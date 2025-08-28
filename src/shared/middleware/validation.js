const { ValidationError } = require('../errors/AppError');
const { asyncHandler } = require('./errorHandler');

/**
 * Middleware para validación de DTOs
 */
const validateDTO = (dtoClass, source = 'body') => {
    return asyncHandler(async (req, res, next) => {
        let dataToValidate;
        
        // Determinar qué datos validar según la fuente
        switch (source) {
            case 'body':
                dataToValidate = req.body;
                break;
            case 'params':
                dataToValidate = req.params;
                break;
            case 'query':
                dataToValidate = req.query;
                break;
            case 'headers':
                dataToValidate = req.headers;
                break;
            default:
                dataToValidate = req.body;
        }
        
        // Validar usando el método validate del DTO
        const { error, value } = dtoClass.validate(dataToValidate);
        
        if (error) {
            // Formatear errores de Joi
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value,
                type: detail.type
            }));
            
            throw new ValidationError(
                `Error de validación en ${source}`,
                validationErrors
            );
        }
        
        // Reemplazar los datos originales con los datos validados y saneados
        req[source] = value;
        
        // También almacenar en req.validated para fácil acceso
        if (!req.validated) {
            req.validated = {};
        }
        req.validated[source] = value;
        
        next();
    });
};

/**
 * Validación específica para parámetros de ID
 */
const validateId = (paramName = 'id') => {
    return asyncHandler(async (req, res, next) => {
        const id = req.params[paramName];
        
        // Verificar que el ID sea un número entero positivo
        const idNumber = parseInt(id, 10);
        
        if (isNaN(idNumber) || idNumber <= 0 || !Number.isInteger(idNumber)) {
            throw new ValidationError(
                `ID inválido: ${paramName} debe ser un número entero positivo`,
                [{
                    field: paramName,
                    message: 'Debe ser un número entero positivo',
                    value: id,
                    type: 'number.integer'
                }]
            );
        }
        
        // Convertir a número en los parámetros
        req.params[paramName] = idNumber;
        
        next();
    });
};

/**
 * Validación para paginación
 */
const validatePagination = () => {
    return asyncHandler(async (req, res, next) => {
        const { page = 1, limit = 20, sortBy, sortOrder = 'asc' } = req.query;
        
        // Validar page
        const pageNumber = parseInt(page, 10);
        if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > 1000) {
            throw new ValidationError(
                'Parámetro de paginación inválido',
                [{
                    field: 'page',
                    message: 'Debe ser un número entre 1 y 1000',
                    value: page,
                    type: 'number.integer'
                }]
            );
        }
        
        // Validar limit
        const limitNumber = parseInt(limit, 10);
        if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
            throw new ValidationError(
                'Parámetro de paginación inválido',
                [{
                    field: 'limit',
                    message: 'Debe ser un número entre 1 y 100',
                    value: limit,
                    type: 'number.integer'
                }]
            );
        }
        
        // Validar sortOrder
        if (sortOrder && !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
            throw new ValidationError(
                'Parámetro de ordenamiento inválido',
                [{
                    field: 'sortOrder',
                    message: 'Debe ser "asc" o "desc"',
                    value: sortOrder,
                    type: 'string.valid'
                }]
            );
        }
        
        // Almacenar valores validados
        req.query.page = pageNumber;
        req.query.limit = limitNumber;
        req.query.sortOrder = sortOrder.toLowerCase();
        
        // Calcular offset para bases de datos
        req.query.offset = (pageNumber - 1) * limitNumber;
        
        next();
    });
};

/**
 * Validación para rango de fechas
 */
const validateDateRange = (startField = 'fechaDesde', endField = 'fechaHasta') => {
    return asyncHandler(async (req, res, next) => {
        const startDate = req.query[startField];
        const endDate = req.query[endField];
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            // Verificar que las fechas sean válidas
            if (isNaN(start.getTime())) {
                throw new ValidationError(
                    'Fecha de inicio inválida',
                    [{
                        field: startField,
                        message: 'Debe ser una fecha válida en formato ISO',
                        value: startDate,
                        type: 'date.base'
                    }]
                );
            }
            
            if (isNaN(end.getTime())) {
                throw new ValidationError(
                    'Fecha de fin inválida',
                    [{
                        field: endField,
                        message: 'Debe ser una fecha válida en formato ISO',
                        value: endDate,
                        type: 'date.base'
                    }]
                );
            }
            
            // Verificar que la fecha de fin sea posterior a la de inicio
            if (end <= start) {
                throw new ValidationError(
                    'Rango de fechas inválido',
                    [{
                        field: endField,
                        message: 'La fecha de fin debe ser posterior a la fecha de inicio',
                        value: endDate,
                        type: 'date.greater'
                    }]
                );
            }
            
            // Verificar que el rango no sea excesivo (máximo 1 año)
            const maxRangeDays = 365;
            const rangeDays = (end - start) / (1000 * 60 * 60 * 24);
            
            if (rangeDays > maxRangeDays) {
                throw new ValidationError(
                    'Rango de fechas excesivo',
                    [{
                        field: endField,
                        message: `El rango máximo permitido es de ${maxRangeDays} días`,
                        value: endDate,
                        type: 'date.range'
                    }]
                );
            }
        }
        
        next();
    });
};

/**
 * Validación de formato de email
 */
const validateEmail = (field = 'email') => {
    return asyncHandler(async (req, res, next) => {
        const email = req.body[field];
        
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (!emailRegex.test(email)) {
                throw new ValidationError(
                    'Email inválido',
                    [{
                        field: field,
                        message: 'Debe ser un email válido',
                        value: email,
                        type: 'string.email'
                    }]
                );
            }
            
            // Normalizar email (lowercase)
            req.body[field] = email.toLowerCase().trim();
        }
        
        next();
    });
};

/**
 * Validación de formato de teléfono
 */
const validatePhone = (field = 'telefono') => {
    return asyncHandler(async (req, res, next) => {
        const phone = req.body[field];
        
        if (phone) {
            // Remover espacios y caracteres especiales para validación
            const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
            
            // Verificar que contenga solo números (después de limpiar)
            if (!/^\d{7,15}$/.test(cleanPhone)) {
                throw new ValidationError(
                    'Teléfono inválido',
                    [{
                        field: field,
                        message: 'Debe contener entre 7 y 15 dígitos',
                        value: phone,
                        type: 'string.pattern'
                    }]
                );
            }
            
            // Normalizar formato
            req.body[field] = phone.trim();
        }
        
        next();
    });
};

/**
 * Sanitización de strings para prevenir XSS
 */
const sanitizeStrings = () => {
    return asyncHandler(async (req, res, next) => {
        const sanitize = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    // Remover caracteres peligrosos básicos
                    obj[key] = obj[key]
                        .trim()
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/javascript:/gi, '')
                        .replace(/on\w+\s*=/gi, '');
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitize(obj[key]);
                }
            }
        };
        
        if (req.body && typeof req.body === 'object') {
            sanitize(req.body);
        }
        
        if (req.query && typeof req.query === 'object') {
            sanitize(req.query);
        }
        
        next();
    });
};

module.exports = {
    validateDTO,
    validateId,
    validatePagination,
    validateDateRange,
    validateEmail,
    validatePhone,
    sanitizeStrings
};