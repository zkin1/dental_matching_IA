/**
 * Cleanup script: drop unused/duplicate tables
 *
 * Tables to drop:
 * - estudiantes (duplicate of estudiantes_odontologia, never used by code)
 * - logs_sistema (duplicate of system_logs)
 * - configuracion_sistema (unused)
 * - scheduler_stats (MatchingScheduler was removed)
 * - matching_scheduler_config (MatchingScheduler was removed)
 *
 * Run: node scripts/cleanup-tables.js
 */

const { getConnection } = require('../config/database');

const TABLES_TO_DROP = [
  'scheduler_stats',
  'matching_scheduler_config',
  'logs_sistema',
  'configuracion_sistema',
  'estudiantes'
];

async function cleanup() {
  let connection;
  try {
    const pool = await getConnection();
    connection = await pool.getConnection();

    console.log('Limpieza de tablas no usadas\n');

    for (const table of TABLES_TO_DROP) {
      try {
        const [rows] = await connection.query(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
          [table]
        );

        if (rows[0].count > 0) {
          await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
          console.log(`  Eliminada: ${table}`);
        } else {
          console.log(`  No existe: ${table} (ok)`);
        }
      } catch (error) {
        console.log(`  Error con ${table}: ${error.message}`);
      }
    }

    console.log('\nLimpieza completada.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

cleanup();
