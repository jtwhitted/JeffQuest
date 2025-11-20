
'use server';

import { XMLParser } from 'fast-xml-parser';
import { Game } from './types';

const BGG_API_URL = 'https://boardgamegeek.com/xmlapi2';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const apiKey = process.env.BGG_API_KEY;

// Helper function to decode common HTML entities that fast-xml-parser might miss.
function decodeBggText(text: string | undefined): string {
    if (!text) return '';
    return text
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&ldquo;/g, '“')
        .replace(/&rdquo;/g, '”')
        .replace(/&lsquo;/g, '‘')
        .replace(/&rsquo;/g, '’');
}


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
    attributeNamePrefix: '@_',
    textNodeName: '_value',
    parseAttributeValue: true,
    decodeHTMLchar: true,
    isArray: (name, jpath) => {
        // These keys should always be arrays, even if there's only one.
        return ['item', 'link', 'result', 'name', 'poll', 'play', 'players', 'player', 'buddy'].includes(name);
    }
});


export async function searchBgg(query: string, exact = false): Promise<{ id: string, name: string }[]> {
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

    const filteredItems = items.filter(item => item['@_type'] === 'boardgame');

    return filteredItems.map((item: any) => {
        const rawName = Array.isArray(item.name) ? item.name[0]['@_value'] : item.name['@_value'];
        return {
            id: item['@_id'].toString(),
            name: decodeBggText(rawName)
        };
    });
}


export async function getBggDetails(ids: string[], includeStats = true): Promise<Partial<Game & {id: string}>[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  // BGG API can be flaky with long requests. Chunk the requests.
  const CHUNK_SIZE = 10;
  const allDetails: Partial<Game & {id: string}>[] = [];

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const idString = chunk.join(',');

    try {
        const fetchParams: Record<string, string> = { id: idString };
        if (includeStats) {
            fetchParams.stats = '1';
        }
        
        const xmlData = await bggFetch('thing', fetchParams);
        const parsed = parser.parse(xmlData);

        if (!parsed.items?.item) {
            console.warn(`Could not find details for BGG ID chunk: ${idString}`);
            continue; // Skip to next chunk
        }
        
        const items = Array.isArray(parsed.items.item) ? parsed.items.item : [parsed.items.item];

        const chunkDetails = items.map((item: any) => {
            const getPrimaryName = (names: any[]) => {
                if (!names) return 'Unknown';
                const primary = names.find(n => n['@_type'] === 'primary');
                return primary ? primary['@_value'] : names[0]?.['@_value'] || 'Unknown';
            };
        
            const getLinkValue = (type: string) => item.link?.filter((l: any) => l['@_type'] === type).map((l: any) => decodeBggText(l['@_value'])) || [];
            const getStat = (name: string) => {
                if (!includeStats) return undefined;
                const value = item.statistics?.ratings?.[name]?.['@_value'];
                return typeof value === 'number' ? parseFloat(value.toPrecision(4)) : undefined;
            };
            
            const rawDescription = item.description || 'No description available.';
        
            const complexity = getStat('averageweight');
            let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' = 'Intermediate';
            if (complexity) {
                if (complexity < 2) difficulty = 'Beginner';
                else if (complexity < 3) difficulty = 'Intermediate';
                else if (complexity < 4) difficulty = 'Advanced';
                else difficulty = 'Expert';
            }
        
            return {
                id: item['@_id'].toString(),
                name: decodeBggText(getPrimaryName(item.name)),
                imageUrl: item.image || '',
                description: decodeBggText(rawDescription),
                yearPublished: item.yearpublished?.['@_value'],
                minPlayers: item.minplayers?.['@_value'],
                maxPlayers: item.maxplayers?.['@_value'],
                difficulty: difficulty,
                category: getLinkValue('boardgamecategory'),
                mechanics: getLinkValue('boardgamemechanic'),
                designers: getLinkValue('boardgamedesigner'),
                publishers: getLinkValue('boardgamepublisher'),
                minPlaytime: item.minplaytime?.['@_value'],
                maxPlaytime: item.maxplaytime?.['@_value'],
                rating: getStat('average'),
                ratingCount: getStat('usersrated'),
                complexity: complexity,
            };
        });
        allDetails.push(...chunkDetails);
    } catch (error) {
        console.error(`Failed to fetch details for chunk ${idString}:`, error);
        // Continue to the next chunk even if one fails
    }
  }

  return allDetails;
}


export async function getBggCollection(username: string): Promise<{ bggId: string, userRating?: number }[]> {
    const params: Record<string, string> = { username, subtype: 'boardgame', stats: '1' };
    const xmlData = await bggFetch('collection', params);
    const parsed = parser.parse(xmlData);

    if (parsed.errors?.error) {
        throw new Error(`BGG Error: ${parsed.errors.error.message}`);
    }

    if (!parsed.items?.item) {
        return [];
    }

    const items = Array.isArray(parsed.items.item) ? parsed.items.item : [parsed.items.item];

    return items.map((item: any) => {
        const rating = item.stats?.rating?.['@_value'];
        return {
            bggId: item['@_objectid'],
            userRating: rating && rating !== 'N/A' ? parseFloat(rating) : undefined,
        };
    });
}


export interface BggPlay {
    bggPlayId: string;
    bggGameId: string;
    date: string;
    notes?: string;
    duration?: number;
    players: {
        name: string;
        bggUsername?: string;
        win: boolean;
        score?: number;
    }[];
}

export async function getBggPlayHistory(username: string): Promise<BggPlay[]> {
    const params: Record<string, string> = { username, subtype: 'boardgame' };
    const xmlData = await bggFetch('plays', params);
    const parsed = parser.parse(xmlData);

    if (parsed.errors?.error) {
        throw new Error(`BGG Error: ${parsed.errors.error.message}`);
    }

    if (!parsed.plays?.play) {
        return [];
    }

    const plays: BggPlay[] = parsed.plays.play.map((play: any): BggPlay => {
        const playPlayers = play.players?.[0]?.player?.map((p: any) => ({
            name: decodeBggText(p['@_name']),
            bggUsername: p['@_username'] || undefined,
            win: p['@_win'] === 1,
            score: p['@_score'] ? parseFloat(p['@_score']) : undefined,
        })) || [];
        
        return {
            bggPlayId: play['@_id'],
            bggGameId: play.item?.[0]?.['@_objectid'],
            date: play['@_date'],
            notes: decodeBggText(play.comments),
            duration: play['@_length'] ? parseInt(play['@_length'], 10) : undefined,
            players: playPlayers,
        };
    });

    return plays;
}

export async function getBggFriends(username: string): Promise<string[]> {
    const params: Record<string, string> = { name: username, buddies: '1' };
    const xmlData = await bggFetch('user', params);
    const parsed = parser.parse(xmlData);

    if (parsed.errors?.error) {
        throw new Error(`BGG Error: ${parsed.errors.error.message}`);
    }

    if (!parsed.user?.buddies?.buddy) {
        return [];
    }
    
    const buddies = parsed.user.buddies.buddy;
    return buddies.map((buddy: any) => buddy['@_name']).filter(Boolean);
}

export async function getBggUserDetails(username: string): Promise<{ name: string; avatarUrl?: string }> {
    const params: Record<string, string> = { name: username };
    const xmlData = await bggFetch('user', params);
    const parsed = parser.parse(xmlData);

    if (parsed.errors?.error || !parsed.user) {
        // If user not found, fall back to username
        return { name: username };
    }

    const user = parsed.user;
    // BGG provides 'firstname', which is what we'll use as the "real name".
    // It can be an empty string if not provided.
    const realName = user.firstname?.['@_value']?.trim();
    const avatar = user.avatarlink?.['@_value'];

    return {
        name: decodeBggText(realName) || username, // Fallback to username if real name is empty
        avatarUrl: avatar !== 'N/A' ? avatar : undefined,
    };
}
