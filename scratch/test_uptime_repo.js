async function test() {
    try {
        const res = await fetch("https://raw.githubusercontent.com/TeamPiped/piped-uptime/master/.upptimerc.yml");
        const text = await res.text();
        console.log(text);
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
