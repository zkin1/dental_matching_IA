const BaseRepository = require('./BaseRepository');
const Student = require('../../core/entities/Student');

/**
 * Repositorio para la entidad Estudiante
 */
class StudentRepository extends BaseRepository {
    constructor() {
        super('estudiantes_odontologia');
    }

    /**
     * Convierte datos de DB a entidad Student
     */
    _toEntity(data) {
        return data ? Student.fromDatabase(data) : null;
    }

    /**
     * Convierte entidad Student a datos de DB
     */
    _fromEntity(student) {
        return {
            nombre_completo: student.nombreCompleto,
            codigo_estudiante: student.codigoEstudiante,
            año_carrera: student.anoCarrera,
            telefono: student.telefono,
            email: student.email,
            especialidades: Array.isArray(student.especialidades) ? 
                student.especialidades.join(', ') : student.especialidades,
            casos_activos: student.casosActivos,
            casos_necesarios: student.casosNecesarios,
            casos_completados: student.casosCompletados,
            estado: student.estado
        };
    }

    /**
     * Encuentra un estudiante por ID y lo convierte a entidad
     */
    async findStudentById(id) {
        const data = await this.findById(id);
        return this._toEntity(data);
    }

    /**
     * Encuentra todos los estudiantes activos
     */
    async findAllActive(limit = 100) {
        const validLimit = this._validateLimit(limit, 100);
        const rows = await this.findWhere({ estado: 'activo' }, validLimit);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra estudiantes disponibles para nuevos casos
     */
    async findAvailable(especialidad = null, limit = 50) {
        const validLimit = this._validateLimit(limit, 50);
        
        let query = `
            SELECT * FROM ${this.tableName} 
            WHERE estado = ? 
                AND casos_activos < casos_necesarios
        `;
        
        const params = ['activo'];
        
        if (especialidad) {
            query += ' AND especialidades LIKE ?';
            params.push(`%${especialidad}%`);
        }
        
        // Use string interpolation for LIMIT to avoid MySQL2 parameter binding issues
        query += ` ORDER BY casos_activos ASC, casos_completados DESC LIMIT ${validLimit}`;
        
        const rows = await this.execute(query, params);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra estudiantes por especialidad
     */
    async findBySpecialty(especialidad) {
        const query = `
            SELECT * FROM ${this.tableName} 
            WHERE estado = 'activo' 
                AND especialidades LIKE ?
        `;
        
        const rows = await this.execute(query, [`%${especialidad}%`]);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra estudiantes por año de carrera
     */
    async findByYear(year) {
        const rows = await this.findWhere({ año_carrera: year, estado: 'activo' });
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra estudiantes con poca carga de trabajo
     */
    async findWithLowWorkload(percentage = 50) {
        const query = `
            SELECT * FROM ${this.tableName} 
            WHERE estado = 'activo' 
                AND (casos_activos / casos_necesarios * 100) <= ?
            ORDER BY casos_activos ASC
        `;
        
        const rows = await this.execute(query, [percentage]);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra estudiantes avanzados (4to y 5to año)
     */
    async findAdvancedStudents() {
        const query = `
            SELECT * FROM ${this.tableName} 
            WHERE estado = 'activo' 
                AND (año_carrera LIKE '%4%' OR año_carrera LIKE '%5%' 
                     OR año_carrera LIKE '%cuarto%' OR año_carrera LIKE '%quinto%')
        `;
        
        const rows = await this.execute(query);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Busca estudiantes por código
     */
    async findByCode(codigo) {
        const rows = await this.findWhere({ codigo_estudiante: codigo });
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Obtiene estadísticas de estudiantes
     */
    async getStatistics() {
        const queries = {
            total: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE estado = 'activo'`,
            disponibles: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE estado = 'activo' AND casos_activos < casos_necesarios`,
            completos: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE estado = 'activo' AND casos_activos >= casos_necesarios`,
            porAno: `SELECT año_carrera, COUNT(*) as count FROM ${this.tableName} WHERE estado = 'activo' GROUP BY año_carrera`,
            cargaTrabajo: `
                SELECT 
                    AVG(casos_activos / casos_necesarios * 100) as promedio_carga,
                    MIN(casos_activos / casos_necesarios * 100) as min_carga,
                    MAX(casos_activos / casos_necesarios * 100) as max_carga
                FROM ${this.tableName} 
                WHERE estado = 'activo' AND casos_necesarios > 0
            `,
            porEspecialidad: `
                SELECT 
                    SUBSTRING_INDEX(SUBSTRING_INDEX(especialidades, ',', n.n), ',', -1) as especialidad,
                    COUNT(*) as count
                FROM ${this.tableName} e
                CROSS JOIN (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) n
                WHERE CHAR_LENGTH(especialidades) - CHAR_LENGTH(REPLACE(especialidades, ',', '')) >= n.n - 1
                    AND estado = 'activo'
                GROUP BY especialidad
                ORDER BY count DESC
            `
        };

        const stats = {};
        
        for (const [key, query] of Object.entries(queries)) {
            try {
                const rows = await this.execute(query);
                if (['porAno', 'cargaTrabajo', 'porEspecialidad'].includes(key)) {
                    stats[key] = rows;
                } else {
                    stats[key] = rows[0].count;
                }
            } catch (error) {
                console.warn(`Error obteniendo estadística ${key}:`, error.message);
                stats[key] = key.startsWith('por') ? [] : 0;
            }
        }

        return stats;
    }

    /**
     * Crea un nuevo estudiante
     */
    async createStudent(student) {
        const data = this._fromEntity(student);
        const id = await this.create(data);
        student.id = id;
        return student;
    }

    /**
     * Actualiza un estudiante
     */
    async updateStudent(student) {
        const data = this._fromEntity(student);
        const updated = await this.updateById(student.id, data);
        return updated;
    }

    /**
     * Incrementa los casos activos de un estudiante
     */
    async incrementActiveCases(id) {
        const query = `UPDATE ${this.tableName} SET casos_activos = casos_activos + 1 WHERE id = ?`;
        const result = await this.execute(query, [id]);
        return result.affectedRows > 0;
    }

    /**
     * Decrementa los casos activos de un estudiante
     */
    async decrementActiveCases(id) {
        const query = `UPDATE ${this.tableName} SET casos_activos = GREATEST(casos_activos - 1, 0) WHERE id = ?`;
        const result = await this.execute(query, [id]);
        return result.affectedRows > 0;
    }

    /**
     * Incrementa los casos completados de un estudiante
     */
    async incrementCompletedCases(id) {
        const query = `UPDATE ${this.tableName} SET casos_completados = casos_completados + 1 WHERE id = ?`;
        const result = await this.execute(query, [id]);
        return result.affectedRows > 0;
    }

    /**
     * Busca duplicados por código de estudiante o email
     */
    async findDuplicates(codigoEstudiante, email) {
        const query = `
            SELECT * FROM ${this.tableName} 
            WHERE estado = 'activo' 
                AND (codigo_estudiante = ? OR email = ?)
        `;
        
        const rows = await this.execute(query, [codigoEstudiante, email]);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Obtiene ranking de estudiantes por casos completados
     */
    async getPerformanceRanking(limit = 10) {
        const validLimit = this._validateLimit(limit, 10);
        
        const query = `
            SELECT *, 
                   (casos_completados / GREATEST(casos_activos + casos_completados, 1) * 100) as success_rate
            FROM ${this.tableName} 
            WHERE estado = 'activo'
            ORDER BY casos_completados DESC, success_rate DESC
            LIMIT ${validLimit}
        `;
        
        const rows = await this.execute(query);
        return rows.map(row => this._toEntity(row));
    }
}

module.exports = StudentRepository;