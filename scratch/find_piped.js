async function test() {
    try {
        console.log("Fetching status.piped.video...");
        const res = await fetch("https://status.piped.video/");
        const text = await res.text();
        console.log("Length:", text.length);
        console.log("Snippet:", text.substring(0, 1000));
        
        // Find domains
        const domains = text.match(/[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];
        console.log("Unique domain matches in text:", Array.from(new Set(domains)).slice(0, 30));
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
