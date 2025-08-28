const BaseRepository = require('./BaseRepository');
const Assignment = require('../../core/entities/Assignment');

/**
 * Repositorio para la entidad Assignment
 */
class AssignmentRepository extends BaseRepository {
    constructor() {
        super('asignaciones');
    }

    /**
     * Convierte datos de DB a entidad Assignment
     */
    _toEntity(data) {
        return data ? Assignment.fromDatabase(data) : null;
    }

    /**
     * Convierte entidad Assignment a datos de DB
     */
    _fromEntity(assignment) {
        return {
            id_paciente: assignment.pacienteId,
            id_estudiante: assignment.estudianteId,
            especialidad: assignment.especialidad,
            clinica: assignment.clinica,
            dia_semana: assignment.diaSemana,
            hora_inicio: assignment.horaInicio,
            hora_fin: assignment.horaFin,
            fecha_asignacion: assignment.fechaAsignacion,
            fecha_cita: assignment.fechaCita,
            estado: assignment.estado,
            score_compatibilidad: assignment.scoreCompatibilidad,
            observaciones_sistema: assignment.observacionesSistema,
            observaciones_estudiante: assignment.observacionesEstudiante,
            algoritmo_version: assignment.algoritmoVersion
        };
    }

    /**
     * Encuentra una asignación por ID y la convierte a entidad
     */
    async findAssignmentById(id) {
        const data = await this.findById(id);
        return this._toEntity(data);
    }

    /**
     * Encuentra todas las asignaciones con información de paciente y estudiante
     */
    async findAllWithDetails(limit = 100) {
        const validLimit = this._validateLimit(limit, 100);
        
        const query = `
            SELECT 
                a.*,
                p.nombre_completo as paciente_nombre,
                p.telefono as paciente_telefono,
                p.tipo_tratamiento_inferido,
                p.nivel_dolor,
                p.prioridad,
                e.nombre_completo as estudiante_nombre,
                e.codigo_estudiante,
                e.año_carrera,
                e.especialidades
            FROM ${this.tableName} a
            LEFT JOIN pacientes p ON a.id_paciente = p.id
            LEFT JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
            ORDER BY a.fecha_asignacion DESC
            LIMIT ${validLimit}
        `;
        
        const rows = await this.execute(query);
        return rows.map(row => ({
            assignment: this._toEntity(row),
            paciente: {
                nombre: row.paciente_nombre,
                telefono: row.paciente_telefono,
                tratamiento: row.tipo_tratamiento_inferido,
                dolor: row.nivel_dolor,
                prioridad: row.prioridad
            },
            estudiante: {
                nombre: row.estudiante_nombre,
                codigo: row.codigo_estudiante,
                año: row.año_carrera,
                especialidades: row.especialidades
            }
        }));
    }

    /**
     * Encuentra asignaciones activas
     */
    async findActive() {
        const estadosActivos = ['asignado', 'contactado', 'en_tratamiento'];
        const placeholders = estadosActivos.map(() => '?').join(',');
        
        const query = `SELECT * FROM ${this.tableName} WHERE estado IN (${placeholders})`;
        const rows = await this.execute(query, estadosActivos);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra asignaciones por paciente
     */
    async findByPatient(pacienteId) {
        const rows = await this.findWhere({ id_paciente: pacienteId });
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra asignaciones por estudiante
     */
    async findByStudent(estudianteId) {
        const rows = await this.findWhere({ id_estudiante: estudianteId });
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra asignaciones por especialidad
     */
    async findBySpecialty(especialidad) {
        const rows = await this.findWhere({ especialidad });
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra asignaciones por clínica
     */
    async findByClinic(clinica) {
        const rows = await this.findWhere({ clinica });
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra asignaciones por fecha de cita
     */
    async findByDate(fecha) {
        const rows = await this.findWhere({ fecha_cita: fecha });
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra conflictos de horarios para un estudiante en una fecha específica
     */
    async findTimeConflicts(estudianteId, fecha, horaInicio, horaFin) {
        const query = `
            SELECT * FROM ${this.tableName}
            WHERE id_estudiante = ?
                AND fecha_cita = ?
                AND estado IN ('asignado', 'contactado', 'en_tratamiento')
                AND (
                    (hora_inicio < ? AND hora_fin > ?) OR
                    (hora_inicio < ? AND hora_fin > ?) OR
                    (hora_inicio >= ? AND hora_fin <= ?)
                )
        `;
        
        const rows = await this.execute(query, [
            estudianteId, fecha,
            horaFin, horaInicio,
            horaInicio, horaInicio,
            horaInicio, horaFin
        ]);
        
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Encuentra asignaciones por rango de fechas
     */
    async findByDateRange(startDate, endDate, estado = null) {
        let query = `
            SELECT * FROM ${this.tableName}
            WHERE fecha_cita >= ? AND fecha_cita <= ?
        `;
        
        const params = [startDate, endDate];
        
        if (estado) {
            query += ' AND estado = ?';
            params.push(estado);
        }
        
        query += ' ORDER BY fecha_cita ASC, hora_inicio ASC';
        
        const rows = await this.execute(query, params);
        return rows.map(row => this._toEntity(row));
    }

    /**
     * Obtiene estadísticas de asignaciones
     */
    async getStatistics() {
        const queries = {
            total: `SELECT COUNT(*) as count FROM ${this.tableName}`,
            activas: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE estado IN ('asignado', 'contactado', 'en_tratamiento')`,
            completadas: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE estado = 'completado'`,
            canceladas: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE estado = 'cancelado'`,
            porEspecialidad: `SELECT especialidad, COUNT(*) as count FROM ${this.tableName} GROUP BY especialidad`,
            porClinica: `SELECT clinica, COUNT(*) as count FROM ${this.tableName} GROUP BY clinica`,
            porEstado: `SELECT estado, COUNT(*) as count FROM ${this.tableName} GROUP BY estado`,
            scorePromedio: `SELECT AVG(score_compatibilidad) as promedio FROM ${this.tableName} WHERE score_compatibilidad > 0`,
            hoy: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE DATE(fecha_asignacion) = CURDATE()`,
            estaSemana: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE YEARWEEK(fecha_asignacion) = YEARWEEK(NOW())`
        };

        const stats = {};
        
        for (const [key, query] of Object.entries(queries)) {
            try {
                const rows = await this.execute(query);
                if (['porEspecialidad', 'porClinica', 'porEstado'].includes(key)) {
                    stats[key] = rows;
                } else if (key === 'scorePromedio') {
                    stats[key] = parseFloat(rows[0].promedio || 0).toFixed(2);
                } else {
                    stats[key] = rows[0].count || rows[0].promedio || 0;
                }
            } catch (error) {
                console.warn(`Error obteniendo estadística ${key}:`, error.message);
                stats[key] = key.startsWith('por') ? [] : 0;
            }
        }

        return stats;
    }

    /**
     * Crea una nueva asignación
     */
    async createAssignment(assignment) {
        const data = this._fromEntity(assignment);
        const id = await this.create(data);
        assignment.id = id;
        return assignment;
    }

    /**
     * Actualiza una asignación
     */
    async updateAssignment(assignment) {
        const data = this._fromEntity(assignment);
        const updated = await this.updateById(assignment.id, data);
        return updated;
    }

    /**
     * Actualiza el estado de una asignación
     */
    async updateStatus(id, estado, observaciones = null) {
        const data = { estado };
        if (observaciones) {
            data.observaciones_sistema = observaciones;
        }
        return await this.updateById(id, data);
    }

    /**
     * Verifica si un paciente ya tiene asignación activa
     */
    async hasActiveAssignment(pacienteId) {
        const estadosActivos = ['asignado', 'contactado', 'en_tratamiento'];
        const count = await this.count({
            id_paciente: pacienteId,
            estado: estadosActivos // Note: this won't work with IN clause in count method
        });
        
        // Better approach for IN clause
        const query = `
            SELECT COUNT(*) as count 
            FROM ${this.tableName} 
            WHERE id_paciente = ? AND estado IN ('asignado', 'contactado', 'en_tratamiento')
        `;
        
        const rows = await this.execute(query, [pacienteId]);
        return rows[0].count > 0;
    }

    /**
     * Obtiene el historial de asignaciones de un paciente
     */
    async getPatientHistory(pacienteId) {
        const query = `
            SELECT 
                a.*,
                e.nombre_completo as estudiante_nombre,
                e.codigo_estudiante
            FROM ${this.tableName} a
            LEFT JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
            WHERE a.id_paciente = ?
            ORDER BY a.fecha_asignacion DESC
        `;
        
        const rows = await this.execute(query, [pacienteId]);
        return rows.map(row => ({
            assignment: this._toEntity(row),
            estudiante: {
                nombre: row.estudiante_nombre,
                codigo: row.codigo_estudiante
            }
        }));
    }

    /**
     * Obtiene la carga de trabajo de un estudiante
     */
    async getStudentWorkload(estudianteId) {
        const query = `
            SELECT 
                COUNT(*) as total_asignaciones,
                SUM(CASE WHEN estado IN ('asignado', 'contactado', 'en_tratamiento') THEN 1 ELSE 0 END) as activas,
                SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completadas,
                SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as canceladas,
                AVG(score_compatibilidad) as score_promedio
            FROM ${this.tableName}
            WHERE id_estudiante = ?
        `;
        
        const rows = await this.execute(query, [estudianteId]);
        return rows[0];
    }

    /**
     * Busca asignaciones que necesitan seguimiento (no contactadas después de X días)
     */
    async findNeedingFollowUp(days = 3) {
        const query = `
            SELECT * FROM ${this.tableName}
            WHERE estado = 'asignado'
                AND DATEDIFF(NOW(), fecha_asignacion) >= ?
            ORDER BY fecha_asignacion ASC
        `;
        
        const rows = await this.execute(query, [days]);
        return rows.map(row => this._toEntity(row));
    }
}

module.exports = AssignmentRepository;