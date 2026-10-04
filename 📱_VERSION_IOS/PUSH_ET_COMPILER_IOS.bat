@echo off
chcp 65001 >nul
cd /d "%~dp0\..\scratch"

echo =======================================================
echo    NEONWAVE iOS - ENVOI ET COMPILATION GITHUB ACTIONS
echo =======================================================
echo.
echo Envoi des derniers fichiers Swift vers le dépôt GitHub iOS...
python push_to_ios_repo.py
if errorlevel 1 (
    echo.
    echo [ERREUR] Échec de l'envoi. Vérifiez votre connexion.
    pause
    exit /b 1
)

echo.
echo =======================================================
echo Compilation lancée sur GitHub Actions !
echo Surveillance et téléchargement de l'IPA en cours...
echo =======================================================
python wait_and_download_current.py

echo.
pause
