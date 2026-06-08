const instances = [
    'https://api.piped.video',
    'https://pipedapi.oxk.io',
    'https://pipedapi.leptons.xyz',
    'https://api.piped.yt',
    'https://piped-api.lunar.icu',
    'https://pipedapi.col7.it',
    'https://piped-api.garudalinux.org',
    'https://api.piped.cre.re'
];

async function testInstances() {
    const videoId = 'dQw4w9WgXcQ'; // Rickroll
    for (const instance of instances) {
        try {
            console.log(`Testing: ${instance}...`);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(`${instance}/streams/${videoId}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) {
                console.log(`FAIL: ${instance} => status ${res.status}`);
                continue;
            }
            const data = await res.json();
            const audioStreams = data.audioStreams || [];
            if (audioStreams.length > 0) {
                console.log(`OK: ${instance} => ${audioStreams.length} audio streams`);
                console.log(`  Sample URL: ${audioStreams[0].url.substring(0, 100)}...`);
            } else {
                console.log(`WARN: ${instance} => responded but 0 audio streams.`);
            }
        } catch (err) {
            console.log(`FAIL: ${instance} => ${err.message}`);
        }
    }
}

testInstances();
