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

async function testStream(videoId) {
    try {
        console.log(`Extracting stream for: ${videoId}`);
        const { body } = await fetchYouTube(`https://www.youtube.com/watch?v=${videoId}`);
        
        const playerMatch = body.match(/var ytInitialPlayerResponse\s*=\s*(\{.*?\});/s) ||
                            body.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);

        if (!playerMatch) {
            console.log(`  -> FAIL: Could not find ytInitialPlayerResponse`);
            return;
        }

        const playerData = JSON.parse(playerMatch[1]);
        const playabilityStatus = playerData?.playabilityStatus || {};
        console.log(`  -> Playability status: ${playabilityStatus.status}`);

        const formats = playerData?.streamingData?.adaptiveFormats || 
                        playerData?.streamingData?.formats || [];

        const audioFormats = formats
            .filter(f => f.mimeType && f.mimeType.startsWith('audio/') && f.url)
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        if (audioFormats.length === 0) {
            console.log(`  -> FAIL: No audio formats found!`);
            // Print signatureCipher or other format keys to see if they are protected
            const rawFormats = playerData?.streamingData?.adaptiveFormats || [];
            console.log(`  -> Raw formats count: ${rawFormats.length}`);
            if (rawFormats.length > 0) {
                console.log(`  -> Sample format keys: ${Object.keys(rawFormats[0]).join(', ')}`);
            }
            return;
        }

        const best = audioFormats[0];
        console.log(`  -> Extracted best format: ${best.mimeType}, bitrate: ${best.bitrate}`);
        console.log(`  -> Fetching stream url: ${best.url.substring(0, 100)}...`);

        // Fetch first 10KB of the audio
        return new Promise((resolve) => {
            const req = https.get(best.url, {
                headers: {
                    'User-Agent': USER_AGENTS[0],
                    'Range': 'bytes=0-10240'
                }
            }, (res) => {
                console.log(`  -> HTTP Response Status: ${res.statusCode}`);
                console.log(`  -> Content-Length: ${res.headers['content-length']}`);
                console.log(`  -> Content-Type: ${res.headers['content-type']}`);
                
                let bytesReceived = 0;
                res.on('data', (chunk) => {
                    bytesReceived += chunk.length;
                });
                res.on('end', () => {
                    console.log(`  -> Downloaded ${bytesReceived} bytes successfully!`);
                    resolve();
                });
            });
            req.on('error', (err) => {
                console.log(`  -> Download failed: ${err.message}`);
                resolve();
            });
        });

    } catch (err) {
        console.log(`  -> Error: ${err.message}`);
    }
}

testStream('J05Ww73KlLE');
