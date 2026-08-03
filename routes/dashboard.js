const express = require('express');
const router = express.Router();

// Debug log para verificar carga del módulo
console.log('📊 Cargando módulo dashboard.js...');

const { getConnection, executeQuery } = require('../config/database');

// ====================================
//   ENDPOINTS DEL DASHBOARD
// ====================================

/**
 * Obtener conteo de pacientes
 */
router.get('/pacientes/count', async (req, res) => {
    try {
        const result = await executeQuery('SELECT COUNT(*) as count FROM pacientes WHERE activo = 1');
        
        res.json({ 
            success: true, 
            count: result.rows[0].count 
        });
        
    } catch (error) {
        console.error('Error obteniendo conteo de pacientes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

/**
 * Obtener conteo de estudiantes
 */
router.get('/estudiantes/count', async (req, res) => {
    try {
        const result = await executeQuery(
            'SELECT COUNT(*) as count FROM estudiantes_odontologia WHERE estado = ?',
            ['activo']
        );
        
        res.json({ 
            success: true, 
            count: result.rows[0].count 
        });
        
    } catch (error) {
        console.error('Error obteniendo conteo de estudiantes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

/**
 * Obtener conteo de asignaciones
 */
router.get('/asignaciones/count', async (req, res) => {
    try {
        const result = await executeQuery('SELECT COUNT(*) as count FROM asignaciones');
        
        res.json({ 
            success: true, 
            count: result.rows[0].count 
        });
        
    } catch (error) {
        console.error('Error obteniendo conteo de asignaciones:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

/**
 * Obtener estadísticas resumidas del dashboard (usado por el frontend React)
 */
router.get('/stats', async (req, res) => {
    try {
        const pacientes = await executeQuery('SELECT COUNT(*) as count FROM pacientes WHERE activo = 1');
        const estudiantes = await executeQuery('SELECT COUNT(*) as count FROM estudiantes_odontologia WHERE estado = ?', ['activo']);
        const asignaciones = await executeQuery('SELECT COUNT(*) as count FROM asignaciones');
        const scoreResult = await executeQuery('SELECT AVG(score_compatibilidad) as avg_score FROM asignaciones WHERE score_compatibilidad > 0');

        res.json({
            success: true,
            data: {
                pacientes: pacientes.rows[0].count,
                estudiantes: estudiantes.rows[0].count,
                asignaciones: asignaciones.rows[0].count,
                scorePromedio: scoreResult.rows[0].avg_score || 0
            }
        });
    } catch (error) {
        console.error('Error obteniendo stats:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo estadisticas' });
    }
});

/**
 * Obtener estadísticas completas del dashboard
 */
router.get('/stats/overview', async (req, res) => {
    try {
        // Conteo de pacientes por estado
        const patientsResult = await executeQuery(`
            SELECT 
                estado,
                COUNT(*) as count
            FROM pacientes 
            WHERE activo = 1 
            GROUP BY estado
        `);
        
        // Conteo de estudiantes
        const studentsResult = await executeQuery(`
            SELECT 
                estado,
                COUNT(*) as count,
                SUM(casos_activos) as total_casos_activos,
                SUM(casos_necesarios) as total_capacidad
            FROM estudiantes_odontologia 
            GROUP BY estado
        `);
        
        // Conteo de asignaciones recientes (últimos 7 días)
        const recentAssignments = await executeQuery(`
            SELECT COUNT(*) as count 
            FROM asignaciones 
            WHERE fecha_asignacion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        
        // Asignaciones por estado
        const assignmentsByStatus = await executeQuery(`
            SELECT 
                estado,
                COUNT(*) as count
            FROM asignaciones 
            GROUP BY estado
        `);
        
        res.json({
            success: true,
            patients: patientsResult.rows,
            students: studentsResult.rows,
            recentAssignments: recentAssignments.rows[0].count,
            assignmentsByStatus: assignmentsByStatus.rows,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error obteniendo estadísticas generales:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas generales'
        });
    }
});

/**
 * Obtener conteo de citas para hoy
 */
router.get('/citas/today', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const result = await executeQuery(
            'SELECT COUNT(*) as count FROM citas WHERE DATE(fecha_programada) = ?',
            [today]
        );
        
        res.json({ 
            success: true, 
            count: result.rows[0].count 
        });
        
    } catch (error) {
        console.error('Error obteniendo conteo de citas:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

/**
 * Obtener todos los pacientes
 */
router.get('/pacientes', async (req, res) => {
    try {
        const result = await executeQuery(`
            SELECT 
                id,
                nombre_completo,
                edad,
                telefono,
                email,
                ciudad,
                sintomas_seleccionados,
                tipo_tratamiento_inferido,
                nivel_dolor,
                prioridad,
                estado,
                fecha_registro,
                activo
            FROM pacientes 
            WHERE activo = 1
            ORDER BY fecha_registro DESC
            LIMIT 100
        `);
        
        res.json({ 
            success: true, 
            data: result.rows 
        });
        
    } catch (error) {
        console.error('Error obteniendo pacientes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

/**
 * Obtener todos los estudiantes
 */
router.get('/estudiantes', async (req, res) => {
    try {
        const result = await executeQuery(`
            SELECT 
                id,
                nombre_completo,
                año_carrera,
                especialidades,
                estado,
                ciudad,
                casos_activos,
                casos_necesarios,
                casos_completados,
                email
            FROM estudiantes_odontologia 
            WHERE estado = ?
            ORDER BY nombre_completo
        `, ['activo']);
        
        res.json({ 
            success: true, 
            data: result.rows 
        });
        
    } catch (error) {
        console.error('Error obteniendo estudiantes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

/**
 * Obtener todas las asignaciones
 */
router.get('/asignaciones', async (req, res) => {
    try {
        const result = await executeQuery(`
            SELECT 
                a.id,
                p.nombre_completo as nombre_paciente,
                e.nombre_completo as nombre_estudiante,
                a.algoritmo_version as especialidad,
                a.estado,
                a.fecha_asignacion,
                a.score_compatibilidad,
                a.codigo_acceso,
                p.telefono as telefono_paciente,
                p.tipo_tratamiento_inferido,
                p.prioridad,
                e.email as email_estudiante
            FROM asignaciones a
            LEFT JOIN pacientes p ON a.id_paciente = p.id
            LEFT JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
            ORDER BY a.fecha_asignacion DESC
            LIMIT 100
        `);
        
        res.json({ 
            success: true, 
            data: result.rows 
        });
        
    } catch (error) {
        console.error('Error obteniendo asignaciones:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

/**
 * Verificar salud del sistema
 */
router.get('/system/health', async (req, res) => {
    try {
        const pool = await getConnection();
        
        // Verificar conexión a base de datos
        await pool.ping();
        
        // Obtener estadísticas de la base de datos
        const [patientsCount] = await pool.query('SELECT COUNT(*) as count FROM pacientes WHERE activo = 1');
        const [studentsCount] = await pool.query('SELECT COUNT(*) as count FROM estudiantes_odontologia WHERE estado = "activo"');
        const [assignmentsCount] = await pool.query('SELECT COUNT(*) as count FROM asignaciones');
        
        res.json({
            success: true,
            services: {
                database: true,
                ai: true, // Simulated for now
                matching: true // Simulated for now
            },
            stats: {
                pacientes: patientsCount.count,
                estudiantes: studentsCount.count,
                asignaciones: assignmentsCount.count,
                dbRecords: patientsCount.count + studentsCount.count + assignmentsCount.count
            },
            uptime: `${Math.floor(process.uptime() / 60)} minutos`,
            version: '2.0.0',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error verificando salud del sistema:', error);
        res.json({
            success: false,
            services: {
                database: false,
                ai: false,
                matching: false
            },
            stats: {
                pacientes: 0,
                estudiantes: 0,
                asignaciones: 0,
                dbRecords: 0
            },
            uptime: `${Math.floor(process.uptime() / 60)} minutos`,
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * Limpiar cache del sistema
 */
router.post('/system/clear-cache', async (req, res) => {
    try {
        // Aquí podrías implementar lógica real de limpieza de cache
        // Por ahora solo simulamos la operación
        
        res.json({
            success: true,
            message: 'Cache limpiado exitosamente',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error limpiando cache:', error);
        res.status(500).json({
            success: false,
            error: 'Error limpiando cache'
        });
    }
});

/**
 * Obtener estadísticas para gráficos
 */
router.get('/stats/specialties', async (req, res) => {
    try {
        // Obtener distribución por tipo de tratamiento
        const specialtyResult = await executeQuery(`
            SELECT 
                p.tipo_tratamiento_inferido as especialidad,
                COUNT(*) as count
            FROM asignaciones a
            JOIN pacientes p ON a.id_paciente = p.id
            WHERE p.tipo_tratamiento_inferido IS NOT NULL
            GROUP BY p.tipo_tratamiento_inferido
            ORDER BY count DESC
        `);
        
        // Obtener estado de asignaciones
        const statusResult = await executeQuery(`
            SELECT 
                estado,
                COUNT(*) as count
            FROM asignaciones 
            GROUP BY estado
        `);
        
        // Obtener estadísticas por prioridad
        const priorityResult = await executeQuery(`
            SELECT 
                p.prioridad,
                COUNT(*) as count
            FROM asignaciones a
            JOIN pacientes p ON a.id_paciente = p.id
            GROUP BY p.prioridad
        `);
        
        res.json({
            success: true,
            specialties: specialtyResult.rows,
            status: statusResult.rows,
            priorities: priorityResult.rows
        });
        
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas'
        });
    }
});

module.exports = router;