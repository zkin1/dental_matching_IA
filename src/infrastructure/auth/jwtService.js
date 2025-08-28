/**
 * DENTAL MATCHING - JWT AUTHENTICATION SERVICE
 * Complete JWT implementation with refresh tokens, role-based access
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Redis = require('ioredis');

class JWTService {
  constructor() {
    // JWT Configuration
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecretKey();
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || this.generateSecretKey();
    this.jwtExpiration = process.env.JWT_EXPIRATION || '15m'; // 15 minutes
    this.refreshTokenExpiration = process.env.REFRESH_TOKEN_EXPIRATION || '7d'; // 7 days
    this.issuer = process.env.JWT_ISSUER || 'dental-matching';
    this.audience = process.env.JWT_AUDIENCE || 'dental-matching-users';
    
    // Redis for token blacklisting and session management
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      keyPrefix: 'jwt:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    // Validate configuration
    this.validateConfiguration();
  }

  /**
   * Generate a secure secret key
   */
  generateSecretKey() {
    const key = crypto.randomBytes(64).toString('hex');
    console.warn('Generated JWT secret. Set JWT_SECRET environment variable in production!');
    return key;
  }

  /**
   * Validate JWT configuration
   */
  validateConfiguration() {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be set and at least 32 characters in production');
      }
      if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
        throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters in production');
      }
    }
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(user, additionalClaims = {}) {
    const payload = {
      sub: user.id.toString(), // Subject (user ID)
      email: user.email,
      role: user.role || 'user',
      permissions: user.permissions || [],
      name: user.nombre_completo || user.name,
      iat: Math.floor(Date.now() / 1000), // Issued at
      ...additionalClaims
    };

    const options = {
      expiresIn: this.jwtExpiration,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256'
    };

    return jwt.sign(payload, this.jwtSecret, options);
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(user) {
    const payload = {
      sub: user.id.toString(),
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    const options = {
      expiresIn: this.refreshTokenExpiration,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256'
    };

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, options);
    
    // Store refresh token in Redis with expiration
    const key = `refresh:${user.id}:${crypto.createHash('sha256').update(refreshToken).digest('hex').substring(0, 16)}`;
    const expirationTime = this.getExpirationTime(this.refreshTokenExpiration);
    
    await this.redis.setex(key, expirationTime, JSON.stringify({
      userId: user.id,
      email: user.email,
      issuedAt: new Date().toISOString(),
      userAgent: user.userAgent || 'unknown',
      ip: user.ip || 'unknown'
    }));

    return refreshToken;
  }

  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(user, sessionInfo = {}) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken({
      ...user,
      ...sessionInfo
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getExpirationTime(this.jwtExpiration),
      scope: user.permissions?.join(' ') || 'read'
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      const options = {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      };

      const decoded = jwt.verify(token, this.jwtSecret, options);
      
      // Add additional validation
      if (!decoded.sub || !decoded.email) {
        throw new Error('Invalid token structure');
      }

      return {
        valid: true,
        decoded,
        error: null
      };
    } catch (error) {
      return {
        valid: false,
        decoded: null,
        error: error.message
      };
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token) {
    try {
      const options = {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      };

      const decoded = jwt.verify(token, this.jwtRefreshSecret, options);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if token exists in Redis (not revoked)
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
      const key = `refresh:${decoded.sub}:${tokenHash}`;
      const storedData = await this.redis.get(key);

      if (!storedData) {
        throw new Error('Token not found or expired');
      }

      return {
        valid: true,
        decoded,
        sessionData: JSON.parse(storedData),
        error: null
      };
    } catch (error) {
      return {
        valid: false,
        decoded: null,
        sessionData: null,
        error: error.message
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken, user) {
    const verification = await this.verifyRefreshToken(refreshToken);
    
    if (!verification.valid) {
      throw new Error(`Invalid refresh token: ${verification.error}`);
    }

    // Verify user matches token
    if (verification.decoded.sub !== user.id.toString()) {
      throw new Error('Token user mismatch');
    }

    // Generate new access token
    const newAccessToken = this.generateAccessToken(user);
    
    // Update session activity
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex').substring(0, 16);
    const key = `refresh:${user.id}:${tokenHash}`;
    
    const sessionData = {
      ...verification.sessionData,
      lastUsed: new Date().toISOString(),
      useCount: (verification.sessionData.useCount || 0) + 1
    };
    
    const remaining = await this.redis.ttl(key);
    await this.redis.setex(key, remaining, JSON.stringify(sessionData));

    return {
      accessToken: newAccessToken,
      tokenType: 'Bearer',
      expiresIn: this.getExpirationTime(this.jwtExpiration)
    };
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken);
      if (!decoded || !decoded.sub) {
        return false;
      }

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex').substring(0, 16);
      const key = `refresh:${decoded.sub}:${tokenHash}`;
      
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      return false;
    }
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllUserSessions(userId) {
    try {
      const pattern = `refresh:${userId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        const result = await this.redis.del(...keys);
        return result;
      }
      
      return 0;
    } catch (error) {
      console.error('Error revoking all user sessions:', error);
      return 0;
    }
  }

  /**
   * Blacklist access token
   */
  async blacklistAccessToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
      const key = `blacklist:${tokenHash}`;
      const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (expirationTime > 0) {
        await this.redis.setex(key, expirationTime, 'blacklisted');
        return true;
      }
      
      return false; // Token already expired
    } catch (error) {
      console.error('Error blacklisting token:', error);
      return false;
    }
  }

  /**
   * Check if access token is blacklisted
   */
  async isTokenBlacklisted(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
      const key = `blacklist:${tokenHash}`;
      const result = await this.redis.get(key);
      return result !== null;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false; // Assume not blacklisted on error
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId) {
    try {
      const pattern = `refresh:${userId}:*`;
      const keys = await this.redis.keys(pattern);
      
      const sessions = [];
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const sessionData = JSON.parse(data);
          const ttl = await this.redis.ttl(key);
          
          sessions.push({
            ...sessionData,
            expiresIn: ttl,
            sessionId: key.split(':').pop()
          });
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Revoke specific session
   */
  async revokeSession(userId, sessionId) {
    try {
      const key = `refresh:${userId}:${sessionId}`;
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Error revoking session:', error);
      return false;
    }
  }

  /**
   * Authentication middleware
   */
  authenticateToken(options = {}) {
    const {
      required = true,
      roles = [],
      permissions = [],
      skipBlacklistCheck = false
    } = options;

    return async (req, res, next) => {
      try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
          if (required) {
            return res.status(401).json({
              success: false,
              error: 'ACCESS_TOKEN_REQUIRED',
              message: 'Access token is required'
            });
          }
          return next();
        }

        // Check if token is blacklisted (unless skipped)
        if (!skipBlacklistCheck) {
          const isBlacklisted = await this.isTokenBlacklisted(token);
          if (isBlacklisted) {
            return res.status(401).json({
              success: false,
              error: 'TOKEN_BLACKLISTED',
              message: 'Token has been revoked'
            });
          }
        }

        // Verify token
        const verification = this.verifyAccessToken(token);
        if (!verification.valid) {
          return res.status(401).json({
            success: false,
            error: 'INVALID_TOKEN',
            message: verification.error
          });
        }

        // Check role requirements
        if (roles.length > 0 && !roles.includes(verification.decoded.role)) {
          return res.status(403).json({
            success: false,
            error: 'INSUFFICIENT_ROLE',
            message: `Required role: ${roles.join(' or ')}`
          });
        }

        // Check permission requirements
        if (permissions.length > 0) {
          const userPermissions = verification.decoded.permissions || [];
          const hasPermission = permissions.some(permission => 
            userPermissions.includes(permission)
          );
          
          if (!hasPermission) {
            return res.status(403).json({
              success: false,
              error: 'INSUFFICIENT_PERMISSIONS',
              message: `Required permissions: ${permissions.join(' or ')}`
            });
          }
        }

        // Add user info to request
        req.user = {
          id: verification.decoded.sub,
          email: verification.decoded.email,
          role: verification.decoded.role,
          permissions: verification.decoded.permissions || [],
          name: verification.decoded.name
        };

        req.token = token;
        next();
      } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'AUTH_ERROR',
          message: 'Authentication error'
        });
      }
    };
  }

  /**
   * Optional authentication middleware
   */
  optionalAuth() {
    return this.authenticateToken({ required: false });
  }

  /**
   * Role-based authorization middleware
   */
  requireRole(...roles) {
    return this.authenticateToken({ roles });
  }

  /**
   * Permission-based authorization middleware
   */
  requirePermission(...permissions) {
    return this.authenticateToken({ permissions });
  }

  /**
   * Admin only middleware
   */
  adminOnly() {
    return this.authenticateToken({ roles: ['admin'] });
  }

  /**
   * Convert expiration string to seconds
   */
  getExpirationTime(expirationString) {
    const unit = expirationString.slice(-1);
    const value = parseInt(expirationString.slice(0, -1));
    
    const multipliers = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400,
      'w': 604800
    };
    
    return value * (multipliers[unit] || 3600); // Default to hours
  }

  /**
   * Generate secure random session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Cleanup expired tokens (maintenance task)
   */
  async cleanupExpiredTokens() {
    try {
      // This would typically be run as a cron job
      const patterns = ['refresh:*', 'blacklist:*'];
      let cleaned = 0;
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          if (ttl <= 0) {
            await this.redis.del(key);
            cleaned++;
          }
        }
      }
      
      console.log(`Cleaned up ${cleaned} expired tokens`);
      return cleaned;
    } catch (error) {
      console.error('Error during token cleanup:', error);
      return 0;
    }
  }
}

module.exports = JWTService;