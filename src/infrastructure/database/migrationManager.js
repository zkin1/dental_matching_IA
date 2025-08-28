/**
 * DENTAL MATCHING - DATABASE MIGRATION MANAGER
 * Handles database schema migrations and versioning
 */

const fs = require('fs').promises;
const path = require('path');
const loggerService = require('../logging/logger');

class MigrationManager {
  constructor(dbConnection) {
    this.db = dbConnection;
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.migrationTable = 'schema_migrations';
  }

  /**
   * Initialize migration system
   */
  async initialize() {
    try {
      await this.ensureMigrationTable();
      loggerService.logDatabaseEvent('MIGRATION_INIT', this.migrationTable, {
        migrationsPath: this.migrationsPath
      });
    } catch (error) {
      loggerService.error('Failed to initialize migration system', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Create migrations table if it doesn't exist
   */
  async ensureMigrationTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INT DEFAULT 0,
        checksum VARCHAR(255),
        INDEX idx_version (version),
        INDEX idx_executed_at (executed_at)
      ) ENGINE=InnoDB;
    `;

    await this.db.execute(createTableQuery);
  }

  /**
   * Get all available migrations
   */
  async getAvailableMigrations() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const migrations = files
        .filter(file => file.endsWith('.sql') || file.endsWith('.js'))
        .map(file => {
          const parts = file.split('_');
          const version = parts[0];
          const name = parts.slice(1).join('_').replace(/\.(sql|js)$/, '');
          
          return {
            version,
            name,
            filename: file,
            path: path.join(this.migrationsPath, file)
          };
        })
        .sort((a, b) => a.version.localeCompare(b.version));

      return migrations;
    } catch (error) {
      loggerService.error('Failed to read migrations directory', {
        error: error.message,
        migrationsPath: this.migrationsPath
      });
      return [];
    }
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations() {
    try {
      const [rows] = await this.db.execute(
        `SELECT version, name, executed_at, execution_time, checksum 
         FROM ${this.migrationTable} 
         ORDER BY version ASC`
      );
      return rows;
    } catch (error) {
      loggerService.error('Failed to get executed migrations', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations() {
    const available = await this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();
    const executedVersions = new Set(executed.map(m => m.version));

    return available.filter(migration => !executedVersions.has(migration.version));
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migration) {
    const startTime = Date.now();
    
    try {
      loggerService.info('Executing migration', {
        version: migration.version,
        name: migration.name,
        filename: migration.filename
      });

      // Read migration file
      const content = await fs.readFile(migration.path, 'utf8');
      const checksum = require('crypto').createHash('md5').update(content).digest('hex');

      // Execute migration based on file type
      if (migration.filename.endsWith('.sql')) {
        await this.executeSqlMigration(content);
      } else if (migration.filename.endsWith('.js')) {
        await this.executeJsMigration(migration.path);
      }

      const executionTime = Date.now() - startTime;

      // Record migration execution
      await this.db.execute(
        `INSERT INTO ${this.migrationTable} 
         (version, name, executed_at, execution_time, checksum) 
         VALUES (?, ?, NOW(), ?, ?)`,
        [migration.version, migration.name, executionTime, checksum]
      );

      loggerService.logDatabaseEvent('MIGRATION_EXECUTED', this.migrationTable, {
        version: migration.version,
        name: migration.name,
        executionTime,
        checksum
      });

      return true;
    } catch (error) {
      loggerService.error('Migration execution failed', {
        version: migration.version,
        name: migration.name,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Execute SQL migration
   */
  async executeSqlMigration(sqlContent) {
    // Split SQL content by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        // Use query() instead of execute() for migration statements
        // as some SQL commands are not supported in prepared statement protocol
        await this.db.query(statement);
      }
    }
  }

  /**
   * Execute JavaScript migration
   */
  async executeJsMigration(filePath) {
    const migration = require(filePath);
    
    if (typeof migration.up !== 'function') {
      throw new Error('JavaScript migration must export an "up" function');
    }

    await migration.up(this.db);
  }

  /**
   * Run all pending migrations
   */
  async migrate() {
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      loggerService.info('No pending migrations to execute');
      return { executed: 0, migrations: [] };
    }

    loggerService.info(`Found ${pendingMigrations.length} pending migrations`);
    
    const executed = [];
    const transaction = await this.db.getConnection();
    
    try {
      await transaction.beginTransaction();

      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
        executed.push({
          version: migration.version,
          name: migration.name
        });
      }

      await transaction.commit();
      
      loggerService.info('All migrations executed successfully', {
        count: executed.length,
        migrations: executed
      });

      return { executed: executed.length, migrations: executed };
    } catch (error) {
      await transaction.rollback();
      loggerService.error('Migration rollback performed', {
        error: error.message,
        executedCount: executed.length
      });
      throw error;
    } finally {
      transaction.release();
    }
  }

  /**
   * Rollback last migration
   */
  async rollback() {
    try {
      const executed = await this.getExecutedMigrations();
      
      if (executed.length === 0) {
        loggerService.info('No migrations to rollback');
        return { rolled_back: false };
      }

      const lastMigration = executed[executed.length - 1];
      const migrationFile = await this.findMigrationFile(lastMigration.version);

      if (!migrationFile) {
        throw new Error(`Migration file not found for version ${lastMigration.version}`);
      }

      // Execute rollback
      if (migrationFile.endsWith('.js')) {
        const migration = require(path.join(this.migrationsPath, migrationFile));
        
        if (typeof migration.down === 'function') {
          await migration.down(this.db);
        } else {
          loggerService.warn('No rollback function found for migration', {
            version: lastMigration.version
          });
        }
      }

      // Remove from migrations table
      await this.db.execute(
        `DELETE FROM ${this.migrationTable} WHERE version = ?`,
        [lastMigration.version]
      );

      loggerService.logDatabaseEvent('MIGRATION_ROLLED_BACK', this.migrationTable, {
        version: lastMigration.version,
        name: lastMigration.name
      });

      return {
        rolled_back: true,
        migration: {
          version: lastMigration.version,
          name: lastMigration.name
        }
      };
    } catch (error) {
      loggerService.error('Migration rollback failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Find migration file by version
   */
  async findMigrationFile(version) {
    const files = await fs.readdir(this.migrationsPath);
    return files.find(file => file.startsWith(`${version}_`));
  }

  /**
   * Get migration status
   */
  async getStatus() {
    try {
      const available = await this.getAvailableMigrations();
      const executed = await this.getExecutedMigrations();
      const pending = await this.getPendingMigrations();

      return {
        total_available: available.length,
        executed: executed.length,
        pending: pending.length,
        last_executed: executed.length > 0 ? executed[executed.length - 1] : null,
        pending_migrations: pending.map(m => ({
          version: m.version,
          name: m.name
        }))
      };
    } catch (error) {
      loggerService.error('Failed to get migration status', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create new migration file
   */
  async createMigration(name, type = 'sql') {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
    const filename = `${timestamp}_${name.replace(/\s+/g, '_')}.${type}`;
    const filePath = path.join(this.migrationsPath, filename);

    let content = '';
    
    if (type === 'sql') {
      content = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- 
-- Add your SQL statements here
-- Each statement should end with a semicolon

`;
    } else if (type === 'js') {
      content = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  /**
   * Execute migration
   * @param {Object} db - Database connection
   */
  async up(db) {
    // Add your migration logic here
    
  },

  /**
   * Rollback migration
   * @param {Object} db - Database connection
   */
  async down(db) {
    // Add your rollback logic here
    
  }
};
`;
    }

    await fs.writeFile(filePath, content, 'utf8');
    
    loggerService.info('Migration file created', {
      filename,
      type,
      path: filePath
    });

    return {
      filename,
      path: filePath,
      version: timestamp
    };
  }

  /**
   * Validate migration integrity
   */
  async validateIntegrity() {
    try {
      const executed = await this.getExecutedMigrations();
      const issues = [];

      for (const migration of executed) {
        try {
          const filePath = await this.findMigrationFile(migration.version);
          if (!filePath) {
            issues.push({
              type: 'MISSING_FILE',
              version: migration.version,
              name: migration.name
            });
            continue;
          }

          const content = await fs.readFile(path.join(this.migrationsPath, filePath), 'utf8');
          const currentChecksum = require('crypto').createHash('md5').update(content).digest('hex');

          if (migration.checksum && migration.checksum !== currentChecksum) {
            issues.push({
              type: 'CHECKSUM_MISMATCH',
              version: migration.version,
              name: migration.name,
              expected: migration.checksum,
              actual: currentChecksum
            });
          }
        } catch (error) {
          issues.push({
            type: 'VALIDATION_ERROR',
            version: migration.version,
            name: migration.name,
            error: error.message
          });
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      loggerService.error('Migration integrity validation failed', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = MigrationManager;