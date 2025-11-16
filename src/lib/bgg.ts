
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
    decodeHTMLchar: true,
    isArray: (name, jpath) => {
        // These keys should always be arrays, even if there's only one.
        return ['item', 'link', 'result', 'name', 'poll', 'play', 'players', 'player'].includes(name);
    }
});


export async function searchBgg(query: string): Promise<{ id: string, name: string }[]> {
    const params: Record<string, string> = { query, type: 'boardgame' };

    const xmlData = await bggFetch('search', params);
    const parsed = parser.parse(xmlData);

    if (!parsed.items?.item) {
        return [];
    }

    const items = Array.isArray(parsed.items.item) ? parsed.items.item : [parsed.items.item];

    const filteredItems = items.filter(item => item.type === 'boardgame');

    return filteredItems.map((item: any) => ({
        id: item.id.toString(),
        name: Array.isArray(item.name) ? item.name[0].value : item.name.value
    }));
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
                const primary = names.find(n => n.type === 'primary');
                return primary ? primary.value : names[0]?.value || 'Unknown';
            };
        
            const getLinkValue = (type: string) => item.link?.filter((l: any) => l.type === type).map((l: any) => l.value) || [];
            const getStat = (name: string) => {
                if (!includeStats) return undefined;
                const value = item.statistics?.ratings?.[name]?.value;
                return typeof value === 'number' ? parseFloat(value.toPrecision(4)) : undefined;
            };
            
            const description = item.description || 'No description available.';
        
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
        allDetails.push(...chunkDetails);
    } catch (error) {
        console.error(`Failed to fetch details for chunk ${idString}:`, error);
        // Continue to the next chunk even if one fails
    }
  }

  return allDetails;
}


export async function getBggCollection(username: string): Promise<{bggId: string, userRating?: number}[]> {
    const params: Record<string, string> = { username, stats: '1' };

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
        const ratingValue = item.stats?.rating?.value;
        // BGG returns 'N/A' for unrated games, which the parser might turn into a string.
        // We only want to capture actual number ratings.
        const userRating = typeof ratingValue === 'number' ? ratingValue : undefined;
        return {
            bggId: item.objectid.toString(),
            userRating: userRating,
        }
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
            name: p.name,
            bggUsername: p.username || undefined,
            win: p.win === 1,
            score: p.score ? parseFloat(p.score) : undefined,
        })) || [];
        
        return {
            bggPlayId: play.id,
            bggGameId: play.item?.objectid,
            date: play.date,
            notes: play.comments || undefined,
            duration: play.length ? parseInt(play.length, 10) : undefined,
            players: playPlayers,
        };
    });

    return plays;
}

