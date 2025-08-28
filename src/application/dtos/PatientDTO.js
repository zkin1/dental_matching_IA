const Joi = require('joi');

/**
 * Data Transfer Objects para Paciente
 */

// Schema base para validación de paciente
const basePatientSchema = {
    nombreCompleto: Joi.string().min(2).max(100).required()
        .messages({
            'string.empty': 'El nombre completo es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede exceder 100 caracteres'
        }),
    
    edad: Joi.number().integer().min(1).max(120).required()
        .messages({
            'number.base': 'La edad debe ser un número',
            'number.integer': 'La edad debe ser un número entero',
            'number.min': 'La edad debe ser mayor a 0',
            'number.max': 'La edad debe ser menor a 120'
        }),
    
    telefono: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(7).max(20).required()
        .messages({
            'string.empty': 'El teléfono es requerido',
            'string.pattern.base': 'El teléfono debe contener solo números y caracteres válidos',
            'string.min': 'El teléfono debe tener al menos 7 caracteres',
            'string.max': 'El teléfono no puede exceder 20 caracteres'
        }),
    
    email: Joi.string().email().max(100)
        .messages({
            'string.email': 'Debe ser un email válido',
            'string.max': 'El email no puede exceder 100 caracteres'
        }),
    
    ciudad: Joi.string().max(50)
        .messages({
            'string.max': 'La ciudad no puede exceder 50 caracteres'
        }),
    
    sintomas: Joi.array().items(Joi.string().max(200))
        .messages({
            'array.base': 'Los síntomas deben ser un array de strings'
        }),
    
    nivelDolor: Joi.number().integer().min(0).max(10)
        .messages({
            'number.base': 'El nivel de dolor debe ser un número',
            'number.integer': 'El nivel de dolor debe ser un número entero',
            'number.min': 'El nivel de dolor debe ser entre 0 y 10',
            'number.max': 'El nivel de dolor debe ser entre 0 y 10'
        }),
    
    prioridad: Joi.string().valid('baja', 'moderada', 'alta', 'muy_alta')
        .messages({
            'any.only': 'La prioridad debe ser: baja, moderada, alta, muy_alta'
        }),
    
    tipoTratamiento: Joi.string().max(100)
        .messages({
            'string.max': 'El tipo de tratamiento no puede exceder 100 caracteres'
        }),
    
    estado: Joi.string().valid('pendiente', 'asignado', 'en_tratamiento', 'completado', 'cancelado')
        .messages({
            'any.only': 'El estado debe ser: pendiente, asignado, en_tratamiento, completado, cancelado'
        })
};

/**
 * DTO para crear un nuevo paciente
 */
class CreatePatientDTO {
    constructor(data) {
        this.nombreCompleto = data.nombreCompleto;
        this.edad = data.edad;
        this.telefono = data.telefono;
        this.email = data.email;
        this.ciudad = data.ciudad;
        this.sintomas = data.sintomas || [];
        this.nivelDolor = data.nivelDolor || 0;
        this.prioridad = data.prioridad || 'moderada';
        this.tipoTratamiento = data.tipoTratamiento;
    }

    static getValidationSchema() {
        return Joi.object({
            nombreCompleto: basePatientSchema.nombreCompleto,
            edad: basePatientSchema.edad,
            telefono: basePatientSchema.telefono,
            email: basePatientSchema.email,
            ciudad: basePatientSchema.ciudad,
            sintomas: basePatientSchema.sintomas,
            nivelDolor: basePatientSchema.nivelDolor,
            prioridad: basePatientSchema.prioridad,
            tipoTratamiento: basePatientSchema.tipoTratamiento
        });
    }

    static validate(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data, { abortEarly: false });
    }
}

/**
 * DTO para actualizar un paciente existente
 */
class UpdatePatientDTO {
    constructor(data) {
        this.nombreCompleto = data.nombreCompleto;
        this.edad = data.edad;
        this.telefono = data.telefono;
        this.email = data.email;
        this.ciudad = data.ciudad;
        this.sintomas = data.sintomas;
        this.nivelDolor = data.nivelDolor;
        this.prioridad = data.prioridad;
        this.tipoTratamiento = data.tipoTratamiento;
        this.estado = data.estado;
    }

    static getValidationSchema() {
        return Joi.object({
            nombreCompleto: basePatientSchema.nombreCompleto.optional(),
            edad: basePatientSchema.edad.optional(),
            telefono: basePatientSchema.telefono.optional(),
            email: basePatientSchema.email.optional(),
            ciudad: basePatientSchema.ciudad.optional(),
            sintomas: basePatientSchema.sintomas.optional(),
            nivelDolor: basePatientSchema.nivelDolor.optional(),
            prioridad: basePatientSchema.prioridad.optional(),
            tipoTratamiento: basePatientSchema.tipoTratamiento.optional(),
            estado: basePatientSchema.estado.optional()
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
 * DTO para respuesta de paciente
 */
class PatientResponseDTO {
    constructor(patient, includeStudentInfo = false) {
        this.id = patient.id;
        this.nombreCompleto = patient.nombreCompleto;
        this.edad = patient.edad;
        this.telefono = patient.telefono;
        this.email = patient.email;
        this.ciudad = patient.ciudad;
        this.sintomas = patient.sintomas;
        this.tipoTratamiento = patient.tipoTratamiento;
        this.nivelDolor = patient.nivelDolor;
        this.prioridad = patient.prioridad;
        this.estado = patient.estado;
        this.fechaRegistro = patient.fechaRegistro;
        this.isPediatric = patient.isPediatric();
        this.urgencyLevel = patient.getUrgencyLevel();
        
        if (includeStudentInfo && patient.estudiante) {
            this.estudiante = {
                id: patient.estudiante.id,
                nombre: patient.estudiante.nombreCompleto,
                codigo: patient.estudiante.codigoEstudiante
            };
        }
    }

    static fromPatient(patient, includeStudentInfo = false) {
        return new PatientResponseDTO(patient, includeStudentInfo);
    }

    static fromPatientList(patients, includeStudentInfo = false) {
        return patients.map(patient => new PatientResponseDTO(patient, includeStudentInfo));
    }
}

/**
 * DTO para filtros de búsqueda de pacientes
 */
class PatientSearchDTO {
    constructor(data) {
        this.nombre = data.nombre;
        this.ciudad = data.ciudad;
        this.prioridad = data.prioridad;
        this.estado = data.estado;
        this.edadMin = data.edadMin;
        this.edadMax = data.edadMax;
        this.isPediatric = data.isPediatric;
        this.page = data.page || 1;
        this.limit = data.limit || 20;
        this.sortBy = data.sortBy || 'fechaRegistro';
        this.sortOrder = data.sortOrder || 'desc';
    }

    static getValidationSchema() {
        return Joi.object({
            nombre: Joi.string().max(100),
            ciudad: Joi.string().max(50),
            prioridad: Joi.string().valid('baja', 'moderada', 'alta', 'muy_alta'),
            estado: Joi.string().valid('pendiente', 'asignado', 'en_tratamiento', 'completado', 'cancelado'),
            edadMin: Joi.number().integer().min(0).max(120),
            edadMax: Joi.number().integer().min(0).max(120),
            isPediatric: Joi.boolean(),
            page: Joi.number().integer().min(1).max(1000),
            limit: Joi.number().integer().min(1).max(100),
            sortBy: Joi.string().valid('fechaRegistro', 'nombreCompleto', 'edad', 'prioridad', 'estado'),
            sortOrder: Joi.string().valid('asc', 'desc')
        }).with('edadMin', 'edadMax');
    }

    static validate(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data, { abortEarly: false });
    }
}

module.exports = {
    CreatePatientDTO,
    UpdatePatientDTO,
    PatientResponseDTO,
    PatientSearchDTO
};