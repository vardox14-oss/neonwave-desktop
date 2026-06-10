async function test() {
    try {
        console.log("Fetching summary.json...");
        const res = await fetch("https://raw.githubusercontent.com/TeamPiped/piped-uptime/master/history/summary.json");
        const data = await res.json();
        console.log("Monitored sites count:", data.length);
        
        // Filter sites that are status: "up"
        const upSites = data.filter(site => site.status === "up");
        console.log("Active 'up' sites count:", upSites.length);
        
        upSites.forEach(site => {
            console.log(`Name: ${site.name}, Status: ${site.status}, Uptime: ${site.uptime}, URL: ${site.url}`);
        });
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
