# NeonWave Desktop

NeonWave est une application desktop Electron avec un serveur Express local, une interface web embarquee, des comptes utilisateurs, playlists, recommandations et integrations Spotify/YouTube.

## Demarrage local

```bash
npm install
npm start
```

Au premier lancement, NeonWave affiche un assistant de configuration pour creer le compte proprietaire. Aucun compte administrateur par defaut n est livre.

Pour lancer uniquement le serveur :

```bash
npm run server
```

## Configuration

Copier `.env.example` vers `.env` pour le developpement local. Les secrets reels ne doivent pas etre versionnes.

Variables utiles :

- `PORT` : port du serveur local, par defaut `5000`.
- `JWT_SECRET` : optionnel ; si absent ou trop faible, NeonWave genere un secret fort.
- `ALLOW_PUBLIC_REGISTRATION` : `true` ou `false`.
- `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET` : optionnels, activent les fonctions Spotify.
- `DISCORD_CLIENT_ID` : optionnel, remplace le client Discord par defaut.

## Donnees

En desktop, la base est stockee dans le dossier AppData de l application. En mode serveur local, elle est stockee dans `data/database.json`. Les ecritures sont atomiques et une sauvegarde `.bak` est maintenue automatiquement.

Le fichier `src/database.json` fourni dans la source est volontairement vide : il sert uniquement a declencher l assistant de premiere installation.

## Tests

```bash
npm test
npm audit
```

## Build Windows

```bash
npm run dist
```

Les artefacts sont generes dans `release/`.

## Avant distribution publique

- Configurer les credentials Spotify personnels dans l environnement de build.
- Verifier les droits/licences de diffusion musicale selon le mode de distribution.
- Signer l installateur Windows avec un certificat de code signing.
- Ajouter une strategie de mise a jour automatique avec un serveur de publication.
- Brancher un service de crash reports si l application est diffusee hors usage prive.
