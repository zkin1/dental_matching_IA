const { AppError, ValidationError, DatabaseError } = require('../errors/AppError');
const logger = require('../utils/logger');

/**
 * Middleware para manejo centralizado de errores
 */
const errorHandler = (error, req, res, next) => {
    let appError = error;
    
    // Convertir errores conocidos a AppError
    if (!error.isOperational) {
        appError = convertToAppError(error);
    }
    
    // Logging del error
    logError(error, req);
    
    // En desarrollo, mostrar stack trace
    const response = {
        success: false,
        error: {
            message: appError.message,
            statusCode: appError.statusCode,
            errorCode: appError.errorCode,
            timestamp: appError.timestamp
        }
    };
    
    // Incluir detalles adicionales según el tipo de error
    if (appError instanceof ValidationError && appError.errors) {
        response.error.validationErrors = appError.errors;
    }
    
    // En desarrollo, incluir stack trace
    if (process.env.NODE_ENV === 'development') {
        response.error.stack = error.stack;
        
        // Incluir detalles del error original si existe
        if (appError.originalError) {
            response.error.originalError = appError.originalError;
        }
    }
    
    // Headers especiales para ciertos tipos de error
    if (appError.errorCode === 'RATE_LIMIT_ERROR' && appError.retryAfter) {
        res.set('Retry-After', appError.retryAfter);
    }
    
    res.status(appError.statusCode).json(response);
};

/**
 * Convierte errores nativos a AppError
 */
function convertToAppError(error) {
    // Error de validación de Joi
    if (error.isJoi) {
        const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
        }));
        
        return new ValidationError('Error de validación', validationErrors);
    }
    
    // Errores de MySQL
    if (error.code) {
        switch (error.code) {
            case 'ER_DUP_ENTRY':
                return new DatabaseError('Registro duplicado', error);
            case 'ER_NO_SUCH_TABLE':
                return new DatabaseError('Tabla no encontrada', error);
            case 'ER_BAD_FIELD_ERROR':
                return new DatabaseError('Campo no válido', error);
            case 'ECONNREFUSED':
                return new DatabaseError('Error de conexión a la base de datos', error);
            case 'ER_ACCESS_DENIED_ERROR':
                return new DatabaseError('Acceso denegado a la base de datos', error);
            default:
                return new DatabaseError('Error de base de datos', error);
        }
    }
    
    // Error de sintaxis JSON
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return new ValidationError('JSON inválido en el cuerpo de la solicitud');
    }
    
    // Errores de casting de MongoDB/Mongoose (si se usa en el futuro)
    if (error.name === 'CastError') {
        return new ValidationError(`Valor inválido para el campo ${error.path}`);
    }
    
    // Error genérico del servidor
    return new AppError(
        process.env.NODE_ENV === 'production' ? 
            'Error interno del servidor' : 
            error.message,
        500,
        'INTERNAL_SERVER_ERROR',
        false
    );
}

/**
 * Registra el error en los logs
 */
function logError(error, req) {
    const logData = {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        request: {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        },
        timestamp: new Date().toISOString()
    };
    
    // Incluir body de la request (excepto passwords)
    if (req.body && Object.keys(req.body).length > 0) {
        logData.request.body = sanitizeRequestBody(req.body);
    }
    
    // Incluir parámetros de la URL
    if (req.params && Object.keys(req.params).length > 0) {
        logData.request.params = req.params;
    }
    
    // Incluir query parameters
    if (req.query && Object.keys(req.query).length > 0) {
        logData.request.query = req.query;
    }
    
    // Log según la severidad
    if (error.isOperational) {
        if (error.statusCode >= 500) {
            logger.error('Error operacional del servidor', logData);
        } else if (error.statusCode >= 400) {
            logger.warn('Error operacional del cliente', logData);
        } else {
            logger.info('Error operacional menor', logData);
        }
    } else {
        logger.error('Error no manejado', logData);
    }
}

/**
 * Sanitiza el cuerpo de la request para logging
 */
function sanitizeRequestBody(body) {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    
    return sanitized;
}

/**
 * Middleware para manejar rutas no encontradas
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Ruta ${req.originalUrl} no encontrada`,
        404,
        'ROUTE_NOT_FOUND'
    );
    
    next(error);
};

/**
 * Wrapper para funciones async que automáticamente captura errores
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler
};