const NEW_APIS = [
    "https://pa.il.ax",
    "https://api.piped.privacydev.net",
    "https://pipedapi.palveluntarjoaja.eu",
    "https://pdapi.vern.cc",
    "https://api.piped.minionflo.net",
    "https://pipedapi.ngn.tf"
];

async function testSearch(baseUrl, query) {
    const res = await fetch(`${baseUrl}/search?q=${encodeURIComponent(query)}&filter=music_songs`, {
        signal: AbortSignal.timeout(3000)
    });
    if (res.status === 200) {
        const data = await res.json();
        if (data && Array.isArray(data.items) && data.items.length > 0) {
            return data;
        }
    }
    throw new Error(`Search failed: status=${res.status}`);
}

async function testStream(baseUrl, videoId) {
    const res = await fetch(`${baseUrl}/streams/${encodeURIComponent(videoId)}`, {
        signal: AbortSignal.timeout(3000)
    });
    if (res.status === 200) {
        const data = await res.json();
        if (data && Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
            return data;
        }
    }
    throw new Error(`Stream failed: status=${res.status}`);
}

async function run() {
    const query = "Distant Maes";
    const testVideoId = "C7cdnKXqKOU";
    
    for (const baseUrl of NEW_APIS) {
        console.log(`\nTesting ${baseUrl}...`);
        
        let searchOk = false;
        try {
            const searchData = await testSearch(baseUrl, query);
            console.log(`✅ Search OK: found ${searchData.items.length} items. First: ${searchData.items[0].title}`);
            searchOk = true;
        } catch (e) {
            console.log(`❌ Search failed: ${e.message}`);
        }
        
        let streamOk = false;
        try {
            const streamData = await testStream(baseUrl, testVideoId);
            console.log(`✅ Stream OK: found ${streamData.audioStreams.length} audio streams. Bitrate: ${streamData.audioStreams[0].bitrate}`);
            streamOk = true;
        } catch (e) {
            console.log(`❌ Stream failed: ${e.message}`);
        }
        
        if (searchOk && streamOk) {
            console.log(`🌟 FULLY WORKING PIPED INSTANCE: ${baseUrl}`);
        }
    }
}
run();
