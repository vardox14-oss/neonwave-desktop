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

async function testVideo(videoId) {
    try {
        console.log(`Checking playability for: ${videoId}`);
        const { body } = await fetchYouTube(`https://www.youtube.com/watch?v=${videoId}`);
        
        const playerMatch = body.match(/var ytInitialPlayerResponse\s*=\s*(\{.*?\});/s) ||
                            body.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);

        if (!playerMatch) {
            console.log(`  -> FAIL: Could not find ytInitialPlayerResponse`);
            return;
        }

        const playerData = JSON.parse(playerMatch[1]);
        const playabilityStatus = playerData?.playabilityStatus || {};
        console.log(`  -> Status: ${playabilityStatus.status}`);
        console.log(`  -> Reason: ${playabilityStatus.reason || 'None'}`);
        console.log(`  -> Embeddable: ${playabilityStatus.embeddable}`);
        if (playabilityStatus.errorScreen) {
            console.log(`  -> Has Error Screen`);
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
        await testVideo(id);
        console.log();
    }
}

run();
