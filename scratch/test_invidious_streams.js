async function test() {
    try {
        const res = await fetch("https://api.invidious.io/instances.json");
        const data = await res.json();
        const instances = data
            .filter(item => {
                const inst = item[1];
                return inst && inst.type === "https" && inst.monitor && inst.monitor.down === false;
            })
            .map(item => item[1].uri);
            
        const videoId = 'C7cdnKXqKOU';
        for (const uri of instances) {
            try {
                console.log(`Fetching streams from Invidious: ${uri}/api/v1/streams/${videoId}...`);
                const streamRes = await fetch(`${uri}/api/v1/streams/${videoId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(3000)
                });
                console.log(`Status on ${uri}: ${streamRes.status}`);
                if (streamRes.status === 200) {
                    const streamData = await streamRes.json();
                    console.log(`Success on ${uri}! adaptiveFormats:`, streamData.adaptiveFormats?.length);
                    if (streamData.adaptiveFormats) {
                        const audio = streamData.adaptiveFormats.filter(f => f.type.startsWith("audio/"));
                        if (audio.length > 0) {
                            console.log("Audio stream URL:", audio[0].url);
                            break;
                        }
                    }
                }
            } catch (err) {
                console.log(`Error on ${uri}:`, err.message);
            }
        }
    } catch (e) {
        console.log("Global error:", e.message);
    }
}
test();
