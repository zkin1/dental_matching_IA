const { getConnection } = require('../../../config/database');

/**
 * Repositorio base que proporciona funcionalidad común para todos los repositorios
 */
class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
        this.connection = null;
    }

    /**
     * Validates and normalizes limit parameters to avoid MySQL parameter binding issues
     */
    _validateLimit(limit, defaultValue = 100) {
        return Number.isInteger(limit) ? Math.max(1, Math.min(limit, 1000)) : 
               Number.isInteger(parseInt(limit)) ? Math.max(1, Math.min(parseInt(limit), 1000)) : defaultValue;
    }

    /**
     * Validates and normalizes offset parameters
     */
    _validateOffset(offset, defaultValue = 0) {
        return Number.isInteger(offset) ? Math.max(0, offset) : 
               Number.isInteger(parseInt(offset)) ? Math.max(0, parseInt(offset)) : defaultValue;
    }

    /**
     * Obtiene una conexión a la base de datos
     */
    async getConnection() {
        if (!this.connection) {
            this.connection = await getConnection();
        }
        return this.connection;
    }

    /**
     * Ejecuta una consulta SQL
     */
    async execute(query, params = []) {
        try {
            const db = await this.getConnection();
            const [rows] = await db.execute(query, params);
            return rows;
        } catch (error) {
            console.error(`Error ejecutando query en ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Encuentra un registro por ID
     */
    async findById(id) {
        const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
        const rows = await this.execute(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Encuentra todos los registros
     */
    async findAll(limit = 100, offset = 0) {
        const validLimit = this._validateLimit(limit, 100);
        const validOffset = this._validateOffset(offset, 0);
        const query = `SELECT * FROM ${this.tableName} LIMIT ${validLimit} OFFSET ${validOffset}`;
        return await this.execute(query);
    }

    /**
     * Encuentra registros por condiciones
     */
    async findWhere(conditions = {}, limit = 100) {
        const validLimit = this._validateLimit(limit, 100);
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(conditions);
        
        let query = `SELECT * FROM ${this.tableName}`;
        if (whereClause) {
            query += ` WHERE ${whereClause}`;
        }
        query += ` LIMIT ${validLimit}`;
        
        return await this.execute(query, values);
    }

    /**
     * Cuenta registros
     */
    async count(conditions = {}) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(conditions);
        
        let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
        if (whereClause) {
            query += ` WHERE ${whereClause}`;
        }
        
        const rows = await this.execute(query, values);
        return rows[0].total;
    }

    /**
     * Crea un nuevo registro
     */
    async create(data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');
        
        const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
        const result = await this.execute(query, values);
        
        return result.insertId;
    }

    /**
     * Actualiza un registro por ID
     */
    async updateById(id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        
        const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
        const result = await this.execute(query, [...values, id]);
        
        return result.affectedRows > 0;
    }

    /**
     * Elimina un registro por ID
     */
    async deleteById(id) {
        const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
        const result = await this.execute(query, [id]);
        
        return result.affectedRows > 0;
    }

    /**
     * Elimina registros por condiciones
     */
    async deleteWhere(conditions = {}) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(conditions);
        
        if (!whereClause) {
            throw new Error('No se permiten eliminaciones sin condiciones');
        }
        
        const query = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
        const result = await this.execute(query, values);
        
        return result.affectedRows;
    }

    /**
     * Verifica si existe un registro con las condiciones dadas
     */
    async exists(conditions = {}) {
        const count = await this.count(conditions);
        return count > 0;
    }

    /**
     * Ejecuta una consulta personalizada
     */
    async customQuery(query, params = []) {
        return await this.execute(query, params);
    }

    /**
     * Inicia una transacción
     */
    async beginTransaction() {
        const db = await this.getConnection();
        await db.query('START TRANSACTION');
    }

    /**
     * Confirma una transacción
     */
    async commit() {
        const db = await this.getConnection();
        await db.query('COMMIT');
    }

    /**
     * Revierte una transacción
     */
    async rollback() {
        const db = await this.getConnection();
        await db.query('ROLLBACK');
    }
}

module.exports = BaseRepository;