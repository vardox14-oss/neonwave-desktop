# Production Checklist

## Securite

- Aucun secret reel dans le depot.
- `JWT_SECRET` fort et specifique a chaque installation.
- Premier compte cree via `/api/setup/owner`.
- Mots de passe stockes en bcrypt.
- Cookies `httpOnly`.
- `npm audit` sans vulnerabilites connues.
- Renderer Electron avec `nodeIntegration: false`, `contextIsolation: true` et `sandbox: true`.

## Donnees

- Base runtime dans AppData, pas dans le dossier source.
- Ecriture atomique de la base.
- Sauvegarde locale `.bak` creee avant remplacement.
- Plan de sauvegarde externe si plusieurs utilisateurs dependent de l installation.

## Distribution

- Build via `npm run dist`.
- Installateur signe.
- `.env` non inclus dans l artefact final.
- Credentials Spotify injectes par environnement ou par configuration utilisateur.
- Strategy d auto-update definie avant publication.

## Produit

- Parcours testes : setup, login, inscription, playlists, likes, lecture, recherche, admin.
- Messages d erreur reseau lisibles.
- Accessibilite clavier verifiee.
- Droits/licences musicales clarifies avant toute diffusion publique.
