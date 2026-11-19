@echo off
REM Doble clic para crear el instalador .exe de Windows
cd /d "%~dp0\.."
echo === My Little Artist: creando instalador para Windows ===
where node >nul 2>nul
if errorlevel 1 (
  echo Falta Node.js. Instala la version LTS desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm install
if errorlevel 1 goto fail
call npm run dist:win
if errorlevel 1 goto fail
echo.
echo Listo. El instalador esta en la carpeta "release".
start "" release
pause
exit /b 0
:fail
echo Hubo un error. Revisa los mensajes de arriba.
pause
exit /b 1
