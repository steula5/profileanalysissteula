@echo off
REM Deploy script for Profile Analysis Steula
cd "c:\Users\sup.vendas\Desktop\Apps and dashboards\profileanalysissteula-main"

echo [1/3] Adding changes...
git add -A

echo [2/3] Committing changes...
git commit -m "Fix: Use relative path for main.tsx and HashRouter routing"

echo [3/3] Pushing to GitHub (triggering deploy)...
git push origin main

echo.
echo ✓ Deployment initiated!
echo.
echo GitHub Actions will build and deploy to:
echo https://steula5.github.io/profileanalysissteula/#/
echo.
echo Please wait 2-3 minutes, then refresh the page to see the changes.
echo.
pause
