/**
 * NeonWave Premium UX Extras
 * Handles Audio Visualizer and Lyrics Synchronization
 */

const UXExtras = {
    visualizer: null,
    lyrics: null,

    init() {
        this.visualizer = new AudioVisualizer('audioVisualizer');
        // Disabled simulated lyrics in favor of Player's real LRCLIB lyrics loader
        this.lyrics = null;
    },

    onTrackChange(track) {
        // Do nothing, handled by Player
    }
};

class AudioVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        
        // Since we are using YouTube IFrame, we can't easily get the audio stream for the AnalyserNode
        // due to CORS and IFrame restrictions. 
        // We will implement a "Simulated" visualizer that reacts to the playback state
        // providing a premium feel without the technical limitations of IFrame audio extraction.
    }

    start() {
        if (this.animationId) return;
        this.animate();
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        if (!this.ctx) return;
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);
        
        const barCount = 12;
        const barWidth = (width / barCount) - 2;
        const time = Date.now() * 0.005;

        for (let i = 0; i < barCount; i++) {
            // Simulated frequency height
            const targetHeight = Math.sin(time + i * 0.5) * (height * 0.4) + (height * 0.5);
            const noise = Math.random() * 5;
            const h = Math.max(4, targetHeight + noise);
            
            const x = i * (barWidth + 2);
            const y = height - h;
            
            // Gradient
            const grad = this.ctx.createLinearGradient(0, y, 0, height);
            grad.addColorStop(0, '#4f8cff');
            grad.addColorStop(1, '#1ed760');
            
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, barWidth, h, 2);
            this.ctx.fill();
        }
    }
}

class LyricsManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentLyrics = [];
    }

    async loadLyrics(track) {
        if (!this.container) return;
        this.container.innerHTML = '<p class="loading">Recherche des paroles...</p>';
        
        try {
            // Simulated sync lyrics for the "Karaoke" feel
            // In a real app, this would fetch from a lyrics API (e.g., Musixmatch, Genius)
            // For the demo, we generate some "vibe" lyrics if not found
            const lyrics = await this.fetchSimulatedLyrics(track);
            this.renderLyrics(lyrics);
        } catch (e) {
            this.container.innerHTML = '<p>Paroles non disponibles pour ce titre.</p>';
        }
    }

    async fetchSimulatedLyrics(track) {
        // Mocking a delay
        await new Promise(r => setTimeout(r, 800));
        
        // Example synced lyrics format
        return [
            { time: 0, text: "♪ (Musique)" },
            { time: 5, text: `Vous écoutez ${track.title}` },
            { time: 10, text: `Par ${track.artist}` },
            { time: 15, text: "NeonWave — L'expérience Premium" },
            { time: 20, text: "Laisse la musique couler dans tes veines" },
            { time: 25, text: "Chaque note, chaque battement..." },
            { time: 30, text: "Le rythme de la nuit nous emporte" },
            { time: 35, text: "♪ (Solo de synthé)" },
            { time: 45, text: "Redécouvrez vos classiques" },
            { time: 50, text: "NeonWave, plus qu'un simple lecteur" }
        ];
    }

    renderLyrics(lyrics) {
        this.currentLyrics = lyrics;
        this.container.innerHTML = lyrics.map((l, i) => `
            <p id="lyric-${i}" data-time="${l.time}">${l.text}</p>
        `).join('');
        
        // Start tracking time to highlight
        this.startTimeTracking();
    }

    startTimeTracking() {
        if (this.trackerInterval) clearInterval(this.trackerInterval);
        
        this.trackerInterval = setInterval(() => {
            if (typeof Player === 'undefined' || !Player.ytPlayer) return;
            const currentTime = Player.ytPlayer.getCurrentTime();
            
            let activeIndex = -1;
            this.currentLyrics.forEach((l, i) => {
                if (currentTime >= l.time) activeIndex = i;
            });

            if (activeIndex !== -1) {
                const el = document.getElementById(`lyric-${activeIndex}`);
                if (el && !el.classList.contains('active')) {
                    document.querySelectorAll('.np-lyrics-content p').forEach(p => p.classList.remove('active'));
                    el.classList.add('active');
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 500);
    }
}

// Global hooks for Player
const originalSetPlaying = Player.setPlaying;
Player.setPlaying = function(playing, ...args) {
    originalSetPlaying.call(this, playing, ...args);
    if (playing) {
        UXExtras.visualizer?.start();
    } else {
        UXExtras.visualizer?.stop();
    }
};

window.addEventListener('DOMContentLoaded', () => UXExtras.init());
