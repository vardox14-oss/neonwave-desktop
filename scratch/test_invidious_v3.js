async function test() {
    try {
        console.log("Fetching api.invidious.io/instances.json...");
        const res = await fetch("https://api.invidious.io/instances.json");
        const data = await res.json();
        
        const instances = data
            .filter(item => {
                const inst = item[1];
                return inst && inst.type === "https" && inst.monitor && inst.monitor.down === false;
            })
            .map(item => item[1].uri);
            
        console.log("HTTPS Instances to test:", instances);
        
        const query = "Distant Maes";
        for (const uri of instances) {
            try {
                console.log(`Searching on ${uri}...`);
                const searchRes = await fetch(`${uri}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
                });
                console.log(`Status on ${uri}: ${searchRes.status}`);
                if (searchRes.status === 200) {
                    const searchData = await searchRes.json();
                    console.log(`Results count on ${uri}:`, searchData.length || (searchData.items ? searchData.items.length : 0));
                    if (searchData && (searchData.length > 0 || searchData.items?.length > 0)) {
                        const items = searchData.items || searchData;
                        console.log("First item:", {
                            title: items[0].title,
                            videoId: items[0].videoId,
                            author: items[0].author
                        });
                        console.log(`SUCCESS WITH INSTANCE: ${uri}`);
                        break;
                    }
                }
            } catch (err) {
                console.log(`Error on instance ${uri}:`, err.message);
            }
        }
    } catch (err) {
        console.log("Error in test:", err.message);
    }
}
test();
