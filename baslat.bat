@echo off
echo === SmartRec Sihirli Baslatma Tusu (Kesin Cozum) ===
echo.

echo 1. Kurye (TypeScript) koda cevriliyor...
call npx tsc frontend/app.ts --target ES2020 --module ES2020 --outDir frontend/dist
echo Kurye hazir!

echo.
echo 2. Arka Plan (Python Mutfagi) calistiriliyor...
cd backend
python app.py

pause