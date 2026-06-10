const PIPED_INSTANCES = [
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.moomoo.me',
    'https://pipedapi.syncpundit.io',
    'https://pipedapi.rivo.lol',
    'https://pipedapi.leptons.xyz',
    'https://ytapi.dc09.ru',
    'https://pipedapi.colinslegacy.com',
    'https://yapi.vyper.me',
    'https://api.looleh.xyz',
    'https://piped-api.cfe.re',
    'https://pipedapi.r4fo.com'
];

async function tryPipedFetch(path) {
    for (const baseUrl of PIPED_INSTANCES) {
        try {
            console.log(`Trying ${baseUrl}${path}...`);
            const res = await fetch(`${baseUrl}${path}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
            });
            console.log(`Status: ${res.status}`);
            if (res.status === 200) {
                const data = await res.json();
                console.log(`Data keys: ${Object.keys(data)}`);
                if (data && (Array.isArray(data.items) || Array.isArray(data.audioStreams))) {
                    console.log(`Found operational instance: ${baseUrl}`);
                    return { baseUrl, data };
                }
            }
        } catch (err) {
            console.log(`Error on ${baseUrl}: ${err.message}`);
        }
    }
    return null;
}

async function test() {
    const query = "Distant Maes";
    const path = `/search?q=${encodeURIComponent(query)}&filter=music_songs`;
    const result = await tryPipedFetch(path);
    if (result) {
        console.log(`SUCCESS with ${result.baseUrl}`);
        console.log("Items:", result.data.items ? result.data.items.slice(0, 2) : "no items");
    } else {
        console.log("No working instance found.");
    }
}

test();
