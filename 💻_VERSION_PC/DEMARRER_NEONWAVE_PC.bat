@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo =======================================================
echo            LANCEMENT DE NEONWAVE PC (ELECTRON)
echo =======================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ATTENTION] Node.js n'est pas détecté sur votre système.
    echo Si vous venez de réinitialiser Windows, installez d'abord Node.js (LTS) depuis :
    echo https://nodejs.org
    echo.
    echo Ou utilisez directement l'exécutable dans le dossier "Executables_Windows".
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Les modules ne sont pas installés. Installation automatique en cours...
    npm install
)

echo Démarrage de NeonWave...
npm start
