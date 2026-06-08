const { exec } = require('child_process');
const https = require('https');

function getAudioUrl(videoId) {
    return new Promise((resolve, reject) => {
        exec(`python -m yt_dlp -g -f bestaudio "${videoId}"`, (err, stdout, stderr) => {
            if (err) return reject(err);
            resolve(stdout.trim());
        });
    });
}

async function testRange(videoId) {
    try {
        console.log(`Getting URL for: ${videoId}...`);
        const url = await getAudioUrl(videoId);
        console.log(`Extracted URL: ${url.substring(0, 100)}...`);

        console.log('Sending Range request for bytes 1000-5000...');
        return new Promise((resolve) => {
            const req = https.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Range': 'bytes=1000-5000'
                }
            }, (res) => {
                console.log(`Response Status: ${res.statusCode}`);
                console.log(`Content-Range: ${res.headers['content-range']}`);
                console.log(`Content-Length: ${res.headers['content-length']}`);
                console.log(`Content-Type: ${res.headers['content-type']}`);
                
                let dataLen = 0;
                res.on('data', (chunk) => dataLen += chunk.length);
                res.on('end', () => {
                    console.log(`Downloaded ${dataLen} bytes successfully!`);
                    resolve();
                });
            });
            req.on('error', (err) => {
                console.log(`Error: ${err.message}`);
                resolve();
            });
        });
    } catch (e) {
        console.error('Test failed:', e);
    }
}

testRange('J05Ww73KlLE');
