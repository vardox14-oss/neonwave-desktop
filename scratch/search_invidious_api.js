async function test() {
    try {
        const res = await fetch("https://api.invidious.io/");
        const text = await res.text();
        const matches = text.match(/href="([^"]+)"/g) || [];
        console.log("Matches:", matches);
        
        // Check for json substring
        const jsonLinks = matches.filter(m => m.toLowerCase().includes("json"));
        console.log("JSON Links:", jsonLinks);
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
