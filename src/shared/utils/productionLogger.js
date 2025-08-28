/**
 * DENTAL MATCHING - PRODUCTION LOGGER PATCH
 * Reemplaza console.* con logger enterprise en producción
 */

// Solo ejecutar en producción
if (process.env.NODE_ENV === 'production') {
  try {
    const loggerService = require('../../infrastructure/logging/logger');
    
    // Sobrescribir métodos de console globalmente
    const originalConsole = { ...console };
    
    console.log = (...args) => loggerService.info(...args);
    console.info = (...args) => loggerService.info(...args);
    console.warn = (...args) => loggerService.warn(...args);
    console.error = (...args) => loggerService.error(...args);
    console.debug = (...args) => loggerService.debug(...args);
    
    // Mantener referencia al console original por si es necesario
    console.originalConsole = originalConsole;
    
  } catch (error) {
    // Si falla el logger enterprise, silenciar completamente en producción
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.debug = () => {};
  }
}

module.exports = {
  // Función para restaurar console original si es necesario
  restoreConsole() {
    if (console.originalConsole) {
      Object.assign(console, console.originalConsole);
    }
  }
};