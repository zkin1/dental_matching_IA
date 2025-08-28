/**
 * DENTAL MATCHING - STRUCTURED LOGGING SYSTEM
 * Winston-based logging with multiple transports and formats
 */

const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

class LoggerService {
  constructor() {
    this.logger = this.createLogger();
    this.setupUncaughtExceptionHandlers();
  }

  /**
   * Create Winston logger instance
   */
  createLogger() {
    const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
    const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

    // Custom format for structured logging
    const structuredFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, userId, requestId, ip, userAgent, method, url, statusCode, responseTime, stack, ...meta }) => {
        const logEntry = {
          timestamp,
          level: level.toUpperCase(),
          service: service || 'dental-matching',
          message,
          ...(userId && { userId }),
          ...(requestId && { requestId }),
          ...(ip && { ip }),
          ...(userAgent && { userAgent }),
          ...(method && { method }),
          ...(url && { url }),
          ...(statusCode && { statusCode }),
          ...(responseTime && { responseTime }),
          ...(stack && { stack }),
          ...meta
        };
        
        try {
          return JSON.stringify(logEntry);
        } catch (error) {
          // Handle circular references by creating a safe version
          const safeEntry = {
            timestamp: logEntry.timestamp,
            level: logEntry.level,
            service: logEntry.service,
            message: logEntry.message,
            error: typeof logEntry.error === 'string' ? logEntry.error : '[Circular Reference Error]',
            stack: typeof logEntry.stack === 'string' ? logEntry.stack : 'Stack trace unavailable'
          };
          return JSON.stringify(safeEntry);
        }
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, service, userId, requestId, method, url, statusCode, responseTime, ...meta }) => {
        let logLine = `${timestamp} ${level}: ${message}`;
        
        if (method && url) {
          logLine += ` | ${method} ${url}`;
        }
        
        if (statusCode) {
          logLine += ` | ${statusCode}`;
        }
        
        if (responseTime) {
          logLine += ` | ${responseTime}ms`;
        }
        
        if (userId) {
          logLine += ` | User: ${userId}`;
        }
        
        if (requestId) {
          logLine += ` | Req: ${requestId.substring(0, 8)}`;
        }
        
        if (Object.keys(meta).length > 0) {
          try {
            logLine += ` | ${JSON.stringify(meta)}`;
          } catch (error) {
            logLine += ` | [Circular Reference in Meta]`;
          }
        }
        
        return logLine;
      })
    );

    // Create transports
    const transports = [];

    // Console transport (development)
    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: logLevel
        })
      );
    }

    // File transports (production)
    if (process.env.NODE_ENV === 'production') {
      // Application logs (daily rotate)
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'app-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: structuredFormat,
          level: logLevel
        })
      );

      // Error logs (daily rotate)
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '90d', // Keep error logs longer
          format: structuredFormat,
          level: 'error'
        })
      );

      // HTTP access logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'access-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '30d',
          format: structuredFormat,
          level: 'http'
        })
      );

      // Security logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'security-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '180d', // Keep security logs for 6 months
          format: structuredFormat,
          level: 'warn'
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: structuredFormat,
      defaultMeta: {
        service: 'dental-matching',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        hostname: require('os').hostname(),
        pid: process.pid
      },
      transports,
      exitOnError: false
    });
  }

  /**
   * Setup uncaught exception and promise rejection handlers
   */
  setupUncaughtExceptionHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        type: 'uncaughtException'
      });
      
      // Graceful shutdown
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      let safeReason = '[Unknown Reason]';
      let safeStack = null;
      
      try {
        if (typeof reason === 'string') {
          safeReason = reason;
        } else if (reason && typeof reason === 'object') {
          safeReason = reason.message || reason.toString() || '[object Object]';
          safeStack = reason.stack || null;
        } else {
          safeReason = String(reason);
        }
      } catch (e) {
        safeReason = '[Error processing rejection reason]';
      }
        
      this.logger.error('Unhandled Promise Rejection', {
        reason: safeReason,
        stack: safeStack,
        promise: '[object Promise]',
        type: 'unhandledRejection'
      });
    });
  }

  /**
   * Create child logger with additional context
   */
  child(meta) {
    return {
      debug: (message, additionalMeta = {}) => this.logger.debug(message, { ...meta, ...additionalMeta }),
      info: (message, additionalMeta = {}) => this.logger.info(message, { ...meta, ...additionalMeta }),
      warn: (message, additionalMeta = {}) => this.logger.warn(message, { ...meta, ...additionalMeta }),
      error: (message, additionalMeta = {}) => this.logger.error(message, { ...meta, ...additionalMeta }),
      http: (message, additionalMeta = {}) => this.logger.http(message, { ...meta, ...additionalMeta })
    };
  }

  /**
   * HTTP request logging middleware
   */
  httpLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Generate request ID
      req.requestId = require('crypto').randomUUID();
      
      // Log request start
      this.logger.http('HTTP Request Started', {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId,
        userId: req.user?.id,
        contentLength: req.get('Content-Length'),
        contentType: req.get('Content-Type'),
        headers: this.sanitizeHeaders(req.headers)
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        const responseTime = Date.now() - startTime;
        
        // Log response safely
        const logger = req.app.locals.logger?.logger || req.app.locals.logger || module.exports;
        logger.http('HTTP Request Completed', {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          responseTime,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          requestId: req.requestId,
          userId: req.user?.id,
          contentLength: res.get('Content-Length'),
          contentType: res.get('Content-Type')
        });

        // Log slow requests
        if (responseTime > 5000) { // 5 seconds
          const logger = req.app.locals.logger?.logger || req.app.locals.logger || module.exports;
          if (logger && typeof logger.warn === 'function') {
            logger.warn('Slow HTTP Request', {
              method: req.method,
              url: req.originalUrl || req.url,
              responseTime,
              statusCode: res.statusCode,
              requestId: req.requestId,
              userId: req.user?.id
            });
          }
        }

        // Log errors
        if (res.statusCode >= 400) {
          const level = res.statusCode >= 500 ? 'error' : 'warn';
          const logger = req.app.locals.logger?.logger || req.app.locals.logger || module.exports;
          if (logger && typeof logger[level] === 'function') {
            logger[level]('HTTP Error Response', {
              method: req.method,
              url: req.originalUrl || req.url,
              statusCode: res.statusCode,
              responseTime,
              requestId: req.requestId,
              userId: req.user?.id,
              ip: req.ip || req.connection.remoteAddress
            });
          }
        }

        originalEnd.call(res, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Error logging middleware
   */
  errorLogger() {
    return (err, req, res, next) => {
      const errorContext = {
        error: err.message,
        stack: err.stack,
        statusCode: err.status || err.statusCode || 500,
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId,
        userId: req.user?.id,
        body: this.sanitizeRequestBody(req.body),
        query: req.query,
        params: req.params
      };

      // Log based on error severity
      if (err.status && err.status < 500) {
        this.logger.warn('Client Error', errorContext);
      } else {
        this.logger.error('Server Error', errorContext);
      }

      next(err);
    };
  }

  /**
   * Security event logger
   */
  logSecurityEvent(event, req, additionalMeta = {}) {
    this.logger.warn('Security Event', {
      event,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl || req.url,
      userId: req.user?.id,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      ...additionalMeta
    });
  }

  /**
   * Authentication logger
   */
  logAuthEvent(event, email, success, req, reason = null) {
    const level = success ? 'info' : 'warn';
    
    this.logger[level]('Authentication Event', {
      event,
      email,
      success,
      reason,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Business logic logger
   */
  logBusinessEvent(event, data = {}) {
    this.logger.info('Business Event', {
      event,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * AI/ML operation logger
   */
  logAIEvent(operation, data = {}) {
    this.logger.info('AI Operation', {
      operation,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Database operation logger
   */
  logDatabaseEvent(operation, table, data = {}) {
    this.logger.debug('Database Operation', {
      operation,
      table,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Performance logger
   */
  logPerformance(operation, duration, data = {}) {
    const level = duration > 5000 ? 'warn' : 'info'; // Warn if over 5 seconds
    
    this.logger[level]('Performance Metric', {
      operation,
      duration,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    const sanitizeObject = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitizeObject(value);
        }
      }
    };
    
    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Log system health check
   */
  logHealthCheck(status, checks = {}) {
    this.logger.info('Health Check', {
      status,
      checks,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Export logs for analysis
   */
  async exportLogs(startDate, endDate, level = 'info') {
    // Implementation for log export functionality
    this.logger.info('Log Export Requested', {
      startDate,
      endDate,
      level,
      timestamp: new Date().toISOString()
    });
  }

  // Direct logger methods
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  http(message, meta = {}) {
    this.logger.http(message, meta);
  }
}

// Create singleton instance
const loggerService = new LoggerService();

module.exports = loggerService;