#!/bin/bash
# Doble clic en este archivo (en un Mac) para crear el instalador .dmg
cd "$(dirname "$0")/.."
echo "=== My Little Artist: creando instalador para Mac ==="
if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js. Instala la version LTS desde https://nodejs.org y vuelve a abrir este archivo."
  read -n 1 -s -r -p "Pulsa una tecla para salir..."; exit 1
fi
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm install && npm run dist:mac
if [ $? -eq 0 ]; then
  echo ""; echo "Listo. El .dmg esta en la carpeta 'release'."
  open release
else
  echo "Hubo un error. Revisa los mensajes de arriba."
fi
read -n 1 -s -r -p "Pulsa una tecla para cerrar..."
