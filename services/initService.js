const studentCodeService = require('./studentCodeService');
const { getConnection } = require('../config/database');

class InitService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Inicializa el sistema y valida todos los códigos de estudiante
     */
    async initializeSystem() {
        if (this.initialized) {
            console.log('✅ Sistema ya inicializado');
            return;
        }

        try {
            console.log('🚀 Inicializando sistema...');
            
            // Validar y corregir códigos de estudiante
            await this.validateAllStudentCodes();
            
            // Verificar integridad de la base de datos
            await this.checkDatabaseIntegrity();
            
            this.initialized = true;
            console.log('✅ Sistema inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando sistema:', error);
            throw error;
        }
    }

    /**
     * Valida y corrige todos los códigos de estudiante
     */
    async validateAllStudentCodes() {
        try {
            console.log('🔍 Validando códigos de estudiante...');
            
            const results = await studentCodeService.validateAndFixCodes();
            
            if (results.fixed.length > 0) {
                console.log(`🔄 ${results.fixed.length} códigos corregidos:`);
                results.fixed.forEach(fix => {
                    console.log(`   • ${fix.estudiante}: ${fix.oldCode} → ${fix.newCode} (${fix.reason})`);
                });
            } else {
                console.log('✅ Todos los códigos de estudiante son válidos');
            }
            
            // Obtener estadísticas finales
            const stats = await studentCodeService.getCodeStats();
            console.log('📊 Estadísticas de códigos:', {
                total: stats.total_estudiantes,
                conCodigo: stats.con_codigo,
                codigosValidos: stats.codigos_validos,
                codigosInvalidos: stats.codigos_invalidos
            });
            
        } catch (error) {
            console.error('❌ Error validando códigos:', error);
            throw error;
        }
    }

    /**
     * Verifica la integridad de la base de datos
     */
    async checkDatabaseIntegrity() {
        try {
            console.log('🔍 Verificando integridad de la base de datos...');
            
            const db = await getConnection();
            
            // Verificar que las tablas principales existen
            const tables = ['estudiantes_odontologia', 'pacientes', 'asignaciones'];
            
            for (const table of tables) {
                try {
                    const [rows] = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
                    console.log(`✅ Tabla ${table}: ${rows[0].count} registros`);
                } catch (error) {
                    console.warn(`⚠️ Tabla ${table} no encontrada o error de acceso`);
                }
            }
            
            // Verificar que no hay estudiantes sin códigos
            const [studentsWithoutCode] = await db.execute(`
                SELECT COUNT(*) as count 
                FROM estudiantes_odontologia 
                WHERE codigo_estudiante IS NULL OR codigo_estudiante = ''
            `);
            
            if (studentsWithoutCode[0].count > 0) {
                console.warn(`⚠️ ${studentsWithoutCode[0].count} estudiantes sin códigos`);
            } else {
                console.log('✅ Todos los estudiantes tienen códigos asignados');
            }
            
            // Verificar que no hay códigos duplicados
            const [duplicateCodes] = await db.execute(`
                SELECT codigo_estudiante, COUNT(*) as count
                FROM estudiantes_odontologia 
                WHERE codigo_estudiante IS NOT NULL AND codigo_estudiante != ''
                GROUP BY codigo_estudiante 
                HAVING COUNT(*) > 1
            `);
            
            if (duplicateCodes.length > 0) {
                console.warn(`⚠️ ${duplicateCodes.length} códigos duplicados encontrados`);
            } else {
                console.log('✅ No hay códigos duplicados');
            }
            
        } catch (error) {
            console.error('❌ Error verificando integridad de la base de datos:', error);
            throw error;
        }
    }

    /**
     * Ejecuta una validación completa del sistema
     */
    async runFullValidation() {
        try {
            console.log('🔍 Ejecutando validación completa del sistema...');
            
            // Validar códigos
            await this.validateAllStudentCodes();
            
            // Verificar integridad
            await this.checkDatabaseIntegrity();
            
            // Generar reporte
            const report = await this.generateSystemReport();
            
            console.log('📋 Reporte del sistema:', report);
            
            return report;
            
        } catch (error) {
            console.error('❌ Error en validación completa:', error);
            throw error;
        }
    }

    /**
     * Genera un reporte del estado del sistema
     */
    async generateSystemReport() {
        try {
            const db = await getConnection();
            
            // Estadísticas generales
            const [studentStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN estado = 'activo' THEN 1 END) as activos,
                    COUNT(CASE WHEN estado = 'completo' THEN 1 END) as completados
                FROM estudiantes_odontologia
            `);
            
            const [patientStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
                    COUNT(CASE WHEN estado = 'asignado' THEN 1 END) as asignados,
                    COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados
                FROM pacientes
            `);
            
            const [assignmentStats] = await db.execute(`
                SELECT COUNT(*) as total FROM asignaciones
            `);
            
            // Estadísticas de códigos
            const codeStats = await studentCodeService.getCodeStats();
            
            return {
                timestamp: new Date().toISOString(),
                estudiantes: studentStats[0],
                pacientes: patientStats[0],
                asignaciones: assignmentStats[0],
                codigos: codeStats,
                sistema: {
                    version: '1.0.0',
                    estado: 'activo',
                    ultimaValidacion: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            throw error;
        }
    }
}

module.exports = new InitService();
