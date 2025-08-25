const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dental_matching',
  port: parseInt(process.env.DB_PORT) || 3306,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
  timeout: parseInt(process.env.DB_TIMEOUT) || 60000,
  // Configuraciones de seguridad y optimización
  reconnect: true,
  charset: 'utf8mb4',
  timezone: 'local',
  // Configuraciones adicionales de seguridad
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
  // Configuraciones de rendimiento
  multipleStatements: false, // Prevenir SQL injection
  dateStrings: true,
  // Configuraciones de conexión
  waitForConnections: true,
  queueLimit: 0,
  // Configuraciones de timeout
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
  // Configuraciones de debug (solo en desarrollo)
  debug: process.env.NODE_ENV === 'development' ? ['ComQueryPacket'] : false
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
    
    // Validar que la query no sea peligrosa
    if (typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query inválida');
    }
    
    // Prevenir SQL injection básico
    if (query.toLowerCase().includes('drop') || 
        query.toLowerCase().includes('delete from') ||
        query.toLowerCase().includes('truncate') ||
        query.toLowerCase().includes('alter table')) {
      throw new Error('Operación no permitida por seguridad');
    }
    
    // Log solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Ejecutando query:', query.substring(0, 100) + '...');
    }
    
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