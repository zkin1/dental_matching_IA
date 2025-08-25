@echo off
chcp 65001 >nul
echo 🧪 Iniciando pruebas del sistema Dental Matching...
echo ==================================================

REM Verificar que Node.js esté instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js no está instalado
    pause
    exit /b 1
)

REM Verificar que el archivo de prueba existe
if not exist "scripts\test_system.js" (
    echo ❌ Error: No se encontró el archivo de prueba
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
    echo ❌ Error: No se encontró archivo .env
    echo 🔧 Por favor, ejecuta primero la migración con migrate.bat
    pause
    exit /b 1
)

echo 🚀 Ejecutando pruebas del sistema...
echo ==================================================

REM Ejecutar las pruebas
node scripts\test_system.js

if %errorlevel% equ 0 (
    echo ==================================================
    echo 🎉 Pruebas completadas exitosamente!
    echo ✅ El sistema está funcionando correctamente
    echo 🚀 Puedes proceder con el uso en producción
) else (
    echo ==================================================
    echo ❌ Error en las pruebas
    echo 🔧 Revisa los logs de error arriba
    echo 📞 Si el problema persiste, contacta al equipo de desarrollo
)

pause
