'use server';
/**
 * @fileOverview Tools for interacting with the BoardGameGeek (BGG) API.
 *
 * - searchBgg - Searches for a game on BGG and returns a list of results.
 * - getBggGameDetails - Fetches detailed information for a specific game ID from BGG.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Helper function to fetch and parse XML
async function fetchAndParseXml(url: string) {
    const response = await fetch(url, { headers: { 'Accept': 'application/xml' } });
    if (!response.ok) {
        throw new Error(`Failed to fetch from BGG API: ${response.statusText}`);
    }
    const xmlText = await response.text();
    
    // Basic XML parsing without a library. This is fragile but sufficient for this API.
    const getItemXmls = (xml: string) => {
        const itemRegex = /<item id="\d+" type="boardgame">[\s\S]*?<\/item>/g;
        return [...xml.matchAll(itemRegex)].map(match => match[0]);
    };
    
    const getLinks = (xml: string, type: string) => {
        const linkRegex = new RegExp(`<link type="${type}" id="[^"]*" value="([^"]*)"\\/>`, 'g');
        return [...xml.matchAll(linkRegex)].map(match => match[1].replace(/&amp;/g, '&'));
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
        return match ? match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#10;/g, '\n').replace(/&rsquo;/g, "'") : null;
    };

    return { getItemXmls, getValue, getTagValue, getLinks, rawXml: xmlText };
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
        description: 'Searches for a board game on BoardGameGeek (BGG) by its title. Prioritizes exact matches.',
        inputSchema: z.object({
            query: z.string().describe('The title of the game to search for.'),
        }),
        outputSchema: BggSearchResultSchema,
    },
    async (input) => {
        const exactMatchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(input.query)}&type=boardgame&exact=1`;
        let xml = await fetch(exactMatchUrl).then(res => res.text());
        
        let { getItemXmls } = await fetchAndParseXml(exactMatchUrl);
        let itemXmls = getItemXmls(xml);

        // If no exact match, fall back to a regular search
        if (!itemXmls || itemXmls.length === 0) {
            const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(input.query)}&type=boardgame`;
            xml = await fetch(searchUrl).then(res => res.text());
            itemXmls = (await fetchAndParseXml(searchUrl)).getItemXmls(xml);
        }
        
        return itemXmls.slice(0, 5).map(itemXml => {
            const idMatch = itemXml.match(/<item id="([^"]*)"/);
            const id = idMatch ? idMatch[1] : null;

            const primaryNameMatch = itemXml.match(/<name type="primary" value="([^"]*)"/);
            let name = primaryNameMatch ? primaryNameMatch[1] : 'Unknown';
            
            // If primary name is not found, try to find any name tag
            if (name === 'Unknown') {
                const anyNameMatch = itemXml.match(/<name value="([^"]*)"/);
                if (anyNameMatch) name = anyNameMatch[1];
            }
            
            const yearTagMatch = itemXml.match(/<yearpublished value="([^"]*)"/);
            const yearPublished = yearTagMatch ? yearTagMatch[1] : undefined;

            return {
                id: id ? parseInt(id, 10) : 0,
                name: name.replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
                yearPublished: yearPublished ? parseInt(yearPublished, 10) : undefined,
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

        const primaryNameMatch = itemXml.match(/<name type="primary" value="([^"]*)"/);
        let name = primaryNameMatch ? primaryNameMatch[1] : 'Unknown';
        if (name === 'Unknown') {
            const nameMatch = itemXml.match(/<name value="([^"]*)"/);
            if (nameMatch) name = nameMatch[1];
        }
        name = name.replace(/&amp;/g, '&').replace(/&quot;/g, '"');

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

        return {
            id: input.id,
            name,
            description: getTagValue(itemXml, 'description') || undefined,
            imageUrl: originalImageUrl || undefined,
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
