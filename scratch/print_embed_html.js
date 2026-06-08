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
    const { body } = await fetchYouTube('https://www.youtube.com/embed/J05Ww73KlLE');
    console.log("Length:", body.length);
    
    // Look for initial data or player response
    const matches = [
        body.match(/ytPlayer\.config\s*=\s*(\{.*?\});/s),
        body.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/s),
        body.match(/ytInitialData\s*=\s*(\{.*?\});/s),
        body.match(/var\s+ytInitialPlayerResponse\s*=\s*(\{.*?\});/s)
    ];
    
    matches.forEach((m, idx) => {
        if (m) {
            console.log(`Match ${idx} found! Length: ${m[1].length}`);
            console.log(m[1].substring(0, 500));
        } else {
            console.log(`Match ${idx} not found`);
        }
    });

    // Let's write the html to a file to inspect it
    const fs = require('fs');
    fs.writeFileSync('scratch/embed_J05Ww73KlLE.html', body);
}

run();
