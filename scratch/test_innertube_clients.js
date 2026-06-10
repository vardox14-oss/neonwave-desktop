// Test different InnerTube clients for streams
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

async function testClient(name, clientConfig, headers, videoId) {
    const url = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`;
    const body = {
        context: { client: clientConfig },
        videoId: videoId
    };
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000)
        });
        
        const data = await res.json();
        const status = data.playabilityStatus?.status;
        const formats = data.streamingData?.adaptiveFormats || [];
        const audioStreams = formats.filter(f => f.mimeType?.includes('audio'));
        
        console.log(`${name}: status=${res.status} playability=${status} audio=${audioStreams.length}`);
        if (audioStreams.length > 0) {
            const best = audioStreams.sort((a,b) => (b.bitrate||0) - (a.bitrate||0))[0];
            console.log(`  Best: ${best.mimeType} ${best.bitrate}bps`);
            console.log(`  URL: ${best.url ? best.url.slice(0, 100) + '...' : 'NO URL (signatureCipher present)'}`);
            if (!best.url && best.signatureCipher) {
                console.log(`  signatureCipher present (needs decryption)`);
            }
        }
        if (status !== 'OK') {
            console.log(`  Reason: ${data.playabilityStatus?.reason || 'none'}`);
        }
    } catch(e) {
        console.log(`${name}: ERROR ${e.message}`);
    }
}

async function main() {
    const videoId = '5NV6Rdv1a3I'; // Daft Punk Get Lucky Audio

    // WEB client
    await testClient('WEB', {
        clientName: 'WEB',
        clientVersion: '2.20240530.02.00',
        hl: 'fr', gl: 'FR'
    }, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://www.youtube.com',
        'Referer': 'https://www.youtube.com/'
    }, videoId);

    // ANDROID_MUSIC
    await testClient('ANDROID_MUSIC', {
        clientName: 'ANDROID_MUSIC',
        clientVersion: '6.42.52',
        androidSdkVersion: 30,
        hl: 'fr', gl: 'FR'
    }, {
        'User-Agent': 'com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 11)',
        'X-YouTube-Client-Name': '21',
        'X-YouTube-Client-Version': '6.42.52'
    }, videoId);

    // IOS
    await testClient('IOS', {
        clientName: 'IOS',
        clientVersion: '19.09.3',
        deviceModel: 'iPhone14,3',
        hl: 'fr', gl: 'FR'
    }, {
        'User-Agent': 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
        'X-YouTube-Client-Name': '5',
        'X-YouTube-Client-Version': '19.09.3'
    }, videoId);

    // TVHTML5_SIMPLY_EMBEDDED_PLAYER
    await testClient('TV_EMBED', {
        clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
        clientVersion: '2.0',
        hl: 'fr', gl: 'FR'
    }, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://www.youtube.com',
        'Referer': 'https://www.youtube.com/'
    }, videoId);

    // WEB_EMBEDDED_PLAYER
    await testClient('WEB_EMBED', {
        clientName: 'WEB_EMBEDDED_PLAYER',
        clientVersion: '1.20240530.00.00',
        hl: 'fr', gl: 'FR'
    }, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://www.youtube.com',
        'Referer': 'https://www.youtube.com/'
    }, videoId);
}

main().catch(console.error);
