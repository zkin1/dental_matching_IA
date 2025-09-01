/**
 * DENTAL MATCHING - SECURITY CONFIGURATION
 * CORS, Helmet, and comprehensive security headers
 */

const helmet = require('helmet');
const cors = require('cors');

class SecurityConfig {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.isDevelopment = this.environment === 'development';
    this.isProduction = this.environment === 'production';
  }

  /**
   * Get CORS configuration
   */
  getCorsConfig() {
    const allowedOrigins = this.getAllowedOrigins();
    
    return {
      origin: (origin, callback) => {
        // DESARROLLO: Permitir todos los orígenes para testing
        if (this.isDevelopment) {
          return callback(null, true);
        }

        // SEGURIDAD: Requests sin origin solo se permiten desde herramientas de desarrollo específicas
        if (!origin) {
          // En producción, rechazar requests sin origin para prevenir CSRF
          return callback(new Error('Origin header required'));
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Log intento de acceso no autorizado
        const loggerService = require('../logging/logger');
        loggerService.logSecurityEvent('CORS_BLOCKED', { origin });
        
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true, // Allow cookies - necesario para auth
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-Request-ID',
        'Accept',
        'Origin',
        'Cache-Control'
      ],
      // SEGURIDAD: Agregar validación de pre-flight requests
      preflightContinue: false,
      optionsSuccessStatus: 200,
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Response-Time',
        'X-Request-ID'
      ],
      maxAge: 86400, // 24 hours preflight cache
      optionsSuccessStatus: 200 // Some legacy browsers (IE11) choke on 204
    };
  }

  /**
   * Get allowed origins from environment
   */
  getAllowedOrigins() {
    const origins = process.env.ALLOWED_ORIGINS || '';
    
    if (!origins) {
      return this.isDevelopment ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : [];
    }

    return origins.split(',').map(origin => origin.trim());
  }

  /**
   * Check if origin is localhost
   */
  isLocalhost(origin) {
    if (!origin) return false;
    
    const localhostPatterns = [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
      /^https?:\/\/\[::1\](:\d+)?$/
    ];

    return localhostPatterns.some(pattern => pattern.test(origin));
  }

  /**
   * Get Helmet configuration
   */
  getHelmetConfig() {
    return {
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://cdnjs.cloudflare.com",
            "https://cdn.jsdelivr.net"
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdnjs.cloudflare.com",
            "https://fonts.googleapis.com"
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdnjs.cloudflare.com"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https:",
            "blob:"
          ],
          connectSrc: [
            "'self'",
            ...(this.isDevelopment ? ["http://localhost:*", "ws://localhost:*"] : [])
          ],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: this.isProduction ? [] : null
        },
        reportOnly: this.isDevelopment, // Only report in development
        useDefaults: false
      },

      // Cross Origin Embedder Policy
      crossOriginEmbedderPolicy: false, // Disable if causing issues with external resources

      // Cross Origin Opener Policy
      crossOriginOpenerPolicy: {
        policy: "same-origin"
      },

      // Cross Origin Resource Policy
      crossOriginResourcePolicy: {
        policy: "cross-origin"
      },

      // DNS Prefetch Control
      dnsPrefetchControl: {
        allow: false
      },

      // Expect Certificate Transparency
      expectCt: this.isProduction ? {
        maxAge: 30,
        enforce: true
      } : false,

      // Feature Policy / Permissions Policy
      permissionsPolicy: {
        features: {
          camera: ["'none'"],
          microphone: ["'none'"],
          geolocation: ["'self'"],
          notifications: ["'self'"],
          payment: ["'none'"],
          usb: ["'none'"],
          bluetooth: ["'none'"],
          magnetometer: ["'none'"],
          gyroscope: ["'none'"],
          fullscreen: ["'self'"]
        }
      },

      // Frame Options
      frameguard: {
        action: 'deny'
      },

      // Hide Powered By
      hidePoweredBy: true,

      // HTTP Strict Transport Security
      hsts: this.isProduction ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      } : false,

      // IE No Open
      ieNoOpen: true,

      // No Sniff
      noSniff: true,

      // Origin Agent Cluster
      originAgentCluster: true,

      // Referrer Policy
      referrerPolicy: {
        policy: ["no-referrer-when-downgrade", "strict-origin-when-cross-origin"]
      },

      // X-XSS-Protection
      xssFilter: true
    };
  }

  /**
   * Additional security middleware
   */
  additionalSecurityMiddleware() {
    return (req, res, next) => {
      // Custom security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Download-Options', 'noopen');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

      // API specific headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

      // Request ID for tracing
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = require('crypto').randomUUID();
      }
      res.setHeader('X-Request-ID', req.headers['x-request-id']);

      // Response time tracking
      const startTime = Date.now();
      res.on('finish', () => {
        // Only set headers if response hasn't been sent yet
        if (!res.headersSent) {
          const responseTime = Date.now() - startTime;
          res.setHeader('X-Response-Time', `${responseTime}ms`);
        }
      });

      next();
    };
  }

  /**
   * Rate limiting headers middleware
   */
  rateLimitHeaders() {
    return (req, res, next) => {
      // Add rate limit information if available
      if (req.rateLimit) {
        res.setHeader('X-RateLimit-Limit', req.rateLimit.limit);
        res.setHeader('X-RateLimit-Remaining', req.rateLimit.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(req.rateLimit.resetTime));
      }

      next();
    };
  }

  /**
   * Security monitoring middleware
   */
  securityMonitoring() {
    return (req, res, next) => {
      // Monitor for security issues
      const suspiciousPatterns = [
        /\.\.\//,  // Directory traversal
        /<script/i, // XSS attempts
        /union.*select/i, // SQL injection
        /javascript:/i, // JavaScript protocol
        /vbscript:/i, // VBScript protocol
        /data:.*base64/i // Base64 data URLs
      ];

      const checkSuspicious = (value) => {
        if (typeof value === 'string') {
          return suspiciousPatterns.some(pattern => pattern.test(value));
        }
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(checkSuspicious);
        }
        return false;
      };

      // Check URL, query parameters, and body
      const suspicious = [
        req.url,
        JSON.stringify(req.query),
        JSON.stringify(req.body)
      ].some(checkSuspicious);

      if (suspicious) {
        // Log security event (would integrate with your logger)
        // Log security event usando logger enterprise
        const loggerService = require('../logging/logger');
        loggerService.warn('Suspicious request detected:', {
          ip: req.ip,
          url: req.url,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });

        // You might want to block or flag these requests
        res.setHeader('X-Security-Warning', 'Suspicious patterns detected');
      }

      next();
    };
  }

  /**
   * IP whitelist/blacklist middleware
   */
  ipFiltering() {
    const blacklistedIPs = this.getBlacklistedIPs();
    const whitelistedIPs = this.getWhitelistedIPs();

    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;

      // Check blacklist
      if (blacklistedIPs.length > 0 && blacklistedIPs.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          error: 'IP_BLOCKED',
          message: 'Access denied from this IP address'
        });
      }

      // Check whitelist (if configured)
      if (whitelistedIPs.length > 0 && !whitelistedIPs.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          error: 'IP_NOT_WHITELISTED',
          message: 'Access denied: IP not in whitelist'
        });
      }

      next();
    };
  }

  /**
   * Get blacklisted IPs from environment
   */
  getBlacklistedIPs() {
    const ips = process.env.BLACKLISTED_IPS || '';
    return ips ? ips.split(',').map(ip => ip.trim()) : [];
  }

  /**
   * Get whitelisted IPs from environment
   */
  getWhitelistedIPs() {
    const ips = process.env.WHITELISTED_IPS || '';
    return ips ? ips.split(',').map(ip => ip.trim()) : [];
  }

  /**
   * User-Agent validation middleware
   */
  userAgentValidation() {
    return (req, res, next) => {
      const userAgent = req.get('User-Agent');
      
      // Block empty or suspicious user agents
      if (!userAgent || userAgent.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_USER_AGENT',
          message: 'Valid User-Agent header required'
        });
      }

      // Block known malicious patterns
      const maliciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /hack/i,
        /exploit/i
      ];

      // Only block if not in development and matches malicious patterns
      if (this.isProduction) {
        const isMalicious = maliciousPatterns.some(pattern => pattern.test(userAgent));
        if (isMalicious) {
          const loggerService = require('../logging/logger');
          loggerService.warn('Blocked suspicious User-Agent:', userAgent);
          return res.status(403).json({
            success: false,
            error: 'BLOCKED_USER_AGENT',
            message: 'Access denied'
          });
        }
      }

      next();
    };
  }

  /**
   * Complete security setup
   */
  setupSecurity(app) {
    // Basic Helmet setup
    app.use(helmet(this.getHelmetConfig()));

    // CORS setup
    app.use(cors(this.getCorsConfig()));

    // Additional security middleware
    app.use(this.additionalSecurityMiddleware());
    app.use(this.rateLimitHeaders());
    app.use(this.securityMonitoring());
    app.use(this.ipFiltering());
    
    // User agent validation (optional, might be too strict)
    if (this.isProduction) {
      app.use(this.userAgentValidation());
    }

    // Trust proxy if behind reverse proxy
    if (process.env.TRUST_PROXY === 'true') {
      app.set('trust proxy', true);
    }

    const loggerService = require('../logging/logger');
    loggerService.info(`Security configured for ${this.environment} environment`);
  }

  /**
   * Health check for security configuration
   */
  getSecurityHealthCheck() {
    return {
      cors: {
        configured: true,
        allowedOrigins: this.getAllowedOrigins().length,
        credentialsEnabled: true
      },
      helmet: {
        configured: true,
        hsts: this.isProduction,
        csp: true,
        xssFilter: true
      },
      ipFiltering: {
        blacklisted: this.getBlacklistedIPs().length,
        whitelisted: this.getWhitelistedIPs().length
      },
      environment: this.environment,
      trustProxy: process.env.TRUST_PROXY === 'true'
    };
  }

  /**
   * Security headers validation
   */
  validateSecurityHeaders(req, res, next) {
    const requiredHeaders = ['User-Agent', 'Accept'];
    const missingHeaders = requiredHeaders.filter(header => !req.headers[header.toLowerCase()]);

    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_HEADERS',
        message: `Required headers missing: ${missingHeaders.join(', ')}`
      });
    }

    next();
  }
}

module.exports = new SecurityConfig();