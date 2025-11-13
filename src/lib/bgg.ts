
'use server';

import { XMLParser } from 'fast-xml-parser';

const BGG_API_URL = 'https://boardgamegeek.com/xmlapi2';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const apiKey = process.env.BGG_API_KEY;

async function bggFetch(path: string, params: Record<string, string>) {
    const url = new URL(`${BGG_API_URL}/${path}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    const headers: HeadersInit = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (response.status === 202) {
        await delay(3000); // BGG is queuing the request, wait and retry.
        return bggFetch(path, params);
    }
    
    if (!response.ok) {
        console.error(`BGG API request failed for ${url.toString()} with status ${response.status}: ${await response.text()}`);
        throw new Error(`BoardGameGeek API request failed. Status: ${response.status}`);
    }

    return response.text();
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '_value',
    parseAttributeValue: true,
    isArray: (name, jpath) => {
        // These keys should always be arrays, even if there's only one.
        return ['item', 'link', 'result', 'name', 'poll'].includes(name);
    }
});


export async function searchBgg(query: string, exact: boolean = false): Promise<{ id: string, name: string }[]> {
    const params: Record<string, string> = { query, type: 'boardgame' };
    if (exact) {
        params.exact = '1';
    }
    const xmlData = await bggFetch('search', params);
    const parsed = parser.parse(xmlData);

    if (!parsed.items?.item) {
        return [];
    }

    const items = Array.isArray(parsed.items.item) ? parsed.items.item : [parsed.items.item];

    return items.map((item: any) => ({
        id: item.id.toString(),
        name: Array.isArray(item.name) ? item.name[0].value : item.name.value
    }));
}


export async function getBggDetails(ids: string) {
    if (!ids) {
        return [];
    }

    const xmlData = await bggFetch('thing', { id: ids, stats: '1' });
    const parsed = parser.parse(xmlData);

    if (!parsed.items?.item) {
        console.warn(`Could not find details for BGG ID(s) ${ids}`);
        return [];
    }
    
    const items = Array.isArray(parsed.items.item) ? parsed.items.item : [parsed.items.item];

    return items.map((item: any) => {
        const getPrimaryName = (names: any[]) => {
            if (!names) return 'Unknown';
            const primary = names.find(n => n.type === 'primary');
            return primary ? primary.value : names[0]?.value || 'Unknown';
        };
    
        const getLinkValue = (type: string) => item.link?.filter((l: any) => l.type === type).map((l: any) => l.value) || [];
        const getStat = (name: string) => {
            const value = item.statistics?.ratings?.[name]?.value;
            return typeof value === 'number' ? parseFloat(value.toPrecision(4)) : undefined;
        };
        
        const description = item.description?.replace(/&#10;/g, '\n') || 'No description available.';
    
        const complexity = getStat('averageweight');
        let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' = 'Intermediate';
        if (complexity) {
            if (complexity < 2) difficulty = 'Beginner';
            else if (complexity < 3) difficulty = 'Intermediate';
            else if (complexity < 4) difficulty = 'Advanced';
            else difficulty = 'Expert';
        }
    
        return {
            id: item.id.toString(),
            name: getPrimaryName(item.name),
            imageUrl: item.image || '',
            description: description,
            yearPublished: item.yearpublished?.value,
            minPlayers: item.minplayers?.value,
            maxPlayers: item.maxplayers?.value,
            difficulty: difficulty,
            category: getLinkValue('boardgamecategory'),
            mechanics: getLinkValue('boardgamemechanic'),
            designers: getLinkValue('boardgamedesigner'),
            publishers: getLinkValue('boardgamepublisher'),
            minPlaytime: item.minplaytime?.value,
            maxPlaytime: item.maxplaytime?.value,
            rating: getStat('average'),
            ratingCount: getStat('usersrated'),
            complexity: complexity,
        };
    });
}
