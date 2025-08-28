const Joi = require('joi');

/**
 * Data Transfer Objects para Estudiante
 */

// Schema base para validación de estudiante
const baseStudentSchema = {
    nombreCompleto: Joi.string().min(2).max(100).required()
        .messages({
            'string.empty': 'El nombre completo es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede exceder 100 caracteres'
        }),
    
    codigoEstudiante: Joi.string().min(5).max(20).required()
        .messages({
            'string.empty': 'El código de estudiante es requerido',
            'string.min': 'El código debe tener al menos 5 caracteres',
            'string.max': 'El código no puede exceder 20 caracteres'
        }),
    
    anoCarrera: Joi.string().required()
        .messages({
            'string.empty': 'El año de carrera es requerido'
        }),
    
    telefono: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(7).max(20)
        .messages({
            'string.pattern.base': 'El teléfono debe contener solo números y caracteres válidos',
            'string.min': 'El teléfono debe tener al menos 7 caracteres',
            'string.max': 'El teléfono no puede exceder 20 caracteres'
        }),
    
    email: Joi.string().email().max(100).required()
        .messages({
            'string.empty': 'El email es requerido',
            'string.email': 'Debe ser un email válido',
            'string.max': 'El email no puede exceder 100 caracteres'
        }),
    
    especialidades: Joi.alternatives().try(
        Joi.array().items(Joi.string().max(50)),
        Joi.string().max(200)
    ).messages({
        'alternatives.match': 'Las especialidades deben ser un array de strings o string separado por comas'
    }),
    
    casosActivos: Joi.number().integer().min(0).max(50)
        .messages({
            'number.base': 'Los casos activos deben ser un número',
            'number.integer': 'Los casos activos deben ser un número entero',
            'number.min': 'Los casos activos no pueden ser negativos',
            'number.max': 'Los casos activos no pueden exceder 50'
        }),
    
    casosNecesarios: Joi.number().integer().min(1).max(50)
        .messages({
            'number.base': 'Los casos necesarios deben ser un número',
            'number.integer': 'Los casos necesarios deben ser un número entero',
            'number.min': 'Los casos necesarios deben ser al menos 1',
            'number.max': 'Los casos necesarios no pueden exceder 50'
        }),
    
    casosCompletados: Joi.number().integer().min(0).max(200)
        .messages({
            'number.base': 'Los casos completados deben ser un número',
            'number.integer': 'Los casos completados deben ser un número entero',
            'number.min': 'Los casos completados no pueden ser negativos',
            'number.max': 'Los casos completados no pueden exceder 200'
        }),
    
    estado: Joi.string().valid('activo', 'inactivo', 'graduado', 'suspendido')
        .messages({
            'any.only': 'El estado debe ser: activo, inactivo, graduado, suspendido'
        })
};

/**
 * DTO para crear un nuevo estudiante
 */
class CreateStudentDTO {
    constructor(data) {
        this.nombreCompleto = data.nombreCompleto;
        this.codigoEstudiante = data.codigoEstudiante;
        this.anoCarrera = data.anoCarrera;
        this.telefono = data.telefono;
        this.email = data.email;
        this.especialidades = data.especialidades || [];
        this.casosActivos = data.casosActivos || 0;
        this.casosNecesarios = data.casosNecesarios || 10;
        this.casosCompletados = data.casosCompletados || 0;
    }

    static getValidationSchema() {
        return Joi.object({
            nombreCompleto: baseStudentSchema.nombreCompleto,
            codigoEstudiante: baseStudentSchema.codigoEstudiante,
            anoCarrera: baseStudentSchema.anoCarrera,
            telefono: baseStudentSchema.telefono,
            email: baseStudentSchema.email,
            especialidades: baseStudentSchema.especialidades,
            casosActivos: baseStudentSchema.casosActivos,
            casosNecesarios: baseStudentSchema.casosNecesarios,
            casosCompletados: baseStudentSchema.casosCompletados
        });
    }

    static validate(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data, { abortEarly: false });
    }
}

/**
 * DTO para actualizar un estudiante existente
 */
class UpdateStudentDTO {
    constructor(data) {
        this.nombreCompleto = data.nombreCompleto;
        this.codigoEstudiante = data.codigoEstudiante;
        this.anoCarrera = data.anoCarrera;
        this.telefono = data.telefono;
        this.email = data.email;
        this.especialidades = data.especialidades;
        this.casosActivos = data.casosActivos;
        this.casosNecesarios = data.casosNecesarios;
        this.casosCompletados = data.casosCompletados;
        this.estado = data.estado;
    }

    static getValidationSchema() {
        return Joi.object({
            nombreCompleto: baseStudentSchema.nombreCompleto.optional(),
            codigoEstudiante: baseStudentSchema.codigoEstudiante.optional(),
            anoCarrera: baseStudentSchema.anoCarrera.optional(),
            telefono: baseStudentSchema.telefono.optional(),
            email: baseStudentSchema.email.optional(),
            especialidades: baseStudentSchema.especialidades.optional(),
            casosActivos: baseStudentSchema.casosActivos.optional(),
            casosNecesarios: baseStudentSchema.casosNecesarios.optional(),
            casosCompletados: baseStudentSchema.casosCompletados.optional(),
            estado: baseStudentSchema.estado.optional()
        }).min(1).messages({
            'object.min': 'Debe proporcionar al menos un campo para actualizar'
        });
    }

    static validate(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data, { abortEarly: false });
    }
}

/**
 * DTO para respuesta de estudiante
 */
class StudentResponseDTO {
    constructor(student, includeWorkloadDetails = false) {
        this.id = student.id;
        this.nombreCompleto = student.nombreCompleto;
        this.codigoEstudiante = student.codigoEstudiante;
        this.anoCarrera = student.anoCarrera;
        this.telefono = student.telefono;
        this.email = student.email;
        this.especialidades = student.especialidades;
        this.casosActivos = student.casosActivos;
        this.casosNecesarios = student.casosNecesarios;
        this.casosCompletados = student.casosCompletados;
        this.estado = student.estado;
        this.isAvailable = student.isAvailable();
        this.isAdvanced = student.isAdvancedStudent();
        this.workloadPercentage = student.getWorkloadPercentage();
        this.remainingCapacity = student.getRemainingCapacity();
        
        if (includeWorkloadDetails) {
            this.workloadDetails = {
                percentage: this.workloadPercentage,
                remaining: this.remainingCapacity,
                efficiency: student.casosCompletados > 0 ? 
                    (student.casosCompletados / (student.casosActivos + student.casosCompletados)) * 100 : 0
            };
        }
    }

    static fromStudent(student, includeWorkloadDetails = false) {
        return new StudentResponseDTO(student, includeWorkloadDetails);
    }

    static fromStudentList(students, includeWorkloadDetails = false) {
        return students.map(student => new StudentResponseDTO(student, includeWorkloadDetails));
    }
}

/**
 * DTO para filtros de búsqueda de estudiantes
 */
class StudentSearchDTO {
    constructor(data) {
        this.nombre = data.nombre;
        this.codigo = data.codigo;
        this.anoCarrera = data.anoCarrera;
        this.especialidad = data.especialidad;
        this.estado = data.estado;
        this.disponible = data.disponible;
        this.cargaMaxima = data.cargaMaxima;
        this.page = data.page || 1;
        this.limit = data.limit || 20;
        this.sortBy = data.sortBy || 'nombreCompleto';
        this.sortOrder = data.sortOrder || 'asc';
    }

    static getValidationSchema() {
        return Joi.object({
            nombre: Joi.string().max(100),
            codigo: Joi.string().max(20),
            anoCarrera: Joi.string(),
            especialidad: Joi.string().max(50),
            estado: Joi.string().valid('activo', 'inactivo', 'graduado', 'suspendido'),
            disponible: Joi.boolean(),
            cargaMaxima: Joi.number().integer().min(0).max(100),
            page: Joi.number().integer().min(1).max(1000),
            limit: Joi.number().integer().min(1).max(100),
            sortBy: Joi.string().valid('nombreCompleto', 'codigoEstudiante', 'anoCarrera', 'casosActivos', 'casosCompletados'),
            sortOrder: Joi.string().valid('asc', 'desc')
        });
    }

    static validate(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data, { abortEarly: false });
    }
}

/**
 * DTO para disponibilidad de horarios
 */
class StudentAvailabilityDTO {
    constructor(data) {
        this.estudianteId = data.estudianteId;
        this.especialidad = data.especialidad;
        this.clinica = data.clinica;
        this.diasDisponibles = data.diasDisponibles || [];
        this.horariosDisponibles = data.horariosDisponibles || [];
    }

    static getValidationSchema() {
        return Joi.object({
            estudianteId: Joi.number().integer().required(),
            especialidad: Joi.string().max(50).required(),
            clinica: Joi.string().max(100).required(),
            diasDisponibles: Joi.array().items(
                Joi.string().valid('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado')
            ),
            horariosDisponibles: Joi.array().items(
                Joi.object({
                    inicio: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
                    fin: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
                })
            )
        });
    }

    static validate(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data, { abortEarly: false });
    }
}

module.exports = {
    CreateStudentDTO,
    UpdateStudentDTO,
    StudentResponseDTO,
    StudentSearchDTO,
    StudentAvailabilityDTO
};