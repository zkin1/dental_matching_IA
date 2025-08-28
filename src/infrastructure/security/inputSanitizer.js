/**
 * DENTAL MATCHING - INPUT SANITIZATION & SECURITY
 * Comprehensive protection against SQL injection, XSS, and other attacks
 */

const sanitizeHtml = require('sanitize-html');
const validator = require('validator');

class InputSanitizer {
  constructor() {
    // XSS Protection configuration
    this.xssOptions = {
      allowedTags: [], // No HTML tags allowed by default
      allowedAttributes: {},
      disallowedTagsMode: 'escape',
      allowedIframeHostnames: [],
      parseStyleAttributes: false
    };

    // Safe HTML configuration for rich text fields
    this.richTextOptions = {
      allowedTags: [
        'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'
      ],
      allowedAttributes: {
        'p': ['style'],
        'span': ['style']
      },
      allowedStyles: {
        '*': {
          'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
          'font-weight': [/^bold$/, /^normal$/],
          'font-style': [/^italic$/, /^normal$/]
        }
      },
      transformTags: {
        'script': 'span',
        'iframe': 'p',
        'object': 'p',
        'embed': 'p'
      }
    };

    // SQL Injection patterns to detect
    this.sqlPatterns = [
      /('|\\x27|;|\\x3b|--|\/\*|\*\/)/i,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
      /(\bor\b|\band\b).*[=<>]/i,
      /\\x[0-9a-f]{2}/i,
      /char\\(.*\\)/i,
      /0x[0-9a-f]+/i
    ];

    // Dangerous script patterns
    this.scriptPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload/gi,
      /onerror/gi,
      /onclick/gi,
      /onmouseover/gi,
      /onfocus/gi,
      /onblur/gi,
      /expression\(/gi,
      /eval\(/gi,
      /document\./gi,
      /window\./gi
    ];
  }

  /**
   * Main sanitization method
   */
  sanitize(data, options = {}) {
    if (data === null || data === undefined) {
      return data;
    }

    const {
      allowHtml = false,
      richText = false,
      maxLength = null,
      allowSql = false,
      preserveNewlines = true
    } = options;

    if (typeof data === 'string') {
      return this.sanitizeString(data, {
        allowHtml,
        richText,
        maxLength,
        allowSql,
        preserveNewlines
      });
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item, options));
    }

    if (typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.sanitizeString(key, { allowHtml: false });
        sanitized[sanitizedKey] = this.sanitize(value, options);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitize string input
   */
  sanitizeString(str, options = {}) {
    if (!str || typeof str !== 'string') {
      return str;
    }

    let sanitized = str;

    // Trim whitespace
    sanitized = sanitized.trim();

    // Apply max length if specified
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Check for SQL injection patterns
    if (!options.allowSql && this.containsSqlInjection(sanitized)) {
      throw new Error('Potential SQL injection detected');
    }

    // Handle HTML content
    if (options.richText) {
      sanitized = this.sanitizeRichText(sanitized);
    } else if (options.allowHtml) {
      sanitized = this.sanitizeBasicHtml(sanitized);
    } else {
      sanitized = this.sanitizeXSS(sanitized);
    }

    // Normalize unicode
    sanitized = sanitized.normalize('NFC');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Handle newlines
    if (!options.preserveNewlines) {
      sanitized = sanitized.replace(/[\r\n]/g, ' ');
    }

    return sanitized;
  }

  /**
   * XSS protection - remove all HTML
   */
  sanitizeXSS(str) {
    return sanitizeHtml(str, this.xssOptions);
  }

  /**
   * Sanitize rich text content
   */
  sanitizeRichText(str) {
    return sanitizeHtml(str, this.richTextOptions);
  }

  /**
   * Basic HTML sanitization
   */
  sanitizeBasicHtml(str) {
    const basicOptions = {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: {},
      disallowedTagsMode: 'escape'
    };
    
    return sanitizeHtml(str, basicOptions);
  }

  /**
   * Check for SQL injection patterns
   */
  containsSqlInjection(str) {
    return this.sqlPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Check for script injection patterns
   */
  containsScriptInjection(str) {
    return this.scriptPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Sanitize email
   */
  sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
      return email;
    }

    const sanitized = this.sanitizeXSS(email.toLowerCase().trim());
    
    if (!validator.isEmail(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized;
  }

  /**
   * Sanitize URL
   */
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return url;
    }

    const sanitized = this.sanitizeXSS(url.trim());
    
    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:'];
    const lowerUrl = sanitized.toLowerCase();
    
    if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      throw new Error('Dangerous URL protocol detected');
    }

    if (!validator.isURL(sanitized, {
      protocols: ['http', 'https'],
      require_protocol: false
    })) {
      throw new Error('Invalid URL format');
    }

    return sanitized;
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return filename;
    }

    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[\/\\]/g, '');
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Normalize
    sanitized = this.sanitizeXSS(sanitized.trim());
    
    // Ensure reasonable length
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, 255 - ext.length);
      sanitized = name + ext;
    }

    return sanitized;
  }

  /**
   * Sanitize JSON data
   */
  sanitizeJSON(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') {
      return jsonStr;
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const sanitized = this.sanitize(parsed);
      return JSON.stringify(sanitized);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Sanitize phone number
   */
  sanitizePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return phone;
    }

    // Remove all non-digits except + at the start
    let sanitized = phone.replace(/[^\d+]/g, '');
    
    // Ensure + is only at the start
    if (sanitized.includes('+')) {
      sanitized = '+' + sanitized.replace(/\+/g, '');
    }

    return sanitized;
  }

  /**
   * Express middleware for request sanitization
   */
  sanitizeMiddleware(options = {}) {
    return (req, res, next) => {
      try {
        // Sanitize body
        if (req.body) {
          req.body = this.sanitize(req.body, options);
        }

        // Sanitize query parameters
        if (req.query) {
          req.query = this.sanitize(req.query, { ...options, allowHtml: false });
        }

        // Sanitize URL parameters
        if (req.params) {
          req.params = this.sanitize(req.params, { allowHtml: false });
        }

        next();
      } catch (error) {
        res.status(400).json({
          success: false,
          error: 'INVALID_INPUT',
          message: error.message
        });
      }
    };
  }

  /**
   * Specific middleware for different content types
   */
  sanitizeUserInput() {
    return this.sanitizeMiddleware({
      allowHtml: false,
      maxLength: 1000,
      preserveNewlines: true
    });
  }

  sanitizeRichTextInput() {
    return this.sanitizeMiddleware({
      richText: true,
      maxLength: 5000,
      preserveNewlines: true
    });
  }

  sanitizeApiInput() {
    return this.sanitizeMiddleware({
      allowHtml: false,
      maxLength: 2000,
      preserveNewlines: false
    });
  }

  /**
   * SQL parameter sanitization
   */
  sanitizeSqlParam(value) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      // Escape SQL special characters
      return value.replace(/'/g, "''");
    }

    if (typeof value === 'number') {
      if (!isFinite(value)) {
        throw new Error('Invalid number value');
      }
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    throw new Error('Unsupported parameter type for SQL');
  }

  /**
   * Validate and sanitize database table/column names
   */
  sanitizeIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Invalid identifier');
    }

    // Only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error('Invalid identifier format');
    }

    // Prevent SQL reserved words (basic list)
    const sqlKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
      'ALTER', 'TABLE', 'INDEX', 'DATABASE', 'SCHEMA', 'TRIGGER',
      'PROCEDURE', 'FUNCTION', 'VIEW', 'GRANT', 'REVOKE'
    ];

    if (sqlKeywords.includes(identifier.toUpperCase())) {
      throw new Error('Identifier conflicts with SQL keyword');
    }

    return identifier;
  }

  /**
   * Content Security Policy header value
   */
  getCSPHeader() {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  /**
   * Rate limiting for input validation failures
   */
  validationFailureTracker() {
    const failures = new Map();
    const MAX_FAILURES = 10;
    const WINDOW_MS = 60000; // 1 minute

    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress;
      const now = Date.now();

      if (!failures.has(key)) {
        failures.set(key, []);
      }

      const userFailures = failures.get(key);
      
      // Remove old failures outside window
      const recentFailures = userFailures.filter(timestamp => now - timestamp < WINDOW_MS);
      failures.set(key, recentFailures);

      if (recentFailures.length >= MAX_FAILURES) {
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_VALIDATION_FAILURES',
          message: 'Too many validation failures. Please slow down.'
        });
      }

      // Override res.status to track 400 errors
      const originalStatus = res.status.bind(res);
      res.status = function(code) {
        if (code === 400) {
          recentFailures.push(now);
          failures.set(key, recentFailures);
        }
        return originalStatus(code);
      };

      next();
    };
  }
}

module.exports = new InputSanitizer();