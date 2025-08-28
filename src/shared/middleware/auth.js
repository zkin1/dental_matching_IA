const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');
const logger = require('../utils/logger');

/**
 * Middleware de autenticación JWT
 * Verifica tokens de acceso y establece req.user
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            throw new UnauthorizedError('Token de acceso requerido');
        }
        
        // SEGURIDAD CRÍTICA: Nunca usar secret hardcodeado
        const secretKey = process.env.JWT_SECRET;
        
        if (!secretKey) {
            logger.error('JWT_SECRET no configurado - aplicación no segura');
            throw new Error('Configuración de seguridad faltante. Configure JWT_SECRET en variables de entorno.');
        }
        
        jwt.verify(token, secretKey, (err, user) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    throw new UnauthorizedError('Token expirado');
                } else if (err.name === 'JsonWebTokenError') {
                    throw new UnauthorizedError('Token inválido');
                } else {
                    throw new UnauthorizedError('Error de verificación del token');
                }
            }
            
            req.user = user;
            logger.debug(`Usuario autenticado: ${user.id} (${user.role})`);
            next();
        });
        
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware de autorización por roles
 * Verifica que el usuario tenga el rol requerido
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError('Usuario no autenticado');
            }
            
            const userRole = req.user.role;
            const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            
            if (!rolesArray.includes(userRole)) {
                logger.warn(`Acceso denegado para usuario ${req.user.id} con rol ${userRole}. Roles permitidos: ${rolesArray.join(', ')}`);
                throw new ForbiddenError(`Acceso denegado. Roles permitidos: ${rolesArray.join(', ')}`);
            }
            
            logger.debug(`Acceso autorizado para usuario ${req.user.id} con rol ${userRole}`);
            next();
            
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware para verificar permisos específicos
 * Verifica que el usuario tenga permisos granulares
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError('Usuario no autenticado');
            }
            
            const userPermissions = req.user.permissions || [];
            
            if (!userPermissions.includes(permission)) {
                logger.warn(`Permiso denegado para usuario ${req.user.id}. Permiso requerido: ${permission}`);
                throw new ForbiddenError(`Permiso requerido: ${permission}`);
            }
            
            logger.debug(`Permiso autorizado para usuario ${req.user.id}: ${permission}`);
            next();
            
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware para verificar propiedad de recursos
 * Verifica que el usuario sea propietario del recurso o tenga rol administrativo
 */
const requireOwnership = (resourceIdParam = 'id') => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError('Usuario no autenticado');
            }
            
            const resourceId = parseInt(req.params[resourceIdParam]);
            const userId = req.user.id;
            const userRole = req.user.role;
            
            // Administradores pueden acceder a cualquier recurso
            if (['admin', 'super_admin'].includes(userRole)) {
                return next();
            }
            
            // Verificar propiedad del recurso
            if (userId !== resourceId) {
                logger.warn(`Acceso denegado para usuario ${userId} intentando acceder al recurso ${resourceId}`);
                throw new ForbiddenError('Solo puedes acceder a tus propios recursos');
            }
            
            next();
            
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware opcional de autenticación
 * Establece req.user si hay token válido, pero no requiere autenticación
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return next();
        }
        
        // SEGURIDAD CRÍTICA: Nunca usar secret hardcodeado
        const secretKey = process.env.JWT_SECRET;
        
        if (!secretKey) {
            logger.error('JWT_SECRET no configurado - aplicación no segura');
            throw new Error('Configuración de seguridad faltante. Configure JWT_SECRET en variables de entorno.');
        }
        
        jwt.verify(token, secretKey, (err, user) => {
            if (!err) {
                req.user = user;
            }
            next();
        });
        
    } catch (error) {
        // En caso de error, continuar sin autenticación
        next();
    }
};

/**
 * Genera un token JWT para un usuario
 */
const generateToken = (user, options = {}) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        permissions: user.permissions || [],
        iat: Math.floor(Date.now() / 1000)
    };
    
    const defaultOptions = {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'dental-matching-system',
        audience: 'dental-matching-users'
    };
    
    const tokenOptions = { ...defaultOptions, ...options };
    
    // SEGURIDAD CRÍTICA: Verificar JWT_SECRET existe
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
        logger.error('JWT_SECRET no configurado para generar token');
        throw new Error('Configuración de seguridad faltante. Configure JWT_SECRET en variables de entorno.');
    }
    
    return jwt.sign(payload, secretKey, tokenOptions);
};

/**
 * Genera token de refresh
 */
const generateRefreshToken = (user) => {
    const payload = {
        id: user.id,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
    };
    
    const secretKey = process.env.JWT_REFRESH_SECRET || 'dental_matching_refresh_secret_dev';
    
    return jwt.sign(payload, secretKey, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
};

/**
 * Verifica token de refresh
 */
const verifyRefreshToken = (token) => {
    const secretKey = process.env.JWT_REFRESH_SECRET || 'dental_matching_refresh_secret_dev';
    return jwt.verify(token, secretKey);
};

/**
 * Middleware de rate limiting por usuario
 */
const userRateLimit = (maxRequests = 1000, windowMinutes = 15) => {
    const userRequests = new Map();
    
    return (req, res, next) => {
        if (!req.user) {
            return next();
        }
        
        const userId = req.user.id;
        const now = Date.now();
        const windowMs = windowMinutes * 60 * 1000;
        
        if (!userRequests.has(userId)) {
            userRequests.set(userId, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        const userLimit = userRequests.get(userId);
        
        if (now > userLimit.resetTime) {
            userRequests.set(userId, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        if (userLimit.count >= maxRequests) {
            logger.warn(`Rate limit excedido para usuario ${userId}`);
            return res.status(429).json({
                success: false,
                error: 'Límite de solicitudes excedido',
                retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
            });
        }
        
        userLimit.count++;
        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole,
    requirePermission,
    requireOwnership,
    optionalAuth,
    generateToken,
    generateRefreshToken,
    verifyRefreshToken,
    userRateLimit
};