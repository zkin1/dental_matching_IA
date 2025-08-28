const bcrypt = require('bcryptjs');
const UserRepository = require('../../infrastructure/repositories/UserRepository');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../../shared/middleware/auth');
const { ValidationError, NotFoundError, UnauthorizedError, ConflictError } = require('../../shared/errors/AppError');
const { CreateUserDTO, LoginDTO, ChangePasswordDTO } = require('../dtos/UserDTO');
const logger = require('../../shared/utils/logger');

/**
 * Servicio de autenticación y autorización
 * Maneja login, registro, tokens y gestión de usuarios
 */
class AuthService {
    constructor() {
        this.userRepository = new UserRepository();
        this.saltRounds = 12;
    }

    /**
     * Registra un nuevo usuario en el sistema
     */
    async register(userData) {
        logger.info('Iniciando registro de usuario');
        
        // Validar datos de entrada
        const { error, value } = CreateUserDTO.validate(userData);
        if (error) {
            throw new ValidationError(`Datos inválidos: ${error.details.map(d => d.message).join(', ')}`);
        }

        // Verificar si el usuario ya existe
        const existingUser = await this.userRepository.findByEmail(value.email);
        if (existingUser) {
            throw new ConflictError('El email ya está registrado');
        }

        // Verificar código de estudiante si aplica
        if (value.role === 'student' && value.codigoEstudiante) {
            const existingStudent = await this.userRepository.findByStudentCode(value.codigoEstudiante);
            if (existingStudent) {
                throw new ConflictError('El código de estudiante ya está registrado');
            }
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(value.password, this.saltRounds);

        // Asignar permisos según rol
        const permissions = this.getPermissionsByRole(value.role);

        const newUser = {
            ...value,
            password: hashedPassword,
            permissions: permissions,
            estado: 'activo',
            emailVerified: false,
            createdAt: new Date(),
            lastLogin: null
        };

        const user = await this.userRepository.create(newUser);
        
        logger.info(`Usuario registrado exitosamente: ${user.id} (${user.email})`);

        // Generar tokens
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        // Actualizar refresh token en BD
        await this.userRepository.updateRefreshToken(user.id, refreshToken);

        return {
            user: this.sanitizeUser(user),
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            }
        };
    }

    /**
     * Autentica un usuario y genera tokens
     */
    async login(credentials) {
        logger.info('Iniciando proceso de login');
        
        // Validar datos de entrada
        const { error, value } = LoginDTO.validate(credentials);
        if (error) {
            throw new ValidationError(`Datos inválidos: ${error.details.map(d => d.message).join(', ')}`);
        }

        // Buscar usuario por email
        const user = await this.userRepository.findByEmail(value.email);
        if (!user) {
            throw new UnauthorizedError('Credenciales inválidas');
        }

        // Verificar estado del usuario
        if (user.estado !== 'activo') {
            throw new UnauthorizedError('Usuario inactivo o bloqueado');
        }

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(value.password, user.password);
        if (!isPasswordValid) {
            logger.warn(`Intento de login fallido para usuario: ${user.email}`);
            throw new UnauthorizedError('Credenciales inválidas');
        }

        // Actualizar último login
        await this.userRepository.updateLastLogin(user.id);

        // Generar tokens
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        // Actualizar refresh token en BD
        await this.userRepository.updateRefreshToken(user.id, refreshToken);

        logger.info(`Login exitoso para usuario: ${user.email}`);

        return {
            user: this.sanitizeUser(user),
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            }
        };
    }

    /**
     * Refresca el token de acceso usando el refresh token
     */
    async refreshToken(refreshToken) {
        try {
            const decoded = verifyRefreshToken(refreshToken);
            
            const user = await this.userRepository.findById(decoded.id);
            if (!user || user.refreshToken !== refreshToken) {
                throw new UnauthorizedError('Refresh token inválido');
            }

            if (user.estado !== 'activo') {
                throw new UnauthorizedError('Usuario inactivo');
            }

            const newAccessToken = generateToken(user);
            const newRefreshToken = generateRefreshToken(user);

            // Actualizar refresh token
            await this.userRepository.updateRefreshToken(user.id, newRefreshToken);

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            };

        } catch (error) {
            throw new UnauthorizedError('Refresh token inválido o expirado');
        }
    }

    /**
     * Cierra sesión del usuario
     */
    async logout(userId) {
        await this.userRepository.updateRefreshToken(userId, null);
        logger.info(`Logout exitoso para usuario: ${userId}`);
    }

    /**
     * Cambia la contraseña del usuario
     */
    async changePassword(userId, passwordData) {
        // Validar datos
        const { error, value } = ChangePasswordDTO.validate(passwordData);
        if (error) {
            throw new ValidationError(`Datos inválidos: ${error.details.map(d => d.message).join(', ')}`);
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('Usuario no encontrado');
        }

        // Verificar contraseña actual
        const isCurrentPasswordValid = await bcrypt.compare(value.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new UnauthorizedError('Contraseña actual incorrecta');
        }

        // Hash nueva contraseña
        const hashedNewPassword = await bcrypt.hash(value.newPassword, this.saltRounds);

        // Actualizar contraseña
        await this.userRepository.updatePassword(userId, hashedNewPassword);

        // Invalidar todos los refresh tokens
        await this.userRepository.updateRefreshToken(userId, null);

        logger.info(`Contraseña cambiada exitosamente para usuario: ${userId}`);

        return { message: 'Contraseña actualizada exitosamente' };
    }

    /**
     * Obtiene el perfil del usuario autenticado
     */
    async getProfile(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('Usuario no encontrado');
        }

        return this.sanitizeUser(user);
    }

    /**
     * Actualiza el perfil del usuario
     */
    async updateProfile(userId, updateData) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('Usuario no encontrado');
        }

        // Validar datos (usando un DTO específico para actualización)
        const allowedFields = ['nombre', 'apellido', 'telefono', 'especialidad', 'clinica'];
        const sanitizedData = {};
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                sanitizedData[field] = updateData[field];
            }
        });

        const updatedUser = await this.userRepository.update(userId, sanitizedData);

        logger.info(`Perfil actualizado para usuario: ${userId}`);

        return this.sanitizeUser(updatedUser);
    }

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    async hasPermission(userId, permission) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            return false;
        }

        return user.permissions && user.permissions.includes(permission);
    }

    /**
     * Obtiene permisos por rol
     */
    getPermissionsByRole(role) {
        const rolePermissions = {
            admin: [
                'users:read', 'users:write', 'users:delete',
                'students:read', 'students:write', 'students:delete',
                'patients:read', 'patients:write', 'patients:delete',
                'assignments:read', 'assignments:write', 'assignments:delete',
                'matching:execute', 'matching:view_stats',
                'system:manage'
            ],
            coordinator: [
                'students:read', 'students:write',
                'patients:read', 'patients:write',
                'assignments:read', 'assignments:write',
                'matching:execute', 'matching:view_stats'
            ],
            teacher: [
                'students:read',
                'patients:read',
                'assignments:read',
                'matching:view_stats'
            ],
            student: [
                'patients:read',
                'assignments:read'
            ],
            user: [
                'patients:read'
            ]
        };

        return rolePermissions[role] || rolePermissions['user'];
    }

    /**
     * Elimina campos sensibles del objeto usuario
     */
    sanitizeUser(user) {
        if (!user) return null;

        const { password, refreshToken, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    /**
     * Valida la fuerza de la contraseña
     */
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const errors = [];
        
        if (password.length < minLength) {
            errors.push(`La contraseña debe tener al menos ${minLength} caracteres`);
        }
        if (!hasUpperCase) {
            errors.push('La contraseña debe contener al menos una letra mayúscula');
        }
        if (!hasLowerCase) {
            errors.push('La contraseña debe contener al menos una letra minúscula');
        }
        if (!hasNumbers) {
            errors.push('La contraseña debe contener al menos un número');
        }
        if (!hasSpecialChar) {
            errors.push('La contraseña debe contener al menos un carácter especial');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = AuthService;