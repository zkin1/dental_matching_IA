const Joi = require('joi');

/**
 * Data Transfer Objects para Asignación
 */

// Schema base para validación de asignación
const baseAssignmentSchema = {
    pacienteId: Joi.number().integer().required()
        .messages({
            'number.base': 'El ID del paciente debe ser un número',
            'number.integer': 'El ID del paciente debe ser un número entero',
            'any.required': 'El ID del paciente es requerido'
        }),
    
    estudianteId: Joi.number().integer().required()
        .messages({
            'number.base': 'El ID del estudiante debe ser un número',
            'number.integer': 'El ID del estudiante debe ser un número entero',
            'any.required': 'El ID del estudiante es requerido'
        }),
    
    especialidad: Joi.string().max(50).required()
        .messages({
            'string.empty': 'La especialidad es requerida',
            'string.max': 'La especialidad no puede exceder 50 caracteres'
        }),
    
    clinica: Joi.string().max(100)
        .messages({
            'string.max': 'La clínica no puede exceder 100 caracteres'
        }),
    
    diaSemana: Joi.string().valid('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado')
        .messages({
            'any.only': 'El día debe ser: lunes, martes, miercoles, jueves, viernes, sabado'
        }),
    
    horaInicio: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .messages({
            'string.pattern.base': 'La hora de inicio debe tener formato HH:MM'
        }),
    
    horaFin: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .messages({
            'string.pattern.base': 'La hora de fin debe tener formato HH:MM'
        }),
    
    fechaCita: Joi.date().iso()
        .messages({
            'date.base': 'La fecha de cita debe ser una fecha válida',
            'date.format': 'La fecha debe estar en formato ISO'
        }),
    
    estado: Joi.string().valid('asignado', 'notificado', 'contactado', 'confirmado', 'en_tratamiento', 'completado', 'cancelado')
        .messages({
            'any.only': 'El estado debe ser: asignado, notificado, contactado, confirmado, en_tratamiento, completado, cancelado'
        }),
    
    scoreCompatibilidad: Joi.number().min(0).max(1)
        .messages({
            'number.base': 'El score debe ser un número',
            'number.min': 'El score debe ser entre 0 y 1',
            'number.max': 'El score debe ser entre 0 y 1'
        }),
    
    observacionesSistema: Joi.string().max(500)
        .messages({
            'string.max': 'Las observaciones del sistema no pueden exceder 500 caracteres'
        }),
    
    observacionesEstudiante: Joi.string().max(500)
        .messages({
            'string.max': 'Las observaciones del estudiante no pueden exceder 500 caracteres'
        })
};

/**
 * DTO para crear una nueva asignación manual
 */
class CreateAssignmentDTO {
    constructor(data) {
        this.pacienteId = data.pacienteId;
        this.estudianteId = data.estudianteId;
        this.especialidad = data.especialidad;
        this.clinica = data.clinica;
        this.diaSemana = data.diaSemana;
        this.horaInicio = data.horaInicio;
        this.horaFin = data.horaFin;
        this.fechaCita = data.fechaCita;
        this.observacionesSistema = data.observacionesSistema;
        this.scoreCompatibilidad = data.scoreCompatibilidad;
    }

    static getValidationSchema() {
        return Joi.object({
            pacienteId: baseAssignmentSchema.pacienteId,
            estudianteId: baseAssignmentSchema.estudianteId,
            especialidad: baseAssignmentSchema.especialidad,
            clinica: baseAssignmentSchema.clinica,
            diaSemana: baseAssignmentSchema.diaSemana,
            horaInicio: baseAssignmentSchema.horaInicio,
            horaFin: baseAssignmentSchema.horaFin,
            fechaCita: baseAssignmentSchema.fechaCita,
            observacionesSistema: baseAssignmentSchema.observacionesSistema,
            scoreCompatibilidad: baseAssignmentSchema.scoreCompatibilidad
        }).custom((value, helpers) => {
            // Validar que hora de fin sea mayor que hora de inicio
            if (value.horaInicio && value.horaFin) {
                const inicio = value.horaInicio.split(':').map(Number);
                const fin = value.horaFin.split(':').map(Number);
                
                const inicioMinutos = inicio[0] * 60 + inicio[1];
                const finMinutos = fin[0] * 60 + fin[1];
                
                if (finMinutos <= inicioMinutos) {
                    return helpers.error('custom.timeRange');
                }
            }
            
            return value;
        }).messages({
            'custom.timeRange': 'La hora de fin debe ser mayor que la hora de inicio'
        });
    }

    static validate(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data, { abortEarly: false });
    }
}

/**
 * DTO para actualizar una asignación existente
 */
class UpdateAssignmentDTO {
    constructor(data) {
        this.especialidad = data.especialidad;
        this.clinica = data.clinica;
        this.diaSemana = data.diaSemana;
        this.horaInicio = data.horaInicio;
        this.horaFin = data.horaFin;
        this.fechaCita = data.fechaCita;
        this.estado = data.estado;
        this.observacionesSistema = data.observacionesSistema;
        this.observacionesEstudiante = data.observacionesEstudiante;
        this.scoreCompatibilidad = data.scoreCompatibilidad;
    }

    static getValidationSchema() {
        return Joi.object({
            especialidad: baseAssignmentSchema.especialidad.optional(),
            clinica: baseAssignmentSchema.clinica.optional(),
            diaSemana: baseAssignmentSchema.diaSemana.optional(),
            horaInicio: baseAssignmentSchema.horaInicio.optional(),
            horaFin: baseAssignmentSchema.horaFin.optional(),
            fechaCita: baseAssignmentSchema.fechaCita.optional(),
            estado: baseAssignmentSchema.estado.optional(),
            observacionesSistema: baseAssignmentSchema.observacionesSistema.optional(),
            observacionesEstudiante: baseAssignmentSchema.observacionesEstudiante.optional(),
            scoreCompatibilidad: baseAssignmentSchema.scoreCompatibilidad.optional()
        }).min(1).custom((value, helpers) => {
            // Validar que hora de fin sea mayor que hora de inicio si ambas están presentes
            if (value.horaInicio && value.horaFin) {
                const inicio = value.horaInicio.split(':').map(Number);
                const fin = value.horaFin.split(':').map(Number);
                
                const inicioMinutos = inicio[0] * 60 + inicio[1];
                const finMinutos = fin[0] * 60 + fin[1];
                
                if (finMinutos <= inicioMinutos) {
                    return helpers.error('custom.timeRange');
                }
            }
            
            return value;
        }).messages({
            'object.min': 'Debe proporcionar al menos un campo para actualizar',
            'custom.timeRange': 'La hora de fin debe ser mayor que la hora de inicio'
        });
    }

    static validate(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data, { abortEarly: false });
    }
}

/**
 * DTO para respuesta de asignación
 */
class AssignmentResponseDTO {
    constructor(assignment, includeDetails = false) {
        this.id = assignment.id;
        this.pacienteId = assignment.pacienteId;
        this.estudianteId = assignment.estudianteId;
        this.especialidad = assignment.especialidad;
        this.clinica = assignment.clinica;
        this.diaSemana = assignment.diaSemana;
        this.horaInicio = assignment.horaInicio;
        this.horaFin = assignment.horaFin;
        this.fechaAsignacion = assignment.fechaAsignacion;
        this.fechaCita = assignment.fechaCita;
        this.estado = assignment.estado;
        this.scoreCompatibilidad = assignment.scoreCompatibilidad;
        this.observacionesSistema = assignment.observacionesSistema;
        this.observacionesEstudiante = assignment.observacionesEstudiante;
        this.algoritmoVersion = assignment.algoritmoVersion;
        
        // Propiedades calculadas
        this.isActive = assignment.isActive();
        this.isCompleted = assignment.isCompleted();
        this.durationMinutes = assignment.getDurationMinutes();
        
        if (includeDetails) {
            this.details = {
                tipoAsignacion: assignment.observacionesSistema?.includes('MANUAL') ? 'manual' : 'automatica',
                duracionFormateada: this.formatDuration(assignment.getDurationMinutes()),
                estadoDescriptivo: this.getEstadoDescriptivo(assignment.estado)
            };
        }
    }

    formatDuration(minutes) {
        if (!minutes) return 'No especificado';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    getEstadoDescriptivo(estado) {
        const descriptions = {
            'asignado': 'Asignado - Pendiente de notificación',
            'notificado': 'Notificado - Esperando contacto',
            'contactado': 'Contactado - Pendiente de confirmación',
            'confirmado': 'Confirmado - Cita programada',
            'en_tratamiento': 'En tratamiento',
            'completado': 'Tratamiento completado',
            'cancelado': 'Asignación cancelada'
        };
        return descriptions[estado] || estado;
    }

    static fromAssignment(assignment, includeDetails = false) {
        return new AssignmentResponseDTO(assignment, includeDetails);
    }

    static fromAssignmentList(assignments, includeDetails = false) {
        return assignments.map(assignment => new AssignmentResponseDTO(assignment, includeDetails));
    }
}

/**
 * DTO para filtros de búsqueda de asignaciones
 */
class AssignmentSearchDTO {
    constructor(data) {
        this.pacienteId = data.pacienteId;
        this.estudianteId = data.estudianteId;
        this.especialidad = data.especialidad;
        this.clinica = data.clinica;
        this.estado = data.estado;
        this.fechaDesde = data.fechaDesde;
        this.fechaHasta = data.fechaHasta;
        this.diaSemana = data.diaSemana;
        this.scoreMinimo = data.scoreMinimo;
        this.tipoAsignacion = data.tipoAsignacion;
        this.page = data.page || 1;
        this.limit = data.limit || 20;
        this.sortBy = data.sortBy || 'fechaAsignacion';
        this.sortOrder = data.sortOrder || 'desc';
    }

    static getValidationSchema() {
        return Joi.object({
            pacienteId: Joi.number().integer(),
            estudianteId: Joi.number().integer(),
            especialidad: Joi.string().max(50),
            clinica: Joi.string().max(100),
            estado: baseAssignmentSchema.estado,
            fechaDesde: Joi.date().iso(),
            fechaHasta: Joi.date().iso(),
            diaSemana: baseAssignmentSchema.diaSemana,
            scoreMinimo: Joi.number().min(0).max(1),
            tipoAsignacion: Joi.string().valid('manual', 'automatica'),
            page: Joi.number().integer().min(1).max(1000),
            limit: Joi.number().integer().min(1).max(100),
            sortBy: Joi.string().valid('fechaAsignacion', 'fechaCita', 'scoreCompatibilidad', 'estado'),
            sortOrder: Joi.string().valid('asc', 'desc')
        }).custom((value, helpers) => {
            // Validar que fechaHasta sea mayor que fechaDesde
            if (value.fechaDesde && value.fechaHasta && value.fechaHasta <= value.fechaDesde) {
                return helpers.error('custom.dateRange');
            }
            return value;
        }).messages({
            'custom.dateRange': 'La fecha hasta debe ser mayor que la fecha desde'
        });
    }

    static validate(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data, { abortEarly: false });
    }
}

/**
 * DTO para sugerencias de matching
 */
class MatchingSuggestionDTO {
    constructor(data) {
        this.pacienteId = data.pacienteId;
        this.maxSugerencias = data.maxSugerencias || 5;
        this.especialidadRequerida = data.especialidadRequerida;
        this.clinicaPreferida = data.clinicaPreferida;
        this.considerarHorarios = data.considerarHorarios !== false; // true por defecto
    }

    static getValidationSchema() {
        return Joi.object({
            pacienteId: Joi.number().integer().required(),
            maxSugerencias: Joi.number().integer().min(1).max(20),
            especialidadRequerida: Joi.string().max(50),
            clinicaPreferida: Joi.string().max(100),
            considerarHorarios: Joi.boolean()
        });
    }

    static validate(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data, { abortEarly: false });
    }
}

module.exports = {
    CreateAssignmentDTO,
    UpdateAssignmentDTO,
    AssignmentResponseDTO,
    AssignmentSearchDTO,
    MatchingSuggestionDTO
};