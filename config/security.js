/**
 * Configuración de seguridad para el sistema Dental Matching
 * Incluye funciones de validación, sanitización y protección
 */

const crypto = require('crypto');

class SecurityConfig {
    constructor() {
        this.maxRequestSize = parseInt(process.env.REQUEST_TIMEOUT_MS) || 10 * 1024 * 1024; // 10MB
        this.allowedFileTypes = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
    }

    /**
     * Sanitiza texto para prevenir XSS
     */
    sanitizeText(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    }

    /**
     * Valida email
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    /**
     * Valida teléfono chileno
     */
    validatePhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        const cleanPhone = phone.replace(/\D/g, '');
        return cleanPhone.length >= 8 && cleanPhone.length <= 12;
    }

    /**
     * Valida edad
     */
    validateAge(age) {
        const numAge = parseInt(age);
        return !isNaN(numAge) && numAge >= 1 && numAge <= 120;
    }

    /**
     * Valida nivel de dolor
     */
    validatePainLevel(level) {
        const numLevel = parseInt(level);
        return !isNaN(numLevel) && numLevel >= 0 && numLevel <= 10;
    }

    /**
     * Genera token CSRF
     */
    generateCSRFToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Valida token CSRF
     */
    validateCSRFToken(token, storedToken) {
        if (!token || !storedToken) return false;
        return crypto.timingSafeEqual(
            Buffer.from(token, 'hex'),
            Buffer.from(storedToken, 'hex')
        );
    }

    /**
     * Genera hash seguro para contraseñas
     */
    async hashPassword(password) {
        return new Promise((resolve, reject) => {
            crypto.scrypt(password, process.env.SESSION_SECRET || 'default-salt', 64, (err, derivedKey) => {
                if (err) reject(err);
                resolve(derivedKey.toString('hex'));
            });
        });
    }

    /**
     * Valida contraseña
     */
    async verifyPassword(password, hash) {
        const passwordHash = await this.hashPassword(password);
        return crypto.timingSafeEqual(
            Buffer.from(passwordHash, 'hex'),
            Buffer.from(hash, 'hex')
        );
    }

    /**
     * Valida que el nombre no contenga caracteres peligrosos
     */
    validateName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const cleanName = name.trim();
        if (cleanName.length < 2 || cleanName.length > 100) return false;
        
        // Solo permitir letras, espacios, guiones y apóstrofes
        const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;
        return nameRegex.test(cleanName);
    }

    /**
     * Valida ciudad
     */
    validateCity(city) {
        if (!city || typeof city !== 'string') return false;
        
        const cleanCity = city.trim();
        if (cleanCity.length < 2 || cleanCity.length > 50) return false;
        
        // Solo permitir letras, espacios y guiones
        const cityRegex = /^[a-zA-ZÀ-ÿ\s\-]+$/;
        return cityRegex.test(cleanCity);
    }

    /**
     * Sanitiza datos de entrada del paciente
     */
    sanitizePatientData(data) {
        return {
            nombre_completo: this.sanitizeText(data.nombre_completo || ''),
            edad: this.validateAge(data.edad) ? parseInt(data.edad) : null,
            telefono: this.validatePhone(data.telefono) ? data.telefono.trim() : '',
            email: this.validateEmail(data.email) ? data.email.trim().toLowerCase() : '',
            ciudad: this.validateCity(data.ciudad) ? this.sanitizeText(data.ciudad) : 'Metropolitana',
            sintomas_seleccionados: Array.isArray(data.sintomas_seleccionados) 
                ? data.sintomas_seleccionados.map(s => this.sanitizeText(s))
                : [],
            nivel_dolor: this.validatePainLevel(data.nivel_dolor) ? parseInt(data.nivel_dolor) : 0,
            prioridad: this.sanitizeText(data.prioridad || 'Moderada'),
            complejidad: this.sanitizeText(data.complejidad || 'Básico')
        };
    }

    /**
     * Sanitiza datos de entrada del estudiante
     */
    sanitizeStudentData(data) {
        return {
            nombre_completo: this.sanitizeText(data.nombre_completo || ''),
            codigo_estudiante: this.sanitizeText(data.codigo_estudiante || ''),
            telefono: this.validatePhone(data.telefono) ? data.telefono.trim() : '',
            email: this.validateEmail(data.email) ? data.email.trim().toLowerCase() : '',
            ciudad: this.validateCity(data.ciudad) ? this.sanitizeText(data.ciudad) : 'Metropolitana',
            especialidades: Array.isArray(data.especialidades) 
                ? data.especialidades.map(e => this.sanitizeText(e))
                : [],
            año_carrera: this.sanitizeText(data.año_carrera || '4to'),
            casos_activos: parseInt(data.casos_activos) || 0,
            casos_necesarios: parseInt(data.casos_necesarios) || 1
        };
    }

    /**
     * Valida que la request sea segura
     */
    validateRequest(req) {
        const validations = {
            userAgent: req.get('User-Agent') && req.get('User-Agent').length >= 10,
            contentType: req.method === 'GET' || 
                        req.is('application/json') || 
                        req.is('application/x-www-form-urlencoded'),
            contentLength: !req.headers['content-length'] || 
                          parseInt(req.headers['content-length']) <= this.maxRequestSize
        };

        return {
            isValid: Object.values(validations).every(v => v),
            errors: Object.entries(validations)
                .filter(([_, valid]) => !valid)
                .map(([key, _]) => key)
        };
    }

    /**
     * Prevenir ataques de timing
     */
    constantTimeComparison(a, b) {
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
}

module.exports = new SecurityConfig();
