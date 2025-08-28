/**
 * DENTAL MATCHING - VALIDATION SCHEMAS
 * Joi validation schemas for all entities
 */

const Joi = require('joi');

// Base validation patterns
const patterns = {
  objectId: /^[0-9a-fA-F]{24}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+\d{1,3}[- ]?)?\d{10}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

// Common field validations
const commonFields = {
  id: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(patterns.objectId)
  ),
  email: Joi.string().email().lowercase().trim(),
  phone: Joi.string().pattern(patterns.phone).optional(),
  date: Joi.date().iso(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sortBy: Joi.string().default('created_at')
  }
};

// Patient validation schemas
const patientSchemas = {
  create: Joi.object({
    nombre_completo: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.empty': 'El nombre completo es requerido',
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 100 caracteres'
      }),
    
    edad: Joi.number()
      .integer()
      .min(1)
      .max(120)
      .required()
      .messages({
        'number.base': 'La edad debe ser un número',
        'number.min': 'La edad debe ser mayor a 0',
        'number.max': 'La edad no puede ser mayor a 120'
      }),
    
    genero: Joi.string()
      .valid('masculino', 'femenino', 'otro')
      .required()
      .messages({
        'any.only': 'El género debe ser masculino, femenino u otro'
      }),
    
    email: commonFields.email.optional(),
    telefono: commonFields.phone,
    
    direccion: Joi.string().trim().max(200).optional(),
    
    motivo_consulta: Joi.string()
      .trim()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'string.min': 'El motivo de consulta debe tener al menos 10 caracteres',
        'string.max': 'El motivo de consulta no puede exceder 1000 caracteres'
      }),
    
    sintomas: Joi.array()
      .items(Joi.string().trim().max(100))
      .min(1)
      .max(20)
      .optional(),
    
    historial_medico: Joi.object({
      alergias: Joi.array().items(Joi.string().trim().max(100)).optional(),
      medicamentos: Joi.array().items(Joi.string().trim().max(100)).optional(),
      enfermedades_previas: Joi.array().items(Joi.string().trim().max(100)).optional(),
      cirugias_previas: Joi.array().items(Joi.string().trim().max(100)).optional()
    }).optional(),
    
    prioridad: Joi.string()
      .valid('baja', 'media', 'alta', 'urgente')
      .default('media'),
    
    especialidad_requerida: Joi.string()
      .valid('general', 'ortodoncia', 'endodoncia', 'periodoncia', 'cirugia', 'pediatrica')
      .default('general'),
    
    consentimiento: Joi.boolean().valid(true).required().messages({
      'any.only': 'Debe aceptar el consentimiento informado'
    }),
    
    notas_adicionales: Joi.string().trim().max(500).optional()
  }),
  
  update: Joi.object({
    nombre_completo: Joi.string().trim().min(2).max(100).optional(),
    edad: Joi.number().integer().min(1).max(120).optional(),
    genero: Joi.string().valid('masculino', 'femenino', 'otro').optional(),
    email: commonFields.email.optional(),
    telefono: commonFields.phone,
    direccion: Joi.string().trim().max(200).optional(),
    motivo_consulta: Joi.string().trim().min(10).max(1000).optional(),
    sintomas: Joi.array().items(Joi.string().trim().max(100)).min(1).max(20).optional(),
    historial_medico: Joi.object({
      alergias: Joi.array().items(Joi.string().trim().max(100)).optional(),
      medicamentos: Joi.array().items(Joi.string().trim().max(100)).optional(),
      enfermedades_previas: Joi.array().items(Joi.string().trim().max(100)).optional(),
      cirugias_previas: Joi.array().items(Joi.string().trim().max(100)).optional()
    }).optional(),
    prioridad: Joi.string().valid('baja', 'media', 'alta', 'urgente').optional(),
    especialidad_requerida: Joi.string().valid('general', 'ortodoncia', 'endodoncia', 'periodoncia', 'cirugia', 'pediatrica').optional(),
    estado: Joi.string().valid('pendiente', 'asignado', 'en_tratamiento', 'completado', 'cancelado').optional(),
    notas_adicionales: Joi.string().trim().max(500).optional()
  }).min(1),
  
  query: Joi.object({
    ...commonFields.pagination,
    search: Joi.string().trim().min(2).max(100).optional(),
    estado: Joi.string().valid('pendiente', 'asignado', 'en_tratamiento', 'completado', 'cancelado').optional(),
    prioridad: Joi.string().valid('baja', 'media', 'alta', 'urgente').optional(),
    especialidad: Joi.string().valid('general', 'ortodoncia', 'endodoncia', 'periodoncia', 'cirugia', 'pediatrica').optional(),
    fecha_inicio: Joi.date().iso().optional(),
    fecha_fin: Joi.date().iso().min(Joi.ref('fecha_inicio')).optional()
  })
};

// Student validation schemas
const studentSchemas = {
  create: Joi.object({
    nombre_completo: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required(),
    
    email: commonFields.email.required(),
    telefono: commonFields.phone,
    
    numero_estudiante: Joi.string()
      .trim()
      .alphanum()
      .min(6)
      .max(20)
      .required()
      .messages({
        'string.alphanum': 'El número de estudiante solo puede contener letras y números'
      }),
    
    ano_academico: Joi.number()
      .integer()
      .min(1)
      .max(6)
      .required()
      .messages({
        'number.min': 'El año académico debe ser entre 1 y 6',
        'number.max': 'El año académico debe ser entre 1 y 6'
      }),
    
    especialidades: Joi.array()
      .items(Joi.string().valid('general', 'ortodoncia', 'endodoncia', 'periodoncia', 'cirugia', 'pediatrica'))
      .min(1)
      .max(3)
      .required()
      .messages({
        'array.min': 'Debe seleccionar al menos una especialidad',
        'array.max': 'No puede seleccionar más de 3 especialidades'
      }),
    
    nivel_experiencia: Joi.string()
      .valid('principiante', 'intermedio', 'avanzado')
      .default('principiante'),
    
    disponibilidad: Joi.object({
      dias: Joi.array()
        .items(Joi.string().valid('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'))
        .min(1)
        .required(),
      horario_inicio: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      horario_fin: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      capacidad_maxima: Joi.number().integer().min(1).max(10).default(3)
    }).required(),
    
    calificaciones: Joi.object({
      promedio_general: Joi.number().min(0).max(100).optional(),
      materias: Joi.array().items(
        Joi.object({
          nombre: Joi.string().required(),
          calificacion: Joi.number().min(0).max(100).required(),
          creditos: Joi.number().integer().min(1).max(10).required()
        })
      ).optional()
    }).optional(),
    
    preferencias: Joi.object({
      tipo_casos: Joi.array().items(Joi.string()).optional(),
      grupos_edad: Joi.array().items(Joi.string().valid('ninos', 'adolescentes', 'adultos', 'adultos_mayores')).optional(),
      complejidad: Joi.string().valid('baja', 'media', 'alta').optional()
    }).optional()
  }),
  
  update: Joi.object({
    nombre_completo: Joi.string().trim().min(2).max(100).optional(),
    email: commonFields.email.optional(),
    telefono: commonFields.phone,
    ano_academico: Joi.number().integer().min(1).max(6).optional(),
    especialidades: Joi.array()
      .items(Joi.string().valid('general', 'ortodoncia', 'endodoncia', 'periodoncia', 'cirugia', 'pediatrica'))
      .min(1)
      .max(3)
      .optional(),
    nivel_experiencia: Joi.string().valid('principiante', 'intermedio', 'avanzado').optional(),
    disponibilidad: Joi.object({
      dias: Joi.array()
        .items(Joi.string().valid('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'))
        .min(1)
        .optional(),
      horario_inicio: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      horario_fin: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      capacidad_maxima: Joi.number().integer().min(1).max(10).optional()
    }).optional(),
    calificaciones: Joi.object({
      promedio_general: Joi.number().min(0).max(100).optional(),
      materias: Joi.array().items(
        Joi.object({
          nombre: Joi.string().required(),
          calificacion: Joi.number().min(0).max(100).required(),
          creditos: Joi.number().integer().min(1).max(10).required()
        })
      ).optional()
    }).optional(),
    preferencias: Joi.object({
      tipo_casos: Joi.array().items(Joi.string()).optional(),
      grupos_edad: Joi.array().items(Joi.string().valid('ninos', 'adolescentes', 'adultos', 'adultos_mayores')).optional(),
      complejidad: Joi.string().valid('baja', 'media', 'alta').optional()
    }).optional(),
    estado: Joi.string().valid('activo', 'inactivo', 'suspendido').optional()
  }).min(1),
  
  query: Joi.object({
    ...commonFields.pagination,
    search: Joi.string().trim().min(2).max(100).optional(),
    ano_academico: Joi.number().integer().min(1).max(6).optional(),
    especialidad: Joi.string().valid('general', 'ortodoncia', 'endodoncia', 'periodoncia', 'cirugia', 'pediatrica').optional(),
    nivel_experiencia: Joi.string().valid('principiante', 'intermedio', 'avanzado').optional(),
    estado: Joi.string().valid('activo', 'inactivo', 'suspendido').optional(),
    disponible: Joi.boolean().optional()
  })
};

// Assignment validation schemas
const assignmentSchemas = {
  create: Joi.object({
    paciente_id: commonFields.id.required(),
    estudiante_id: commonFields.id.required(),
    especialidad: Joi.string()
      .valid('general', 'ortodoncia', 'endodoncia', 'periodoncia', 'cirugia', 'pediatrica')
      .required(),
    tipo_matching: Joi.string()
      .valid('automatico', 'manual', 'sugerencia')
      .default('automatico'),
    score_compatibilidad: Joi.number().min(0).max(1).optional(),
    fecha_programada: Joi.date().iso().min('now').optional(),
    notas: Joi.string().trim().max(500).optional(),
    prioridad: Joi.string().valid('baja', 'media', 'alta', 'urgente').default('media')
  }),
  
  update: Joi.object({
    estado: Joi.string()
      .valid('pendiente', 'confirmado', 'en_progreso', 'completado', 'cancelado')
      .optional(),
    fecha_programada: Joi.date().iso().optional(),
    fecha_completado: Joi.date().iso().optional(),
    resultado: Joi.string().trim().max(1000).optional(),
    calificacion_estudiante: Joi.number().integer().min(1).max(5).optional(),
    calificacion_paciente: Joi.number().integer().min(1).max(5).optional(),
    feedback: Joi.string().trim().max(1000).optional(),
    notas: Joi.string().trim().max(500).optional(),
    tiempo_duracion: Joi.number().integer().min(1).optional()
  }).min(1),
  
  query: Joi.object({
    ...commonFields.pagination,
    paciente_id: commonFields.id.optional(),
    estudiante_id: commonFields.id.optional(),
    especialidad: Joi.string().valid('general', 'ortodoncia', 'endodoncia', 'periodoncia', 'cirugia', 'pediatrica').optional(),
    estado: Joi.string().valid('pendiente', 'confirmado', 'en_progreso', 'completado', 'cancelado').optional(),
    fecha_inicio: Joi.date().iso().optional(),
    fecha_fin: Joi.date().iso().min(Joi.ref('fecha_inicio')).optional(),
    tipo_matching: Joi.string().valid('automatico', 'manual', 'sugerencia').optional()
  })
};

// AI Matching validation schemas
const matchingSchemas = {
  execute: Joi.object({
    mode: Joi.string()
      .valid('intelligent', 'urgent', 'balanced', 'experimental')
      .default('intelligent'),
    limit: Joi.number().integer().min(1).max(200).default(50),
    filters: Joi.object({
      especialidades: Joi.array()
        .items(Joi.string().valid('general', 'ortodoncia', 'endodoncia', 'periodoncia', 'cirugia', 'pediatrica'))
        .optional(),
      prioridades: Joi.array()
        .items(Joi.string().valid('baja', 'media', 'alta', 'urgente'))
        .optional(),
      min_score: Joi.number().min(0).max(1).default(0.3)
    }).optional(),
    options: Joi.object({
      force_assignment: Joi.boolean().default(false),
      send_notifications: Joi.boolean().default(true),
      save_results: Joi.boolean().default(true)
    }).optional()
  }),
  
  feedback: Joi.object({
    assignment_id: commonFields.id.required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    feedback_type: Joi.string()
      .valid('estudiante', 'paciente', 'supervisor')
      .required(),
    comments: Joi.string().trim().max(1000).optional(),
    satisfaction_score: Joi.number().min(0).max(100).optional(),
    would_recommend: Joi.boolean().optional(),
    improvement_areas: Joi.array()
      .items(Joi.string().trim().max(100))
      .max(5)
      .optional()
  })
};

// User authentication schemas
const authSchemas = {
  register: Joi.object({
    email: commonFields.email.required(),
    password: Joi.string()
      .pattern(patterns.password)
      .required()
      .messages({
        'string.pattern.base': 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial'
      }),
    confirm_password: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Las contraseñas deben coincidir'
      }),
    nombre_completo: Joi.string().trim().min(2).max(100).required(),
    role: Joi.string().valid('admin', 'supervisor', 'coordinator').default('coordinator'),
    permissions: Joi.array()
      .items(Joi.string())
      .optional()
  }),
  
  login: Joi.object({
    email: commonFields.email.required(),
    password: Joi.string().required(),
    remember_me: Joi.boolean().default(false)
  }),
  
  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string()
      .pattern(patterns.password)
      .required()
      .messages({
        'string.pattern.base': 'La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial'
      }),
    confirm_password: Joi.string()
      .valid(Joi.ref('new_password'))
      .required()
      .messages({
        'any.only': 'Las contraseñas deben coincidir'
      })
  }),
  
  resetPassword: Joi.object({
    email: commonFields.email.required()
  })
};

// System health and monitoring schemas
const systemSchemas = {
  healthCheck: Joi.object({
    detailed: Joi.boolean().default(false),
    include_metrics: Joi.boolean().default(true)
  }),
  
  analytics: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'year').default('week'),
    metrics: Joi.array()
      .items(Joi.string().valid('assignments', 'success_rate', 'response_time', 'user_satisfaction'))
      .default(['assignments', 'success_rate']),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional()
  })
};

module.exports = {
  patterns,
  commonFields,
  patientSchemas,
  studentSchemas,
  assignmentSchemas,
  matchingSchemas,
  authSchemas,
  systemSchemas
};