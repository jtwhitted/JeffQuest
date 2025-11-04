'use server';
/**
 * @fileOverview Tools for interacting with the BoardGameGeek (BGG) API.
 *
 * - searchBgg - Searches for a game on BGG and returns a list of results.
 * - getBggGameDetails - Fetches detailed information for a specific game ID from BGG.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Helper function to fetch and parse XML
async function fetchAndParseXml(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch from BGG API: ${response.statusText}`);
    }
    const xmlText = await response.text();
    
    // Basic XML parsing without a library. This is fragile.
    const getItems = (xml: string, tag: string) => {
        const itemRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
        const matches = [...xml.matchAll(itemRegex)];
        return matches.map(match => match[1]);
    };

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
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
        const match = xml.match(regex);
        return match ? match[1] : null;
    };


    return { getItems, getAttribute, getValue, getTagValue, rawXml: xmlText };
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
        const { getItems, getAttribute, getValue } = await fetchAndParseXml(url);

        const items = getItems(await fetch(url).then(res => res.text()), 'item');
        
        return items.map(itemXml => {
            const nameTag = [...itemXml.matchAll(/<name[^>]*value="([^"]*)"/g)];
            const yearTag = itemXml.match(/<yearpublished[^>]*value="([^"]*)"/);

            return {
                id: parseInt(getAttribute(itemXml, 'item', 'id') || '0', 10),
                name: nameTag.length > 0 ? nameTag[0][1] : 'Unknown',
                yearPublished: yearTag ? parseInt(yearTag[1], 10) : undefined,
            };
        }).filter(item => item.id > 0);
    }
);


// Schema for detailed BGG game info
const BggGameDetailsSchema = z.object({
    id: z.number(),
    name: z.string(),
    category: z.string(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
    complexity: z.number().describe('The BGG weight/complexity rating, typically from 1 to 5.'),
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
        const { getAttribute, getValue, rawXml } = await fetchAndParseXml(url);
        
        const itemXml = rawXml; // The whole response is for one "thing"

        const name = getAttribute(itemXml, 'name', 'value') || 'Unknown';
        const minPlayers = parseInt(getValue(itemXml, 'minplayers') || '1', 10);
        const maxPlayers = parseInt(getValue(itemXml, 'maxplayers') || '1', 10);
        
        // Find the "boardgamecategory" link and get its value
        const linkRegex = /<link type="boardgamecategory" id="[^"]*" value="([^"]*)"\/>/g;
        const categoryMatch = linkRegex.exec(itemXml);
        const category = categoryMatch ? categoryMatch[1] : 'Unknown';

        const complexity = parseFloat(getValue(itemXml, 'averageweight') || '0');

        return {
            id: input.id,
            name,
            category,
            minPlayers,
            maxPlayers,
            complexity,
        };
    }
);
