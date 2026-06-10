async function test() {
    try {
        console.log("Fetching instances.cobalt.best...");
        const res = await fetch("https://instances.cobalt.best/");
        const text = await res.text();
        console.log("Length:", text.length);
        console.log("Snippet:", text.substring(0, 1000));
        
        // Find domains
        const domains = text.match(/[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];
        console.log("Unique domain matches in text:", Array.from(new Set(domains)).slice(0, 50));
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
