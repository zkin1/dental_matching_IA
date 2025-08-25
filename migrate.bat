@echo off
chcp 65001 >nul
echo 🔄 Iniciando migración de base de datos Dental Matching...
echo ==================================================

REM Verificar que Node.js esté instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js no está instalado
    pause
    exit /b 1
)

REM Verificar que el archivo de migración existe
if not exist "scripts\migrate_database.js" (
    echo ❌ Error: No se encontró el archivo de migración
    pause
    exit /b 1
)

REM Verificar que las dependencias estén instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
)

REM Verificar que el archivo .env existe
if not exist ".env" (
    echo ⚠️  Advertencia: No se encontró archivo .env
    echo 📝 Creando archivo .env desde env.example...
    if exist "env.example" (
        copy env.example .env >nul
        echo ✅ Archivo .env creado. Por favor, configura las variables de entorno antes de continuar.
        echo 🔧 Edita el archivo .env con tus credenciales de base de datos
        pause
        exit /b 1
    ) else (
        echo ❌ Error: No se encontró env.example
        pause
        exit /b 1
    )
)

echo 🚀 Ejecutando migración...
echo ==================================================

REM Ejecutar la migración
node scripts\migrate_database.js

if %errorlevel% equ 0 (
    echo ==================================================
    echo 🎉 Migración completada exitosamente!
    echo ✅ La base de datos ha sido actualizada a la nueva estructura
    echo ✅ Todas las tablas nuevas han sido creadas
    echo ✅ Los índices de rendimiento han sido agregados
    echo ✅ Los códigos de acceso han sido generados
    echo.
    echo 🚀 Tu sistema está listo para producción!
) else (
    echo ==================================================
    echo ❌ Error en la migración
    echo 🔧 Revisa los logs de error arriba
    echo 📞 Si el problema persiste, contacta al equipo de desarrollo
)

pause
