#!/bin/bash

# ===============================================
# Script de instalación profesional para Dental Matching
# Versión: 2.0.0
# Fecha: 2024
# ===============================================

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
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

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para verificar sistema operativo
check_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        print_error "Sistema operativo no soportado: $OSTYPE"
        exit 1
    fi
    print_message "Sistema operativo detectado: $OS"
}

# Función para verificar dependencias del sistema
check_system_dependencies() {
    print_header "Verificando dependencias del sistema"
    
    local missing_deps=()
    
    # Verificar Node.js
    if ! command_exists node; then
        missing_deps+=("nodejs")
    else
        NODE_VERSION=$(node --version)
        print_message "Node.js encontrado: $NODE_VERSION"
    fi
    
    # Verificar npm
    if ! command_exists npm; then
        missing_deps+=("npm")
    else
        NPM_VERSION=$(npm --version)
        print_message "npm encontrado: $NPM_VERSION"
    fi
    
    # Verificar MySQL
    if ! command_exists mysql; then
        missing_deps+=("mysql")
    else
        MYSQL_VERSION=$(mysql --version)
        print_message "MySQL encontrado: $MYSQL_VERSION"
    fi
    
    # Verificar Git
    if ! command_exists git; then
        missing_deps+=("git")
    else
        GIT_VERSION=$(git --version)
        print_message "Git encontrado: $GIT_VERSION"
    fi
    
    # Instalar dependencias faltantes
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_warning "Dependencias faltantes: ${missing_deps[*]}"
        install_system_dependencies "${missing_deps[@]}"
    fi
}

# Función para instalar dependencias del sistema
install_system_dependencies() {
    print_header "Instalando dependencias del sistema"
    
    if [[ "$OS" == "linux" ]]; then
        if command_exists apt-get; then
            # Ubuntu/Debian
            sudo apt-get update
            sudo apt-get install -y "$@"
        elif command_exists yum; then
            # CentOS/RHEL
            sudo yum install -y "$@"
        elif command_exists dnf; then
            # Fedora
            sudo dnf install -y "$@"
        else
            print_error "Gestor de paquetes no soportado"
            exit 1
        fi
    elif [[ "$OS" == "macos" ]]; then
        if command_exists brew; then
            brew install "$@"
        else
            print_error "Homebrew no está instalado. Instálalo desde https://brew.sh/"
            exit 1
        fi
    fi
}

# Función para verificar versión mínima de Node.js
check_node_version() {
    local required_version="16.0.0"
    local current_version=$(node --version | sed 's/v//')
    
    if ! command_exists node; then
        print_error "Node.js no está instalado"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm no está instalado"
        exit 1
    fi
    
    # Comparar versiones
    if ! node -e "
        const required = '$required_version'.split('.').map(Number);
        const current = '$current_version'.split('.').map(Number);
        for (let i = 0; i < Math.max(required.length, current.length); i++) {
            const req = required[i] || 0;
            const cur = current[i] || 0;
            if (cur < req) process.exit(1);
            if (cur > req) process.exit(0);
        }
        process.exit(0);
    "; then
        print_error "Node.js $required_version o superior es requerido. Versión actual: $current_version"
        exit 1
    fi
    
    print_message "Versión de Node.js compatible: $current_version"
}

# Función para configurar base de datos
setup_database() {
    print_header "Configurando base de datos"
    
    if [[ -z "$DB_HOST" ]]; then
        read -p "Host de la base de datos [localhost]: " DB_HOST
        DB_HOST=${DB_HOST:-localhost}
    fi
    
    if [[ -z "$DB_PORT" ]]; then
        read -p "Puerto de la base de datos [3306]: " DB_PORT
        DB_PORT=${DB_PORT:-3306}
    fi
    
    if [[ -z "$DB_USER" ]]; then
        read -p "Usuario de la base de datos: " DB_USER
    fi
    
    if [[ -z "$DB_PASSWORD" ]]; then
        read -s -p "Contraseña de la base de datos: " DB_PASSWORD
        echo
    fi
    
    if [[ -z "$DB_NAME" ]]; then
        read -p "Nombre de la base de datos [dental_matching]: " DB_NAME
        DB_NAME=${DB_NAME:-dental_matching}
    fi
    
    # Crear archivo .env
    create_env_file
    
    # Probar conexión a la base de datos
    test_database_connection
    
    # Ejecutar migración
    run_database_migration
}

# Función para crear archivo .env
create_env_file() {
    print_message "Creando archivo .env"
    
    cat > .env << EOF
# ===============================================
# Configuración del Sistema Dental Matching
# ===============================================

# Configuración de la base de datos
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# Configuración del servidor
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Configuración de seguridad
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Configuración de Google Sheets
GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
GOOGLE_SHEETS_TOKEN_PATH=./config/google-token.json

# Configuración de email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Configuración de logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Configuración de sincronización
SYNC_INTERVAL_MINUTES=5
SYNC_ENABLED=true

# Configuración de notificaciones
NOTIFICATIONS_ENABLED=true
EMAIL_NOTIFICATIONS_ENABLED=true

# Configuración de rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configuración de caché
CACHE_TTL=300000
CACHE_CHECK_PERIOD=60000

# Configuración de monitoreo
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
EOF

    print_message "Archivo .env creado exitosamente"
}

# Función para probar conexión a la base de datos
test_database_connection() {
    print_message "Probando conexión a la base de datos"
    
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1; then
        print_message "Conexión a la base de datos exitosa"
    else
        print_error "No se pudo conectar a la base de datos"
        exit 1
    fi
}

# Función para ejecutar migración de base de datos
run_database_migration() {
    print_message "Ejecutando migración de base de datos"
    
    if [[ -f "scripts/migrate_database.js" ]]; then
        node scripts/migrate_database.js
        print_message "Migración completada exitosamente"
    else
        print_warning "Script de migración no encontrado"
    fi
}

# Función para instalar dependencias de Node.js
install_node_dependencies() {
    print_header "Instalando dependencias de Node.js"
    
    if [[ -f "package.json" ]]; then
        print_message "Instalando dependencias..."
        npm ci --production
        
        if [[ "$NODE_ENV" != "production" ]]; then
            print_message "Instalando dependencias de desarrollo..."
            npm install
        fi
        
        print_message "Dependencias instaladas exitosamente"
    else
        print_error "package.json no encontrado"
        exit 1
    fi
}

# Función para configurar PM2
setup_pm2() {
    print_header "Configurando PM2"
    
    if ! command_exists pm2; then
        print_message "Instalando PM2 globalmente..."
        npm install -g pm2
    fi
    
    if [[ -f "ecosystem.config.js" ]]; then
        print_message "Configurando aplicación con PM2..."
        pm2 start ecosystem.config.js --env production
        pm2 save
        pm2 startup
        
        print_message "PM2 configurado exitosamente"
        print_message "Comandos útiles:"
        print_message "  pm2 status          - Ver estado de la aplicación"
        print_message "  pm2 logs            - Ver logs en tiempo real"
        print_message "  pm2 restart all     - Reiniciar aplicación"
        print_message "  pm2 stop all        - Detener aplicación"
    else
        print_warning "ecosystem.config.js no encontrado, PM2 no configurado"
    fi
}

# Función para configurar Nginx
setup_nginx() {
    print_header "Configurando Nginx"
    
    if ! command_exists nginx; then
        print_warning "Nginx no está instalado. Instálalo manualmente."
        return
    fi
    
    if [[ -f "nginx.conf" ]]; then
        print_message "Copiando configuración de Nginx..."
        sudo cp nginx.conf /etc/nginx/nginx.conf
        
        print_message "Verificando configuración de Nginx..."
        if sudo nginx -t; then
            print_message "Reiniciando Nginx..."
            sudo systemctl restart nginx
            sudo systemctl enable nginx
            
            print_message "Nginx configurado exitosamente"
        else
            print_error "Error en la configuración de Nginx"
        fi
    else
        print_warning "nginx.conf no encontrado"
    fi
}

# Función para configurar firewall
setup_firewall() {
    print_header "Configurando firewall"
    
    if command_exists ufw; then
        print_message "Configurando UFW..."
        sudo ufw allow ssh
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw allow 3000/tcp
        
        if [[ "$NODE_ENV" != "production" ]]; then
            sudo ufw allow 8080/tcp
        fi
        
        sudo ufw --force enable
        print_message "Firewall configurado exitosamente"
    elif command_exists firewall-cmd; then
        print_message "Configurando firewalld..."
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --permanent --add-port=3000/tcp
        
        if [[ "$NODE_ENV" != "production" ]]; then
            sudo firewall-cmd --permanent --add-port=8080/tcp
        fi
        
        sudo firewall-cmd --reload
        print_message "Firewall configurado exitosamente"
    else
        print_warning "Firewall no detectado, configuración manual requerida"
    fi
}

# Función para crear directorios necesarios
create_directories() {
    print_header "Creando directorios necesarios"
    
    local directories=(
        "logs"
        "uploads"
        "downloads"
        "backups"
        "temp"
        "config"
    )
    
    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            print_message "Directorio creado: $dir"
        fi
    done
}

# Función para configurar logs
setup_logs() {
    print_header "Configurando sistema de logs"
    
    # Crear archivo de log principal
    touch logs/app.log
    chmod 644 logs/app.log
    
    # Configurar rotación de logs si logrotate está disponible
    if command_exists logrotate; then
        print_message "Configurando rotación de logs..."
        sudo tee /etc/logrotate.d/dental-matching > /dev/null << EOF
/var/www/dental_matching/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nginx nginx
    postrotate
        systemctl reload nginx
    endscript
}
EOF
        print_message "Rotación de logs configurada"
    fi
}

# Función para ejecutar pruebas
run_tests() {
    print_header "Ejecutando pruebas del sistema"
    
    if [[ -f "scripts/test_system.js" ]]; then
        print_message "Ejecutando pruebas..."
        if node scripts/test_system.js; then
            print_message "Todas las pruebas pasaron exitosamente"
        else
            print_warning "Algunas pruebas fallaron"
        fi
    else
        print_warning "Script de pruebas no encontrado"
    fi
}

# Función para mostrar información final
show_final_info() {
    print_header "Instalación Completada"
    
    echo
    print_message "🎉 ¡El Sistema Dental Matching ha sido instalado exitosamente!"
    echo
    print_message "📋 Información de la instalación:"
    print_message "   - Aplicación: http://localhost:3000"
    print_message "   - API: http://localhost:3000/api"
    print_message "   - Health Check: http://localhost:3000/health"
    echo
    print_message "🔧 Comandos útiles:"
    print_message "   - Ver estado: pm2 status"
    print_message "   - Ver logs: pm2 logs"
    print_message "   - Reiniciar: pm2 restart all"
    print_message "   - Detener: pm2 stop all"
    echo
    print_message "📚 Documentación:"
    print_message "   - README.md - Guía de usuario"
    print_message "   - MIGRATION_README.md - Guía de migración"
    print_message "   - CHANGES_SUMMARY.md - Resumen de cambios"
    echo
    print_message "🚀 ¡Tu sistema está listo para producción!"
}

# Función principal
main() {
    print_header "Instalador del Sistema Dental Matching v2.0.0"
    
    # Verificar sistema operativo
    check_os
    
    # Verificar dependencias del sistema
    check_system_dependencies
    
    # Verificar versión de Node.js
    check_node_version
    
    # Crear directorios necesarios
    create_directories
    
    # Configurar base de datos
    setup_database
    
    # Instalar dependencias de Node.js
    install_node_dependencies
    
    # Configurar PM2
    setup_pm2
    
    # Configurar Nginx
    setup_nginx
    
    # Configurar firewall
    setup_firewall
    
    # Configurar logs
    setup_logs
    
    # Ejecutar pruebas
    run_tests
    
    # Mostrar información final
    show_final_info
}

# Ejecutar función principal
main "$@"
