async function test() {
    const videoId = "C7cdnKXqKOU";
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    try {
        console.log("Requesting from api.cobalt.tools...");
        const res = await fetch("https://api.cobalt.tools/", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            },
            body: JSON.stringify({
                url: url,
                downloadMode: "audio",
                audioFormat: "mp3",
                audioBitrate: "128"
            })
        });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response text length:", text.length);
        console.log("Response:", text);
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
