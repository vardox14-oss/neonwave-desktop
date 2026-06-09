-- Migration d'initialisation de NeonWave

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    banned INTEGER NOT NULL DEFAULT 0,
    music_onboarding_completed INTEGER NOT NULL DEFAULT 0,
    music_preferences TEXT DEFAULT '{}',
    followed_artists TEXT DEFAULT '[]',
    music_preferences_updated_at TEXT,
    favorites TEXT DEFAULT '[]',
    liked_tracks TEXT DEFAULT '[]',
    history TEXT DEFAULT '[]',
    recently_played TEXT DEFAULT '[]',
    local_tracks TEXT DEFAULT '[]',
    shared_playlists TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    tracks TEXT DEFAULT '[]',
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insérer les paramètres par défaut
INSERT OR IGNORE INTO settings (key, value) VALUES ('banned_ips', '[]');
INSERT OR IGNORE INTO settings (key, value) VALUES ('setup_completed', 'false');
