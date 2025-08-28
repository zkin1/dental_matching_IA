/**
 * DENTAL MATCHING - DATABASE INDEX OPTIMIZER
 * Automated index analysis and optimization
 */

const loggerService = require('../logging/logger');

class IndexOptimizer {
  constructor(dbConnection) {
    this.db = dbConnection;
    this.slowQueryThreshold = 1000; // milliseconds
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzePerformance() {
    try {
      const analysis = {
        slowQueries: await this.getSlowQueries(),
        missingIndexes: await this.findMissingIndexes(),
        unusedIndexes: await this.findUnusedIndexes(),
        indexStatistics: await this.getIndexStatistics(),
        tableStats: await this.getTableStatistics()
      };

      loggerService.logDatabaseEvent('PERFORMANCE_ANALYSIS', 'optimization', {
        slowQueries: analysis.slowQueries.length,
        missingIndexes: analysis.missingIndexes.length,
        unusedIndexes: analysis.unusedIndexes.length
      });

      return analysis;
    } catch (error) {
      loggerService.error('Performance analysis failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get slow queries from performance schema
   */
  async getSlowQueries() {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          digest_text,
          count_star,
          avg_timer_wait / 1000000000 as avg_time_seconds,
          sum_timer_wait / 1000000000 as total_time_seconds,
          sum_rows_examined,
          sum_rows_sent,
          sum_select_scan,
          sum_select_full_join,
          first_seen,
          last_seen
        FROM performance_schema.events_statements_summary_by_digest
        WHERE avg_timer_wait / 1000000 > ?
          AND count_star > 10
          AND digest_text IS NOT NULL
          AND digest_text NOT LIKE '%performance_schema%'
          AND digest_text NOT LIKE '%information_schema%'
        ORDER BY avg_timer_wait DESC
        LIMIT 50
      `, [this.slowQueryThreshold]);

      return rows.map(row => ({
        query: row.digest_text,
        executions: row.count_star,
        avgTime: parseFloat(row.avg_time_seconds),
        totalTime: parseFloat(row.total_time_seconds),
        rowsExamined: row.sum_rows_examined,
        rowsSent: row.sum_rows_sent,
        tableScans: row.sum_select_scan,
        fullJoins: row.sum_select_full_join,
        firstSeen: row.first_seen,
        lastSeen: row.last_seen,
        optimization: this.suggestOptimization(row)
      }));
    } catch (error) {
      loggerService.error('Failed to get slow queries', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Find missing indexes based on query patterns
   */
  async findMissingIndexes() {
    try {
      // Analyze WHERE clauses, JOIN conditions, and ORDER BY clauses
      const suggestions = [];

      // Get table information
      const tables = await this.getTables();
      
      for (const table of tables) {
        const tableAnalysis = await this.analyzeTableQueries(table);
        suggestions.push(...tableAnalysis.suggestions);
      }

      return suggestions;
    } catch (error) {
      loggerService.error('Failed to find missing indexes', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Find unused indexes
   */
  async findUnusedIndexes() {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          t.table_schema,
          t.table_name,
          t.index_name,
          t.column_name,
          t.seq_in_index,
          t.non_unique,
          s.rows_selected
        FROM information_schema.statistics t
        LEFT JOIN performance_schema.table_io_waits_summary_by_index_usage s
          ON t.table_schema = s.object_schema
          AND t.table_name = s.object_name
          AND t.index_name = s.index_name
        WHERE t.table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
          AND t.index_name != 'PRIMARY'
          AND (s.rows_selected IS NULL OR s.rows_selected = 0)
        ORDER BY t.table_name, t.index_name, t.seq_in_index
      `);

      const unusedIndexes = {};
      rows.forEach(row => {
        const key = `${row.table_schema}.${row.table_name}.${row.index_name}`;
        if (!unusedIndexes[key]) {
          unusedIndexes[key] = {
            schema: row.table_schema,
            table: row.table_name,
            index: row.index_name,
            columns: [],
            nonUnique: row.non_unique === 1,
            usage: row.rows_selected || 0
          };
        }
        unusedIndexes[key].columns.push(row.column_name);
      });

      return Object.values(unusedIndexes);
    } catch (error) {
      loggerService.error('Failed to find unused indexes', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStatistics() {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          object_schema,
          object_name,
          index_name,
          count_fetch,
          count_insert,
          count_update,
          count_delete,
          sum_timer_fetch / 1000000000 as total_fetch_time,
          sum_timer_insert / 1000000000 as total_insert_time,
          sum_timer_update / 1000000000 as total_update_time,
          sum_timer_delete / 1000000000 as total_delete_time
        FROM performance_schema.table_io_waits_summary_by_index_usage
        WHERE object_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
        ORDER BY count_fetch DESC
      `);

      return rows.map(row => ({
        schema: row.object_schema,
        table: row.object_name,
        index: row.index_name,
        fetchCount: row.count_fetch || 0,
        insertCount: row.count_insert || 0,
        updateCount: row.count_update || 0,
        deleteCount: row.count_delete || 0,
        totalFetchTime: parseFloat(row.total_fetch_time) || 0,
        totalInsertTime: parseFloat(row.total_insert_time) || 0,
        totalUpdateTime: parseFloat(row.total_update_time) || 0,
        totalDeleteTime: parseFloat(row.total_delete_time) || 0
      }));
    } catch (error) {
      loggerService.error('Failed to get index statistics', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get table statistics
   */
  async getTableStatistics() {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          table_schema,
          table_name,
          table_rows,
          data_length,
          index_length,
          data_free,
          avg_row_length,
          auto_increment,
          create_time,
          update_time,
          check_time,
          table_collation,
          engine
        FROM information_schema.tables
        WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
          AND table_type = 'BASE TABLE'
        ORDER BY data_length + index_length DESC
      `);

      return rows.map(row => ({
        schema: row.table_schema,
        name: row.table_name,
        rows: row.table_rows || 0,
        dataSize: row.data_length || 0,
        indexSize: row.index_length || 0,
        freeSpace: row.data_free || 0,
        avgRowLength: row.avg_row_length || 0,
        autoIncrement: row.auto_increment,
        engine: row.engine,
        collation: row.table_collation,
        created: row.create_time,
        updated: row.update_time,
        checked: row.check_time,
        totalSize: (row.data_length || 0) + (row.index_length || 0),
        fragmentation: row.data_free ? (row.data_free / ((row.data_length || 1) + (row.index_length || 1))) * 100 : 0
      }));
    } catch (error) {
      loggerService.error('Failed to get table statistics', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Slow query recommendations
    analysis.slowQueries.forEach(query => {
      if (query.avgTime > 5) {
        recommendations.push({
          type: 'SLOW_QUERY',
          priority: 'HIGH',
          description: `Query takes ${query.avgTime.toFixed(2)}s on average`,
          suggestion: query.optimization,
          query: query.query.substring(0, 200) + '...'
        });
      }
    });

    // Missing index recommendations
    analysis.missingIndexes.forEach(suggestion => {
      recommendations.push({
        type: 'MISSING_INDEX',
        priority: suggestion.priority || 'MEDIUM',
        description: `Table ${suggestion.table} could benefit from an index`,
        suggestion: `CREATE INDEX idx_${suggestion.columns.join('_')} ON ${suggestion.table} (${suggestion.columns.join(', ')})`,
        table: suggestion.table,
        columns: suggestion.columns
      });
    });

    // Unused index recommendations
    analysis.unusedIndexes.forEach(index => {
      recommendations.push({
        type: 'UNUSED_INDEX',
        priority: 'LOW',
        description: `Index ${index.index} on ${index.table} appears to be unused`,
        suggestion: `Consider dropping: DROP INDEX ${index.index} ON ${index.table}`,
        table: index.table,
        index: index.index
      });
    });

    // Fragmentation recommendations
    analysis.tableStats.forEach(table => {
      if (table.fragmentation > 20) {
        recommendations.push({
          type: 'FRAGMENTATION',
          priority: 'MEDIUM',
          description: `Table ${table.name} has ${table.fragmentation.toFixed(1)}% fragmentation`,
          suggestion: `OPTIMIZE TABLE ${table.name}`,
          table: table.name,
          fragmentation: table.fragmentation
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Create essential indexes for dental matching system
   */
  async createEssentialIndexes() {
    // Get existing columns for each table to avoid creating indexes on non-existent columns
    const tableColumns = await this.getTableColumns();
    
    const indexes = [
      // Pacientes table indexes
      {
        table: 'pacientes',
        name: 'idx_pacientes_email',
        columns: ['email'],
        type: 'UNIQUE'
      },
      {
        table: 'pacientes',
        name: 'idx_pacientes_tipo_tratamiento',
        columns: ['tipo_tratamiento']
      },
      {
        table: 'pacientes',
        name: 'idx_pacientes_status',
        columns: ['status']
      },
      {
        table: 'pacientes',
        name: 'idx_pacientes_created_at',
        columns: ['created_at']
      },

      // Estudiantes table indexes
      {
        table: 'estudiantes',
        name: 'idx_estudiantes_email',
        columns: ['email'],
        type: 'UNIQUE'
      },
      {
        table: 'estudiantes',
        name: 'idx_estudiantes_semestre',
        columns: ['semestre']
      },
      {
        table: 'estudiantes',
        name: 'idx_estudiantes_disponibilidad',
        columns: ['disponibilidad']
      },

      // Asignaciones table indexes
      {
        table: 'asignaciones',
        name: 'idx_asignaciones_paciente',
        columns: ['paciente_id']
      },
      {
        table: 'asignaciones',
        name: 'idx_asignaciones_estudiante',
        columns: ['estudiante_id']
      },
      {
        table: 'asignaciones',
        name: 'idx_asignaciones_status',
        columns: ['status']
      },

      // AI Matching indexes
      {
        table: 'ai_matching_results',
        name: 'idx_ai_matching_paciente',
        columns: ['paciente_id']
      },
      {
        table: 'ai_matching_results',
        name: 'idx_ai_matching_score',
        columns: ['score']
      },
      {
        table: 'ai_matching_results',
        name: 'idx_ai_matching_created',
        columns: ['created_at']
      }
    ];

    const results = [];

    for (const index of indexes) {
      try {
        // Check if table exists
        if (!tableColumns[index.table]) {
          results.push({
            table: index.table,
            name: index.name,
            status: 'SKIPPED',
            reason: 'Table does not exist'
          });
          continue;
        }

        // Check if all required columns exist
        const missingColumns = index.columns.filter(col => 
          !tableColumns[index.table].includes(col)
        );

        if (missingColumns.length > 0) {
          results.push({
            table: index.table,
            name: index.name,
            status: 'SKIPPED',
            reason: `Missing columns: ${missingColumns.join(', ')}`
          });
          continue;
        }

        const exists = await this.indexExists(index.table, index.name);
        
        if (!exists) {
          await this.createIndex(index);
          results.push({
            table: index.table,
            name: index.name,
            status: 'CREATED'
          });
          
          loggerService.logDatabaseEvent('INDEX_CREATED', index.table, {
            indexName: index.name,
            columns: index.columns,
            type: index.type || 'NORMAL'
          });
        } else {
          results.push({
            table: index.table,
            name: index.name,
            status: 'EXISTS'
          });
        }
      } catch (error) {
        results.push({
          table: index.table,
          name: index.name,
          status: 'ERROR',
          error: error.message
        });
        
        loggerService.error('Failed to create index', {
          table: index.table,
          indexName: index.name,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Check if index exists
   */
  async indexExists(table, indexName) {
    try {
      const [rows] = await this.db.execute(
        `SELECT COUNT(*) as count 
         FROM information_schema.statistics 
         WHERE table_name = ? AND index_name = ?`,
        [table, indexName]
      );
      return rows[0].count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create index
   */
  async createIndex(indexConfig) {
    const { table, name, columns, type } = indexConfig;
    const indexType = type === 'UNIQUE' ? 'UNIQUE' : '';
    const columnList = columns.join(', ');
    
    const query = `CREATE ${indexType} INDEX ${name} ON ${table} (${columnList})`;
    await this.db.execute(query);
  }

  /**
   * Optimize table (defragment)
   */
  async optimizeTable(tableName) {
    try {
      const startTime = Date.now();
      await this.db.execute(`OPTIMIZE TABLE ${tableName}`);
      const duration = Date.now() - startTime;
      
      loggerService.logDatabaseEvent('TABLE_OPTIMIZED', tableName, {
        duration
      });
      
      return { success: true, duration };
    } catch (error) {
      loggerService.error('Table optimization failed', {
        table: tableName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Analyze table for statistics update
   */
  async analyzeTable(tableName) {
    try {
      const startTime = Date.now();
      await this.db.execute(`ANALYZE TABLE ${tableName}`);
      const duration = Date.now() - startTime;
      
      loggerService.logDatabaseEvent('TABLE_ANALYZED', tableName, {
        duration
      });
      
      return { success: true, duration };
    } catch (error) {
      loggerService.error('Table analysis failed', {
        table: tableName,
        error: error.message
      });
      throw error;
    }
  }

  // Helper methods

  async getTables() {
    const [rows] = await this.db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND table_type = 'BASE TABLE'
    `);
    return rows.map(row => row.table_name);
  }

  /**
   * Get columns for all tables
   */
  async getTableColumns() {
    try {
      const [rows] = await this.db.execute(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE()
        ORDER BY table_name, ordinal_position
      `);

      const tableColumns = {};
      rows.forEach(row => {
        if (!tableColumns[row.table_name]) {
          tableColumns[row.table_name] = [];
        }
        tableColumns[row.table_name].push(row.column_name);
      });

      return tableColumns;
    } catch (error) {
      loggerService.error('Failed to get table columns', {
        error: error.message
      });
      return {};
    }
  }

  async analyzeTableQueries(tableName) {
    // This would analyze query patterns for the specific table
    // For now, return basic suggestions based on common patterns
    return {
      table: tableName,
      suggestions: [
        {
          table: tableName,
          columns: ['status'],
          priority: 'MEDIUM',
          reason: 'Frequently used in WHERE clauses'
        }
      ]
    };
  }

  suggestOptimization(queryRow) {
    const suggestions = [];
    
    if (queryRow.sum_select_scan > 0) {
      suggestions.push('Consider adding indexes to avoid table scans');
    }
    
    if (queryRow.sum_select_full_join > 0) {
      suggestions.push('Optimize JOIN conditions with proper indexes');
    }
    
    if (queryRow.sum_rows_examined > queryRow.sum_rows_sent * 10) {
      suggestions.push('Query examines too many rows, add WHERE conditions or indexes');
    }
    
    return suggestions.join('; ') || 'Review query structure and indexing strategy';
  }
}

module.exports = IndexOptimizer;