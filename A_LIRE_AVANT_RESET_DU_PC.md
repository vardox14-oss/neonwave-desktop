# 🛡️ GUIDE DE SAUVEGARDE ET RESTAURATION AVANT LE RESET DU PC

Ce document vous guide pas-à-pas pour **sauvegarder** l'intégralité de vos projets NeonWave (PC et iOS) avant de réinitialiser / formater Windows, et pour **tout remettre en route** en quelques minutes après.

---

## ☁️ 1. Bonne nouvelle : Vos projets sont DÉJÀ sécurisés sur GitHub dans le Cloud !

Même si vous effacez complètement votre disque dur maintenant, **aucun code n'est perdu** car tout est synchronisé en ligne :

1. **Version PC (Desktop & Backend)** :  
   👉 **Dépôt GitHub** : [https://github.com/vardox14-oss/neonwave-desktop](https://github.com/vardox14-oss/neonwave-desktop)  
   - Branche : `main`
   - Statut : **100% à jour** (tous les commits, y compris les derniers correctifs d'InnerTube et de l'interface, sont envoyés).

2. **Version iOS (Swift & Xcode)** :  
   👉 **Dépôt GitHub** : [https://github.com/vardox14-oss/neonwave-ios](https://github.com/vardox14-oss/neonwave-ios)  
   - Branche : `codex/ios-browser-preview`
   - Statut : **100% à jour** (synchronisé avec les animations Spicy Lyrics, le lecteur AVPlayer natif et les boutons bleus).

3. **Serveur VPS distant** :  
   Le serveur en ligne `51.77.159.172` tourne de manière totalement autonome dans un datacenter. Rien ne sera impacté par le reset de votre PC local.

---

## 💾 2. Que copier sur votre Clé USB / Disque externe avant de formater ?

Pour un redémarrage instantané sans devoir tout retélécharger, copiez sur votre clé USB :

1. **Le dossier entier `app_unpacked`**  
   *(Contient les dossiers triés `📱_VERSION_IOS` et `💻_VERSION_PC`, les exécutables `.exe`, et le fichier `.ipa`).*
2. **Le fichier `NeonWave.ipa`**  
   *(Également présent sur votre Bureau et dans le dossier `📱_VERSION_IOS/NeonWave_v105_DERNIER_BUILD.ipa`). Mettez-le aussi sur votre Google Drive / iCloud pour l'avoir sous la main depuis votre iPhone.*
3. **Le fichier `cookies.txt`**  
   *(Présent sur votre Bureau, utile pour YouTube si besoin).*

---

## 📂 3. Organisation des Dossiers Triés

Le dossier est désormais structuré de manière limpide :

```text
app_unpacked/
│
├── 📱_VERSION_IOS/                        <-- TOUT CE QUI CONCERNE L'IPHONE
│   ├── NeonWave_v105_DERNIER_BUILD.ipa    <-- Le tout dernier IPA prêt à être installé
│   ├── NeonWave.ipa                       <-- Copie directe pour Sideloadly / TrollStore
│   ├── GUIDE_INSTALLATION_IPHONE.md       <-- Tutoriel complet d'installation sur iPhone
│   ├── PUSH_ET_COMPILER_IOS.bat           <-- Script 1-clic pour compiler un nouvel IPA
│   ├── Anciens_Builds_IPA/                <-- Archives des anciennes versions d'IPA
│   └── Scripts_Compilation_CI/            <-- Scripts de synchronisation et de build
│
├── 💻_VERSION_PC/                         <-- TOUT CE QUI CONCERNE LE PC WINDOWS
│   ├── DEMARRER_NEONWAVE_PC.bat           <-- Double-clic pour lancer l'application PC
│   ├── INSTALLER_DEPENDANCES_APRES_RESET.bat <-- Lance l'installation auto après reset
│   ├── GUIDE_UTILISATION_PC.md            <-- Guide d'utilisation PC
│   └── Executables_Windows/               <-- Installateur et version portable .EXE
│       ├── NeonWave-Setup-1.5.0.exe
│       └── NeonWave-1.5.0-Portable.exe
│
├── 🌐_SERVEUR_ET_VPS/                     <-- ACCÈS SERVEUR & CONFIGURATIONS
│   └── ACCES_ET_CONFIGURATION_SERVEUR.md  <-- Identifiants SSH et commandes PM2
│
├── ios/                                   <-- Projet Xcode et code source Swift complet
├── src/ & public/                         <-- Code source Electron & Web du player PC
├── package.json & main.js                 <-- Configuration du projet PC
└── A_LIRE_AVANT_RESET_DU_PC.md            <-- Ce guide
```

---

## 🔄 4. Comment tout remettre en marche après le Reset de Windows ?

Une fois que votre PC a été réinitialisé et que vous êtes sur un Windows tout propre :

1. **Installez les deux outils de base** :
   - **Node.js LTS** : Téléchargez et installez depuis [https://nodejs.org](https://nodejs.org) *(Suivez l'installateur par défaut).*
   - **Git** : Téléchargez et installez depuis [https://git-scm.com](https://git-scm.com) *(Facultatif mais très recommandé).*

2. **Copiez le dossier `app_unpacked` depuis votre clé USB** sur votre Bureau ou dans votre dossier utilisateur.

3. **Dans le dossier `💻_VERSION_PC/`** :
   - Double-cliquez sur **`INSTALLER_DEPENDANCES_APRES_RESET.bat`**.
   - Le script va réinstaller automatiquement tous les modules nécessaires.

4. **Lancez NeonWave PC** :
   - Double-cliquez sur **`DEMARRER_NEONWAVE_PC.bat`** (ou lancez l'exécutable dans `Executables_Windows/`).

Tout remarchera exactement comme avant !
