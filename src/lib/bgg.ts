
'use server';

import { XMLParser } from 'fast-xml-parser';

// Note: Using a mix of v1 and v2 APIs. v1 for search, v2 for thing.
const BGG_API_V1_URL = 'https://boardgamegeek.com/xmlapi';
const BGG_API_V2_URL = 'https://boardgamegeek.com/xmlapi2';

// Helper to fetch and handle retries with delay, as BGG API can be slow
async function fetchWithRetry(url: string, retries = 5, delay = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        const res = await fetch(url, { next: { revalidate: 3600 } });
        // BGG API returns 202 if it's processing the request, so we need to wait
        if (res.status === 202) {
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
        }
        if (res.ok) {
            return res;
        }
    }
    throw new Error('Failed to fetch from BGG API after multiple retries.');
}

export async function searchBgg(name: string): Promise<string | null> {
    const url = `${BGG_API_V1_URL}/search?query=${encodeURIComponent(name)}&type=boardgame&exact=1`;
    try {
        const response = await fetchWithRetry(url);
        const xmlText = await response.text();
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const result = parser.parse(xmlText);

        if (result.boardgames && result.boardgames.boardgame) {
            const items = Array.isArray(result.boardgames.boardgame) ? result.boardgames.boardgame : [result.boardgames.boardgame];
            return items[0]?.['@_objectid'] || null;
        }
        return null;
    } catch (error) {
        console.error(`BGG Search Error for "${name}":`, error);
        return null;
    }
}

export async function getBggGameDetails(bggId: string) {
    const url = `${BGG_API_V2_URL}/thing?id=${bggId}&stats=1`;
    try {
        const response = await fetchWithRetry(url);
        const xmlText = await response.text();

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            isArray: (name) => ['link', 'poll'].includes(name),
        });
        const result = parser.parse(xmlText);
        const item = result.items?.item;

        if (!item) {
            return null;
        }

        const getValue = (field: any) => field?.['@_value'];

        const getLinkValue = (type: string) => {
            const links = item.link?.filter((l: any) => l['@_type'] === type) || [];
            return links.map((l: any) => l['@_value']);
        };
        
        const primaryName = Array.isArray(item.name) ? item.name.find(n => n['@_type'] === 'primary')?.['@_value'] : item.name?.['@_value'];

        return {
            name: primaryName || getValue(item.name),
            imageUrl: item.image ? `https:${item.image}` : `https:${item.thumbnail}` || '',
            description: item.description?.replace(/&amp;#10;/g, '\n') || 'No description available.',
            yearPublished: parseInt(getValue(item.yearpublished), 10) || undefined,
            minPlayers: parseInt(getValue(item.minplayers), 10),
            maxPlayers: parseInt(getValue(item.maxplayers), 10),
            minPlaytime: parseInt(getValue(item.minplaytime), 10),
            maxPlaytime: parseInt(getValue(item.maxplaytime), 10),
            difficulty: 'Intermediate', // BGG doesn't have this, so we default.
            category: getLinkValue('boardgamecategory')[0] || 'Unknown',
            mechanics: getLinkValue('boardgamemechanic'),
            designers: getLinkValue('boardgamedesigner'),
            publishers: getLinkValue('boardgamepublisher'),
            rating: parseFloat(getValue(item.statistics?.ratings?.average)),
            ratingCount: parseInt(getValue(item.statistics?.ratings?.usersrated), 10),
            complexity: parseFloat(getValue(item.statistics?.ratings?.averageweight)),
        };
    } catch (error) {
        console.error(`BGG Thing Error for ID "${bggId}":`, error);
        return null;
    }
}
