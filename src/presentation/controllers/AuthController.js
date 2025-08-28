const AuthService = require('../../application/services/AuthService');
const { asyncHandler } = require('../../shared/middleware/errorHandler');
const logger = require('../../shared/utils/logger');

/**
 * Controlador de autenticación y autorización
 * Maneja endpoints relacionados con login, registro y gestión de usuarios
 */
class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    /**
     * POST /api/auth/register
     * Registra un nuevo usuario en el sistema
     */
    register = asyncHandler(async (req, res) => {
        logger.info('Solicitud de registro recibida');

        const result = await this.authService.register(req.body);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: result
        });
    });

    /**
     * POST /api/auth/login
     * Autentica un usuario y genera tokens
     */
    login = asyncHandler(async (req, res) => {
        logger.info('Solicitud de login recibida');

        const result = await this.authService.login(req.body);

        // Configurar cookie segura con refresh token (opcional)
        if (req.body.rememberMe) {
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
            });
        }

        res.json({
            success: true,
            message: 'Login exitoso',
            data: result
        });
    });

    /**
     * POST /api/auth/refresh-token
     * Refresca el token de acceso
     */
    refreshToken = asyncHandler(async (req, res) => {
        const { refreshToken } = req.body || {};
        const cookieRefreshToken = req.cookies?.refreshToken;

        const tokenToUse = refreshToken || cookieRefreshToken;

        const result = await this.authService.refreshToken(tokenToUse);

        res.json({
            success: true,
            message: 'Token refrescado exitosamente',
            data: result
        });
    });

    /**
     * POST /api/auth/logout
     * Cierra la sesión del usuario
     */
    logout = asyncHandler(async (req, res) => {
        await this.authService.logout(req.user.id);

        // Limpiar cookie de refresh token
        res.clearCookie('refreshToken');

        res.json({
            success: true,
            message: 'Logout exitoso'
        });
    });

    /**
     * GET /api/auth/profile
     * Obtiene el perfil del usuario autenticado
     */
    getProfile = asyncHandler(async (req, res) => {
        const profile = await this.authService.getProfile(req.user.id);

        res.json({
            success: true,
            data: profile
        });
    });

    /**
     * PUT /api/auth/profile
     * Actualiza el perfil del usuario autenticado
     */
    updateProfile = asyncHandler(async (req, res) => {
        const updatedProfile = await this.authService.updateProfile(req.user.id, req.body);

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: updatedProfile
        });
    });

    /**
     * PUT /api/auth/change-password
     * Cambia la contraseña del usuario autenticado
     */
    changePassword = asyncHandler(async (req, res) => {
        const result = await this.authService.changePassword(req.user.id, req.body);

        res.json({
            success: true,
            message: result.message
        });
    });

    /**
     * GET /api/auth/permissions
     * Obtiene los permisos del usuario autenticado
     */
    getPermissions = asyncHandler(async (req, res) => {
        const permissions = req.user.permissions || [];

        res.json({
            success: true,
            data: {
                userId: req.user.id,
                role: req.user.role,
                permissions: permissions
            }
        });
    });

    /**
     * POST /api/auth/check-permission
     * Verifica si el usuario tiene un permiso específico
     */
    checkPermission = asyncHandler(async (req, res) => {
        const { permission } = req.body;

        const hasPermission = await this.authService.hasPermission(req.user.id, permission);

        res.json({
            success: true,
            data: {
                permission: permission,
                hasPermission: hasPermission
            }
        });
    });

    /**
     * GET /api/auth/validate-token
     * Valida si el token actual es válido
     */
    validateToken = asyncHandler(async (req, res) => {
        // Si llegamos aquí, el token ya fue validado por el middleware
        res.json({
            success: true,
            message: 'Token válido',
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    role: req.user.role
                },
                tokenInfo: {
                    issuedAt: new Date(req.user.iat * 1000),
                    expiresAt: req.user.exp ? new Date(req.user.exp * 1000) : null
                }
            }
        });
    });

    /**
     * POST /api/auth/validate-password-strength
     * Valida la fortaleza de una contraseña
     */
    validatePasswordStrength = asyncHandler(async (req, res) => {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña es requerida'
            });
        }

        const validation = this.authService.validatePasswordStrength(password);

        res.json({
            success: validation.isValid,
            data: validation
        });
    });

    /**
     * GET /api/auth/session-info
     * Obtiene información de la sesión actual
     */
    getSessionInfo = asyncHandler(async (req, res) => {
        const sessionInfo = {
            user: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role,
                permissions: req.user.permissions || []
            },
            session: {
                loginTime: new Date(req.user.iat * 1000),
                expiresAt: req.user.exp ? new Date(req.user.exp * 1000) : null,
                remainingTime: req.user.exp ? 
                    Math.max(0, req.user.exp - Math.floor(Date.now() / 1000)) : null
            },
            security: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                lastActivity: new Date()
            }
        };

        res.json({
            success: true,
            data: sessionInfo
        });
    });

    /**
     * POST /api/auth/logout-all-devices
     * Cierra todas las sesiones del usuario (invalida todos los refresh tokens)
     */
    logoutAllDevices = asyncHandler(async (req, res) => {
        await this.authService.logout(req.user.id);

        res.clearCookie('refreshToken');

        res.json({
            success: true,
            message: 'Sesión cerrada en todos los dispositivos'
        });
    });

    /**
     * GET /api/auth/roles
     * Obtiene la lista de roles disponibles (solo para admins)
     */
    getRoles = asyncHandler(async (req, res) => {
        const roles = [
            {
                key: 'admin',
                name: 'Administrador',
                description: 'Acceso completo al sistema',
                permissions: this.authService.getPermissionsByRole('admin')
            },
            {
                key: 'coordinator',
                name: 'Coordinador',
                description: 'Gestión de estudiantes y pacientes',
                permissions: this.authService.getPermissionsByRole('coordinator')
            },
            {
                key: 'teacher',
                name: 'Profesor',
                description: 'Supervisión y consulta',
                permissions: this.authService.getPermissionsByRole('teacher')
            },
            {
                key: 'student',
                name: 'Estudiante',
                description: 'Acceso a asignaciones',
                permissions: this.authService.getPermissionsByRole('student')
            },
            {
                key: 'user',
                name: 'Usuario',
                description: 'Acceso básico',
                permissions: this.authService.getPermissionsByRole('user')
            }
        ];

        res.json({
            success: true,
            data: roles
        });
    });
}

module.exports = AuthController;