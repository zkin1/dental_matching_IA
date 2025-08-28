/**
 * DENTAL MATCHING - UNIFIED DATABASE SERVICE
 * Configuración única y simple para toda la aplicación
 * 
 * ESTE ES EL ÚNICO ARCHIVO DE BASE DE DATOS QUE NECESITAS
 * Todas las rutas (legacy y modernas) usan este servicio
 */

const mysql = require('mysql2/promise');

// Aplicar patch de logger para producción
require('../src/shared/utils/productionLogger');

// Usar logger enterprise si está disponible
let logger;
try {
  logger = require('../src/infrastructure/logging/logger');
} catch (error) {
  logger = {
    info: (...args) => console.log('[DB]', ...args),
    error: (...args) => console.error('[DB]', ...args),
    warn: (...args) => console.warn('[DB]', ...args),
    debug: (...args) => process.env.NODE_ENV === 'development' && console.log('[DB]', ...args)
  };
}

class DatabaseService {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
    this.healthMetrics = {
      connections: 0,
      queries: 0,
      errors: 0,
      slowQueries: 0,
      lastHealthCheck: null
    };
  }

  /**
   * Configuración de base de datos
   */
  getConfig() {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dental_matching',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
      charset: 'utf8mb4',
      timezone: 'Z',
      multipleStatements: false,
      dateStrings: true,
      namedPlaceholders: true,
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
      } : false
    };
  }

  /**
   * Inicializar servicio de base de datos
   */
  async initialize() {
    if (this.isInitialized) return this.pool;

    try {
      const config = this.getConfig();
      
      logger.info('Initializing database service', {
        host: config.host,
        database: config.database,
        connectionLimit: config.connectionLimit
      });

      this.pool = mysql.createPool(config);

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.isInitialized = true;
      
      logger.info('Database service ready', {
        host: config.host,
        database: config.database
      });

      // Start health monitoring
      this.startHealthMonitoring();

      return this.pool;
    } catch (error) {
      logger.error('Database initialization failed', error);
      throw error;
    }
  }

  /**
   * MÉTODO PRINCIPAL: getConnection()
   * Para compatibilidad con rutas legacy
   */
  async getConnection() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.pool;
  }

  /**
   * MÉTODO PRINCIPAL: getPoolConnection()  
   * Para obtener conexión individual
   */
  async getPoolConnection() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      const connection = await this.pool.getConnection();
      logger.debug('Individual connection obtained from pool');
      return connection;
    } catch (error) {
      this.healthMetrics.errors++;
      logger.error('Error obtaining connection from pool', error);
      throw error;
    }
  }

  /**
   * MÉTODO PRINCIPAL: executeQuery()
   * Para compatibilidad con rutas legacy
   */
  async executeQuery(query, params = []) {
    return await this.execute(query, params);
  }

  /**
   * MÉTODO PRINCIPAL: execute()
   * Ejecutar queries con monitoreo completo
   */
  async execute(query, params = []) {
    const startTime = Date.now();
    const queryId = require('crypto').randomUUID().substring(0, 8);
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Query inválida');
      }

      // Asegurar que params es array
      if (!Array.isArray(params)) {
        params = [];
      }

      this.healthMetrics.queries++;
      
      logger.debug('Executing database query', {
        queryId,
        query: query.substring(0, 200),
        paramCount: params.length
      });

      // Solo queries parametrizadas para máxima seguridad
      const [rows, fields] = await this.pool.execute(query, params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > 1000) {
        this.healthMetrics.slowQueries++;
        logger.warn('Slow database query detected', {
          queryId,
          duration,
          query: query.substring(0, 500)
        });
      }

      logger.debug('Database query completed', {
        queryId,
        duration,
        rowsAffected: rows.affectedRows || rows.length || 0
      });

      // Retornar en formato compatible con legacy
      return { rows, fields };
    } catch (error) {
      this.healthMetrics.errors++;
      const duration = Date.now() - startTime;
      
      logger.error('Database query failed', {
        queryId,
        duration,
        error: error.message,
        query: query.substring(0, 500),
        sqlState: error.sqlState,
        errno: error.errno
      });
      
      throw error;
    }
  }

  /**
   * MÉTODO PRINCIPAL: testConnection()
   * Para tests de conectividad
   */
  async testConnection() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const config = this.getConfig();
      
      logger.debug('Testing connection', {
        host: config.host,
        user: config.user,
        database: config.database,
        port: config.port
      });
      
      const result = await this.execute('SELECT 1 as test, NOW() as current_time');
      logger.info('Database connection test successful', result.rows[0]);
      return true;
    } catch (error) {
      logger.error('Database connection test failed', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  async executeTransaction(operations) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const connection = await this.pool.getConnection();
    const transactionId = require('crypto').randomUUID().substring(0, 8);
    
    try {
      await connection.beginTransaction();
      
      logger.debug('Transaction started', {
        transactionId,
        operationCount: operations.length
      });

      const results = [];
      for (const operation of operations) {
        const [result] = await connection.execute(operation.query, operation.params || []);
        results.push(result);
      }

      await connection.commit();
      
      logger.debug('Transaction committed', {
        transactionId,
        operationCount: operations.length
      });

      return results;
    } catch (error) {
      await connection.rollback();
      
      logger.error('Transaction rolled back', {
        transactionId,
        error: error.message
      });
      
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    if (!this.pool) return null;

    return {
      totalConnections: this.pool.pool.totalConnections,
      activeConnections: this.pool.pool.activeConnections,
      idleConnections: this.pool.pool.idleConnections,
      waitingClients: this.pool.pool.waitingClients,
      connectionLimit: this.pool.pool.config.connectionLimit
    };
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      await this.execute('SELECT 1 as health_check');
      
      // Get pool statistics
      const poolStats = this.getPoolStats();
      
      const duration = Date.now() - startTime;
      this.healthMetrics.lastHealthCheck = new Date();

      const healthData = {
        status: 'healthy',
        responseTime: duration,
        connections: poolStats,
        metrics: { ...this.healthMetrics }
      };

      return healthData;
      
    } catch (error) {
      const healthData = {
        status: 'unhealthy',
        error: error.message,
        metrics: { ...this.healthMetrics }
      };
      
      logger.error('Database health check failed', healthData);
      return healthData;
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    // Health check every 5 minutes
    setInterval(async () => {
      await this.performHealthCheck();
    }, 5 * 60 * 1000);
  }

  /**
   * MÉTODO PRINCIPAL: closePool()
   * Para cerrar conexiones
   */
  async closePool() {
    return await this.close();
  }

  /**
   * Close database connections
   */
  async close() {
    if (this.pool) {
      try {
        await this.pool.end();
        logger.info('Database connections closed');
        this.isInitialized = false;
        this.pool = null;
      } catch (error) {
        logger.error('Error closing database connections', error);
      }
    }
  }

  /**
   * Create database middleware for Express
   */
  middleware() {
    return (req, res, next) => {
      req.db = this;
      next();
    };
  }
}

// =====================================
// SINGLETON INSTANCE - ÚNICA INSTANCIA
// =====================================

const databaseService = new DatabaseService();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Closing database connections...');
  await databaseService.close();
});

process.on('SIGTERM', async () => {
  logger.info('Closing database connections...');
  await databaseService.close();
});

// ========================================
// EXPORTAR MÉTODOS - API UNIFICADA
// ========================================

module.exports = {
  // API para rutas legacy
  getConnection: () => databaseService.getConnection(),
  getPoolConnection: () => databaseService.getPoolConnection(), 
  executeQuery: (query, params) => databaseService.executeQuery(query, params),
  testConnection: () => databaseService.testConnection(),
  closePool: () => databaseService.closePool(),
  
  // API enterprise para nuevas funciones
  execute: (query, params) => databaseService.execute(query, params),
  executeTransaction: (operations) => databaseService.executeTransaction(operations),
  performHealthCheck: () => databaseService.performHealthCheck(),
  getPoolStats: () => databaseService.getPoolStats(),
  middleware: () => databaseService.middleware(),
  
  // Instancia directa para casos avanzados
  instance: databaseService
};