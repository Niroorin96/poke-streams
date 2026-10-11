@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale a versao LTS em https://nodejs.org e rode de novo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Primeira vez: instalando o necessario, pode levar alguns minutos...
  call npm ci
  if errorlevel 1 (
    echo Falha ao instalar. Confira a internet e tente de novo.
    pause
    exit /b 1
  )
)
if not exist "%~dp0node_modules\electron\dist\electron.exe" (
  echo Baixando o Electron oficial, pode levar alguns minutos...
  call node "%~dp0node_modules\electron\install.js"
  if errorlevel 1 (
    echo Falha ao baixar o Electron. Confira a internet e tente de novo.
    pause
    exit /b 1
  )
)
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."