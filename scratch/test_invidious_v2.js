async function test() {
    try {
        console.log("Fetching instances.invidious.io...");
        const res = await fetch("https://instances.invidious.io/");
        const text = await res.text();
        console.log("Response text length:", text.length);
        console.log("First 500 chars:", text.substring(0, 500));
        
        try {
            const data = JSON.parse(text);
            console.log("Keys:", Object.keys(data));
        } catch (e) {
            console.log("Not JSON:", e.message);
        }
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
