const path = require('path');
const fs = require('fs');
const https = require('https');

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const fetchYouTube = (url, headers = {}, redirectCount = 0) => {
    if (redirectCount > 5) return Promise.reject(new Error('Trop de redirections'));
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 
                'User-Agent': ua, 
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8', 
                'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3', 
                'Referer': 'https://www.google.com/',
                ...headers 
            },
            timeout: 10000, rejectUnauthorized: false
        };
        const req = https.get(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchYouTube(res.headers.location, headers, redirectCount + 1));
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.on('error', reject);
    });
};

const scrapeYouTube = async (query, { audioHint = true, musicOnly = true } = {}) => {
    const cleanQuery = query.toLowerCase().replace(/\s+(audio|official|lyrics|lyrics|paroles)$/g, '').trim();
    console.log(`Searching YT for: "${cleanQuery}"`);
    try {
        const searchTerms = [cleanQuery, audioHint ? 'audio' : ''].filter(Boolean).join(' ');
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms)}${musicOnly ? '&sp=EgIQAQ%253D%253D' : ''}`;
        const { status, body } = await fetchYouTube(searchUrl);
        
        const regexes = [
            /var ytInitialData = (\{.*?\});/s,
            /window\["ytInitialData"\] = (\{.*?\});/s,
            /ytInitialData = (\{.*?\});/s
        ];
        
        let match = null;
        for (let r of regexes) {
            match = body.match(r);
            if (match) break;
        }

        if (!match) {
            console.warn(`GDPR check needed or no match. Status: ${status}, body len: ${body.length}`);
            if (body.includes('consent') || body.includes('CONSENT')) {
                const retryUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms)}${musicOnly ? '&sp=EgIQAQ%253D%253D' : ''}`;
                const { status: st2, body: body2 } = await fetchYouTube(retryUrl, {
                    'Cookie': 'CONSENT=YES+cb.20240408-01-p0.fr+FX+999; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwNDA4LjAxX3AxGgJmciACGgYIgJnsBhAB',
                    'Referer': 'https://www.youtube.com/'
                });
                for (let r of regexes) {
                    match = body2.match(r);
                    if (match) break;
                }
            }
        }
        
        if (!match) {
            console.error('Failed to extract data.');
            return [];
        }
        
        const data = JSON.parse(match[1]);
        let contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
        
        if (!contents) {
            const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
            for (const section of sections) {
                contents = section?.itemSectionRenderer?.contents;
                if (contents && contents.some(c => c.videoRenderer)) break;
            }
        }
        
        if (!contents) {
            return [];
        }

        const items = [];
        for (let item of contents) {
            if (item.videoRenderer) {
                const v = item.videoRenderer;
                if (!v.videoId) continue;
                items.push({
                    title: v.title?.runs?.[0]?.text || 'Untitled',
                    videoId: v.videoId,
                    uploaderName: v.ownerText?.runs?.[0]?.text || 'Unknown Artist',
                    durationText: v.lengthText?.simpleText || '0:00'
                });
            }
        }
        return items;
    } catch (e) {
        console.error('Error:', e);
        return [];
    }
};

(async () => {
    console.log('--- SEARCHING "Saïf Malade" (musicOnly = true) ---');
    const items = await scrapeYouTube('Saïf Malade', { audioHint: true, musicOnly: true });
    console.log(items);

    console.log('\n--- SEARCHING "Saïf Malade" (musicOnly = false) ---');
    const items2 = await scrapeYouTube('Saïf Malade', { audioHint: true, musicOnly: false });
    console.log(items2);
})();
