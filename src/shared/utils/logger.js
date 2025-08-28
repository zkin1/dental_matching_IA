/**
 * DENTAL MATCHING - LOGGER WRAPPER ENTERPRISE
 * Wrapper para mantener compatibilidad con sistema legacy
 * mientras se usa el sistema enterprise de logging
 */

// Usar el logger enterprise como principal
const loggerService = require('../../infrastructure/logging/logger');

/**
 * Wrapper class para compatibilidad con API legacy
 */
class LegacyLoggerWrapper {
    constructor() {
        // Mantener compatibilidad con propiedades legacy
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
    }

    // Métodos de logging que delegan al servicio enterprise
    error(message, data = null) {
        loggerService.error(message, data);
    }

    warn(message, data = null) {
        loggerService.warn(message, data);
    }

    info(message, data = null) {
        loggerService.info(message, data);
    }

    debug(message, data = null) {
        loggerService.debug(message, data);
    }

    // Métodos específicos para compatibilidad legacy
    http(req, res, duration) {
        const logData = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        };
        
        const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;
        
        if (res.statusCode >= 500) {
            this.error(message, logData);
        } else if (res.statusCode >= 400) {
            this.warn(message, logData);
        } else {
            this.info(message, logData);
        }
    }

    database(operation, table, duration, error = null) {
        loggerService.logDatabaseEvent(operation, table, {
            duration: `${duration}ms`,
            error: error ? error.message : null
        });
    }

    matching(action, data) {
        loggerService.logBusinessEvent('AI_MATCHING', {
            action,
            ...data
        });
    }

    cleanOldLogs(daysToKeep = 30) {
        loggerService.info('Log cleanup requested (handled by enterprise system)', { 
            retentionDays: daysToKeep 
        });
        // La limpieza automática se maneja en el logger enterprise
    }

    getLogStats() {
        // Delegado al sistema enterprise - podría implementarse si es necesario
        loggerService.info('Log stats requested');
        return {
            message: 'Stats handled by enterprise logging system',
            useHealthCheck: '/api/health for system metrics'
        };
    }
}

// Crear instancia singleton
const logger = new LegacyLoggerWrapper();

// Limpiar logs antiguos al iniciar (solo en producción)
if (process.env.NODE_ENV === 'production') {
    logger.cleanOldLogs(30);
}

// Middleware de logging de requests
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(req, res, duration);
    });
    
    next();
};

module.exports = logger;
module.exports.requestLogger = requestLogger;