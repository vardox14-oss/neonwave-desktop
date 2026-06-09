# NeonWave sur iPhone en PWA

Objectif: installation 100% gratuite, sans Mac, sans App Store et sans compte Apple Developer payant.

## Ce que l'iPhone installe

L'iPhone n'installe pas un IPA dans ce mode. Il installe la PWA depuis Safari:

1. Ouvre l'URL NeonWave HTTPS sur iPhone.
2. Touche le bouton Partager de Safari.
3. Choisis `Ajouter a l'ecran d'accueil`.
4. Ouvre NeonWave depuis l'icone.

NeonWave s'ouvre alors en plein ecran avec l'icone, le splash screen et le player adapte iPhone.

## Deploiement gratuit conseille

- `Cloudflare Pages` sert les fichiers de `public/`.
- `Cloudflare Workers` sert les routes `/api/*`.
- `Cloudflare D1` stocke les comptes, playlists, likes, historique et preferences.
- `Cloudflare R2` stocke les sons perso si tu actives l'import de fichiers.

Pour que l'app iPhone et Electron utilisent les memes donnees, garde les appels API en meme origine:

```text
https://neonwave.example.pages.dev/        -> Pages/PWA
https://neonwave.example.pages.dev/api/*   -> Worker API
```

Comme ca, les cookies de session restent simples et l'app desktop peut aussi charger cette URL Cloudflare.

## Notes importantes

- La PWA doit etre servie en HTTPS pour installer le service worker.
- Le mode audio iPhone utilise le stream `/api/music/streams/:id` via un vrai element audio.
- Les controles ecran verrouille/casque passent par Media Session quand iOS les expose.
- iOS peut encore couper certains streams si le reseau tombe ou si le serveur n'est pas disponible.
