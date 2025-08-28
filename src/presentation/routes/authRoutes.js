const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticateToken, requireRole, optionalAuth } = require('../../shared/middleware/auth');
const { sanitizeStrings } = require('../../shared/middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const authController = new AuthController();

// Middleware común
router.use(sanitizeStrings());

// Rate limiting para autenticación (más restrictivo)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 intentos por IP cada 15 minutos
    message: {
        success: false,
        error: 'Demasiados intentos de autenticación. Intenta en 15 minutos.',
        retryAfter: '15 minutes'
    }
});

// Rate limiting para registro (muy restrictivo)
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // máximo 3 registros por IP cada hora
    message: {
        success: false,
        error: 'Límite de registros alcanzado. Intenta en 1 hora.',
        retryAfter: '1 hour'
    }
});

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "usuario@ejemplo.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           example: "MiPassword123!"
 *         rememberMe:
 *           type: boolean
 *           default: false
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - confirmPassword
 *         - nombre
 *         - apellido
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *         confirmPassword:
 *           type: string
 *         nombre:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         apellido:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         role:
 *           type: string
 *           enum: [admin, coordinator, teacher, student, user]
 *           default: user
 *         telefono:
 *           type: string
 *         codigoEstudiante:
 *           type: string
 *           description: Requerido para estudiantes
 *         especialidad:
 *           type: string
 *         clinica:
 *           type: string
 *           enum: [Clínica para el Niño y Adolescente, Clínica Integral Adulto y Gerontología, Ambas]
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             tokens:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: string
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         nombre:
 *           type: string
 *         apellido:
 *           type: string
 *         role:
 *           type: string
 *         estado:
 *           type: string
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Datos de registro inválidos
 *       409:
 *         description: Email o código de estudiante ya registrado
 *       429:
 *         description: Límite de registros alcanzado
 */
router.post('/register', registerLimiter, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autentica un usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Credenciales inválidas
 *       429:
 *         description: Demasiados intentos de login
 */
router.post('/login', authLimiter, authController.login);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresca el token de acceso
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Token de refresco (opcional si está en cookie)
 *     responses:
 *       200:
 *         description: Token refrescado exitosamente
 *       401:
 *         description: Refresh token inválido o expirado
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cierra la sesión del usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout exitoso
 *       401:
 *         description: Token inválido o expirado
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Cierra sesión en todos los dispositivos
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada en todos los dispositivos
 *       401:
 *         description: Token inválido o expirado
 */
router.post('/logout-all', authenticateToken, authController.logoutAllDevices);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token inválido o expirado
 *   put:
 *     summary: Actualiza el perfil del usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               telefono:
 *                 type: string
 *               especialidad:
 *                 type: string
 *               clinica:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Cambia la contraseña del usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *               confirmNewPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Contraseña actual incorrecta o token inválido
 */
router.put('/change-password', authenticateToken, authController.changePassword);

/**
 * @swagger
 * /api/auth/permissions:
 *   get:
 *     summary: Obtiene los permisos del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permisos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: integer
 *                     role:
 *                       type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/permissions', authenticateToken, authController.getPermissions);

/**
 * @swagger
 * /api/auth/check-permission:
 *   post:
 *     summary: Verifica si el usuario tiene un permiso específico
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permission
 *             properties:
 *               permission:
 *                 type: string
 *                 example: "patients:write"
 *     responses:
 *       200:
 *         description: Resultado de verificación de permiso
 */
router.post('/check-permission', authenticateToken, authController.checkPermission);

/**
 * @swagger
 * /api/auth/validate-token:
 *   get:
 *     summary: Valida si el token actual es válido
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/validate-token', authenticateToken, authController.validateToken);

/**
 * @swagger
 * /api/auth/session-info:
 *   get:
 *     summary: Obtiene información de la sesión actual
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información de la sesión
 */
router.get('/session-info', authenticateToken, authController.getSessionInfo);

/**
 * @swagger
 * /api/auth/validate-password-strength:
 *   post:
 *     summary: Valida la fortaleza de una contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resultado de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post('/validate-password-strength', authController.validatePasswordStrength);

/**
 * @swagger
 * /api/auth/roles:
 *   get:
 *     summary: Obtiene la lista de roles disponibles (solo admins)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles y permisos
 *       403:
 *         description: Acceso denegado
 */
router.get('/roles', 
    authenticateToken, 
    requireRole('admin'),
    authController.getRoles
);

module.exports = router;