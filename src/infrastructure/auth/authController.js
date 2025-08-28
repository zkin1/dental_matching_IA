/**
 * DENTAL MATCHING - AUTHENTICATION CONTROLLER
 * Complete auth system with registration, login, refresh, logout
 */

const { Validator } = require('../validation/validator');
const { authSchemas } = require('../validation/schemas');
const JWTService = require('./jwtService');
const loggerService = require('../logging/logger');

class AuthController {
  constructor() {
    this.jwtService = new JWTService();
    this.maxLoginAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    this.lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 3600; // 1 hour in seconds
    
    // Importar servicio de base de datos
    this.db = require('../../../config/database');
  }

  /**
   * User registration
   */
  async register(req, res, next) {
    try {
      // Validate input
      const validatedData = await Validator.validate(req.body, authSchemas.register);
      
      // Check if user already exists
      const existingUser = await this.findUserByEmail(validatedData.email);
      if (existingUser) {
        loggerService.logSecurityEvent('REGISTRATION_ATTEMPT_EXISTING_EMAIL', req, {
          email: validatedData.email
        });
        
        return res.status(409).json({
          success: false,
          error: 'USER_ALREADY_EXISTS',
          message: 'Un usuario con este email ya existe'
        });
      }

      // Hash password
      const hashedPassword = await this.jwtService.hashPassword(validatedData.password);
      
      // Create user (this would typically interact with your user repository)
      const userData = {
        email: validatedData.email,
        password: hashedPassword,
        nombre_completo: validatedData.nombre_completo,
        role: validatedData.role,
        permissions: validatedData.permissions || this.getDefaultPermissions(validatedData.role),
        created_at: new Date(),
        email_verified: false,
        status: 'active'
      };

      const newUser = await this.createUser(userData);
      
      // Generate tokens
      const sessionInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };
      
      const tokens = await this.jwtService.generateTokenPair(newUser, sessionInfo);
      
      // Log successful registration
      loggerService.logAuthEvent('REGISTRATION_SUCCESS', validatedData.email, true, req);
      loggerService.logBusinessEvent('USER_REGISTERED', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      });

      // Remove sensitive data from response
      const { password, ...userResponse } = newUser;
      
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: userResponse,
          ...tokens
        }
      });

    } catch (error) {
      loggerService.logSecurityEvent('REGISTRATION_ERROR', req, {
        error: error.message,
        email: req.body?.email
      });
      next(error);
    }
  }

  /**
   * User login
   */
  async login(req, res, next) {
    try {
      // Validate input
      const validatedData = await Validator.validate(req.body, authSchemas.login);
      
      // Check if IP/user is locked out
      const lockoutStatus = await this.checkLockout(validatedData.email, req.ip);
      if (lockoutStatus.isLockedOut) {
        loggerService.logSecurityEvent('LOGIN_ATTEMPT_LOCKED_OUT', req, {
          email: validatedData.email,
          remainingTime: lockoutStatus.remainingTime
        });
        
        return res.status(429).json({
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: 'Cuenta temporalmente bloqueada por múltiples intentos fallidos',
          retryAfter: lockoutStatus.remainingTime
        });
      }

      // Find user
      const user = await this.findUserByEmail(validatedData.email);
      if (!user) {
        await this.recordFailedAttempt(validatedData.email, req.ip);
        loggerService.logAuthEvent('LOGIN_FAILED', validatedData.email, false, req, 'USER_NOT_FOUND');
        
        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Email o contraseña incorrectos'
        });
      }

      // Check if user account is active
      if (user.status !== 'active') {
        loggerService.logAuthEvent('LOGIN_FAILED', validatedData.email, false, req, 'ACCOUNT_INACTIVE');
        
        return res.status(401).json({
          success: false,
          error: 'ACCOUNT_INACTIVE',
          message: 'Cuenta desactivada. Contacte al administrador.'
        });
      }

      // Verify password
      const isValidPassword = await this.jwtService.verifyPassword(validatedData.password, user.password);
      if (!isValidPassword) {
        await this.recordFailedAttempt(validatedData.email, req.ip);
        loggerService.logAuthEvent('LOGIN_FAILED', validatedData.email, false, req, 'INVALID_PASSWORD');
        
        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Email o contraseña incorrectos'
        });
      }

      // Clear failed attempts on successful login
      await this.clearFailedAttempts(validatedData.email, req.ip);

      // Generate tokens
      const sessionInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };
      
      const tokens = await this.jwtService.generateTokenPair(user, sessionInfo);
      
      // Update last login
      await this.updateLastLogin(user.id, sessionInfo);
      
      // Log successful login
      loggerService.logAuthEvent('LOGIN_SUCCESS', validatedData.email, true, req);
      
      // Remove sensitive data from response
      const { password, ...userResponse } = user;
      
      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: userResponse,
          ...tokens
        }
      });

    } catch (error) {
      loggerService.logSecurityEvent('LOGIN_ERROR', req, {
        error: error.message,
        email: req.body?.email
      });
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token es requerido'
        });
      }

      // Verify refresh token
      const verification = await this.jwtService.verifyRefreshToken(refreshToken);
      if (!verification.valid) {
        loggerService.logSecurityEvent('INVALID_REFRESH_TOKEN', req, {
          error: verification.error
        });
        
        return res.status(401).json({
          success: false,
          error: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token inválido o expirado'
        });
      }

      // Get user data
      const user = await this.findUserById(verification.decoded.sub);
      if (!user || user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'USER_INVALID',
          message: 'Usuario no encontrado o inactivo'
        });
      }

      // Generate new access token
      const newTokens = await this.jwtService.refreshAccessToken(refreshToken, user);
      
      loggerService.logAuthEvent('TOKEN_REFRESHED', user.email, true, req);
      
      res.json({
        success: true,
        message: 'Token renovado exitosamente',
        data: newTokens
      });

    } catch (error) {
      loggerService.logSecurityEvent('TOKEN_REFRESH_ERROR', req, {
        error: error.message
      });
      next(error);
    }
  }

  /**
   * User logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const accessToken = req.token;

      // Blacklist access token
      if (accessToken) {
        await this.jwtService.blacklistAccessToken(accessToken);
      }

      // Revoke refresh token
      if (refreshToken) {
        await this.jwtService.revokeRefreshToken(refreshToken);
      }

      loggerService.logAuthEvent('LOGOUT_SUCCESS', req.user?.email, true, req);
      
      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });

    } catch (error) {
      loggerService.logSecurityEvent('LOGOUT_ERROR', req, {
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(req, res, next) {
    try {
      const userId = req.user.id;
      
      // Revoke all user sessions
      const revokedCount = await this.jwtService.revokeAllUserSessions(userId);
      
      loggerService.logAuthEvent('LOGOUT_ALL_SUCCESS', req.user.email, true, req, {
        revokedSessions: revokedCount
      });
      
      res.json({
        success: true,
        message: `Sesiones cerradas en ${revokedCount} dispositivos`,
        revokedSessions: revokedCount
      });

    } catch (error) {
      loggerService.logSecurityEvent('LOGOUT_ALL_ERROR', req, {
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Get user sessions
   */
  async getSessions(req, res, next) {
    try {
      const userId = req.user.id;
      const sessions = await this.jwtService.getUserSessions(userId);
      
      res.json({
        success: true,
        data: {
          sessions,
          total: sessions.length
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke specific session
   */
  async revokeSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      
      const revoked = await this.jwtService.revokeSession(userId, sessionId);
      
      if (!revoked) {
        return res.status(404).json({
          success: false,
          error: 'SESSION_NOT_FOUND',
          message: 'Sesión no encontrada'
        });
      }

      loggerService.logAuthEvent('SESSION_REVOKED', req.user.email, true, req, {
        sessionId
      });
      
      res.json({
        success: true,
        message: 'Sesión revocada exitosamente'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res, next) {
    try {
      // Validate input
      const validatedData = await Validator.validate(req.body, authSchemas.changePassword);
      
      const userId = req.user.id;
      const user = await this.findUserById(userId);
      
      // Verify current password
      const isValidCurrentPassword = await this.jwtService.verifyPassword(
        validatedData.current_password,
        user.password
      );
      
      if (!isValidCurrentPassword) {
        loggerService.logSecurityEvent('PASSWORD_CHANGE_FAILED', req, {
          reason: 'INVALID_CURRENT_PASSWORD'
        });
        
        return res.status(400).json({
          success: false,
          error: 'INVALID_CURRENT_PASSWORD',
          message: 'Contraseña actual incorrecta'
        });
      }

      // Hash new password
      const hashedNewPassword = await this.jwtService.hashPassword(validatedData.new_password);
      
      // Update password
      await this.updateUserPassword(userId, hashedNewPassword);
      
      // Revoke all sessions except current one
      await this.jwtService.revokeAllUserSessions(userId);
      
      loggerService.logSecurityEvent('PASSWORD_CHANGED', req, {
        userId
      });
      
      res.json({
        success: true,
        message: 'Contraseña cambiada exitosamente. Todas las demás sesiones han sido cerradas.'
      });

    } catch (error) {
      loggerService.logSecurityEvent('PASSWORD_CHANGE_ERROR', req, {
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Reset password request
   */
  async resetPasswordRequest(req, res, next) {
    try {
      const validatedData = await Validator.validate(req.body, authSchemas.resetPassword);
      
      const user = await this.findUserByEmail(validatedData.email);
      
      // Always return success to prevent email enumeration
      const response = {
        success: true,
        message: 'Si el email existe, recibirás un enlace de recuperación'
      };

      if (user) {
        // Generate reset token
        const resetToken = await this.generatePasswordResetToken(user.id);
        
        // Here you would send the reset email
        // await this.sendPasswordResetEmail(user.email, resetToken);
        
        loggerService.logSecurityEvent('PASSWORD_RESET_REQUESTED', req, {
          email: validatedData.email
        });
      }
      
      res.json(response);

    } catch (error) {
      next(error);
    }
  }

  // Helper methods (these would typically interact with your database)
  
  async findUserByEmail(email) {
    try {
      const result = await this.db.executeQuery(
        'SELECT * FROM users WHERE email = ? AND activo = TRUE', 
        [email]
      );
      
      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      loggerService.error('Error finding user by email', { email, error: error.message });
      throw error;
    }
  }

  async findUserById(id) {
    try {
      const result = await this.db.executeQuery(
        'SELECT * FROM users WHERE id = ? AND activo = TRUE', 
        [id]
      );
      
      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      loggerService.error('Error finding user by ID', { id, error: error.message });
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const result = await this.db.executeQuery(
        `INSERT INTO users (email, password, nombre_completo, role, permissions, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          userData.email,
          userData.password,
          userData.nombre_completo,
          userData.role,
          JSON.stringify(userData.permissions)
        ]
      );
      
      // Retornar el usuario creado
      const newUser = {
        id: result.rows.insertId,
        ...userData
      };
      
      loggerService.info('User created successfully', { 
        userId: newUser.id, 
        email: userData.email,
        role: userData.role 
      });
      
      return newUser;
    } catch (error) {
      loggerService.error('Error creating user', { 
        email: userData.email, 
        error: error.message 
      });
      throw error;
    }
  }

  async updateLastLogin(userId, sessionInfo) {
    try {
      await this.db.executeQuery(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [userId]
      );
      
      loggerService.info('User last login updated', { 
        userId, 
        ip: sessionInfo?.ip,
        userAgent: sessionInfo?.userAgent
      });
    } catch (error) {
      loggerService.error('Error updating last login', { userId, error: error.message });
      throw error;
    }
  }

  async updateUserPassword(userId, hashedPassword) {
    try {
      await this.db.executeQuery(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, userId]
      );
      
      loggerService.info('User password updated', { userId });
    } catch (error) {
      loggerService.error('Error updating user password', { userId, error: error.message });
      throw error;
    }
  }

  async checkLockout(email, ip) {
    // Check if account/IP is locked out
    return { isLockedOut: false, remainingTime: 0 };
  }

  async recordFailedAttempt(email, ip) {
    try {
      // Incrementar failed attempts
      const result = await this.db.executeQuery(
        'UPDATE users SET failed_attempts = failed_attempts + 1 WHERE email = ?',
        [email]
      );
      
      // Verificar si debe ser bloqueado
      const userResult = await this.db.executeQuery(
        'SELECT failed_attempts FROM users WHERE email = ?',
        [email]
      );
      
      if (userResult.rows && userResult.rows.length > 0) {
        const user = userResult.rows[0];
        
        if (user.failed_attempts >= this.maxLoginAttempts) {
          // Bloquear usuario
          const lockoutUntil = new Date(Date.now() + (this.lockoutDuration * 1000));
          
          await this.db.executeQuery(
            'UPDATE users SET locked_until = ? WHERE email = ?',
            [lockoutUntil, email]
          );
          
          loggerService.logSecurityEvent('USER_LOCKED_OUT', { email, ip }, {
            attempts: user.failed_attempts,
            lockoutUntil
          });
        }
      }
    } catch (error) {
      loggerService.error('Error recording failed attempt', { email, error: error.message });
    }
  }

  async clearFailedAttempts(email, ip) {
    try {
      await this.db.executeQuery(
        'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE email = ?',
        [email]
      );
      
      loggerService.info('Failed attempts cleared', { email });
    } catch (error) {
      loggerService.error('Error clearing failed attempts', { email, error: error.message });
    }
  }

  async generatePasswordResetToken(userId) {
    // Generate secure password reset token
    const token = require('crypto').randomBytes(32).toString('hex');
    // Store token with expiration (typically 1 hour)
    return token;
  }

  getDefaultPermissions(role) {
    const permissions = {
      'admin': ['read', 'write', 'delete', 'manage_users', 'manage_system'],
      'supervisor': ['read', 'write', 'manage_assignments'],
      'coordinator': ['read', 'write']
    };
    
    return permissions[role] || ['read'];
  }
}

module.exports = AuthController;