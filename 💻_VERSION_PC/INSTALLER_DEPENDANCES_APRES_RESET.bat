@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo ======================================================================
echo    NEONWAVE PC - RÉINSTALLATION COMPLÈTE APRÈS FORMATAGE DU PC
echo ======================================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas encore installé.
    echo 1. Téléchargez et installez Node.js LTS depuis : https://nodejs.org
    echo 2. Relancez ensuite ce script.
    echo.
    pause
    exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
    echo [ATTENTION] Git n'est pas détecté. (Optionnel mais recommandé : https://git-scm.com)
    echo.
)

echo [1/2] Nettoyage et installation des dépendances Node.js...
call npm install
if errorlevel 1 (
    echo [ERREUR] npm install a échoué. Vérifiez votre connexion Internet.
    pause
    exit /b 1
)

echo.
echo [2/2] Installation réussie avec succès !
echo Vous pouvez maintenant lancer NeonWave avec "DEMARRER_NEONWAVE_PC.bat".
echo.
pause
