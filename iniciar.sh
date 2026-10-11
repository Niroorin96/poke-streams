#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale a versão LTS em https://nodejs.org e rode de novo."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Primeira vez: instalando o necessário, pode levar alguns minutos..."
  npm ci || { echo "Falha ao instalar."; exit 1; }
fi
if [ ! -d node_modules/electron/dist ]; then
  echo "Baixando o Electron oficial, pode levar alguns minutos..."
  node node_modules/electron/install.js || { echo "Falha ao baixar o Electron."; exit 1; }
fi
npx electron .