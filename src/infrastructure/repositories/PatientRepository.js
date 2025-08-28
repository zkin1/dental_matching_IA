const BaseRepository = require('./BaseRepository');
const Patient = require('../../core/entities/Patient');

/**
 * Repositorio para la entidad Paciente
 */
class PatientRepository extends BaseRepository {
    constructor() {
        super('pacientes');
    }

    /**
     * Convierte datos de DB a entidad Patient
     */
    _toEntity(data) {
        return data ? Patient.fromDatabase(data) : null;
    }

    /**
     * Convierte entidad Patient a datos de DB
     */
    _fromEntity(patient) {
        return {
            nombre_completo: patient.nombreCompleto,
            edad: patient.edad,
            telefono: patient.telefono,
            email: patient.email,
            ciudad: patient.ciudad,
            sintomas_seleccionados: JSON.stringify(patient.sintomas),
            tipo_tratamiento_inferido: patient.tipoTratamiento,
            nivel_dolor: patient.nivelDolor,
            prioridad: patient.prioridad,
            fecha_registro: patient.fechaRegistro,
            estado: patient.estado,
            activo: 1
        };
    }

    /**
     * Encuentra un paciente por ID y lo convierte a entidad
     */
    async findPatientById(id) {
        const data = await this.findById(id);
        return this._toEntity(data);
    }

    /**
     * Encuentra todos los pacientes activos
     */
    async findAllActive(limit = 100) {
        const validLimit = this._validateLimit(limit, 100);
        const rows = await this.findWhere({ activo: 1 }, validLimit);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra pacientes pendientes de asignación
     */
    async findPending(limit = 50) {
        const validLimit = this._validateLimit(limit, 50);
        
        const query = `
            SELECT p.* 
            FROM ${this.tableName} p
            LEFT JOIN asignaciones a ON p.id = a.id_paciente AND (a.estado = 'asignado' OR a.estado = 'en_tratamiento')
            WHERE p.activo = ? 
                AND p.estado = ?
                AND a.id IS NULL
            ORDER BY 
                CASE p.prioridad 
                    WHEN 'Muy Alta' THEN 1 
                    WHEN 'Alta' THEN 2 
                    WHEN 'Moderada' THEN 3 
                    WHEN 'Baja' THEN 4
                    ELSE 5 
                END,
                p.nivel_dolor DESC,
                p.fecha_registro ASC
            LIMIT ${validLimit}
        `;
        
        // Use hardcoded LIMIT instead of parameter binding for MySQL compatibility
        const rows = await this.execute(query, [1, 'pendiente']);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra pacientes por ciudad
     */
    async findByCity(ciudad) {
        const rows = await this.findWhere({ ciudad, activo: 1 });
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra pacientes por prioridad
     */
    async findByPriority(prioridad) {
        const rows = await this.findWhere({ prioridad, activo: 1 });
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra pacientes pediátricos (menores de 18)
     */
    async findPediatric() {
        const query = `SELECT * FROM ${this.tableName} WHERE edad < 18 AND activo = 1`;
        const rows = await this.execute(query);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra pacientes adultos (18 o más)
     */
    async findAdult() {
        const query = `SELECT * FROM ${this.tableName} WHERE edad >= 18 AND activo = 1`;
        const rows = await this.execute(query);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Busca pacientes por síntomas (text search)
     */
    async findBySymptomsText(searchText, limit = 50) {
        const validLimit = this._validateLimit(limit, 50);
        
        const query = `
            SELECT * FROM ${this.tableName} 
            WHERE activo = 1 
                AND (sintomas_seleccionados LIKE ? 
                     OR tipo_tratamiento_inferido LIKE ?)
            LIMIT ?
        `;
        
        const searchPattern = `%${searchText}%`;
        const rows = await this.execute(query, [searchPattern, searchPattern, validLimit]);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Obtiene estadísticas de pacientes
     */
    async getStatistics() {
        const queries = {
            total: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE activo = 1`,
            pendientes: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE estado = 'pendiente' AND activo = 1`,
            asignados: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE estado = 'asignado' AND activo = 1`,
            completados: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE estado = 'completado' AND activo = 1`,
            pediatricos: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE edad < 18 AND activo = 1`,
            adultos: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE edad >= 18 AND activo = 1`,
            porPrioridad: `SELECT prioridad, COUNT(*) as count FROM ${this.tableName} WHERE activo = 1 GROUP BY prioridad`,
            porCiudad: `SELECT ciudad, COUNT(*) as count FROM ${this.tableName} WHERE activo = 1 GROUP BY ciudad`
        };

        const stats = {};
        
        for (const [key, query] of Object.entries(queries)) {
            const rows = await this.execute(query);
            if (key === 'porPrioridad' || key === 'porCiudad') {
                stats[key] = rows;
            } else {
                stats[key] = rows[0].count;
            }
        }

        return stats;
    }

    /**
     * Crea un nuevo paciente
     */
    async createPatient(patient) {
        const data = this._fromEntity(patient);
        const id = await this.create(data);
        patient.id = id;
        return patient;
    }

    /**
     * Actualiza un paciente
     */
    async updatePatient(patient) {
        const data = this._fromEntity(patient);
        const updated = await this.updateById(patient.id, data);
        return updated;
    }

    /**
     * Actualiza el estado de un paciente
     */
    async updateStatus(id, estado) {
        return await this.updateById(id, { estado });
    }

    /**
     * Marca un paciente como inactivo (soft delete)
     */
    async deactivate(id) {
        return await this.updateById(id, { activo: 0 });
    }

    /**
     * Busca duplicados por teléfono o email
     */
    async findDuplicates(telefono, email) {
        const query = `
            SELECT * FROM ${this.tableName} 
            WHERE activo = 1 
                AND (telefono = ? OR email = ?)
        `;
        
        const rows = await this.execute(query, [telefono, email]);
        return rows.map(row => this._toEntity(row));
    }
}

module.exports = PatientRepository;