@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo    NeonWave - Envoi vers GitHub
echo ==========================================
echo.

echo [1/3] Ajout des fichiers modifies...
git add -A

echo [2/3] Creation du commit...
git commit -m "Update NeonWave - %date% %time%"
if errorlevel 1 (
    echo    ^(Rien de nouveau a envoyer^)
)

echo [3/3] Envoi vers GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo [ERREUR] L'envoi a echoue. Verifie ta connexion / tes identifiants GitHub.
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    Termine ! Fichiers envoyes sur GitHub.
echo ==========================================
echo.
pause
