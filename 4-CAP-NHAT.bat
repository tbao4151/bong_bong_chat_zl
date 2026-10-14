@echo off
cd /d "%~dp0"
echo Thoat Zalo Bong Bong truoc khi cap nhat (chuot phai - Thoat).
pause
taskkill /im "Zalo Bong Bong.exe" /f >nul 2>nul
if not exist node_modules (
  call npm install
  if errorlevel 1 (
    echo Cai thu vien that bai.
    pause
    exit /b 1
  )
)
call npm test
if errorlevel 1 (
  echo Kiem thu that bai. Khong cap nhat.
  pause
  exit /b 1
)
call npm audit --audit-level=high
if errorlevel 1 (
  echo Can xu ly canh bao npm audit truoc khi cap nhat.
  pause
  exit /b 1
)
call npm run dist
if errorlevel 1 (
  echo Dong goi that bai.
  pause
  exit /b 1
)
echo Da dong goi thanh cong trong thu muc dist.
echo Ban can tu kiem tra file EXE va chay installer thu cong.
explorer dist
pause
