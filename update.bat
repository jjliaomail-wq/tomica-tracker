@echo off
echo ==================================================
echo   TOMICA Price Tracker - Auto Update Script
echo ==================================================
echo.

echo [1/5] Scraping latest car data from Tomica website...
node scrapeAll.js
if errorlevel 1 (
    echo ERROR: Scraping failed!
    pause
    exit /b 1
)
echo.

echo [2/5] Building production site...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo.

echo [3/5] Scanning for changed files...
git add .
echo.

echo [4/5] Creating commit...
git commit -m "Update: %date% %time:~0,5%"
echo.

echo [5/5] Pushing to remote repository (GitHub)...
git push origin master
echo.

echo [6/5] Deploying to GitHub Pages...
call npm run deploy
echo.

echo ==================================================
echo   Done! Site will be live in a few minutes.
echo ==================================================
pause
