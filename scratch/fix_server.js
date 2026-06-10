const fs = require('fs');
const lines = fs.readFileSync('src/server.js', 'utf8').split('\n');

const start = 3379;
const end = 3453;

const replacement = `app.get('/api/music/streams/:id', authenticate, async (req, res) => {
    const videoId = req.params.id;
    console.log(\`🎵 Stream request for: \${videoId}\`);

    const db = getDB();
    const p = db.users.map(u => u.history).flat().find(h => h?.videoId === videoId);
    if (p) trackUserHistory(req.user.id, p);

    try {
        const instancesRes = await fetch('https://api.invidious.io/instances.json?sort_by=health');
        if (instancesRes.ok) {
            const instances = await instancesRes.json();
            const urls = instances
                .filter(i => i[1].api === true && i[1].type === 'https' && i[1].cors === true)
                .map(i => i[1].uri);
            
            for (const url of urls.slice(0, 5)) {
                try {
                    const testRes = await fetch(\`\${url}/api/v1/videos/\${videoId}\`);
                    if (testRes.ok) {
                        const data = await testRes.json();
                        if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
                            const audio = data.adaptiveFormats.find(f => f.type.startsWith('audio/mp4')) || data.adaptiveFormats.find(f => f.type.startsWith('audio'));
                            if (audio && audio.url) {
                                return res.redirect(307, audio.url);
                            }
                        }
                    }
                } catch (e) {}
            }
        }
    } catch (err) {
        console.error('Invidious fetch error:', err);
    }
    
    try {
        const testRes = await fetch(\`https://inv.thepixora.com/api/v1/videos/\${videoId}\`);
        if (testRes.ok) {
            const data = await testRes.json();
            if (data.adaptiveFormats) {
                const audio = data.adaptiveFormats.find(f => f.type.startsWith('audio/mp4')) || data.adaptiveFormats.find(f => f.type.startsWith('audio'));
                if (audio && audio.url) return res.redirect(307, audio.url);
            }
        }
    } catch (e) {}

    res.status(404).json({ error: 'Aucun flux audio disponible.' });
});`;

const newLines = [...lines.slice(0, start), replacement, ...lines.slice(end)];
fs.writeFileSync('src/server.js', newLines.join('\n'));
console.log('Replaced successfully');
