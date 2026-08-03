// Aplicar patch de logger para producción ANTES de cualquier import
require('./shared/utils/productionLogger');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Importar middleware personalizado
const { errorHandler, notFoundHandler } = require('./shared/middleware/errorHandler');
const { requestLogger } = require('./shared/utils/logger');
const logger = require('./shared/utils/logger');

// Importar servicios enterprise
const securityConfig = require('./infrastructure/security/securityConfig');
const inputSanitizer = require('./infrastructure/security/inputSanitizer');
const rateLimiter = require('./infrastructure/security/rateLimiter');
const { Validator } = require('./infrastructure/validation/validator');

// Importar rutas
const apiRoutes = require('./presentation/routes');

// Crear aplicación Express
const app = express();

// Configurar cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());

/**
 * CONFIGURACIÓN DE MIDDLEWARE DE SEGURIDAD ENTERPRISE
 */

// Configurar seguridad completa con Helmet y CORS enterprise
securityConfig.setupSecurity(app);

// Compresión gzip
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

/**
 * CONFIGURACIÓN DE RATE LIMITING ENTERPRISE
 */

// Usar rate limiting avanzado enterprise
app.use(rateLimiter.standardLimiter());

// Rate limiting para autenticación
app.use('/api/auth', rateLimiter.authLimiter());

// Rate limiting para matching AI
app.use('/api/matching', rateLimiter.matchingLimiter());
app.use('/api/ai', rateLimiter.matchingLimiter());

/**
 * CONFIGURACIÓN DE PARSEO DE DATOS CON SANITIZACIÓN
 */

// Parseo JSON con límite de tamaño
app.use(express.json({ 
    limit: process.env.JSON_LIMIT || '10mb',
    verify: (req, res, buf) => {
        // Validar que el JSON no esté vacío en POST/PUT
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && buf.length === 0) {
            throw new Error('Cuerpo de la solicitud vacío');
        }
    }
}));

// Parseo URL-encoded
app.use(express.urlencoded({ 
    extended: true, 
    limit: process.env.JSON_LIMIT || '10mb'
}));

// Sanitización automática de inputs
app.use(inputSanitizer.sanitizeUserInput());

/**
 * CONFIGURACIÓN DE LOGGING ENTERPRISE
 */

// Usar logger enterprise de Winston
const loggerService = require('./infrastructure/logging/logger');

// Middleware de logging HTTP enterprise
app.use(loggerService.httpLogger());

// Log de inicio de aplicación con request ID
app.use((req, res, next) => {
    // Agregar ID único a cada request para trazabilidad
    req.requestId = require('crypto').randomUUID();
    
    // Agregar información del request al logger
    res.locals.requestId = req.requestId;
    
    next();
});

/**
 * CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS
 */

// Servir frontend React (client/dist) o fallback a public/
const path = require('path');
const clientDist = path.join(__dirname, '..', 'client', 'dist');
const publicDir = path.join(__dirname, '..', 'public');

// Intentar servir desde client/dist (React build), fallback a public/
const fs = require('fs');
const frontendDir = fs.existsSync(clientDist) ? clientDist : publicDir;

app.use(express.static(frontendDir, {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : '0',
    etag: true,
    lastModified: true
}));

/**
 * RUTAS PRINCIPALES
 */

// Ruta de API info (mantener para compatibilidad)
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Bienvenido a la API del Sistema Dental Matching',
        version: '2.0.0',
        documentation: '/api/docs',
        endpoints: {
            health: '/api/health',
            info: '/api/info',
            routes: '/api/routes'
        },
        timestamp: new Date().toISOString()
    });
});

// Health check simple
app.get('/health', async (req, res) => {
    const healthInfo = {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
        },
        system: {
            node: process.version,
            platform: process.platform,
            environment: process.env.NODE_ENV || 'development'
        }
    };

    // Verificar conexión a base de datos
    try {
        const dbHealth = await databaseService.performHealthCheck();
        healthInfo.database = { 
            status: dbHealth.status === 'healthy' ? 'connected' : 'disconnected',
            responseTime: dbHealth.responseTime,
            connections: dbHealth.connections
        };
        if (dbHealth.status !== 'healthy') {
            healthInfo.status = 'degraded';
        }
    } catch (error) {
        healthInfo.database = { status: 'disconnected', error: error.message };
        healthInfo.status = 'degraded';
        logger.warn('Database health check failed', error);
    }

    const statusCode = healthInfo.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthInfo);
});

/**
 * REGISTRO DE RUTAS API CON SERVICIOS ENTERPRISE
 */

// Aplicar rate limiting estricto a operaciones críticas
app.use('/api/patients', rateLimiter.strictLimiter());
app.use('/api/students', rateLimiter.strictLimiter());
app.use('/api/assignments/manual', rateLimiter.strictLimiter());

// Servicio de base de datos unificado y simplificado
const databaseService = require('../config/database');

// Inicializar servicio de base de datos al arranque
(async () => {
    try {
        await databaseService.instance.initialize();
        loggerService.info('Database service ready');
    } catch (error) {
        loggerService.error('Failed to initialize database service', error);
        // No fallar aquí, permitir lazy initialization
    }
})();

app.use(databaseService.middleware());

// Registrar todas las rutas API
app.use('/api', apiRoutes);

/**
 * RUTAS DE DATOS (pacientes, estudiantes, asignaciones)
 */
try {
    const pacientesRoutes = require('../routes/pacientes');
    const estudiantesRoutes = require('../routes/estudiantes');
    const asignacionesRoutes = require('../routes/asignaciones');

    app.use('/api/pacientes', pacientesRoutes);
    app.use('/api/estudiantes', estudiantesRoutes);
    app.use('/api/asignaciones', asignacionesRoutes);

    loggerService.info('Data routes mounted successfully', {
        routes: ['/api/pacientes', '/api/estudiantes', '/api/asignaciones']
    });
} catch (routeError) {
    loggerService.warn('Failed to mount data routes', { error: routeError.message });
}

/**
 * MANEJO DE ERRORES ENTERPRISE
 */

// Middleware de logging de errores enterprise
app.use(loggerService.errorLogger());

// SPA catch-all: serve index.html for non-API routes (React Router)
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const indexPath = path.join(frontendDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        next();
    }
});

// Middleware para rutas no encontradas
app.use(notFoundHandler);

// Middleware de manejo de errores centralizado
app.use(errorHandler);

/**
 * MANEJO DE SEÑALES DEL SISTEMA
 */

// Graceful shutdown
const gracefulShutdown = (signal) => {
    logger.info(`Recibida señal ${signal}, iniciando cierre graceful...`);
    
    // Cerrar servidor HTTP
    if (global.httpServer) {
        global.httpServer.close(() => {
            logger.info('Servidor HTTP cerrado');
            
            // Cerrar conexiones de base de datos
            databaseService.closePool().then(() => {
                logger.info('Database service closed');
                process.exit(0);
            }).catch((error) => {
                logger.error('Error closing database service', error);
                process.exit(1);
            });
        });
        
        // Forzar cierre si no responde en 10 segundos
        setTimeout(() => {
            logger.error('Forzando cierre del servidor');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
    logger.error('Excepción no capturada', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promise rechazada no manejada', { reason, promise });
    gracefulShutdown('unhandledRejection');
});

module.exports = app;