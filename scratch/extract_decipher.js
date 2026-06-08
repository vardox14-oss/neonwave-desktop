const https = require('https');
const fs = require('fs');

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
    console.log('Fetching watch page to get base.js path...');
    const { body: watchHtml } = await fetchYouTube('https://www.youtube.com/watch?v=J05Ww73KlLE');
    
    // Find base.js
    const jsUrlMatch = watchHtml.match(/"jsUrl":"([^"]+)"/) || watchHtml.match(/src="([^"]+base\.js)"/);
    if (!jsUrlMatch) {
        console.error('Failed to find player JS URL!');
        return;
    }
    
    const jsUrl = jsUrlMatch[1].replace(/\\/g, '');
    const fullJsUrl = jsUrl.startsWith('http') ? jsUrl : `https://www.youtube.com${jsUrl}`;
    console.log(`Player JS URL: ${fullJsUrl}`);
    
    console.log('Fetching player JS...');
    const { body: jsCode } = await fetchYouTube(fullJsUrl);
    console.log(`JS Loaded. Length: ${jsCode.length}`);
    
    // Now look for the decipher function
    // Typical patterns:
    // 1. function(a){a=a.split("");XYZ.reverse(a,3);XYZ.slice(a,2)... return a.join("")}
    // Let's search for "split("")" and "join("")"
    const splitIndex = jsCode.indexOf('.split("")');
    const joinIndex = jsCode.indexOf('.join("")');
    console.log(`split("") found at index: ${splitIndex}`);
    console.log(`join("") found at index: ${joinIndex}`);
    
    // Let's run a few regexes to find the main function
    const regex1 = /([A-Za-z0-9_$]+)\s*=\s*function\s*\(\s*a\s*\)\s*\{\s*a\s*=\s*a\.split\s*\(\s*""\s*\)/g;
    let match;
    while ((match = regex1.exec(jsCode)) !== null) {
        console.log(`Regex1 match: function name = ${match[1]} at index ${match.index}`);
        // Let's print the surrounding code (500 chars)
        console.log(jsCode.substring(match.index, match.index + 400));
        console.log('---');
    }
    
    const regex2 = /\b([A-Za-z0-9_$]+)\s*=\s*function\s*\(\s*a\s*,\s*b\s*\)\s*\{\s*a\.split\s*\(\s*""\s*\)/g;
    while ((match = regex2.exec(jsCode)) !== null) {
        console.log(`Regex2 match: function name = ${match[1]} at index ${match.index}`);
        console.log(jsCode.substring(match.index, match.index + 400));
        console.log('---');
    }

    const regex3 = /function\s+([A-Za-z0-9_$]+)\s*\(\s*a\s*\)\s*\{\s*a\s*=\s*a\.split\s*\(\s*""\s*\)/g;
    while ((match = regex3.exec(jsCode)) !== null) {
        console.log(`Regex3 match: function name = ${match[1]} at index ${match.index}`);
        console.log(jsCode.substring(match.index, match.index + 400));
        console.log('---');
    }
}

run();
