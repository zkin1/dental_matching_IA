/**
 * Clase base para errores de la aplicación
 */
class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = null, isOperational = true) {
        super(message);
        
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            errorCode: this.errorCode,
            timestamp: this.timestamp,
            isOperational: this.isOperational
        };
    }
}

/**
 * Errores de validación (400)
 */
class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            errors: this.errors
        };
    }
}

/**
 * Errores de autenticación (401)
 */
class AuthenticationError extends AppError {
    constructor(message = 'No autorizado') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

/**
 * Errores de autorización (403)
 */
class AuthorizationError extends AppError {
    constructor(message = 'Acceso denegado') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

/**
 * Errores de recurso no encontrado (404)
 */
class NotFoundError extends AppError {
    constructor(resource = 'Recurso', id = null) {
        const message = id ? 
            `${resource} con ID ${id} no encontrado` : 
            `${resource} no encontrado`;
        super(message, 404, 'NOT_FOUND_ERROR');
        this.resource = resource;
        this.resourceId = id;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            resource: this.resource,
            resourceId: this.resourceId
        };
    }
}

/**
 * Errores de conflicto (409)
 */
class ConflictError extends AppError {
    constructor(message, conflictData = null) {
        super(message, 409, 'CONFLICT_ERROR');
        this.conflictData = conflictData;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            conflictData: this.conflictData
        };
    }
}

/**
 * Errores de base de datos
 */
class DatabaseError extends AppError {
    constructor(message, originalError = null) {
        super(message, 500, 'DATABASE_ERROR');
        this.originalError = originalError;
        
        // No exponer detalles internos en producción
        if (process.env.NODE_ENV === 'production') {
            this.message = 'Error interno del servidor';
        }
    }

    toJSON() {
        const json = super.toJSON();
        
        // Solo incluir error original en desarrollo
        if (process.env.NODE_ENV !== 'production' && this.originalError) {
            json.originalError = {
                message: this.originalError.message,
                code: this.originalError.code,
                errno: this.originalError.errno
            };
        }
        
        return json;
    }
}

/**
 * Errores de lógica de negocio
 */
class BusinessLogicError extends AppError {
    constructor(message, businessRule = null) {
        super(message, 422, 'BUSINESS_LOGIC_ERROR');
        this.businessRule = businessRule;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            businessRule: this.businessRule
        };
    }
}

/**
 * Errores de servicios externos
 */
class ExternalServiceError extends AppError {
    constructor(service, message, originalError = null) {
        super(`Error en servicio ${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
        this.service = service;
        this.originalError = originalError;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            service: this.service
        };
    }
}

/**
 * Errores de límite de tasa (429)
 */
class RateLimitError extends AppError {
    constructor(message = 'Demasiadas solicitudes', retryAfter = null) {
        super(message, 429, 'RATE_LIMIT_ERROR');
        this.retryAfter = retryAfter;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            retryAfter: this.retryAfter
        };
    }
}

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    DatabaseError,
    BusinessLogicError,
    ExternalServiceError,
    RateLimitError
};