
'use server';

import { XMLParser } from 'fast-xml-parser';

const BGG_API_URL = 'https://boardgamegeek.com/xmlapi2';

// BGG API is rate-limited, so we need to add a delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const apiKey = process.env.BGG_API_KEY;

async function bggFetch(path: string, params: Record<string, string>) {
    if (!apiKey) {
        console.warn('BGG_API_KEY is not configured. BGG integration will not work.');
        return '<items total="0"></items>'; // Return empty XML to prevent crashes
    }
    
    const url = new URL(`${BGG_API_URL}/${path}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });

    if (response.status === 202) {
        // BGG has queued the request. We need to wait and retry.
        await delay(3000); // Wait 3 seconds
        return bggFetch(path, params);
    }
    
    if (!response.ok) {
        // Log the error but don't crash the server
        console.error(`BGG API request failed with status ${response.status}: ${await response.text()}`);
        return '<items total="0"></items>'; // Return empty XML on failure
    }

    return response.text();
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '_value',
    parseAttributeValue: true,
    isArray: (name, jpath) => {
        return ['item', 'link', 'result', 'name'].includes(name);
    }
});


export async function searchBgg(query: string): Promise<{ id: string, name: string }[]> {
    const xmlData = await bggFetch('search', { query, type: 'boardgame', exact: '1' });
    const parsed = parser.parse(xmlData);
    
    if (!parsed.items?.item) {
        // Try again without exact match
        const xmlDataNonExact = await bggFetch('search', { query, type: 'boardgame' });
        const parsedNonExact = parser.parse(xmlDataNonExact);
        if (!parsedNonExact.items?.item) {
            return [];
        }
        return parsedNonExact.items.item.map((item: any) => ({
            id: item.id.toString(),
            name: item.name.value
        }));
    }

    return parsed.items.item.map((item: any) => ({
        id: item.id.toString(),
        name: item.name.value
    }));
}


export async function getBggDetails(id: string) {
    const xmlData = await bggFetch('thing', { id, stats: '1' });
    const parsed = parser.parse(xmlData);

    if (!parsed.items?.item) {
        console.warn(`Could not find details for BGG ID ${id}`);
        return null;
    }

    const item = parsed.items.item[0];

    const getValue = (field: any) => (Array.isArray(field) ? field.find(f => f.type === 'primary')?.value : field?.value);
    const getLinkValue = (type: string) => item.link?.filter((l: any) => l.type === type).map((l: any) => l.value);
    const getStat = (name: string) => parseFloat(item.statistics?.ratings?.[name]?.value);

    const description = item.description.replace(/&#10;/g, '\n');

    return {
        name: getValue(item.name) || 'Unknown',
        imageUrl: item.image || '',
        description: description,
        yearPublished: item.yearpublished?.value,
        minPlayers: item.minplayers?.value,
        maxPlayers: item.maxplayers?.value,
        difficulty: getStat('averageweight') < 2 ? 'Beginner' : getStat('averageweight') < 3 ? 'Intermediate' : getStat('averageweight') < 4 ? 'Advanced' : 'Expert',
        category: getLinkValue('boardgamecategory')?.[0] || 'Unknown',
        mechanics: getLinkValue('boardgamemechanic') || [],
        designers: getLinkValue('boardgamedesigner') || [],
        publishers: getLinkValue('boardgamepublisher') || [],
        minPlaytime: item.minplaytime?.value,
        maxPlaytime: item.maxplaytime?.value,
        rating: getStat('average'),
        ratingCount: getStat('usersrated'),
        complexity: getStat('averageweight'),
    };
}
