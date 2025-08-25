const { getConnection } = require('../config/database');
const autoNotificationService = require('../services/autoNotificationService');

/**
 * Script para notificar automáticamente todas las asignaciones existentes
 * que tienen estado='asignado' pero no han sido notificadas
 */
async function notifyExistingAssignments() {
    console.log('🔄 Iniciando notificación de asignaciones existentes...');
    
    try {
        const pool = await getConnection();
        
        // Obtener todas las asignaciones con estado='asignado' que no han sido notificadas
        const [assignments] = await pool.execute(`
            SELECT 
                id, id_paciente, id_estudiante, fecha_asignacion,
                score_compatibilidad, observaciones_sistema
            FROM asignaciones 
            WHERE estado = 'asignado' 
            AND notificado_por_email = 0
            ORDER BY fecha_asignacion ASC
        `);
        
        if (assignments.length === 0) {
            console.log('✅ No hay asignaciones pendientes de notificación');
            return;
        }
        
        console.log(`📧 Encontradas ${assignments.length} asignaciones pendientes de notificación`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const assignment of assignments) {
            try {
                console.log(`\n🔄 Procesando asignación ${assignment.id}: Paciente ${assignment.id_paciente} ↔ Estudiante ${assignment.id_estudiante}`);
                
                // Enviar notificaciones
                const result = await autoNotificationService.sendAssignmentNotifications({
                    paciente_id: assignment.id_paciente,
                    estudiante_id: assignment.id_estudiante,
                    fecha_asignacion: assignment.fecha_asignacion
                });
                
                if (result.success) {
                    successCount++;
                    console.log(`✅ Notificaciones enviadas exitosamente para asignación ${assignment.id}`);
                } else {
                    errorCount++;
                    console.error(`❌ Error enviando notificaciones para asignación ${assignment.id}: ${result.message}`);
                }
                
                // Pequeña pausa para evitar sobrecargar el servidor de email
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error procesando asignación ${assignment.id}: ${error.message}`);
            }
        }
        
        console.log(`\n🎉 Proceso completado:`);
        console.log(`   ✅ Exitosas: ${successCount}`);
        console.log(`   ❌ Errores: ${errorCount}`);
        console.log(`   📊 Total procesadas: ${assignments.length}`);
        
    } catch (error) {
        console.error('❌ Error general en el proceso:', error.message);
    }
}

/**
 * Función para ejecutar el script
 */
async function main() {
    try {
        await notifyExistingAssignments();
        console.log('\n✅ Script ejecutado correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando script:', error.message);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { notifyExistingAssignments };
