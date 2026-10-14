@echo off
cd /d "%~dp0"
echo Chay kiem thu truoc khi dong goi...
call npm test
if errorlevel 1 (
  echo Kiem thu that bai. Khong tao EXE.
  pause
  exit /b 1
)
echo Kiem tra lo hong thu vien...
call npm audit --audit-level=high
if errorlevel 1 (
  echo Phat hien van de bao mat can xu ly. Khong tao EXE.
  pause
  exit /b 1
)
echo Dang dong goi file EXE...
call npm run dist
if errorlevel 1 (
  echo Dong goi bi loi.
  pause
  exit /b 1
)
echo Da tao file trong thu muc dist. Chua tu dong cai dat.
explorer dist
pause
