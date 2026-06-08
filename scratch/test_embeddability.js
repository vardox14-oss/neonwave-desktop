const https = require('https');

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

async function testEmbedPage(videoId) {
    try {
        console.log(`Checking embed page for: ${videoId}`);
        const { body } = await fetchYouTube(`https://www.youtube.com/embed/${videoId}`);
        
        // Check if there is "playabilityStatus" inside the page
        const match = body.match(/"playabilityStatus":(\{.*?\})/);
        if (match) {
            // Find closing brace of json
            let depth = 1;
            let i = 0;
            const str = match[1];
            let jsonStr = '{';
            for (i = 1; i < str.length; i++) {
                const char = str[i];
                jsonStr += char;
                if (char === '{') depth++;
                else if (char === '}') {
                    depth--;
                    if (depth === 0) break;
                }
            }
            const statusObj = JSON.parse(jsonStr);
            console.log(`  -> playabilityStatus:`, statusObj);
        } else {
            console.log(`  -> No playabilityStatus JSON found on embed page.`);
            // Check if page contains typical error markers
            if (body.includes('play-error') || body.includes('unavailable')) {
                console.log(`  -> Appears to contain error markers.`);
            } else {
                console.log(`  -> No obvious error markers.`);
            }
        }
    } catch (err) {
        console.log(`  -> Error: ${err.message}`);
    }
}

async function run() {
    const list = [
        'J05Ww73KlLE', // Saïf Malade (official - restricted?)
        '3PZHzGfMlLQ', // Saïf Malade (paroles/lyrics)
        'bFfc6FYHsyA', // Saïf Malade (Version Skyrock)
        'dJ8l3krePWU', // Saïf Medusa (official)
        '3fAbaG2QHuM'  // Saïf Medusa (paroles/lyrics)
    ];
    for (const id of list) {
        await testEmbedPage(id);
        console.log();
    }
}

run();
