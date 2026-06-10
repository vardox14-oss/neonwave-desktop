async function test() {
    try {
        console.log("Fetching api.invidious.io...");
        const res = await fetch("https://api.invidious.io/");
        const text = await res.text();
        console.log("Response text length:", text.length);
        console.log("First 500 characters:", text.substring(0, 500));
        
        // Let's try to parse if it's JSON
        try {
            const data = JSON.parse(text);
            console.log("Is array:", Array.isArray(data));
            console.log("First item:", data[0]);
        } catch (e) {
            console.log("Failed to parse as JSON:", e.message);
        }
    } catch (err) {
        console.log("Error:", err.message);
    }
}
test();
