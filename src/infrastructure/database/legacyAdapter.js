/**
 * Legacy Database Adapter
 * Provides compatibility with legacy database structures and operations
 */

const mysql = require('mysql2/promise');
const loggerService = require('../logging/logger');

class LegacyAdapter {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  /**
   * Initialize legacy adapter
   */
  async initialize() {
    try {
      // Create basic connection pool for legacy operations
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'dental_matching',
        connectionLimit: 5, // Smaller pool for legacy operations
        charset: 'utf8mb4',
        timezone: 'Z'
      };

      this.pool = mysql.createPool(config);
      
      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.isInitialized = true;
      loggerService.info('Legacy adapter initialized successfully');
      
    } catch (error) {
      loggerService.error('Legacy adapter initialization failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute legacy query
   */
  async query(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('Legacy adapter not initialized');
    }

    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      loggerService.error('Legacy query failed', {
        error: error.message,
        sql: sql.substring(0, 100)
      });
      throw error;
    }
  }

  /**
   * Close legacy adapter
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
module.exports = new LegacyAdapter();