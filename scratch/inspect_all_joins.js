const https = require('https');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchYouTube = (url) => {
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 
                'User-Agent': USER_AGENT, 
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8', 
                'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3', 
                'Referer': 'https://www.google.com/'
            },
            timeout: 10000
        };
        const req = https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
    });
};

async function run() {
    const jsUrl = 'https://www.youtube.com/s/player/9d2ef9ef/player_es6.vflset/fr_FR/base.js';
    const { body: jsCode } = await fetchYouTube(jsUrl);
    
    console.log("Searching all occurrences of .join(");
    let pos = 0;
    let occurrences = [];
    
    const targets = ['.join("")', ".join('')", '.join()', ".join()"];
    for (let target of targets) {
        pos = 0;
        while ((pos = jsCode.indexOf(target, pos)) !== -1) {
            occurrences.push({ pos, target });
            pos += target.length;
        }
    }
    
    occurrences.sort((a, b) => a.pos - b.pos);
    console.log(`Total join occurrences: ${occurrences.length}`);
    
    occurrences.forEach((occ, idx) => {
        console.log(`Occurrence ${idx+1} at ${occ.pos} (target: ${occ.target}):`);
        console.log(jsCode.substring(occ.pos - 200, occ.pos + 200));
        console.log('-------------------------------------------------------------\n');
    });
}

run();
