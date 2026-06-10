async function tryInvidiousFetch(query) {
    try {
        console.log("Fetching instances...");
        const res = await fetch("https://api.invidious.io/instances.json");
        const data = await res.json();
        
        const instances = data
            .filter(item => {
                const inst = item[1];
                return inst && inst.type === "https" && inst.monitor && inst.monitor.down === false;
            })
            .map(item => item[1].uri)
            .sort(() => Math.random() - 0.5); // Shuffle
            
        console.log("Shuffled instances:", instances);
        
        for (const uri of instances.slice(0, 5)) {
            try {
                console.log(`Trying search on ${uri}...`);
                const searchRes = await fetch(`${uri}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' },
                    signal: AbortSignal.timeout(3000) // Timeout after 3 seconds
                });
                if (searchRes.status === 200) {
                    const searchData = await searchRes.json();
                    const items = searchData.items || searchData;
                    if (Array.isArray(items) && items.length > 0) {
                        const best = items[0];
                        return {
                            videoId: best.videoId,
                            title: best.title,
                            artist: best.author || best.authorName || '',
                            duration: best.lengthSeconds || 180
                        };
                    }
                }
            } catch (err) {
                console.log(`Failed on ${uri}:`, err.message);
            }
        }
    } catch (e) {
        console.log("Global Invidious error:", e.message);
    }
    return null;
}

async function test() {
    const start = Date.now();
    const result = await tryInvidiousFetch("Distant Maes");
    console.log("Time taken:", Date.now() - start, "ms");
    console.log("Result:", result);
}
test();
