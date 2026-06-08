const express = require('express');
const { authenticate, checkSubscription } = require('../middleware/auth');

const router = express.Router();

// All music routes require auth + valid subscription
router.use(authenticate, checkSubscription);

const PIPED_API = 'https://pipedapi.kavin.rocks';

// GET /api/music/search?q=query
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Paramètre de recherche requis.' });
    }

    const response = await fetch(
      `${PIPED_API}/search?q=${encodeURIComponent(q)}&filter=music_videos`
    );

    if (!response.ok) {
      throw new Error(`Piped API responded with ${response.status}`);
    }

    const data = await response.json();
    
    // Map results to a clean format
    const results = (data.items || []).map((item) => ({
      videoId: item.url?.replace('/watch?v=', '') || '',
      title: item.title || 'Sans titre',
      artist: item.uploaderName || 'Artiste inconnu',
      thumbnail: item.thumbnail || '',
      duration: item.duration || 0,
      views: item.views || 0,
      uploadedDate: item.uploadedDate || '',
    }));

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche.' });
  }
});

// GET /api/music/streams/:videoId
router.get('/streams/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    const response = await fetch(`${PIPED_API}/streams/${videoId}`);

    if (!response.ok) {
      throw new Error(`Piped API responded with ${response.status}`);
    }

    const data = await response.json();

    // Extract audio streams (prefer m4a/opus)
    const audioStreams = (data.audioStreams || [])
      .filter((s) => s.mimeType?.includes('audio'))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    const bestAudio = audioStreams[0] || null;

    res.json({
      title: data.title || 'Sans titre',
      artist: data.uploader || 'Artiste inconnu',
      thumbnail: data.thumbnailUrl || '',
      duration: data.duration || 0,
      audioUrl: bestAudio?.url || null,
      audioMimeType: bestAudio?.mimeType || null,
      audioStreams: audioStreams.map((s) => ({
        url: s.url,
        mimeType: s.mimeType,
        bitrate: s.bitrate,
        quality: s.quality,
      })),
    });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du flux.' });
  }
});

module.exports = router;
