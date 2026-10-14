@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Chua cai Node.js. Hay tai ban LTS tai https://nodejs.org roi chay lai file nay.
  pause
  exit /b
)
echo Dang cai dat thu vien, vui long doi vai phut...
call npm install
echo.
echo Xong. Chay file 2-CHAY-THU.bat de dung thu.
pause
