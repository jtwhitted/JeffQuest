import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import type { AskRulebookInput, AskRulebookOutput } from './flows/ask-rulebook';

// Gemini's own default TTL when none is specified. Long enough to cover a
// typical "set up the game, ask a few rules questions" session without
// caches lingering (and being billed) indefinitely.
const CACHE_TTL_SECONDS = 3600;
const MODEL = 'gemini-3-flash-preview';

const RULEBOOK_SYSTEM_INSTRUCTION = `You are the "Rules Wizard," an expert on board game rules. Your task is to answer a user's question based *only* on the rulebook documents provided below.

**CRITICAL INSTRUCTIONS:**
1.  **Prioritize Documents:** Use the documents in this order of priority: 1) Errata, 2) Rulebook, 3) Quick Start, 4) House Rules, 5) Other. If an Errata document contradicts a Rulebook, the Errata is correct.
2.  **Formulate the Answer:** Provide a clear and concise answer based *only* on the content of the rulebook documents, respecting the priority order.
3.  **Provide Citations:** After giving the answer, you MUST provide citations for where you found the information.
    - The citation must include the 'documentName' which is the user-provided name of the source document.
    - If the source document has page numbers in its text, extract the page number. If not, you can omit the 'pageNumber' field.

If the answer is not in the provided documents, state that you cannot find the answer in the provided rules. Do not make up information.`;

const RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        answer: { type: Type.STRING },
        citations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    documentName: { type: Type.STRING },
                    pageNumber: { type: Type.NUMBER },
                },
                required: ['documentName'],
            },
        },
    },
    required: ['answer'],
};

function buildDocumentsText(documents: AskRulebookInput['documents']): string {
    return documents
        .map(doc => `## Document Name: ${doc.name}\n## Document Type: ${doc.type}\n\n${doc.text}\n---`)
        .join('\n');
}

function cacheKeyFor(documents: AskRulebookInput['documents']): string {
    const hash = crypto.createHash('sha256');
    for (const doc of documents) {
        hash.update(doc.name);
        hash.update(doc.type);
        hash.update(doc.text);
    }
    return hash.digest('hex');
}

type CacheEntry = { name: string; expiresAt: number };
// Per-server-instance cache of document-set hash -> Gemini cache resource
// name. Worst case on a cold instance or an entry we've aged out ourselves
// is just a fresh (billed) cache getting created, never incorrect behavior.
const cacheByKey = new Map<string, CacheEntry>();

function getClient(): GoogleGenAI {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '';
    return new GoogleGenAI({ apiKey });
}

/**
 * Gets (or creates) a Gemini context cache holding the given rulebook
 * documents, so repeated questions about the same game don't re-send the
 * full rulebook text every time. Returns null if caching isn't usable here
 * (unsupported model, content too small, API error, etc.) — callers must
 * fall back to sending the documents inline in that case.
 */
export async function getRulebookCacheName(documents: AskRulebookInput['documents']): Promise<string | null> {
    const key = cacheKeyFor(documents);
    const existing = cacheByKey.get(key);
    if (existing && existing.expiresAt > Date.now()) {
        return existing.name;
    }

    try {
        const client = getClient();
        const cache = await client.caches.create({
            model: MODEL,
            config: {
                contents: buildDocumentsText(documents),
                systemInstruction: RULEBOOK_SYSTEM_INSTRUCTION,
                displayName: `jeffquest-rulebook-${key.slice(0, 16)}`,
                ttl: `${CACHE_TTL_SECONDS}s`,
            },
        });

        if (!cache.name) {
            return null;
        }

        cacheByKey.set(key, {
            name: cache.name,
            // Stop reusing a little before the real expiry so we don't race it.
            expiresAt: Date.now() + (CACHE_TTL_SECONDS - 60) * 1000,
        });

        return cache.name;
    } catch (error) {
        console.warn('Rulebook context cache unavailable, falling back to sending documents inline:', error);
        return null;
    }
}

/**
 * Answers a rulebook question using a previously-created context cache
 * instead of resending the rulebook text. Returns null on any failure so
 * the caller can fall back to the uncached path.
 */
export async function askWithCachedRulebook(cacheName: string, query: string): Promise<AskRulebookOutput | null> {
    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: MODEL,
            contents: `User's Question: "${query}"`,
            config: {
                cachedContent: cacheName,
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_SCHEMA,
            },
        });

        const text = response.text;
        if (!text) {
            return null;
        }
        return JSON.parse(text) as AskRulebookOutput;
    } catch (error) {
        console.warn('Cached rulebook generation failed, falling back to sending documents inline:', error);
        return null;
    }
}
