@echo off
echo ==================================================
echo   TOMICA Price Tracker - Auto Update Script
echo ==================================================
echo.

echo [1/3] Scanning for changed files...
git add .
echo.

echo [2/3] Creating commit...
git commit -m "Auto Update"
echo.

echo [3/3] Pushing to remote repository (GitHub)...
git push origin master

echo.
echo ==================================================
echo   Done! Check above for any errors.
echo ==================================================
pause
