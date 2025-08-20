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
  timeout: 60000
};

let pool;

const getConnection = async () => {
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
      console.log('✅ Conexión a MySQL establecida');
    }
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error);
    throw error;
  }
};

module.exports = { getConnection };