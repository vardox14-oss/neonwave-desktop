# 💻 Guide de l'Application NeonWave PC (Windows Desktop)

Ce dossier regroupe tout ce qui concerne la version PC de **NeonWave** (bâtie sur Electron + Node.js + Web UI).

---

## ⚡ 1. Lancement Rapide

- **Option A (Sans rien installer)** :
  Allez dans le dossier `Executables_Windows` et lancez **`NeonWave-1.5.0-Portable.exe`** ou installez **`NeonWave-Setup-1.5.0.exe`**.
- **Option B (Mode Développement / Code source)** :
  Double-cliquez sur **`DEMARRER_NEONWAVE_PC.bat`** (lance `npm start`).

---

## 🔄 2. Après avoir réinitialisé ou formaté votre PC

Si vous venez de réinstaller Windows :
1. Téléchargez et installez **Node.js LTS** (version 20 ou 22 recommandée) depuis : [https://nodejs.org](https://nodejs.org).
2. (Recommandé) Téléchargez et installez **Git** depuis : [https://git-scm.com](https://git-scm.com).
3. Ouvrez ce dossier et double-cliquez sur **`INSTALLER_DEPENDANCES_APRES_RESET.bat`** (il exécutera `npm install` et configurera tout automatiquement).
4. Lancez ensuite avec **`DEMARRER_NEONWAVE_PC.bat`** !

---

## 📂 3. Organisation du Code Source PC
- `../main.js` : Processus principal Electron (gestion des fenêtres, raccourcis, IPC natif).
- `../preload.js` : Pont sécurisé entre Electron et l'interface Web.
- `../src/` : Moteur de streaming, résolution musicale, gestion des métadonnées.
- `../public/` : Interface utilisateur (Player, Bibliothèque, Paroles synchronisées, Design CSS).
- `../package.json` : Configuration du projet et liste des dépendances.

---

## ☁️ 4. Dépôt GitHub PC
- **Dépôt GitHub Desktop** : [https://github.com/vardox14-oss/neonwave-desktop](https://github.com/vardox14-oss/neonwave-desktop)
- **Branche principale** : `main` (tous les commits sont synchronisés).
