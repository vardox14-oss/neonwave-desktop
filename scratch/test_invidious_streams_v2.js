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
                console.log(`\nTesting ${uri}...`);
                const streamRes = await fetch(`${uri}/api/v1/streams/${videoId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' },
                    signal: AbortSignal.timeout(4000)
                });
                console.log(`Status: ${streamRes.status}`);
                const text = await streamRes.text();
                console.log(`Length: ${text.length}`);
                console.log(`Snippet: ${text.substring(0, 300)}`);
            } catch (err) {
                console.log(`Error on ${uri}:`, err.message);
            }
        }
    } catch (e) {
        console.log("Global error:", e.message);
    }
}
test();
