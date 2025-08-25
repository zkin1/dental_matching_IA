/**
 * Sistema de logging mejorado para Dental Matching System
 * Incluye diferentes niveles de log y rotación de archivos
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logFilePath = process.env.LOG_FILE_PATH || './logs/app.log';
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = 5;
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        this.ensureLogDirectory();
    }

    /**
     * Asegura que el directorio de logs exista
     */
    ensureLogDirectory() {
        const logDir = path.dirname(this.logFilePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    /**
     * Escribe log al archivo
     */
    writeToFile(level, message, data = null) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level: level.toUpperCase(),
                message,
                data,
                pid: process.pid
            };

            const logLine = JSON.stringify(logEntry) + '\n';
            
            // Verificar tamaño del archivo antes de escribir
            if (fs.existsSync(this.logFilePath)) {
                const stats = fs.statSync(this.logFilePath);
                if (stats.size > this.maxLogSize) {
                    this.rotateLogs();
                }
            }

            fs.appendFileSync(this.logFilePath, logLine);
        } catch (error) {
            console.error('Error escribiendo log:', error.message);
        }
    }

    /**
     * Rota los archivos de log
     */
    rotateLogs() {
        try {
            for (let i = this.maxLogFiles - 1; i > 0; i--) {
                const oldFile = `${this.logFilePath}.${i}`;
                const newFile = `${this.logFilePath}.${i + 1}`;
                
                if (fs.existsSync(oldFile)) {
                    if (i === this.maxLogFiles - 1) {
                        fs.unlinkSync(oldFile);
                    } else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }
            
            if (fs.existsSync(this.logFilePath)) {
                fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
            }
        } catch (error) {
            console.error('Error rotando logs:', error.message);
        }
    }

    /**
     * Log de error
     */
    error(message, data = null) {
        if (this.levels[this.logLevel] >= this.levels.error) {
            console.error(`❌ ${message}`, data || '');
            this.writeToFile('error', message, data);
        }
    }

    /**
     * Log de advertencia
     */
    warn(message, data = null) {
        if (this.levels[this.logLevel] >= this.levels.warn) {
            console.warn(`⚠️ ${message}`, data || '');
            this.writeToFile('warn', message, data);
        }
    }

    /**
     * Log de información
     */
    info(message, data = null) {
        if (this.levels[this.logLevel] >= this.levels.info) {
            console.info(`ℹ️ ${message}`, data || '');
            this.writeToFile('info', message, data);
        }
    }

    /**
     * Log de debug
     */
    debug(message, data = null) {
        if (this.levels[this.logLevel] >= this.levels.debug) {
            console.debug(`🔍 ${message}`, data || '');
            this.writeToFile('debug', message, data);
        }
    }

    /**
     * Log de éxito
     */
    success(message, data = null) {
        if (this.levels[this.logLevel] >= this.levels.info) {
            console.log(`✅ ${message}`, data || '');
            this.writeToFile('info', `SUCCESS: ${message}`, data);
        }
    }

    /**
     * Log de request HTTP
     */
    logRequest(req, res, next) {
        const start = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            const logData = {
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                contentLength: req.headers['content-length'] || 0
            };

            if (res.statusCode >= 400) {
                this.warn(`HTTP ${req.method} ${req.originalUrl || req.url} - ${res.statusCode}`, logData);
            } else {
                this.info(`HTTP ${req.method} ${req.originalUrl || req.url} - ${res.statusCode}`, logData);
            }
        });

        next();
    }

    /**
     * Log de error de base de datos
     */
    logDatabaseError(error, query = null, params = null) {
        this.error('Error de base de datos', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            query: query ? query.substring(0, 200) + '...' : null,
            params: params ? params.slice(0, 5) : null
        });
    }

    /**
     * Log de operación de matching
     */
    logMatching(operation, data) {
        this.info(`Matching: ${operation}`, data);
    }

    /**
     * Log de notificación
     */
    logNotification(type, recipient, result) {
        this.info(`Notificación ${type} enviada a ${recipient}`, result);
    }

    /**
     * Log de sincronización
     */
    logSync(operation, result) {
        this.info(`Sincronización: ${operation}`, result);
    }

    /**
     * Obtener estadísticas de logs
     */
    getLogStats() {
        try {
            if (!fs.existsSync(this.logFilePath)) {
                return { totalLines: 0, fileSize: 0, lastModified: null };
            }

            const stats = fs.statSync(this.logFilePath);
            const content = fs.readFileSync(this.logFilePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim().length > 0);

            return {
                totalLines: lines.length,
                fileSize: stats.size,
                lastModified: stats.mtime,
                logLevel: this.logLevel
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Limpiar logs antiguos
     */
    cleanOldLogs(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            let cleanedCount = 0;
            
            for (let i = 1; i <= this.maxLogFiles; i++) {
                const logFile = `${this.logFilePath}.${i}`;
                if (fs.existsSync(logFile)) {
                    const stats = fs.statSync(logFile);
                    if (stats.mtime < cutoffDate) {
                        fs.unlinkSync(logFile);
                        cleanedCount++;
                    }
                }
            }
            
            this.info(`Logs antiguos limpiados: ${cleanedCount} archivos eliminados`);
            return { cleaned: cleanedCount };
        } catch (error) {
            this.error('Error limpiando logs antiguos:', error.message);
            return { error: error.message };
        }
    }
}

module.exports = new Logger();
