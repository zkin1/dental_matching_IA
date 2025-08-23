const { getConnection } = require('../config/database');
const crypto = require('crypto');

class StudentCodeService {
    constructor() {
        this.prefix = 'EST';
        this.year = new Date().getFullYear();
        this.codeLength = 6; // Longitud del código numérico
    }

    /**
     * Genera un código único para un estudiante
     * Formato: EST-2024-123456
     */
    async generateUniqueCode() {
        try {
            let attempts = 0;
            const maxAttempts = 100;
            
            while (attempts < maxAttempts) {
                // Generar código aleatorio
                const randomCode = this.generateRandomCode();
                const fullCode = `${this.prefix}-${this.year}-${randomCode}`;
                
                // Verificar si ya existe
                const exists = await this.codeExists(fullCode);
                if (!exists) {
                    return fullCode;
                }
                
                attempts++;
            }
            
            throw new Error('No se pudo generar un código único después de múltiples intentos');
        } catch (error) {
            console.error('Error generando código único:', error);
            throw error;
        }
    }

    /**
     * Genera un código numérico aleatorio
     */
    generateRandomCode() {
        // Usar crypto.randomInt para mayor seguridad
        const min = Math.pow(10, this.codeLength - 1);
        const max = Math.pow(10, this.codeLength) - 1;
        return crypto.randomInt(min, max + 1).toString();
    }

    /**
     * Verifica si un código ya existe en la base de datos
     */
    async codeExists(code) {
        try {
            const db = await getConnection();
            const [rows] = await db.execute(
                'SELECT COUNT(*) as count FROM estudiantes_odontologia WHERE codigo_estudiante = ?',
                [code]
            );
            return rows[0].count > 0;
        } catch (error) {
            console.error('Error verificando existencia del código:', error);
            throw error;
        }
    }

    /**
     * Valida el formato de un código existente
     */
    validateCodeFormat(code) {
        if (!code || typeof code !== 'string') {
            return false;
        }
        
        // Patrón: EST-YYYY-NNNNNN (donde N son números)
        const pattern = /^EST-\d{4}-\d{6}$/;
        return pattern.test(code);
    }

    /**
     * Regenera un código para un estudiante existente
     */
    async regenerateCode(estudianteId) {
        try {
            const db = await getConnection();
            
            // Verificar que el estudiante existe
            const [estudianteRows] = await db.execute(
                'SELECT id, nombre_completo FROM estudiantes_odontologia WHERE id = ?',
                [estudianteId]
            );
            
            if (estudianteRows.length === 0) {
                throw new Error('Estudiante no encontrado');
            }
            
            // Generar nuevo código único
            const newCode = await this.generateUniqueCode();
            
            // Actualizar en la base de datos
            await db.execute(
                'UPDATE estudiantes_odontologia SET codigo_estudiante = ?, fecha_actualizacion = NOW() WHERE id = ?',
                [newCode, estudianteId]
            );
            
            console.log(`🔄 Código regenerado para estudiante ${estudianteId}: ${newCode}`);
            
            return {
                success: true,
                oldCode: estudianteRows[0].codigo_estudiante,
                newCode: newCode,
                estudiante: estudianteRows[0].nombre_completo
            };
            
        } catch (error) {
            console.error('Error regenerando código:', error);
            throw error;
        }
    }

    /**
     * Verifica y corrige códigos duplicados o inválidos
     */
    async validateAndFixCodes() {
        try {
            const db = await getConnection();
            
            // Buscar códigos duplicados
            const [duplicates] = await db.execute(`
                SELECT codigo_estudiante, COUNT(*) as count
                FROM estudiantes_odontologia 
                WHERE codigo_estudiante IS NOT NULL AND codigo_estudiante != ''
                GROUP BY codigo_estudiante 
                HAVING COUNT(*) > 1
            `);
            
            // Buscar códigos con formato inválido
            const [invalidCodes] = await db.execute(`
                SELECT id, codigo_estudiante, nombre_completo
                FROM estudiantes_odontologia 
                WHERE codigo_estudiante IS NULL 
                   OR codigo_estudiante = '' 
                   OR codigo_estudiante NOT REGEXP '^EST-\\d{4}-\\d{6}$'
            `);
            
            const results = {
                duplicates: duplicates,
                invalidCodes: invalidCodes,
                fixed: []
            };
            
            // Corregir códigos duplicados
            for (const dup of duplicates) {
                const [affectedRows] = await db.execute(
                    'SELECT id, nombre_completo FROM estudiantes_odontologia WHERE codigo_estudiante = ? ORDER BY id',
                    [dup.codigo_estudiante]
                );
                
                // Mantener el primer código y regenerar los demás
                for (let i = 1; i < affectedRows.length; i++) {
                    const newCode = await this.generateUniqueCode();
                    await db.execute(
                        'UPDATE estudiantes_odontologia SET codigo_estudiante = ?, fecha_actualizacion = NOW() WHERE id = ?',
                        [newCode, affectedRows[i].id]
                    );
                    
                    results.fixed.push({
                        estudianteId: affectedRows[i].id,
                        estudiante: affectedRows[i].nombre_completo,
                        oldCode: dup.codigo_estudiante,
                        newCode: newCode,
                        reason: 'Código duplicado'
                    });
                }
            }
            
            // Corregir códigos inválidos
            for (const invalid of invalidCodes) {
                const newCode = await this.generateUniqueCode();
                await db.execute(
                    'UPDATE estudiantes_odontologia SET codigo_estudiante = ?, fecha_actualizacion = NOW() WHERE id = ?',
                    [newCode, invalid.id]
                );
                
                results.fixed.push({
                    estudianteId: invalid.id,
                    estudiante: invalid.nombre_completo,
                    oldCode: invalid.codigo_estudiante || 'N/A',
                    newCode: newCode,
                    reason: 'Formato inválido'
                });
            }
            
            return results;
            
        } catch (error) {
            console.error('Error validando y corrigiendo códigos:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de códigos
     */
    async getCodeStats() {
        try {
            const db = await getConnection();
            
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_estudiantes,
                    COUNT(CASE WHEN codigo_estudiante IS NOT NULL AND codigo_estudiante != '' THEN 1 END) as con_codigo,
                    COUNT(CASE WHEN codigo_estudiante IS NULL OR codigo_estudiante = '' THEN 1 END) as sin_codigo,
                    COUNT(CASE WHEN codigo_estudiante REGEXP '^EST-\\d{4}-\\d{6}$' THEN 1 END) as codigos_validos,
                    COUNT(CASE WHEN codigo_estudiante IS NOT NULL AND codigo_estudiante != '' AND codigo_estudiante NOT REGEXP '^EST-\\d{4}-\\d{6}$' THEN 1 END) as codigos_invalidos
                FROM estudiantes_odontologia
            `);
            
            return stats[0];
            
        } catch (error) {
            console.error('Error obteniendo estadísticas de códigos:', error);
            throw error;
        }
    }
}

module.exports = new StudentCodeService();
