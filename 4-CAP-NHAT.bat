@echo off
cd /d "%~dp0"
echo Hay thoat Zalo Bong Bong truoc (chuot phai bong bong - Thoat).
pause
taskkill /im "Zalo Bong Bong.exe" /f >nul 2>nul
if not exist node_modules call npm install
echo Dang dong goi ban cap nhat...
call npm run dist
if errorlevel 1 (
  echo Dong goi bi loi. Chup man hinh gui lai de duoc ho tro.
  pause
  exit /b
)
echo Dang mo trinh cai dat ban moi...
for %%f in ("dist\Zalo Bong Bong Setup *.exe") do set "SETUP=%%f"
start "" "%SETUP%"
pause
