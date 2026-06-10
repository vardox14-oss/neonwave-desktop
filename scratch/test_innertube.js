// Test InnerTube API (YouTube's internal API)
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_CLIENT = {
    clientName: 'WEB',
    clientVersion: '2.20240530.02.00',
    hl: 'fr',
    gl: 'FR'
};

async function searchYouTube(query) {
    const url = `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_API_KEY}`;
    const body = {
        context: { client: INNERTUBE_CLIENT },
        query: query,
        params: 'EgIQAQ%3D%3D' // music filter
    };
    
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Origin': 'https://www.youtube.com',
            'Referer': 'https://www.youtube.com/'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
    });
    
    console.log('Search status:', res.status);
    const data = await res.json();
    
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const items = [];
    
    for (const section of contents) {
        const sectionContents = section?.itemSectionRenderer?.contents || [];
        for (const item of sectionContents) {
            if (item.videoRenderer) {
                const v = item.videoRenderer;
                if (!v.videoId) continue;
                
                const durationText = v.lengthText?.simpleText || '0:00';
                const parts = durationText.split(':').map(Number);
                let dur = 0;
                if (parts.length === 3) dur = parts[0]*3600 + parts[1]*60 + parts[2];
                else if (parts.length === 2) dur = parts[0]*60 + parts[1];
                
                items.push({
                    title: v.title?.runs?.[0]?.text || 'Untitled',
                    videoId: v.videoId,
                    uploaderName: v.ownerText?.runs?.[0]?.text || 'Unknown',
                    duration: dur,
                    thumbnail: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || ''
                });
            }
        }
    }
    
    return items;
}

async function getVideoStreams(videoId) {
    // Use ANDROID client for better stream access
    const url = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`;
    const body = {
        context: {
            client: {
                clientName: 'ANDROID',
                clientVersion: '19.09.37',
                androidSdkVersion: 30,
                hl: 'fr',
                gl: 'FR'
            }
        },
        videoId: videoId,
        playbackContext: {
            contentPlaybackContext: {
                signatureTimestamp: 20073
            }
        }
    };
    
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
            'X-YouTube-Client-Name': '3',
            'X-YouTube-Client-Version': '19.09.37'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
    });
    
    console.log('Player status:', res.status);
    const data = await res.json();
    
    if (data.playabilityStatus?.status !== 'OK') {
        console.log('Playability:', data.playabilityStatus?.status, data.playabilityStatus?.reason);
        return null;
    }
    
    const formats = data.streamingData?.adaptiveFormats || [];
    const audioStreams = formats.filter(f => f.mimeType?.includes('audio'));
    
    return {
        title: data.videoDetails?.title,
        author: data.videoDetails?.author,
        audioStreams: audioStreams.map(s => ({
            type: s.mimeType,
            bitrate: s.bitrate,
            url: s.url,
            contentLength: s.contentLength
        }))
    };
}

async function main() {
    console.log('=== Testing InnerTube Search ===');
    const results = await searchYouTube('daft punk get lucky audio');
    console.log(`Found ${results.length} results:`);
    results.slice(0, 3).forEach(r => {
        console.log(`  ${r.videoId} - ${r.title} (${r.uploaderName}) [${r.duration}s]`);
    });
    
    if (results.length > 0) {
        console.log('\n=== Testing InnerTube Streams ===');
        const streams = await getVideoStreams(results[0].videoId);
        if (streams) {
            console.log(`Title: ${streams.title}`);
            console.log(`Audio streams: ${streams.audioStreams.length}`);
            streams.audioStreams.forEach(s => {
                console.log(`  ${s.type} - ${s.bitrate}bps - URL: ${s.url?.slice(0, 80)}...`);
            });
        }
    }
}

main().catch(console.error);
