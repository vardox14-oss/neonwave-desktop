const { spawn } = require('child_process');

function testStream(videoId) {
    console.log(`Spawning yt-dlp to stream audio for: ${videoId}`);
    const child = spawn('python', ['-m', 'yt_dlp', '-o', '-', '-f', 'bestaudio', videoId]);
    
    let bytesCount = 0;
    child.stdout.on('data', (chunk) => {
        bytesCount += chunk.length;
        if (bytesCount < 50000) {
            console.log(`  -> Received chunk: ${chunk.length} bytes. Total: ${bytesCount}`);
        }
    });

    child.stderr.on('data', (data) => {
        // Log warnings/errors
        const msg = data.toString();
        if (msg.includes('ERROR') || msg.includes('WARNING')) {
            console.log(`  -> Stderr: ${msg.trim()}`);
        }
    });

    child.on('close', (code) => {
        console.log(`  -> Process exited with code ${code}. Total bytes received: ${bytesCount}`);
    });
}

testStream('J05Ww73KlLE');
