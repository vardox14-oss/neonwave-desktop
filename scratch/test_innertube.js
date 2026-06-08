const https = require('https');

function makeInnerTubeRequest(videoId, clientName, clientVersion) {
    const bodyObj = {
        videoId: videoId,
        context: {
            client: {
                clientName: clientName,
                clientVersion: clientVersion,
                hl: 'fr',
                gl: 'FR',
                utcOffsetMinutes: 120
            }
        }
    };
    const bodyStr = JSON.stringify(bodyObj);

    return new Promise((resolve) => {
        const options = {
            hostname: 'www.youtube.com',
            port: 443,
            path: '/youtubei/v1/player?prettyPrint=false',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Mobile Safari/537.36',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (err) {
                    console.log(`Failed to parse response for ${clientName}:`, err.message);
                    resolve(null);
                }
            });
        });

        req.on('error', (err) => {
            console.log(`Request error for ${clientName}:`, err.message);
            resolve(null);
        });

        req.write(bodyStr);
        req.end();
    });
}

async function testClient(videoId, clientName, clientVersion) {
    console.log(`Testing client ${clientName} (${clientVersion})...`);
    const data = await makeInnerTubeRequest(videoId, clientName, clientVersion);
    if (!data) return;

    const playabilityStatus = data.playabilityStatus || {};
    console.log(`  -> Status: ${playabilityStatus.status}, Reason: ${playabilityStatus.reason}`);

    const formats = data.streamingData?.adaptiveFormats || data.streamingData?.formats || [];
    console.log(`  -> Formats returned: ${formats.length}`);

    const withUrl = formats.filter(f => f.url);
    const withCipher = formats.filter(f => f.signatureCipher || f.cipher);

    console.log(`  -> Formats with direct URL: ${withUrl.length}`);
    console.log(`  -> Formats with cipher: ${withCipher.length}`);

    if (withUrl.length > 0) {
        const audio = withUrl.filter(f => f.mimeType && f.mimeType.startsWith('audio/'));
        console.log(`  -> Direct audio formats: ${audio.length}`);
        if (audio.length > 0) {
            console.log(`  -> Sample audio URL: ${audio[0].url.substring(0, 120)}...`);
        }
    }
}

async function run() {
    const videoId = 'J05Ww73KlLE'; // Saïf Malade (official)
    
    // Test Android client
    await testClient(videoId, 'ANDROID', '17.05.33');
    console.log();

    // Test TVHTML5 client
    await testClient(videoId, 'TVHTML5', '7.20230405.08.01');
    console.log();

    // Test Android Music client
    await testClient(videoId, 'ANDROID_MUSIC', '5.47.53');
    console.log();
}

run();
