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
    
    const patterns = [
        /\b[a-zA-Z0-9$]+\s*=\s*([a-zA-Z0-9$]+)\(decodeURIComponent\([a-zA-Z0-9$]+\.s\)\)/,
        /\b[a-zA-Z0-9$]+\s*=\s*([a-zA-Z0-9$]+)\(decodeURIComponent\([a-zA-Z0-9$]+\.sig\)\)/,
        /\b[a-zA-Z0-9$]+\.set\([^,]+,\s*([a-zA-Z0-9$]+)\(decodeURIComponent\([a-zA-Z0-9$]+\.s\)\)/,
        /\b[a-zA-Z0-9$]+\.set\([^,]+,\s*([a-zA-Z0-9$]+)\(decodeURIComponent\([a-zA-Z0-9$]+\.sig\)\)/,
        /\b[cs_]+&&[a-zA-Z0-9$]+\.set\([^,]+,\s*([a-zA-Z0-9$]+)\(/,
        /\b[cs_]+&&[a-zA-Z0-9$]+\.set\([^,]+,\s*encodeURIComponent\s*\(\s*([a-zA-Z0-9$]+)\(/,
        /\b[cs_]+&&[a-zA-Z0-9$]+\.set\([^,]+,\s*([a-zA-Z0-9$]+)\(decodeURIComponent\([a-zA-Z0-9$]+\.s\)\)/,
        /\b[cs_]+&&[a-zA-Z0-9$]+\.set\([^,]+,\s*([a-zA-Z0-9$]+)\(decodeURIComponent\([a-zA-Z0-9$]+\.sig\)\)/
    ];

    patterns.forEach((pattern, index) => {
        const match = jsCode.match(pattern);
        if (match) {
            console.log(`Pattern ${index} matched!`);
            console.log(`  -> Full match snippet: ${match[0]}`);
            console.log(`  -> Extracted function name: ${match[1]}`);
            
            // Try to extract the function definition
            const funcName = match[1];
            // Escape special chars in funcName if any
            const escapedName = funcName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            
            const defPatterns = [
                new RegExp(`(?:var\\s+|const\\s+|let\\s+)?${escapedName}\\s*=\\s*function\\s*\\(([^)]+)\\)\\s*\\{([^}]+)\\}`),
                new RegExp(`(?:var\\s+|const\\s+|let\\s+)?${escapedName}\\s*=\\s*\\(([^)]+)\\)\\s*=>\\s*\\{([^}]+)\\}`),
                new RegExp(`function\\s+${escapedName}\\s*\\(([^)]+)\\)\\s*\\{([^}]+)\\}`),
                new RegExp(`\\b${escapedName}\\s*=\\s*function\\s*\\(([^)]+)\\)\\s*\\{`)
            ];
            
            defPatterns.forEach((defPattern, defIndex) => {
                const defMatch = jsCode.match(defPattern);
                if (defMatch) {
                    console.log(`  -> Definition Pattern ${defIndex} matched!`);
                    // Find function body by tracing curly braces
                    const startIdx = jsCode.indexOf(defMatch[0]);
                    const bodyStart = jsCode.indexOf('{', startIdx);
                    let depth = 1;
                    let bodyEnd = bodyStart + 1;
                    while (depth > 0 && bodyEnd < jsCode.length) {
                        const char = jsCode[bodyEnd];
                        if (char === '{') depth++;
                        else if (char === '}') depth--;
                        bodyEnd++;
                    }
                    const body = jsCode.substring(startIdx, bodyEnd);
                    console.log(`  -> Definition body:\n${body}\n`);
                }
            });
        } else {
            console.log(`Pattern ${index} did not match.`);
        }
    });
}

run();
