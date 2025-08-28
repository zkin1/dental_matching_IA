/**
 * GLOBAL LOGGER SETUP
 * Configura logging estructurado para toda la aplicación
 */

const loggerService = require('../../infrastructure/logging/logger');

class GlobalLoggerSetup {
    /**
     * Configurar logging para toda la aplicación
     */
    static setupGlobalLogging() {
        // Override console methods en producción para asegurar logging estructurado
        if (process.env.NODE_ENV === 'production') {
            console.log = (message, ...args) => {
                loggerService.info(message, { args });
            };

            console.error = (message, ...args) => {
                loggerService.error(message, { args });
            };

            console.warn = (message, ...args) => {
                loggerService.warn(message, { args });
            };

            console.debug = (message, ...args) => {
                loggerService.debug(message, { args });
            };
        }

        // Log aplicación iniciada
        loggerService.info('Global structured logging configured', {
            environment: process.env.NODE_ENV,
            logLevel: process.env.LOG_LEVEL,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Crear logger para un módulo específico
     */
    static createModuleLogger(moduleName) {
        return loggerService.child({ module: moduleName });
    }

    /**
     * Log métricas de performance
     */
    static logPerformance(operation, startTime, metadata = {}) {
        const duration = Date.now() - startTime;
        loggerService.logPerformance(operation, duration, metadata);
    }

    /**
     * Log eventos de seguridad
     */
    static logSecurityEvent(event, req, metadata = {}) {
        loggerService.logSecurityEvent(event, req, metadata);
    }

    /**
     * Log eventos de autenticación
     */
    static logAuthEvent(event, email, success, req, reason = null) {
        loggerService.logAuthEvent(event, email, success, req, reason);
    }

    /**
     * Log eventos de negocio críticos
     */
    static logBusinessEvent(event, metadata = {}) {
        loggerService.logBusinessEvent(event, {
            ...metadata,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = GlobalLoggerSetup;