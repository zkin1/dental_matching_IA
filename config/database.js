const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  // Configuraciones adicionales recomendadas
  reconnect: true,
  charset: 'utf8mb4',
  timezone: 'local'
};

let pool;

const getConnection = async () => {
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
      console.log('✅ Pool de conexiones MySQL creado');
    }
    return pool;
  } catch (error) {
    console.error('❌ Error creando pool MySQL:', error);
    throw error;
  }
};

// Función para obtener una conexión individual del pool
const getPoolConnection = async () => {
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
    }
    const connection = await pool.getConnection();
    console.log('✅ Conexión individual obtenida del pool');
    return connection;
  } catch (error) {
    console.error('❌ Error obteniendo conexión del pool:', error);
    throw error;
  }
};

// Función para ejecutar queries directamente con el pool
const executeQuery = async (query, params = []) => {
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
    }
    console.log('🔍 Ejecutando query:', query.substring(0, 100) + '...');
    const [rows, fields] = await pool.execute(query, params);
    return { rows, fields };
  } catch (error) {
    console.error('❌ Error ejecutando query:', error.message);
    throw error;
  }
};

// Función para probar la conexión
const testConnection = async () => {
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
    }
    const [rows] = await pool.execute('SELECT 1 as test');
    console.log('✅ Conexión a MySQL probada exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error probando conexión MySQL:', error.message);
    throw error;
  }
};

// Función para cerrar el pool correctamente
const closePool = async () => {
  if (pool) {
    await pool.end();
    console.log('✅ Pool de conexiones MySQL cerrado');
    pool = null;
  }
};

// Manejar el cierre graceful de la aplicación
process.on('SIGINT', async () => {
  console.log('🔄 Cerrando pool de conexiones...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Cerrando pool de conexiones...');
  await closePool();
  process.exit(0);
});

module.exports = { 
  getConnection,
  getPoolConnection,
  executeQuery,
  testConnection,
  closePool
};