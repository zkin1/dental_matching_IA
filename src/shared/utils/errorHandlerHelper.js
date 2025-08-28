/**
 * DENTAL MATCHING - ERROR HANDLER HELPER
 * Helper para manejo consistente de errores en rutas legacy
 */

const logger = require('./logger');

/**
 * Manejo estandarizado de errores para rutas legacy
 */
function handleRouteError(error, req, res, operation) {
  // Log estructurado del error
  logger.error(`Error en operación: ${operation}`, {
    error: error.message,
    code: error.code,
    errno: error.errno,
    sqlState: error.sqlState,
    stack: error.stack,
    requestId: req.headers['x-request-id'],
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method
  });
  
  // Determinar código de estado y mensaje según el error
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let userMessage = 'Error interno del servidor';
  
  // Errores de base de datos
  if (error.code === 'ER_NO_SUCH_TABLE') {
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    userMessage = 'Servicio temporalmente no disponible';
  } else if (error.code === 'ER_BAD_FIELD_ERROR') {
    statusCode = 503;
    errorCode = 'DATABASE_SCHEMA_ERROR';
    userMessage = 'Error de configuración del sistema';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorCode = 'DATABASE_CONNECTION_ERROR';
    userMessage = 'Error de conexión a la base de datos';
  } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    statusCode = 503;
    errorCode = 'DATABASE_ACCESS_ERROR';
    userMessage = 'Error de acceso a la base de datos';
  } else if (error.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorCode = 'DATABASE_TIMEOUT';
    userMessage = 'Tiempo de espera agotado';
  }
  
  // Errores de validación
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    userMessage = error.message;
  }
  
  // Errores de autenticación
  else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    userMessage = error.message;
  }
  
  // Errores de autorización
  else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    userMessage = error.message;
  }
  
  // Respuesta estandarizada de error
  const errorResponse = {
    success: false,
    error: errorCode,
    message: userMessage,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'],
    operation
  };
  
  // En development, incluir más detalles del error
  if (process.env.NODE_ENV === 'development') {
    errorResponse.debug = {
      originalError: error.message,
      code: error.code,
      errno: error.errno
    };
  }
  
  res.status(statusCode).json(errorResponse);
}

/**
 * Wrapper para rutas que maneja errores automáticamente
 */
function asyncHandler(fn, operation) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(error => handleRouteError(error, req, res, operation));
  };
}

/**
 * Respuesta exitosa estandarizada
 */
function sendSuccess(res, data, message = 'Operación exitosa', metadata = {}) {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  if (Array.isArray(data)) {
    response.total = data.length;
    response.data = data;
  } else if (data !== undefined) {
    response.data = data;
  }
  
  res.json(response);
}

module.exports = {
  handleRouteError,
  asyncHandler,
  sendSuccess
};