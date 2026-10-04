# 🌐 Serveur Relais VPS & Backend NeonWave

Ce document consigne les informations techniques nécessaires pour se reconnecter au serveur distant après avoir réinitialisé votre PC.

---

## 🖥️ 1. Connexion SSH au VPS

- **Adresse IP du serveur** : `51.77.159.172`
- **Port SSH** : `22`
- **Utilisateur** : `debian`
- **Mot de passe** : `tzgzewxhAAK4mqT806XH`

### Se connecter depuis un terminal Windows (PowerShell / CMD) :
```bash
ssh debian@51.77.159.172
# Entrez ensuite le mot de passe quand demandé.
```

---

## ⚙️ 2. Gestion du Service Node.js (PM2) sur le VPS

Le serveur tourne en continu sous **PM2** (Process Manager 2).
Commandes utiles une fois connecté en SSH :
```bash
# Vérifier l'état du serveur :
pm2 status

# Consulter les logs en direct :
pm2 logs neonwave

# Redémarrer le serveur :
pm2 restart neonwave

# Consulter les 50 dernières erreurs :
pm2 logs neonwave --err --lines 50 --nostream
```

---

## 🔗 3. URL de l'API & Domaine

- **Base URL API** : `https://51.77.159.172.sslip.io`
- **Résolution métadonnées** : `https://51.77.159.172.sslip.io/api/music/resolve-by-metadata`
- **Dossier du code sur le VPS** : `/home/debian/neonwave`
