const BaseRepository = require('./BaseRepository');

/**
 * Repositorio para gestión de usuarios
 * Maneja operaciones de base de datos relacionadas con autenticación
 */
class UserRepository extends BaseRepository {
    constructor() {
        super('usuarios');
    }

    /**
     * Busca un usuario por email
     */
    async findByEmail(email) {
        const query = `
            SELECT 
                u.*,
                CASE 
                    WHEN u.role = 'student' THEN e.codigoEstudiante
                    ELSE NULL
                END as codigoEstudiante,
                CASE 
                    WHEN u.role = 'student' THEN e.especialidades
                    ELSE NULL
                END as especialidades
            FROM usuarios u
            LEFT JOIN estudiantes_odontologia e ON u.relacionId = e.id AND u.role = 'student'
            WHERE u.email = ? AND u.estado = 'activo'
        `;
        
        const result = await this.executeQuery(query, [email]);
        return result.rows[0] || null;
    }

    /**
     * Busca un usuario por código de estudiante
     */
    async findByStudentCode(codigoEstudiante) {
        const query = `
            SELECT u.*, e.codigoEstudiante 
            FROM usuarios u
            INNER JOIN estudiantes_odontologia e ON u.relacionId = e.id
            WHERE e.codigoEstudiante = ? AND u.role = 'student'
        `;
        
        const result = await this.executeQuery(query, [codigoEstudiante]);
        return result.rows[0] || null;
    }

    /**
     * Actualiza el refresh token del usuario
     */
    async updateRefreshToken(userId, refreshToken) {
        const query = 'UPDATE usuarios SET refreshToken = ?, updatedAt = NOW() WHERE id = ?';
        return await this.executeQuery(query, [refreshToken, userId]);
    }

    /**
     * Actualiza el último login del usuario
     */
    async updateLastLogin(userId) {
        const query = 'UPDATE usuarios SET lastLogin = NOW(), updatedAt = NOW() WHERE id = ?';
        return await this.executeQuery(query, [userId]);
    }

    /**
     * Actualiza la contraseña del usuario
     */
    async updatePassword(userId, hashedPassword) {
        const query = 'UPDATE usuarios SET password = ?, updatedAt = NOW() WHERE id = ?';
        return await this.executeQuery(query, [hashedPassword, userId]);
    }

    /**
     * Crea un nuevo usuario
     */
    async create(userData) {
        const fields = ['email', 'password', 'nombre', 'apellido', 'role', 'permissions', 'estado', 'telefono', 'relacionId'];
        const values = fields.map(field => userData[field]);
        const placeholders = fields.map(() => '?').join(', ');

        const query = `
            INSERT INTO usuarios (${fields.join(', ')}, createdAt, updatedAt) 
            VALUES (${placeholders}, NOW(), NOW())
        `;

        const result = await this.executeQuery(query, values);
        return await this.findById(result.insertId);
    }

    /**
     * Busca usuarios por rol
     */
    async findByRole(role) {
        const query = `
            SELECT u.*, 
                CASE 
                    WHEN u.role = 'student' THEN e.codigoEstudiante
                    ELSE NULL
                END as codigoEstudiante
            FROM usuarios u
            LEFT JOIN estudiantes_odontologia e ON u.relacionId = e.id AND u.role = 'student'
            WHERE u.role = ? AND u.estado = 'activo'
            ORDER BY u.nombre, u.apellido
        `;
        
        const result = await this.executeQuery(query, [role]);
        return result.rows;
    }

    /**
     * Obtiene usuarios activos con paginación
     */
    async findActiveUsers(page = 1, limit = 20) {
        const validPage = Number.isInteger(page) ? Math.max(1, page) : 1;
        const validLimit = this._validateLimit(limit, 20);
        const offset = (validPage - 1) * validLimit;
        
        const query = `
            SELECT u.id, u.email, u.nombre, u.apellido, u.role, u.estado, 
                   u.lastLogin, u.createdAt,
                   CASE 
                       WHEN u.role = 'student' THEN e.codigoEstudiante
                       ELSE NULL
                   END as codigoEstudiante
            FROM usuarios u
            LEFT JOIN estudiantes_odontologia e ON u.relacionId = e.id AND u.role = 'student'
            WHERE u.estado = 'activo'
            ORDER BY u.createdAt DESC
            LIMIT ${validLimit} OFFSET ${offset}
        `;

        const result = await this.executeQuery(query);
        
        // Contar total
        const countQuery = 'SELECT COUNT(*) as total FROM usuarios WHERE estado = ?';
        const countResult = await this.executeQuery(countQuery, ['activo']);
        
        return {
            users: result.rows,
            total: countResult.rows[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult.rows[0].total / limit)
        };
    }

    /**
     * Desactiva un usuario (soft delete)
     */
    async deactivate(userId) {
        const query = 'UPDATE usuarios SET estado = ?, refreshToken = NULL, updatedAt = NOW() WHERE id = ?';
        return await this.executeQuery(query, ['inactivo', userId]);
    }

    /**
     * Activa un usuario
     */
    async activate(userId) {
        const query = 'UPDATE usuarios SET estado = ?, updatedAt = NOW() WHERE id = ?';
        return await this.executeQuery(query, ['activo', userId]);
    }

    /**
     * Obtiene estadísticas de usuarios
     */
    async getUserStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
                SUM(CASE WHEN estado = 'inactivo' THEN 1 ELSE 0 END) as inactivos,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as administradores,
                SUM(CASE WHEN role = 'coordinator' THEN 1 ELSE 0 END) as coordinadores,
                SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) as profesores,
                SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as estudiantes,
                SUM(CASE WHEN lastLogin >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as activos_ultimo_mes
            FROM usuarios
        `;

        const result = await this.executeQuery(query);
        return result.rows[0];
    }

    /**
     * Busca usuarios por término de búsqueda
     */
    async searchUsers(searchTerm, role = null) {
        let query = `
            SELECT u.id, u.email, u.nombre, u.apellido, u.role, u.estado, 
                   u.lastLogin, u.createdAt,
                   CASE 
                       WHEN u.role = 'student' THEN e.codigoEstudiante
                       ELSE NULL
                   END as codigoEstudiante
            FROM usuarios u
            LEFT JOIN estudiantes_odontologia e ON u.relacionId = e.id AND u.role = 'student'
            WHERE (
                u.nombre LIKE ? OR 
                u.apellido LIKE ? OR 
                u.email LIKE ? OR
                (u.role = 'student' AND e.codigoEstudiante LIKE ?)
            ) AND u.estado = 'activo'
        `;

        const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

        if (role) {
            query += ' AND u.role = ?';
            params.push(role);
        }

        query += ' ORDER BY u.nombre, u.apellido LIMIT 50';

        const result = await this.executeQuery(query, params);
        return result.rows;
    }

    /**
     * Verifica si existe un usuario con el email especificado
     */
    async emailExists(email, excludeId = null) {
        let query = 'SELECT id FROM usuarios WHERE email = ?';
        const params = [email];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const result = await this.executeQuery(query, params);
        return result.rows.length > 0;
    }

    /**
     * Obtiene usuarios por permisos específicos
     */
    async findByPermission(permission) {
        const query = `
            SELECT u.id, u.email, u.nombre, u.apellido, u.role, u.permissions
            FROM usuarios u
            WHERE u.estado = 'activo' 
            AND (u.permissions LIKE ? OR u.role = 'admin')
            ORDER BY u.nombre, u.apellido
        `;

        const result = await this.executeQuery(query, [`%${permission}%`]);
        return result.rows.filter(user => {
            const permissions = user.permissions ? JSON.parse(user.permissions) : [];
            return user.role === 'admin' || permissions.includes(permission);
        });
    }
}

module.exports = UserRepository;