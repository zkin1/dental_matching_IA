#!/bin/bash

# ========================================
# SCRIPT DE INSTALACIÓN AUTOMÁTICA
# Dental Matching System v0.2.0
# ========================================

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar sistema operativo
check_os() {
    print_header "Verificando Sistema Operativo"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_message "Sistema Linux detectado"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_message "Sistema macOS detectado"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
        print_message "Sistema Windows detectado (Git Bash)"
    else
        print_error "Sistema operativo no soportado: $OSTYPE"
        exit 1
    fi
}

# Verificar Node.js
check_node() {
    print_header "Verificando Node.js"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_message "Node.js encontrado: $NODE_VERSION"
        
        # Verificar versión mínima
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_error "Node.js 18+ es requerido. Versión actual: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js no encontrado. Por favor instálelo desde https://nodejs.org/"
        exit 1
    fi
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_message "npm encontrado: $NPM_VERSION"
    else
        print_error "npm no encontrado"
        exit 1
    fi
}

# Verificar MySQL
check_mysql() {
    print_header "Verificando MySQL"
    
    if command -v mysql &> /dev/null; then
        MYSQL_VERSION=$(mysql --version)
        print_message "MySQL encontrado: $MYSQL_VERSION"
    else
        print_warning "MySQL no encontrado. Asegúrese de tenerlo instalado y ejecutándose"
        print_message "Puede instalarlo con:"
        if [ "$OS" == "linux" ]; then
            echo "  sudo apt-get install mysql-server"
        elif [ "$OS" == "macos" ]; then
            echo "  brew install mysql"
        fi
    fi
}

# Instalar dependencias
install_dependencies() {
    print_header "Instalando Dependencias"
    
    if [ -f "package.json" ]; then
        print_message "Instalando dependencias de Node.js..."
        npm install
        
        if [ $? -eq 0 ]; then
            print_message "Dependencias instaladas correctamente"
        else
            print_error "Error instalando dependencias"
            exit 1
        fi
    else
        print_error "package.json no encontrado"
        exit 1
    fi
}

# Crear archivo de configuración
setup_env() {
    print_header "Configurando Variables de Entorno"
    
    if [ -f ".env" ]; then
        print_warning "Archivo .env ya existe. ¿Desea sobrescribirlo? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_message "Manteniendo archivo .env existente"
            return
        fi
    fi
    
    if [ -f "env.example" ]; then
        cp env.example .env
        print_message "Archivo .env creado desde env.example"
        print_warning "IMPORTANTE: Edite el archivo .env con sus credenciales antes de continuar"
    else
        print_error "Archivo env.example no encontrado"
        exit 1
    fi
}

# Crear directorios necesarios
create_directories() {
    print_header "Creando Directorios del Sistema"
    
    # Directorio de logs
    if [ ! -d "logs" ]; then
        mkdir -p logs
        print_message "Directorio logs creado"
    fi
    
    # Directorio de uploads (si es necesario)
    if [ ! -d "uploads" ]; then
        mkdir -p uploads
        print_message "Directorio uploads creado"
    fi
    
    # Directorio de backups (si es necesario)
    if [ ! -d "backups" ]; then
        mkdir -p backups
        print_message "Directorio backups creado"
    fi
}

# Verificar permisos
check_permissions() {
    print_header "Verificando Permisos"
    
    # Verificar permisos de escritura en directorios críticos
    if [ -w "logs" ]; then
        print_message "Permisos de logs: OK"
    else
        print_warning "No hay permisos de escritura en logs/"
    fi
    
    if [ -w "." ]; then
        print_message "Permisos del directorio principal: OK"
    else
        print_warning "No hay permisos de escritura en el directorio principal"
    fi
}

# Verificar configuración
verify_config() {
    print_header "Verificando Configuración"
    
    if [ -f ".env" ]; then
        print_message "Archivo .env encontrado"
        
        # Verificar variables críticas
        source .env
        
        if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
            print_warning "Variables de base de datos no configuradas en .env"
        else
            print_message "Variables de base de datos configuradas"
        fi
        
        if [ -z "$EMAIL_USER" ] || [ -z "$EMAIL_PASS" ]; then
            print_warning "Variables de email no configuradas en .env"
        else
            print_message "Variables de email configuradas"
        fi
        
        if [ -z "$GOOGLE_SHEET_ID" ]; then
            print_warning "Google Sheet ID no configurado en .env"
        else
            print_message "Google Sheet ID configurado"
        fi
    else
        print_error "Archivo .env no encontrado"
        exit 1
    fi
}

# Probar conexiones
test_connections() {
    print_header "Probando Conexiones"
    
    print_message "Iniciando test de conexiones..."
    
    # Test de Node.js
    if node -e "console.log('Node.js funcionando correctamente')" &> /dev/null; then
        print_message "Node.js: OK"
    else
        print_error "Node.js: ERROR"
        exit 1
    fi
    
    # Test de dependencias
    if node -e "require('express'); console.log('Express: OK')" &> /dev/null; then
        print_message "Express: OK"
    else
        print_error "Express: ERROR"
        exit 1
    fi
    
    if node -e "require('mysql2'); console.log('MySQL2: OK')" &> /dev/null; then
        print_message "MySQL2: OK"
    else
        print_error "MySQL2: ERROR"
        exit 1
    fi
    
    if node -e "require('nodemailer'); console.log('Nodemailer: OK')" &> /dev/null; then
        print_message "Nodemailer: OK"
    else
        print_error "Nodemailer: ERROR"
        exit 1
    fi
}

# Mostrar instrucciones finales
show_final_instructions() {
    print_header "Instalación Completada"
    
    echo -e "${GREEN}✅ El sistema Dental Matching ha sido instalado correctamente${NC}"
    echo ""
    echo -e "${BLUE}Próximos pasos:${NC}"
    echo "1. Edite el archivo .env con sus credenciales"
    echo "2. Configure su base de datos MySQL"
    echo "3. Configure su cuenta de Google Cloud y Google Sheets"
    echo "4. Configure su cuenta de Gmail para notificaciones"
    echo ""
    echo -e "${BLUE}Para iniciar el sistema:${NC}"
    echo "  npm start          # Modo producción"
    echo "  npm run dev        # Modo desarrollo"
    echo ""
    echo -e "${BLUE}Para verificar el estado:${NC}"
    echo "  curl http://localhost:3000/api/health"
    echo ""
    echo -e "${BLUE}Documentación:${NC}"
    echo "  Lea el README.md para más detalles"
    echo ""
    echo -e "${GREEN}¡Gracias por usar Dental Matching System!${NC}"
}

# Función principal
main() {
    print_header "Dental Matching System - Instalador Automático"
    echo "Este script instalará y configurará el sistema Dental Matching"
    echo ""
    
    # Verificaciones
    check_os
    check_node
    check_mysql
    
    # Instalación
    install_dependencies
    setup_env
    create_directories
    check_permissions
    verify_config
    test_connections
    
    # Finalización
    show_final_instructions
}

# Ejecutar función principal
main "$@"
