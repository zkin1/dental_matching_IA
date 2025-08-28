/**
 * MODERN LEGACY ADAPTER
 * Adaptadores modernos para compatibilidad con endpoints legacy
 * Usa async/await, APIs actuales y mejores prácticas
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');

class ModernLegacyAdapter {
    constructor(enterpriseController, routeName) {
        this.controller = enterpriseController;
        this.routeName = routeName;
        this.router = express.Router();
        this.logger = require('../infrastructure/logging/logger').child({ 
            component: `modern-legacy-${routeName}` 
        });
        
        this.setupMiddleware();
    }

    /**
     * Configurar middleware moderno para el adapter
     */
    setupMiddleware() {
        // Compression para responses
        this.router.use(compression({
            filter: (req, res) => {
                if (req.headers['x-no-compression']) return false;
                return compression.filter(req, res);
            },
            level: 6,
            threshold: 1024
        }));

        // Headers de seguridad específicos para legacy
        this.router.use(helmet({
            contentSecurityPolicy: false, // Legacy clients might not support CSP
            crossOriginEmbedderPolicy: false
        }));

        // Middleware de deprecation warning
        this.router.use(this.deprecationMiddleware());

        // Request/Response interceptor para logging
        this.router.use(this.requestInterceptor());
    }

    /**
     * Middleware de advertencia de deprecación
     */
    deprecationMiddleware() {
        return async (req, res, next) => {
            const deprecationDate = new Date();
            deprecationDate.setMonth(deprecationDate.getMonth() + 6);

            // Headers estándar de deprecación
            res.setHeader('Deprecation', 'true');
            res.setHeader('Sunset', deprecationDate.toISOString());
            res.setHeader('Link', '</api/docs/migration>; rel="help"; title="Migration Guide"');
            res.setHeader('Warning', '299 - "Deprecated API. Migrate to /api/v2 endpoints"');

            // Log estructurado de uso de API deprecated
            this.logger.warn('Legacy API endpoint accessed', {
                endpoint: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.user?.id,
                deprecation: true,
                sunsetDate: deprecationDate.toISOString()
            });

            next();
        };
    }

    /**
     * Interceptor de requests para logging y métricas
     */
    requestInterceptor() {
        return async (req, res, next) => {
            const startTime = process.hrtime.bigint();
            
            // Override res.json para interceptar responses
            const originalJson = res.json;
            res.json = function(body) {
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1000000; // Convert to ms

                // Log performance
                req.app.locals.modernAdapter?.logger.info('Legacy API Response', {
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    responseTime: duration,
                    responseSize: JSON.stringify(body).length,
                    userId: req.user?.id,
                    requestId: req.requestId
                });

                return originalJson.call(this, body);
            };

            // Store adapter reference for logging
            req.app.locals.modernAdapter = this;
            next();
        };
    }

    /**
     * Crear validadores modernos con express-validator
     */
    createValidators() {
        return {
            // Validador de ID de parámetros
            idParam: () => [
                param('id')
                    .isInt({ min: 1 })
                    .withMessage('ID debe ser un número entero positivo')
                    .toInt()
            ],

            // Validador de paginación
            pagination: () => [
                query('page')
                    .optional()
                    .isInt({ min: 1 })
                    .withMessage('Page debe ser mayor a 0')
                    .toInt(),
                query('limit')
                    .optional()
                    .isInt({ min: 1, max: 100 })
                    .withMessage('Limit debe ser entre 1 y 100')
                    .toInt(),
                query('offset')
                    .optional()
                    .isInt({ min: 0 })
                    .withMessage('Offset debe ser mayor o igual a 0')
                    .toInt()
            ],

            // Validador de filtros comunes
            commonFilters: () => [
                query('ciudad')
                    .optional()
                    .isLength({ min: 2, max: 50 })
                    .trim()
                    .escape(),
                query('estado')
                    .optional()
                    .isIn(['pendiente', 'asignado', 'completado', 'cancelado'])
                    .withMessage('Estado inválido'),
                query('prioridad')
                    .optional()
                    .isIn(['baja', 'moderada', 'alta', 'muy_alta'])
                    .withMessage('Prioridad inválida')
            ]
        };
    }

    /**
     * Handler de errores de validación
     */
    handleValidationErrors() {
        return async (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                this.logger.warn('Validation errors in legacy endpoint', {
                    errors: errors.array(),
                    url: req.originalUrl,
                    method: req.method,
                    body: req.body,
                    query: req.query,
                    params: req.params
                });

                return res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Datos de entrada inválidos',
                    details: errors.array().map(err => ({
                        field: err.path || err.param,
                        message: err.msg,
                        value: err.value
                    })),
                    timestamp: new Date().toISOString()
                });
            }
            next();
        };
    }

    /**
     * Wrapper moderno para controladores enterprise
     */
    wrapController(controllerMethod) {
        return async (req, res, next) => {
            try {
                // Validate controller method exists
                if (!controllerMethod || typeof controllerMethod !== 'function') {
                    throw new Error(`Controller method is not defined or not a function`);
                }

                // Validate controller instance exists
                if (!this.controller) {
                    throw new Error('Controller instance is not defined');
                }

                // Transformar request a formato enterprise
                const enterpriseReq = this.transformRequest(req);
                
                // Crear response handler moderno
                const enterpriseRes = this.createEnterpriseResponse(res);

                // Ejecutar método del controlador enterprise
                await controllerMethod.bind(this.controller)(enterpriseReq, enterpriseRes, next);
            } catch (error) {
                this.handleError(error, req, res, next);
            }
        };
    }

    /**
     * Transformar request legacy a formato enterprise
     */
    transformRequest(req) {
        return {
            ...req,
            // Transformar parámetros legacy a enterprise
            query: {
                ...req.query,
                // Mapear parámetros legacy a enterprise
                ...(req.query.page && { page: parseInt(req.query.page) }),
                ...(req.query.limit && { limit: parseInt(req.query.limit) }),
                ...(req.query.offset && { offset: parseInt(req.query.offset) })
            },
            body: {
                ...req.body,
                // Transformaciones específicas si son necesarias
            }
        };
    }

    /**
     * Crear response wrapper para formato legacy
     */
    createEnterpriseResponse(res) {
        const legacyResponse = { ...res };
        
        // Override json method para transformar respuesta enterprise a legacy
        legacyResponse.json = (data) => {
            const legacyData = this.transformResponseToLegacy(data);
            return res.json(legacyData);
        };

        return legacyResponse;
    }

    /**
     * Transformar respuesta enterprise a formato legacy
     */
    transformResponseToLegacy(data) {
        // Si la respuesta enterprise tiene formato específico, transformar
        if (data && typeof data === 'object') {
            return {
                success: true,
                ...data,
                // Mantener compatibilidad con formato legacy esperado
                timestamp: new Date().toISOString()
            };
        }
        
        return {
            success: true,
            data,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Handler moderno de errores
     */
    handleError(error, req, res, next) {
        this.logger.error('Error in modern legacy adapter', {
            error: error.message,
            stack: error.stack,
            url: req.originalUrl,
            method: req.method,
            userId: req.user?.id,
            requestId: req.requestId,
            body: req.body,
            query: req.query,
            params: req.params
        });

        // Respuesta de error en formato legacy
        const statusCode = error.statusCode || error.status || 500;
        const errorResponse = {
            success: false,
            error: error.code || 'INTERNAL_ERROR',
            message: error.message || 'Error interno del servidor',
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        };

        // En desarrollo, incluir stack trace
        if (process.env.NODE_ENV === 'development') {
            errorResponse.stack = error.stack;
        }

        res.status(statusCode).json(errorResponse);
    }

    /**
     * Crear rate limiter específico para este adapter
     */
    createRateLimiter(options = {}) {
        const defaultOptions = {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100,
            message: {
                success: false,
                error: 'RATE_LIMIT_EXCEEDED',
                message: 'Demasiadas peticiones. Intente más tarde.',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => {
                // Skip para IPs de confianza
                const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
                return trustedIPs.includes(req.ip);
            },
            handler: (req, res) => {
                this.logger.warn('Rate limit exceeded in legacy adapter', {
                    ip: req.ip,
                    url: req.originalUrl,
                    userAgent: req.get('User-Agent'),
                    userId: req.user?.id
                });

                res.status(429).json({
                    success: false,
                    error: 'RATE_LIMIT_EXCEEDED',
                    message: 'Demasiadas peticiones desde esta IP',
                    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
                    limit: req.rateLimit.limit,
                    remaining: req.rateLimit.remaining,
                    timestamp: new Date().toISOString()
                });
            }
        };

        return rateLimit({ ...defaultOptions, ...options });
    }

    /**
     * Obtener router configurado
     */
    getRouter() {
        return this.router;
    }
}

module.exports = ModernLegacyAdapter;