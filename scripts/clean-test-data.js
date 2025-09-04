#!/usr/bin/env node

/**
 * SCRIPT PARA LIMPIAR DATOS DE PRUEBA
 * Este script elimina todos los datos de prueba de la base de datos
 */

require('dotenv').config();

const { getConnection } = require('../config/database');

async function cleanTestData() {
    console.log('🧹 Iniciando limpieza de datos de prueba...');
    
    try {
        const db = await getConnection();
        
        console.log('⚠️  Esta operación eliminará TODOS los datos de prueba');
        console.log('   - Pacientes de prueba');
        console.log('   - Estudiantes de prueba');
        console.log('   - Especialidades de prueba');
        console.log('   - Configuración de sistema por defecto');
        console.log('   - Logs del sistema');
        
        // Deshabilitar foreign key checks temporalmente
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // Limpiar datos de prueba en orden correcto
        const cleanupQueries = [
            // Limpiar asignaciones
            'DELETE FROM asignaciones WHERE id > 0',
            'ALTER TABLE asignaciones AUTO_INCREMENT = 1',
            
            // Limpiar resultados de matching
            'DELETE FROM ai_matching_results WHERE id > 0',
            'ALTER TABLE ai_matching_results AUTO_INCREMENT = 1',
            
            // Limpiar especialidades de estudiantes
            'DELETE FROM especialidades_estudiante WHERE id > 0',
            'ALTER TABLE especialidades_estudiante AUTO_INCREMENT = 1',
            
            // Limpiar códigos de acceso
            'DELETE FROM codigos_acceso WHERE id > 0',
            'ALTER TABLE codigos_acceso AUTO_INCREMENT = 1',
            
            // Limpiar notificaciones
            'DELETE FROM notificaciones_email WHERE id > 0',
            'ALTER TABLE notificaciones_email AUTO_INCREMENT = 1',
            
            // Limpiar pacientes
            'DELETE FROM pacientes WHERE id > 0',
            'ALTER TABLE pacientes AUTO_INCREMENT = 1',
            
            // Limpiar estudiantes
            'DELETE FROM estudiantes_odontologia WHERE id > 0',
            'ALTER TABLE estudiantes_odontologia AUTO_INCREMENT = 1',
            
            // Limpiar configuración del sistema (mantener solo lo esencial)
            'DELETE FROM configuracion_sistema WHERE clave NOT IN ("system_version")',
            
            // Limpiar logs del sistema
            'DELETE FROM logs_sistema WHERE id > 0',
            'ALTER TABLE logs_sistema AUTO_INCREMENT = 1',
            
            // NO tocar usuarios - el admin se crea manualmente con script create-admin.js
        ];
        
        let cleanedCount = 0;
        
        for (const query of cleanupQueries) {
            const [result] = await db.query(query);
            if (result.affectedRows > 0) {
                cleanedCount += result.affectedRows;
                console.log(`✅ ${query.split(' ')[2]} - ${result.affectedRows} registros eliminados`);
            }
        }
        
        // Rehabilitar foreign key checks
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log(`\n🎉 Limpieza completada: ${cleanedCount} registros eliminados`);
        console.log('📊 Base de datos limpia y lista para producción');
        console.log('💡 Para crear usuario admin ejecuta: npm run db:create-admin');
        
        // Verificar limpieza
        const verification = await verifyCleanup(db);
        if (verification.success) {
            console.log('✅ Verificación exitosa: Sin datos de prueba detectados');
        } else {
            console.warn('⚠️  Advertencia: Algunos datos podrían no haberse eliminado:');
            verification.warnings.forEach(warning => {
                console.warn(`   - ${warning}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        throw error;
    }
}

async function verifyCleanup(db) {
    const verificationQueries = [
        { table: 'pacientes', query: 'SELECT COUNT(*) as count FROM pacientes' },
        { table: 'estudiantes_odontologia', query: 'SELECT COUNT(*) as count FROM estudiantes_odontologia' },
        { table: 'asignaciones', query: 'SELECT COUNT(*) as count FROM asignaciones' },
        { table: 'especialidades_estudiante', query: 'SELECT COUNT(*) as count FROM especialidades_estudiante' },
    ];
    
    let warnings = [];
    
    for (const verification of verificationQueries) {
        const [result] = await db.query(verification.query);
        const count = result[0].count;
        
        if (count > 0) {
            warnings.push(`${verification.table}: ${count} registros restantes`);
        }
    }
    
    return {
        success: warnings.length === 0,
        warnings
    };
}

// Ejecutar si se llama directamente
if (require.main === module) {
    cleanTestData()
        .then(() => {
            console.log('✅ Proceso de limpieza completado exitosamente');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Error en el proceso de limpieza:', error);
            process.exit(1);
        });
}

module.exports = { cleanTestData };