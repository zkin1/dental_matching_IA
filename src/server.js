#!/usr/bin/env node

/**
 * Servidor principal para el Sistema Dental Matching
 * Versión 2.0.0 - Arquitectura Clean
 */

require('dotenv').config();
const app = require('./app');
const logger = require('./shared/utils/logger');

// Configuración del servidor
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

/**
 * Función principal para iniciar el servidor
 */
async function startServer() {
    try {
        // Verificar configuración crítica
        await validateConfiguration();
        
        // Verificar conexión a base de datos
        await verifyDatabaseConnection();
        
        // Inicializar servicios si es necesario
        await initializeServices();
        
        // Iniciar servidor HTTP
        const server = app.listen(PORT, HOST, () => {
            logger.info(`🏥 Sistema Dental Matching iniciado exitosamente`);
            logger.info(`📍 Servidor ejecutándose en http://${HOST}:${PORT}`);
            logger.info(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔗 API Docs: http://${HOST}:${PORT}/api/docs`);
            logger.info(`💡 Health Check: http://${HOST}:${PORT}/api/health`);
            
            // Log de configuración en desarrollo
            if (process.env.NODE_ENV === 'development') {
                logger.info(`🔧 Configuración:`);
                logger.info(`   - Base de datos: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
                logger.info(`   - Nivel de log: ${process.env.LOG_LEVEL || 'INFO'}`);
                logger.info(`   - Rate limit: ${process.env.RATE_LIMIT_MAX || 1000} requests/15min`);
            }
        });
        
        // Configurar timeout del servidor
        server.timeout = parseInt(process.env.SERVER_TIMEOUT) || 30000;
        
        // Guardar referencia global para graceful shutdown
        global.httpServer = server;
        
        // Manejar errores del servidor
        server.on('error', (error) => {
            if (error.syscall !== 'listen') {
                throw error;
            }
            
            const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Puerto ${PORT}`;
            
            switch (error.code) {
                case 'EACCES':
                    logger.error(`${bind} requiere privilegios elevados`);
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    logger.error(`${bind} ya está en uso`);
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        });
        
        // Log de métricas iniciales
        logInitialMetrics();
        
    } catch (error) {
        logger.error('Error crítico iniciando servidor', error);
        process.exit(1);
    }
}

/**
 * Valida la configuración crítica del sistema
 */
async function validateConfiguration() {
    logger.info('🔍 Validando configuración del sistema...');
    
    const requiredEnvVars = [
        'DB_HOST',
        'DB_USER',
        'DB_NAME'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        logger.error(`Variables de entorno requeridas faltantes: ${missingVars.join(', ')}`);
        
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Configuración incompleta para producción');
        } else {
            logger.warn('Continuando con valores por defecto (solo desarrollo)');
        }
    }
    
    // Validar configuración de base de datos
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        database: process.env.DB_NAME || 'dental_matching',
        hasPassword: !!process.env.DB_PASSWORD
    };
    
    logger.info(`📊 Configuración de BD: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    logger.info('✅ Configuración validada exitosamente');
}

/**
 * Verifica la conexión a la base de datos
 */
async function verifyDatabaseConnection() {
    logger.info('🔌 Verificando conexión a base de datos...');
    
    try {
        const { testConnection } = require('./config/database');
        await testConnection();
        logger.info('✅ Conexión a base de datos establecida');
        
        // Obtener estadísticas básicas
        const { executeQuery } = require('./config/database');
        const stats = await executeQuery(`
            SELECT 
                (SELECT COUNT(*) FROM pacientes WHERE activo = 1) as pacientes_activos,
                (SELECT COUNT(*) FROM estudiantes_odontologia WHERE estado = 'activo') as estudiantes_activos,
                (SELECT COUNT(*) FROM asignaciones WHERE estado IN ('asignado', 'en_tratamiento')) as asignaciones_activas
        `);
        
        if (stats.rows && stats.rows[0]) {
            const { pacientes_activos, estudiantes_activos, asignaciones_activas } = stats.rows[0];
            logger.info(`📈 Datos del sistema:`);
            logger.info(`   - Pacientes activos: ${pacientes_activos}`);
            logger.info(`   - Estudiantes activos: ${estudiantes_activos}`);
            logger.info(`   - Asignaciones activas: ${asignaciones_activas}`);
        }
        
    } catch (error) {
        logger.error('❌ Error conectando a base de datos', error);
        
        if (process.env.NODE_ENV === 'production') {
            throw error;
        } else {
            logger.warn('⚠️  Continuando sin base de datos (solo desarrollo)');
        }
    }
}

/**
 * Inicializa servicios del sistema
 */
async function initializeServices() {
    logger.info('🚀 Inicializando servicios del sistema...');
    
    try {
        // Limpiar logs antiguos en producción
        if (process.env.NODE_ENV === 'production') {
            logger.cleanOldLogs(30);
            logger.info('🧹 Logs antiguos limpiados');
        }
        
        // Inicializar sistema de matching si está habilitado
        if (process.env.ENABLE_AUTO_MATCHING === 'true') {
            logger.info('🤖 Sistema de matching automático habilitado');
            // TODO: Inicializar scheduler de matching
        }
        
        // Verificar directorio de uploads si existe
        const uploadsPath = process.env.UPLOADS_PATH || './uploads';
        try {
            const fs = require('fs');
            if (!fs.existsSync(uploadsPath)) {
                fs.mkdirSync(uploadsPath, { recursive: true });
                logger.info(`📁 Directorio de uploads creado: ${uploadsPath}`);
            }
        } catch (error) {
            logger.warn('⚠️  Error creando directorio de uploads', error);
        }
        
        logger.info('✅ Servicios inicializados exitosamente');
        
    } catch (error) {
        logger.warn('⚠️  Error inicializando algunos servicios', error);
        // No es crítico, continuar
    }
}

/**
 * Registra métricas iniciales del sistema
 */
function logInitialMetrics() {
    const metrics = {
        startTime: new Date().toISOString(),
        processId: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memoryUsage: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            unit: 'MB'
        },
        environment: {
            nodeEnv: process.env.NODE_ENV || 'development',
            timezone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    };
    
    logger.info('📊 Métricas del sistema:', metrics);
}

/**
 * Función para mostrar mensaje de bienvenida
 */
function showWelcomeMessage() {
    console.log('\n' + '='.repeat(60));
    console.log('🦷  SISTEMA DENTAL MATCHING v2.0.0');
    console.log('    Arquitectura Clean • Patrones de Desarrollo');
    console.log('='.repeat(60));
    console.log('🏗️  Arquitectura:');
    console.log('    ├── Presentation (Controllers & Routes)');
    console.log('    ├── Application (Services & DTOs)');
    console.log('    ├── Domain (Entities & Business Logic)');
    console.log('    └── Infrastructure (Repositories & DB)');
    console.log('='.repeat(60));
    console.log('🚀  Características:');
    console.log('    ✅ Validación robusta con Joi');
    console.log('    ✅ Manejo centralizado de errores');
    console.log('    ✅ Sistema de logging avanzado');
    console.log('    ✅ Patrón Repository');
    console.log('    ✅ DTOs y sanitización');
    console.log('    ✅ Documentación Swagger');
    console.log('='.repeat(60) + '\n');
}

// Mostrar mensaje de bienvenida solo si no estamos en tests
if (process.env.NODE_ENV !== 'test') {
    showWelcomeMessage();
}

// Iniciar servidor
startServer().catch((error) => {
    logger.error('Error fatal iniciando aplicación', error);
    process.exit(1);
});

module.exports = app;