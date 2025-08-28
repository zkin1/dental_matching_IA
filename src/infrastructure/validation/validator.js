/**
 * DENTAL MATCHING - VALIDATION MIDDLEWARE
 * Joi validation middleware and utilities
 */

const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

class ValidationError extends Error {
  constructor(message, details = null, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
    this.field = field;
    this.isOperational = true;
  }
}

class Validator {
  
  /**
   * Sanitize input data
   */
  static sanitizeInput(data) {
    if (typeof data === 'string') {
      return sanitizeHtml(data.trim(), {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'escape'
      });
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Validate data against schema
   */
  static async validate(data, schema, options = {}) {
    try {
      // Default options
      const defaultOptions = {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
        convert: true,
        ...options
      };

      // Sanitize input first
      const sanitizedData = this.sanitizeInput(data);
      
      // Validate with Joi
      const { error, value } = schema.validate(sanitizedData, defaultOptions);
      
      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        
        throw new ValidationError('Validation failed', details, details[0]?.field);
      }
      
      return value;
    } catch (err) {
      if (err instanceof ValidationError) {
        throw err;
      }
      
      throw new ValidationError('Invalid data format', null, null);
    }
  }

  /**
   * Create validation middleware for Express
   */
  static validateBody(schema, options = {}) {
    return async (req, res, next) => {
      try {
        req.body = await this.validate(req.body, schema, options);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Validate query parameters
   */
  static validateQuery(schema, options = {}) {
    return async (req, res, next) => {
      try {
        req.query = await this.validate(req.query, schema, options);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Validate URL parameters
   */
  static validateParams(schema, options = {}) {
    return async (req, res, next) => {
      try {
        req.params = await this.validate(req.params, schema, options);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Validate file uploads
   */
  static validateFile(rules = {}) {
    return (req, res, next) => {
      try {
        if (!req.file && rules.required) {
          throw new ValidationError('File is required');
        }
        
        if (req.file) {
          // Check file size
          if (rules.maxSize && req.file.size > rules.maxSize) {
            throw new ValidationError(`File size must be less than ${rules.maxSize} bytes`);
          }
          
          // Check file type
          if (rules.allowedTypes && !rules.allowedTypes.includes(req.file.mimetype)) {
            throw new ValidationError(`File type must be one of: ${rules.allowedTypes.join(', ')}`);
          }
          
          // Sanitize filename
          req.file.originalname = sanitizeHtml(req.file.originalname, {
            allowedTags: [],
            allowedAttributes: {}
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Validate multiple files
   */
  static validateFiles(rules = {}) {
    return (req, res, next) => {
      try {
        if (!req.files && rules.required) {
          throw new ValidationError('Files are required');
        }
        
        if (req.files) {
          // Check number of files
          if (rules.maxCount && req.files.length > rules.maxCount) {
            throw new ValidationError(`Maximum ${rules.maxCount} files allowed`);
          }
          
          // Validate each file
          req.files.forEach((file, index) => {
            if (rules.maxSize && file.size > rules.maxSize) {
              throw new ValidationError(`File ${index + 1} size must be less than ${rules.maxSize} bytes`);
            }
            
            if (rules.allowedTypes && !rules.allowedTypes.includes(file.mimetype)) {
              throw new ValidationError(`File ${index + 1} type must be one of: ${rules.allowedTypes.join(', ')}`);
            }
            
            // Sanitize filename
            file.originalname = sanitizeHtml(file.originalname, {
              allowedTags: [],
              allowedAttributes: {}
            });
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Custom validation rules
   */
  static customRules = {
    // Validate Spanish identification number (DNI)
    dni: Joi.extend((joi) => ({
      type: 'dni',
      base: joi.string(),
      messages: {
        'dni.format': 'DNI must be in format 12345678A'
      },
      rules: {
        format: {
          validate(value, helpers) {
            const dniRegex = /^\d{8}[A-Za-z]$/;
            if (!dniRegex.test(value)) {
              return helpers.error('dni.format');
            }
            return value.toUpperCase();
          }
        }
      }
    })),

    // Validate medical history format
    medicalHistory: Joi.extend((joi) => ({
      type: 'medicalHistory',
      base: joi.object(),
      messages: {
        'medicalHistory.invalid': 'Invalid medical history format'
      },
      rules: {
        format: {
          validate(value, helpers) {
            const requiredFields = ['alergias', 'medicamentos', 'enfermedades_previas'];
            const hasRequiredStructure = requiredFields.every(field => 
              value.hasOwnProperty(field) && Array.isArray(value[field])
            );
            
            if (!hasRequiredStructure) {
              return helpers.error('medicalHistory.invalid');
            }
            
            return value;
          }
        }
      }
    })),

    // Validate time format (HH:MM)
    time: Joi.extend((joi) => ({
      type: 'time',
      base: joi.string(),
      messages: {
        'time.format': 'Time must be in HH:MM format'
      },
      rules: {
        format: {
          validate(value, helpers) {
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(value)) {
              return helpers.error('time.format');
            }
            return value;
          }
        }
      }
    }))
  };

  /**
   * Validate pagination parameters
   */
  static validatePagination(req, res, next) {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().valid('asc', 'desc').default('desc'),
      sortBy: Joi.string().default('created_at')
    });

    try {
      const validated = schema.validate(req.query);
      if (validated.error) {
        throw new ValidationError('Invalid pagination parameters', validated.error.details);
      }
      
      req.pagination = validated.value;
      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate search parameters
   */
  static validateSearch(allowedFields = []) {
    return (req, res, next) => {
      try {
        if (req.query.search) {
          // Sanitize search term
          req.query.search = sanitizeHtml(req.query.search.trim(), {
            allowedTags: [],
            allowedAttributes: {}
          });
          
          // Validate length
          if (req.query.search.length < 2) {
            throw new ValidationError('Search term must be at least 2 characters');
          }
          
          if (req.query.search.length > 100) {
            throw new ValidationError('Search term must be less than 100 characters');
          }
        }
        
        // Validate search fields
        if (req.query.searchFields) {
          const fields = req.query.searchFields.split(',');
          const invalidFields = fields.filter(field => !allowedFields.includes(field));
          
          if (invalidFields.length > 0) {
            throw new ValidationError(`Invalid search fields: ${invalidFields.join(', ')}`);
          }
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Validate date range
   */
  static validateDateRange(req, res, next) {
    try {
      if (req.query.startDate && req.query.endDate) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(req.query.endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new ValidationError('Invalid date format');
        }
        
        if (startDate > endDate) {
          throw new ValidationError('Start date must be before end date');
        }
        
        // Limit date range to prevent performance issues
        const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) {
          throw new ValidationError('Date range cannot exceed 365 days');
        }
        
        req.dateRange = { startDate, endDate };
      }
      
      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate ID parameter
   */
  static validateId(paramName = 'id') {
    return (req, res, next) => {
      try {
        const id = req.params[paramName];
        
        // Check if ID is numeric or MongoDB ObjectId
        const isNumeric = /^\d+$/.test(id);
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        
        if (!isNumeric && !isObjectId) {
          throw new ValidationError(`Invalid ${paramName} format`);
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = {
  Validator,
  ValidationError
};