const Joi = require('joi');

/**
 * DTO para creación de usuarios
 */
const CreateUserDTO = Joi.object({
    email: Joi.string()
        .email()
        .max(255)
        .required()
        .messages({
            'string.email': 'Debe ser un email válido',
            'string.max': 'El email no puede exceder 255 caracteres',
            'any.required': 'El email es obligatorio'
        }),

    password: Joi.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$'))
        .required()
        .messages({
            'string.min': 'La contraseña debe tener al menos 8 caracteres',
            'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
            'any.required': 'La contraseña es obligatoria'
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'Las contraseñas no coinciden',
            'any.required': 'La confirmación de contraseña es obligatoria'
        }),

    nombre: Joi.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .required()
        .messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede exceder 100 caracteres',
            'string.pattern.base': 'El nombre solo puede contener letras y espacios',
            'any.required': 'El nombre es obligatorio'
        }),

    apellido: Joi.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .required()
        .messages({
            'string.min': 'El apellido debe tener al menos 2 caracteres',
            'string.max': 'El apellido no puede exceder 100 caracteres',
            'string.pattern.base': 'El apellido solo puede contener letras y espacios',
            'any.required': 'El apellido es obligatorio'
        }),

    role: Joi.string()
        .valid('admin', 'coordinator', 'teacher', 'student', 'user')
        .default('user')
        .messages({
            'any.only': 'El rol debe ser admin, coordinator, teacher, student o user'
        }),

    telefono: Joi.string()
        .pattern(/^[\+]?[0-9\s\-\(\)]{7,20}$/)
        .optional()
        .messages({
            'string.pattern.base': 'El teléfono debe tener un formato válido'
        }),

    codigoEstudiante: Joi.when('role', {
        is: 'student',
        then: Joi.string()
            .pattern(/^[A-Z0-9\-]{4,20}$/)
            .required()
            .messages({
                'string.pattern.base': 'El código de estudiante debe tener formato válido (letras mayúsculas, números y guiones)',
                'any.required': 'El código de estudiante es obligatorio para estudiantes'
            }),
        otherwise: Joi.optional()
    }),

    especialidad: Joi.when('role', {
        is: Joi.valid('teacher', 'student'),
        then: Joi.string()
            .max(100)
            .optional(),
        otherwise: Joi.optional()
    }),

    clinica: Joi.when('role', {
        is: Joi.valid('teacher', 'student'),
        then: Joi.string()
            .valid(
                'Clínica para el Niño y Adolescente',
                'Clínica Integral Adulto y Gerontología',
                'Ambas'
            )
            .optional(),
        otherwise: Joi.optional()
    })
});

/**
 * DTO para login de usuarios
 */
const LoginDTO = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Debe ser un email válido',
            'any.required': 'El email es obligatorio'
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'La contraseña es obligatoria'
        }),

    rememberMe: Joi.boolean().default(false)
});

/**
 * DTO para cambio de contraseña
 */
const ChangePasswordDTO = Joi.object({
    currentPassword: Joi.string()
        .required()
        .messages({
            'any.required': 'La contraseña actual es obligatoria'
        }),

    newPassword: Joi.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$'))
        .required()
        .messages({
            'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
            'string.pattern.base': 'La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
            'any.required': 'La nueva contraseña es obligatoria'
        }),

    confirmNewPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'Las nuevas contraseñas no coinciden',
            'any.required': 'La confirmación de la nueva contraseña es obligatoria'
        })
});

/**
 * DTO para actualización de perfil
 */
const UpdateProfileDTO = Joi.object({
    nombre: Joi.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .optional()
        .messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede exceder 100 caracteres',
            'string.pattern.base': 'El nombre solo puede contener letras y espacios'
        }),

    apellido: Joi.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .optional()
        .messages({
            'string.min': 'El apellido debe tener al menos 2 caracteres',
            'string.max': 'El apellido no puede exceder 100 caracteres',
            'string.pattern.base': 'El apellido solo puede contener letras y espacios'
        }),

    telefono: Joi.string()
        .pattern(/^[\+]?[0-9\s\-\(\)]{7,20}$/)
        .optional()
        .messages({
            'string.pattern.base': 'El teléfono debe tener un formato válido'
        }),

    especialidad: Joi.string()
        .max(100)
        .optional(),

    clinica: Joi.string()
        .valid(
            'Clínica para el Niño y Adolescente',
            'Clínica Integral Adulto y Gerontología',
            'Ambas'
        )
        .optional()
});

/**
 * DTO para respuesta de usuario (sin datos sensibles)
 */
const UserResponseDTO = Joi.object({
    id: Joi.number().integer(),
    email: Joi.string().email(),
    nombre: Joi.string(),
    apellido: Joi.string(),
    role: Joi.string().valid('admin', 'coordinator', 'teacher', 'student', 'user'),
    estado: Joi.string().valid('activo', 'inactivo'),
    telefono: Joi.string().allow(null),
    codigoEstudiante: Joi.string().allow(null),
    especialidad: Joi.string().allow(null),
    clinica: Joi.string().allow(null),
    permissions: Joi.array().items(Joi.string()),
    lastLogin: Joi.date().allow(null),
    createdAt: Joi.date(),
    updatedAt: Joi.date()
});

/**
 * DTO para reseteo de contraseña
 */
const ForgotPasswordDTO = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Debe ser un email válido',
            'any.required': 'El email es obligatorio'
        })
});

/**
 * DTO para reseteo de contraseña con token
 */
const ResetPasswordDTO = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            'any.required': 'El token es obligatorio'
        }),

    newPassword: Joi.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$'))
        .required()
        .messages({
            'string.min': 'La contraseña debe tener al menos 8 caracteres',
            'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
            'any.required': 'La nueva contraseña es obligatoria'
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'Las contraseñas no coinciden',
            'any.required': 'La confirmación de contraseña es obligatoria'
        })
});

/**
 * DTO para búsqueda de usuarios
 */
const UserSearchDTO = Joi.object({
    search: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .messages({
            'string.min': 'El término de búsqueda debe tener al menos 2 caracteres',
            'string.max': 'El término de búsqueda no puede exceder 100 caracteres'
        }),

    role: Joi.string()
        .valid('admin', 'coordinator', 'teacher', 'student', 'user')
        .optional(),

    estado: Joi.string()
        .valid('activo', 'inactivo', 'all')
        .default('activo'),

    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
});

/**
 * DTO para actualización de rol y permisos (solo admin)
 */
const UpdateUserRoleDTO = Joi.object({
    role: Joi.string()
        .valid('admin', 'coordinator', 'teacher', 'student', 'user')
        .required()
        .messages({
            'any.only': 'El rol debe ser admin, coordinator, teacher, student o user',
            'any.required': 'El rol es obligatorio'
        }),

    permissions: Joi.array()
        .items(Joi.string())
        .optional()
        .messages({
            'array.base': 'Los permisos deben ser un array de strings'
        })
});

module.exports = {
    CreateUserDTO,
    LoginDTO,
    ChangePasswordDTO,
    UpdateProfileDTO,
    UserResponseDTO,
    ForgotPasswordDTO,
    ResetPasswordDTO,
    UserSearchDTO,
    UpdateUserRoleDTO
};