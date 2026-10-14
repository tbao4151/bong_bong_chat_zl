@echo off
cd /d "%~dp0"
echo Dang dong goi file .exe, vui long doi...
call npm run dist
echo.
echo Xong. File cai dat va ban portable nam trong thu muc dist
explorer dist
pause
