#!/bin/bash

echo "========================================"
echo " DENTAL MATCHING SYSTEM - DEV START"
echo "========================================"
echo "Terminando procesos en puerto 3002..."

# Buscar y terminar procesos en puerto 3002
PORT_PID=$(lsof -t -i:3002)
if [ ! -z "$PORT_PID" ]; then
    echo "Terminando proceso con PID $PORT_PID"
    kill -9 $PORT_PID
    sleep 1
else
    echo "No hay procesos ejecutandose en puerto 3002"
fi

echo "Procesos terminados."
echo ""
echo "Iniciando servidor de desarrollo..."
echo ""

# Ejecutar npm run dev
npm run dev