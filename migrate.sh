#!/bin/bash

echo "🔄 Iniciando migración de base de datos Dental Matching..."
echo "=================================================="

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    exit 1
fi

# Verificar que el archivo de migración existe
if [ ! -f "scripts/migrate_database.js" ]; then
    echo "❌ Error: No se encontró el archivo de migración"
    exit 1
fi

# Verificar que las dependencias estén instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error instalando dependencias"
        exit 1
    fi
fi

# Verificar que el archivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Advertencia: No se encontró archivo .env"
    echo "📝 Creando archivo .env desde env.example..."
    if [ -f "env.example" ]; then
        cp env.example .env
        echo "✅ Archivo .env creado. Por favor, configura las variables de entorno antes de continuar."
        echo "🔧 Edita el archivo .env con tus credenciales de base de datos"
        exit 1
    else
        echo "❌ Error: No se encontró env.example"
        exit 1
    fi
fi

echo "🚀 Ejecutando migración..."
echo "=================================================="

# Ejecutar la migración
node scripts/migrate_database.js

if [ $? -eq 0 ]; then
    echo "=================================================="
    echo "🎉 Migración completada exitosamente!"
    echo "✅ La base de datos ha sido actualizada a la nueva estructura"
    echo "✅ Todas las tablas nuevas han sido creadas"
    echo "✅ Los índices de rendimiento han sido agregados"
    echo "✅ Los códigos de acceso han sido generados"
    echo ""
    echo "🚀 Tu sistema está listo para producción!"
else
    echo "=================================================="
    echo "❌ Error en la migración"
    echo "🔧 Revisa los logs de error arriba"
    echo "📞 Si el problema persiste, contacta al equipo de desarrollo"
    exit 1
fi
