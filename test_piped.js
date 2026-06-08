const instances = [
    'https://inv.nadeko.net',
    'https://invidious.fdn.fr',
    'https://invidious.protokolla.fi',
    'https://iv.ggtyler.dev',
    'https://invidious.privacyredirect.com',
    'https://iv.nbooo.de',
    'https://invidious.lunar.icu',
    'https://yt.cdaut.de',
    'https://invidious.materialio.us',
    'https://yewtu.be'
];

async function testInstances() {
    const videoId = 'dQw4w9WgXcQ';
    for (const instance of instances) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`${instance}/api/v1/videos/${videoId}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) { console.log(`FAIL: ${instance} => status ${res.status}`); continue; }
            const data = await res.json();
            const formats = (data.adaptiveFormats || []).filter(f => f.type && f.type.startsWith('audio/'));
            if (formats.length > 0) {
                console.log(`OK: ${instance} => ${formats.length} audio formats`);
                const first = formats[0];
                console.log(`  Sample: type=${first.type}, bitrate=${first.bitrate}, encoding=${first.encoding}`);
                console.log(`  URL prefix: ${(first.url || '').substring(0, 120)}...`);
            } else {
                console.log(`WARN: ${instance} => responded but 0 audio formats. Keys: ${Object.keys(data).join(', ')}`);
            }
        } catch (err) {
            console.log(`FAIL: ${instance} => ${err.message}`);
        }
    }
}

testInstances();
