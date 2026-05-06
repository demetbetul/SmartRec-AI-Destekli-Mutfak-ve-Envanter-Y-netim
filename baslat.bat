@echo off
echo === SmartRec Sihirli Baslatma Tusu ===
echo.

echo 1. Kurye (TypeScript) koda cevriliyor...
call npx tsc frontend/app.ts --outFile frontend/dist/app.js --target es6 --skipLibCheck
echo Kurye hazir!

echo.
echo 2. Arka Plan (Python Mutfagi) calistiriliyor...
cd backend
python app.py

pause