# Serveur public NeonWave iPhone

Ce déploiement lance le serveur Node directement, sans Electron, derrière Caddy et HTTPS automatique. `APP_STORE_MODE=true` ferme les routes Spotify, YouTube, Canvas et conversion média. Le serveur public conserve uniquement les comptes, l'authentification et les fichiers audio personnels des utilisateurs.

## Installation sur un VPS Ubuntu

1. Installer Docker Engine et le plugin Docker Compose.
2. Pointer un domaine, par exemple `api.neonwave.fr`, vers l'adresse IPv4 du VPS.
3. Copier le dépôt sur le VPS, puis depuis `deploy/` copier `.env.production.example` vers `.env.production`.
4. Remplacer toutes les valeurs d'exemple. Générer les deux secrets avec `openssl rand -hex 32`.
5. Lancer `docker compose --env-file .env.production up -d --build`.
6. Vérifier `https://VOTRE_DOMAINE/api/health`. La réponse doit contenir `"appStoreMode":true`.

Le volume `neonwave_data` contient la base et les fichiers personnels. Il doit être sauvegardé régulièrement et ne doit jamais être publié dans Git. Le service redémarre automatiquement après un redémarrage du VPS.

Après achat du compte Apple Developer, renseigner les identifiants Apple/Google, activer MusicKit et Sign in with Apple pour le Bundle ID, puis utiliser ce domaine dans `ios/Local.xcconfig`.
