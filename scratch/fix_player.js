const fs = require('fs');
let code = fs.readFileSync('public/js/player.js', 'utf8');

// 1. Inject navigator.mediaSession into updateNowPlaying
const targetUpdateStr = `            }
        });

        if (typeof Music !== 'undefined' && typeof Music.updateActiveTrackStyling === 'function') {
            Music.updateActiveTrackStyling(track.id);
        }`;

const replacementUpdateStr = `            }
        });

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist || 'Artiste inconnu',
                album: track.album || '',
                artwork: [
                    { src: track.thumb || track.thumbnail || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=512&h=512&fit=crop', sizes: '512x512', type: 'image/jpeg' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => { this.togglePlay(); });
            navigator.mediaSession.setActionHandler('pause', () => { this.togglePlay(); });
            navigator.mediaSession.setActionHandler('previoustrack', () => { this.prevTrack(); });
            navigator.mediaSession.setActionHandler('nexttrack', () => { this.nextTrack(); });
        }

        if (typeof Music !== 'undefined' && typeof Music.updateActiveTrackStyling === 'function') {
            Music.updateActiveTrackStyling(track.id);
        }`;

code = code.replace(targetUpdateStr, replacementUpdateStr);


// 2. Fix Lyrics Search params
const targetLyricsStr = `        const params = new URLSearchParams({
            title: track.title || '',
            artist: track.artist || ''
        });`;

const replacementLyricsStr = `        // Clean artist string and title for LRCLIB
        let cleanArtist = track.artist || '';
        if (cleanArtist.includes(', ')) cleanArtist = cleanArtist.split(', ')[0];
        if (cleanArtist.includes(' & ')) cleanArtist = cleanArtist.split(' & ')[0];
        if (cleanArtist === 'Artiste inconnu') cleanArtist = '';
        
        let cleanTitle = track.title || '';
        cleanTitle = cleanTitle.replace(/\\(feat\\..*?\\)/i, '').replace(/\\[.*?\\]/g, '').trim();

        const params = new URLSearchParams({
            title: cleanTitle,
            artist: cleanArtist
        });`;

code = code.replace(targetLyricsStr, replacementLyricsStr);


fs.writeFileSync('public/js/player.js', code);
console.log('Fixed player.js media session and lyrics');
