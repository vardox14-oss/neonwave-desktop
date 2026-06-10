async function test() {
    const baseUrl = "https://api.piped.private.coffee";
    try {
        console.log("Testing search...");
        const res = await fetch(`${baseUrl}/search?q=Distant%20Maes&filter=music_songs`);
        console.log("Search status:", res.status);
        const data = await res.json();
        console.log("Search keys:", Object.keys(data));
        console.log("Search items length:", data.items?.length);
        if (data.items) console.log("First search item:", data.items[0]);
    } catch (e) {
        console.log("Search error:", e.message);
    }
    
    try {
        console.log("\nTesting streams...");
        const res = await fetch(`${baseUrl}/streams/C7cdnKXqKOU`);
        console.log("Stream status:", res.status);
        const data = await res.json();
        console.log("Stream keys:", Object.keys(data));
        console.log("audioStreams length:", data.audioStreams?.length);
        if (data.audioStreams) console.log("First stream:", data.audioStreams[0]);
    } catch (e) {
        console.log("Stream error:", e.message);
    }
}
test();
