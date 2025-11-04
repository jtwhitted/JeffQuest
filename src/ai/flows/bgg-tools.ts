'use server';
/**
 * @fileOverview Tools for interacting with the BoardGameGeek (BGG) API.
 *
 * - searchBgg - Searches for a game on BGG and returns a list of results.
 * - getBggGameDetails - Fetches detailed information for a specific game ID from BGG.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Helper to convert URL to data URI
async function urlToDataUri(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch image from ${url}. Status: ${response.status}`);
            return url; // Fallback to original URL on failure
        }
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`Error converting image to data URI: ${error}`);
        return url; // Fallback to original URL on error
    }
}


// Helper function to fetch and parse XML
async function fetchAndParseXml(url: string) {
    const response = await fetch(url, { headers: { 'Accept': 'application/xml' } });
    if (!response.ok) {
        throw new Error(`Failed to fetch from BGG API: ${response.statusText}`);
    }
    const xmlText = await response.text();
    
    // Basic XML parsing without a library. This is fragile but sufficient for this API.
    const getItems = (xml: string, tag: string) => {
        const itemRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
        const matches = [...xml.matchAll(itemRegex)];
        return matches.map(match => match[1]);
    };
    
    const getLinks = (xml: string, type: string) => {
        const linkRegex = new RegExp(`<link type="${type}" id="[^"]*" value="([^"]*)"\\/>`, 'g');
        return [...xml.matchAll(linkRegex)].map(match => match[1].replace(/&amp;/g, '&'));
    }

    const getAttribute = (xml: string, tag: string, attribute: string) => {
        const attrRegex = new RegExp(`<${tag}[^>]*${attribute}="([^"]*)"`);
        const match = xml.match(attrRegex);
        return match ? match[1] : null;
    }

    const getValue = (xml: string, tag: string) => {
        const valueRegex = new RegExp(`<${tag}[^>]*value="([^"]*)"`);
        const match = xml.match(valueRegex);
        return match ? match[1] : null;
    }
    
    const getTagValue = (xml: string, tag: string): string | null => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
        const match = xml.match(regex);
        // Decode HTML entities
        return match ? match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#10;/g, '\n') : null;
    };

    return { getItems, getAttribute, getValue, getTagValue, getLinks, rawXml: xmlText };
}


// Schema for BGG search results
const BggSearchResultSchema = z.array(
    z.object({
        id: z.number().describe('The BoardGameGeek ID of the game.'),
        name: z.string().describe('The primary name of the game.'),
        yearPublished: z.number().optional().describe('The year the game was published.'),
    })
);

// Tool to search BGG
export const searchBgg = ai.defineTool(
    {
        name: 'searchBgg',
        description: 'Searches for a board game on BoardGameGeek (BGG) by its title.',
        inputSchema: z.object({
            query: z.string().describe('The title of the game to search for.'),
        }),
        outputSchema: BggSearchResultSchema,
    },
    async (input) => {
        const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(input.query)}&type=boardgame`;
        const { getItems, getAttribute } = await fetchAndParseXml(url);

        const xml = await fetch(url).then(res => res.text());
        const items = getItems(xml, 'item');
        
        return items.slice(0, 5).map(itemXml => {
            const id = getAttribute(itemXml, 'item', 'id');
            const nameTag = itemXml.match(/<name[^>]*value="([^"]*)"/);
            const yearTag = itemXml.match(/<yearpublished[^>]*value="([^"]*)"/);

            return {
                id: id ? parseInt(id, 10) : 0,
                name: nameTag ? nameTag[1] : 'Unknown',
                yearPublished: yearTag ? parseInt(yearTag[1], 10) : undefined,
            };
        }).filter(item => item.id > 0);
    }
);


// Schema for detailed BGG game info
const BggGameDetailsSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    yearPublished: z.number().optional(),
    minPlayers: z.number().optional(),
    maxPlayers: z.number().optional(),
    minPlaytime: z.number().optional(),
    maxPlaytime: z.number().optional(),
    category: z.string().optional(),
    mechanics: z.array(z.string()).optional(),
    designers: z.array(z.string()).optional(),
    publishers: z.array(z.string()).optional(),
    rating: z.number().optional(),
    ratingCount: z.number().optional(),
    complexity: z.number().optional(),
});

// Tool to get game details
export const getBggGameDetails = ai.defineTool(
    {
        name: 'getBggGameDetails',
        description: 'Fetches detailed information for a specific board game from BoardGameGeek (BGG) using its ID.',
        inputSchema: z.object({ id: z.number().describe('The BGG ID of the game.') }),
        outputSchema: BggGameDetailsSchema,
    },
    async (input) => {
        const url = `https://boardgamegeek.com/xmlapi2/thing?id=${input.id}&stats=1`;
        const { getValue, getTagValue, getLinks, rawXml } = await fetchAndParseXml(url);
        
        const itemXml = rawXml; // The whole response is for one "thing"

        const name = getTagValue(itemXml, 'name') || 'Unknown';
        const minPlayers = parseInt(getValue(itemXml, 'minplayers') || '0', 10);
        const maxPlayers = parseInt(getValue(itemXml, 'maxplayers') || '0', 10);
        const minPlaytime = parseInt(getValue(itemXml, 'minplaytime') || '0', 10);
        const maxPlaytime = parseInt(getValue(itemXml, 'maxplaytime') || '0', 10);
        const yearPublished = parseInt(getValue(itemXml, 'yearpublished') || '0', 10);

        const categories = getLinks(itemXml, 'boardgamecategory');
        const mechanics = getLinks(itemXml, 'boardgamemechanic');
        const designers = getLinks(itemXml, 'boardgamedesigner');
        const publishers = getLinks(itemXml, 'boardgamepublisher');
        
        const ratings = getTagValue(itemXml, 'ratings');
        const average = ratings ? parseFloat(getValue(ratings, 'average') || '0') : 0;
        const ratingCount = ratings ? parseInt(getValue(ratings, 'usersrated') || '0', 10) : 0;
        const complexity = ratings ? parseFloat(getValue(ratings, 'averageweight') || '0') : 0;
        
        const originalImageUrl = getTagValue(itemXml, 'image');
        let finalImageUrl: string | undefined = originalImageUrl || undefined;
        if (originalImageUrl) {
            const dataUri = await urlToDataUri(originalImageUrl);
            // Check if conversion was successful before assigning
            if (dataUri.startsWith('data:image')) {
                finalImageUrl = dataUri;
            }
        }


        return {
            id: input.id,
            name,
            description: getTagValue(itemXml, 'description') || undefined,
            imageUrl: finalImageUrl,
            yearPublished: yearPublished > 0 ? yearPublished : undefined,
            minPlayers: minPlayers > 0 ? minPlayers : undefined,
            maxPlayers: maxPlayers > 0 ? maxPlayers : undefined,
            minPlaytime: minPlaytime > 0 ? minPlaytime : undefined,
            maxPlaytime: maxPlaytime > 0 ? maxPlaytime : undefined,
            category: categories.length > 0 ? categories[0] : undefined,
            mechanics,
            designers,
            publishers,
            rating: average,
            ratingCount,
            complexity,
        };
    }
);