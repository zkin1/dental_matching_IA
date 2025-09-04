#!/usr/bin/env node

/**
 * DENTAL MATCHING - SERVIDOR PRINCIPAL UNIFICADO
 * Version 2.0.0 - Arquitectura Clean con compatibilidad legacy
 * 
 * Este servidor unifica:
 * - Sistema legacy (routes/) para compatibilidad
 * - Arquitectura Clean (src/) para funcionalidad avanzada
 * - Servicios enterprise integrados
 */

require('dotenv').config();

// Aplicar patch de logger para producción
require('./src/shared/utils/productionLogger');

// Configurar logging estructurado global
const GlobalLoggerSetup = require('./src/shared/utils/globalLoggerSetup');
GlobalLoggerSetup.setupGlobalLogging();

// Import logger service
const logger = require('./src/infrastructure/logging/logger');

// Importar aplicación enterprise como principal
const app = require('./src/app');

// Configuración del servidor
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

/**
 * Función principal para iniciar el servidor unificado
 */
async function startServer() {
    try {
        // Inicializar servicios enterprise
        await initializeEnterpriseServices();
        
        // Agregar rutas legacy para compatibilidad
        await setupLegacyCompatibility();
        
        // Inicializar y arrancar MatchingScheduler
        console.log('🤖 Inicializando Sistema de Matching Automático...');
        const matchingScheduler = require('./services/MatchingScheduler');
        try {
            await matchingScheduler.initialize();
            await matchingScheduler.start();
            console.log('✅ MatchingScheduler iniciado correctamente');
        } catch (schedulerError) {
            console.warn('⚠️  MatchingScheduler falló al iniciar:', schedulerError.message);
        }
        
        // Iniciar servidor HTTP
        const server = app.listen(PORT, HOST, () => {
            console.log('\n' + '='.repeat(70));
            console.log('🦷  DENTAL MATCHING SYSTEM v2.0.0 - MODERN ENTERPRISE');
            console.log('='.repeat(70));
            console.log(`🚀 Servidor iniciado en http://${HOST}:${PORT}`);
            console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`💡 Health Check: http://${HOST}:${PORT}/api/health`);
            console.log(`🆕 API Enterprise: http://${HOST}:${PORT}/api/patients`);
            console.log(`🔄 API Legacy Moderna: http://${HOST}:${PORT}/api/pacientes`);
            console.log(`📚 Documentación: http://${HOST}:${PORT}/api/docs`);
            console.log('📊 Arquitectura: Enterprise + Adaptadores Modernos');
            console.log('⚡ Tecnologías: async/await, express-validator, Winston');
            console.log('🛡️  Seguridad: JWT, Rate Limiting, CORS, Helmet');
            console.log('🤖 Matching Automático: Habilitado y Programado');
            console.log('='.repeat(70) + '\n');
        });
        
        // Configurar timeout del servidor
        server.timeout = parseInt(process.env.SERVER_TIMEOUT) || 30000;
        
        // Guardar referencia global para graceful shutdown
        global.httpServer = server;
        
        // Manejar errores del servidor
        server.on('error', handleServerError);
        
    } catch (error) {
        console.error('❌ Error crítico iniciando servidor:', error);
        process.exit(1);
    }
}

/**
 * Ejecutar migraciones automáticas en startup
 */
async function runAutomaticMigrations() {
    try {
        console.log('🗄️  Verificando migraciones de base de datos...');
        
        const { getConnection } = require('./config/database');
        const MigrationManager = require('./src/infrastructure/database/migrationManager');
        
        const db = await getConnection();
        const migrationManager = new MigrationManager(db);
        await migrationManager.initialize();

        // Verificar si hay migraciones pendientes
        const status = await migrationManager.getStatus();
        
        if (status.pending > 0) {
            console.log(`🔄 Ejecutando ${status.pending} migración(es) pendiente(s)...`);
            
            const result = await migrationManager.migrate();
            
            console.log('✅ Migraciones automáticas completadas:');
            result.migrations.forEach(migration => {
                console.log(`   ✓ ${migration.version} - ${migration.name}`);
            });
        } else {
            console.log('✅ Base de datos actualizada (sin migraciones pendientes)');
        }

        // Validar integridad
        const integrity = await migrationManager.validateIntegrity();
        if (!integrity.valid) {
            console.warn('⚠️  Problemas de integridad detectados en migraciones');
            integrity.issues.forEach(issue => {
                console.warn(`   - ${issue.type}: ${issue.version}`);
            });
        }

    } catch (error) {
        console.error('❌ Error en migraciones automáticas:', error.message);
        // No fallar el servidor por problemas de migración
        console.log('🔄 Continuando sin migraciones...');
    }
}

/**
 * Inicializar servicios enterprise
 */
async function initializeEnterpriseServices() {
    console.log('🔧 Inicializando servicios enterprise...');
    
    try {
        // Inicializar base de datos unificada
        const databaseService = require('./src/infrastructure/database/databaseService');
        await databaseService.initialize();
        console.log('✅ Base de datos enterprise inicializada');

        // Ejecutar migraciones automáticamente
        await runAutomaticMigrations();
        
        // Inicializar cache Redis
        const cacheService = require('./src/infrastructure/cache/cacheService');
        await cacheService.initialize();
        console.log('✅ Cache Redis inicializado');
        
        // Inicializar health checks
        const healthChecker = require('./src/infrastructure/health/healthChecker');
        healthChecker.registerDefaultChecks();
        
        // Agregar health check para cache
        healthChecker.register('cache', async () => {
            return await cacheService.healthCheck();
        }, { critical: false });
        
        // Agregar health check para base de datos  
        healthChecker.register('database', async () => {
            return await databaseService.performHealthCheck();
        }, { critical: true });
        
        console.log('✅ Health checks configurados');
        
        // Inicializar métricas del sistema
        const systemMetrics = require('./src/infrastructure/health/systemMetrics');
        systemMetrics.registerDefaultCollectors();
        systemMetrics.start();
        console.log('✅ Métricas del sistema iniciadas');
        
    } catch (error) {
        console.error('⚠️  Error inicializando servicios enterprise:', error.message);
        console.log('🔄 Continuando con servicios básicos...');
    }
}

/**
 * Configurar rutas adicionales
 */
async function setupLegacyCompatibility() {
    console.log('🔄 Configurando rutas adicionales...');
    
    // Matching: Rate limiting relajado para desarrollo
    const rateLimit = require('express-rate-limit');
    const matchingLimiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minuto
        max: process.env.NODE_ENV === 'development' ? 10000 : 5, // 10000 en dev, 5 en prod
        message: {
            success: false,
            error: 'MATCHING_RATE_LIMIT_EXCEEDED',
            message: 'Operación de matching limitada por recursos intensivos'
        }
    });
    
    try {
        const matchingRoutes = require('./routes/matching');
        app.use('/api/matching', matchingLimiter, matchingRoutes);
        console.log('✅ Ruta de matching configurada con rate limiting estricto');
    } catch (matchingError) {
        console.warn('⚠️  Error montando ruta de matching:', matchingError.message);
    }

    // Ruta de test para matching IA v3.0
    try {
        const matchingTestRoutes = require('./routes/matching-test');
        app.use('/api/test-matching', matchingTestRoutes);
        console.log('✅ Ruta de test matching IA v3.0 configurada');
    } catch (testError) {
        console.warn('⚠️  Error montando ruta de test:', testError.message);
    }
    
    // Ruta de dashboard
    try {
        const dashboardRoutes = require('./routes/dashboard');
        app.use('/api/dashboard', dashboardRoutes);
        console.log('✅ Ruta de dashboard configurada');
    } catch (dashboardError) {
        console.warn('⚠️  Error montando ruta de dashboard:', dashboardError.message);
    }
    
    // Ruta para estudiantes (consulta de pacientes por código)
    try {
        const studentRoutes = require('./routes/student');
        app.use('/api/student', studentRoutes);
        console.log('✅ Ruta de estudiantes configurada');
    } catch (studentError) {
        console.warn('⚠️  Error montando ruta de estudiantes:', studentError.message);
    }
    
    console.log('✅ Configuración de rutas completada');
}

/**
 * Manejar errores del servidor
 */
function handleServerError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    
    const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Puerto ${PORT}`;
    
    switch (error.code) {
        case 'EACCES':
            console.error(`❌ ${bind} requiere privilegios elevados`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`❌ ${bind} ya está en uso`);
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Graceful shutdown
 */
function gracefulShutdown(signal) {
    console.log(`\n📛 Recibida señal ${signal}, cerrando servidor...`);
    
    if (global.httpServer) {
        global.httpServer.close(() => {
            console.log('✅ Servidor HTTP cerrado');
            process.exit(0);
        });
        
        // Forzar cierre si no responde en 10 segundos
        setTimeout(() => {
            console.error('❌ Forzando cierre del servidor');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
}

// Configurar manejo de señales
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    // Check if it's a Redis connection error
    const isRedisError = reason && (
        reason.message?.includes('ECONNREFUSED') || 
        reason.message?.includes('max retries per request') ||
        reason.message?.includes('Redis') ||
        reason.code === 'ECONNREFUSED'
    );
    
    if (isRedisError) {
        console.warn('⚠️  Redis connection issue (non-fatal):', reason.message || reason);
        logger.warn('Redis connection error handled gracefully', {
            error: reason.message || String(reason),
            type: 'redis_connection_error'
        });
        return; // Don't shutdown for Redis errors
    }
    
    console.error('❌ Promise rechazada no manejada:', { reason, promise });
    logger.error('Recibida señal unhandledRejection, iniciando cierre graceful...');
    gracefulShutdown('unhandledRejection');
});

// Iniciar servidor unificado
startServer().catch((error) => {
    console.error('❌ Error fatal iniciando aplicación:', error);
    process.exit(1);
});

module.exports = app;