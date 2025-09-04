const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');

/**
 * SISTEMA DE CONSULTA PARA ESTUDIANTES
 * Permite a los estudiantes ver sus pacientes asignados usando su código
 */

/**
 * GET /student/patients/:studentCode
 * Obtiene los pacientes asignados a un estudiante por su código
 */
router.get('/patients/:studentCode', async (req, res) => {
    try {
        const { studentCode } = req.params;
        
        if (!studentCode) {
            return res.status(400).json({
                success: false,
                error: 'Código de estudiante requerido'
            });
        }

        const pool = await getConnection();
        
        // Buscar estudiante por código
        const [estudiante] = await pool.execute(`
            SELECT id, nombre_completo, email, codigo_estudiante, año_carrera, casos_activos, casos_completados 
            FROM estudiantes_odontologia 
            WHERE codigo_estudiante = ? AND estado = 'activo'
        `, [studentCode]);

        if (estudiante.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Código de estudiante no válido o inactivo'
            });
        }

        const estudianteData = estudiante[0];

        // Obtener pacientes asignados al estudiante
        const [pacientesAsignados] = await pool.execute(`
            SELECT 
                p.id,
                p.nombre_completo,
                p.edad,
                p.telefono,
                p.email,
                p.ciudad,
                p.tipo_tratamiento_inferido,
                p.complejidad,
                p.prioridad,
                p.nivel_dolor,
                a.fecha_asignacion,
                a.estado as estado_asignacion,
                a.codigo_acceso,
                a.fecha_primer_contacto,
                a.fecha_inicio_tratamiento,
                a.observaciones_estudiante,
                ah.dia_semana,
                ah.hora_inicio,
                ah.hora_fin,
                ah.fecha_asignacion as fecha_cita,
                ah.especialidad,
                ah.clinica,
                ah.estado as estado_horario
            FROM pacientes p
            INNER JOIN asignaciones a ON p.id = a.id_paciente
            LEFT JOIN asignaciones_horario ah ON a.id_paciente = ah.id_paciente AND a.id_estudiante = ah.id_estudiante
            WHERE a.id_estudiante = ?
            ORDER BY a.fecha_asignacion DESC
        `, [estudianteData.id]);

        // Obtener estadísticas del estudiante
        const [estadisticas] = await pool.execute(`
            SELECT 
                COUNT(*) as total_asignaciones,
                COUNT(CASE WHEN a.estado = 'asignado' THEN 1 END) as pendientes,
                COUNT(CASE WHEN a.estado = 'contactado' THEN 1 END) as contactados,
                COUNT(CASE WHEN a.estado = 'en_tratamiento' THEN 1 END) as en_tratamiento,
                COUNT(CASE WHEN a.estado = 'completado' THEN 1 END) as completados,
                COUNT(CASE WHEN a.fecha_primer_contacto IS NOT NULL THEN 1 END) as con_contacto,
                AVG(CASE WHEN a.score_compatibilidad > 0 THEN a.score_compatibilidad END) as score_promedio
            FROM asignaciones a
            WHERE a.id_estudiante = ?
        `, [estudianteData.id]);

        res.json({
            success: true,
            data: {
                estudiante: {
                    ...estudianteData,
                    estadisticas: estadisticas[0]
                },
                pacientes: pacientesAsignados,
                total_pacientes: pacientesAsignados.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error consultando pacientes del estudiante:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * GET /student/:studentCode/patient/:patientId
 * Obtiene detalles específicos de un paciente asignado al estudiante
 */
router.get('/:studentCode/patient/:patientId', async (req, res) => {
    try {
        const { studentCode, patientId } = req.params;
        
        const pool = await getConnection();
        
        // Verificar que el estudiante existe y tiene acceso al paciente
        const [verificacion] = await pool.execute(`
            SELECT 
                e.id as estudiante_id,
                e.nombre_completo as estudiante_nombre,
                e.codigo_estudiante,
                p.id as paciente_id,
                p.nombre_completo as paciente_nombre,
                a.codigo_acceso,
                a.estado as estado_asignacion
            FROM estudiantes_odontologia e
            INNER JOIN asignaciones a ON e.id = a.id_estudiante
            INNER JOIN pacientes p ON a.id_paciente = p.id
            WHERE e.codigo_estudiante = ? 
                AND p.id = ? 
                AND e.estado = 'activo'
        `, [studentCode, patientId]);

        if (verificacion.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'No tienes acceso a este paciente o el código es inválido'
            });
        }

        // Obtener información detallada del paciente
        const [pacienteDetalle] = await pool.execute(`
            SELECT 
                p.*,
                a.fecha_asignacion,
                a.estado as estado_asignacion,
                a.codigo_acceso,
                a.fecha_primer_contacto,
                a.fecha_inicio_tratamiento,
                a.fecha_finalizacion,
                a.observaciones_estudiante,
                a.observaciones_sistema,
                a.score_compatibilidad,
                ah.dia_semana,
                ah.hora_inicio,
                ah.hora_fin,
                ah.fecha_asignacion as fecha_cita,
                ah.especialidad,
                ah.clinica,
                ah.estado as estado_horario,
                ah.notas as notas_horario
            FROM pacientes p
            INNER JOIN asignaciones a ON p.id = a.id_paciente
            LEFT JOIN asignaciones_horario ah ON a.id_paciente = ah.id_paciente AND a.id_estudiante = ah.id_estudiante
            WHERE p.id = ? AND a.id_estudiante = ?
        `, [patientId, verificacion[0].estudiante_id]);

        if (pacienteDetalle.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Paciente no encontrado'
            });
        }

        // Parsear datos JSON si existen
        const paciente = pacienteDetalle[0];
        if (paciente.sintomas_seleccionados) {
            try {
                paciente.sintomas_seleccionados = JSON.parse(paciente.sintomas_seleccionados);
            } catch (e) {
                console.warn('Error parseando síntomas:', e);
            }
        }
        
        if (paciente.preferencias_horario) {
            try {
                paciente.preferencias_horario = JSON.parse(paciente.preferencias_horario);
            } catch (e) {
                console.warn('Error parseando preferencias horario:', e);
            }
        }

        res.json({
            success: true,
            data: {
                paciente: paciente,
                acceso_verificado: true,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error obteniendo detalle del paciente:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * POST /student/:studentCode/patient/:patientId/contact
 * Registra el primer contacto con el paciente
 */
router.post('/:studentCode/patient/:patientId/contact', async (req, res) => {
    try {
        const { studentCode, patientId } = req.params;
        const { observaciones } = req.body;
        
        const pool = await getConnection();
        
        // Verificar acceso
        const [verificacion] = await pool.execute(`
            SELECT e.id as estudiante_id, a.id as asignacion_id
            FROM estudiantes_odontologia e
            INNER JOIN asignaciones a ON e.id = a.id_estudiante
            WHERE e.codigo_estudiante = ? AND a.id_paciente = ?
        `, [studentCode, patientId]);

        if (verificacion.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'No tienes acceso a este paciente'
            });
        }

        // Registrar primer contacto
        await pool.execute(`
            UPDATE asignaciones 
            SET fecha_primer_contacto = NOW(),
                estado = 'contactado',
                observaciones_estudiante = COALESCE(CONCAT(observaciones_estudiante, '\n\n'), '') || ?
            WHERE id = ?
        `, [
            `[${new Date().toISOString()}] Primer contacto realizado: ${observaciones || 'Sin observaciones'}`,
            verificacion[0].asignacion_id
        ]);

        res.json({
            success: true,
            message: 'Contacto registrado exitosamente',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error registrando contacto:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * POST /student/:studentCode/patient/:patientId/update-status
 * Actualiza el estado del tratamiento del paciente
 */
router.post('/:studentCode/patient/:patientId/update-status', async (req, res) => {
    try {
        const { studentCode, patientId } = req.params;
        const { estado, observaciones } = req.body;
        
        // Estados válidos
        const estadosValidos = ['asignado', 'contactado', 'en_tratamiento', 'completado', 'cancelado'];
        
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                error: 'Estado no válido',
                estados_validos: estadosValidos
            });
        }
        
        const pool = await getConnection();
        
        // Verificar acceso
        const [verificacion] = await pool.execute(`
            SELECT e.id as estudiante_id, a.id as asignacion_id
            FROM estudiantes_odontologia e
            INNER JOIN asignaciones a ON e.id = a.id_estudiante
            WHERE e.codigo_estudiante = ? AND a.id_paciente = ?
        `, [studentCode, patientId]);

        if (verificacion.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'No tienes acceso a este paciente'
            });
        }

        // Preparar campos adicionales según el estado
        let camposAdicionales = '';
        let valores = [estado];
        
        if (estado === 'en_tratamiento' && !observaciones) {
            valores.push(new Date());
            camposAdicionales = ', fecha_inicio_tratamiento = ?';
        }
        
        if (estado === 'completado') {
            valores.push(new Date());
            camposAdicionales = ', fecha_finalizacion = ?';
        }

        // Actualizar observaciones si se proporcionan
        if (observaciones) {
            const observacionCompleta = `[${new Date().toISOString()}] Estado: ${estado} - ${observaciones}`;
            valores.push(observacionCompleta);
            camposAdicionales += ', observaciones_estudiante = COALESCE(CONCAT(observaciones_estudiante, "\\n\\n"), "") || ?';
        }
        
        valores.push(verificacion[0].asignacion_id);

        // Actualizar estado
        await pool.execute(`
            UPDATE asignaciones 
            SET estado = ?${camposAdicionales}
            WHERE id = ?
        `, valores);

        res.json({
            success: true,
            message: `Estado actualizado a: ${estado}`,
            nuevo_estado: estado,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * GET /student/:studentCode/dashboard
 * Dashboard del estudiante con resumen de casos
 */
router.get('/:studentCode/dashboard', async (req, res) => {
    try {
        const { studentCode } = req.params;
        
        const pool = await getConnection();
        
        // Verificar estudiante
        const [estudiante] = await pool.execute(`
            SELECT * FROM estudiantes_odontologia 
            WHERE codigo_estudiante = ? AND estado = 'activo'
        `, [studentCode]);

        if (estudiante.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Código de estudiante no válido'
            });
        }

        const estudianteData = estudiante[0];

        // Estadísticas generales
        const [estadisticas] = await pool.execute(`
            SELECT 
                COUNT(*) as total_casos,
                COUNT(CASE WHEN a.estado = 'asignado' THEN 1 END) as pendientes,
                COUNT(CASE WHEN a.estado = 'contactado' THEN 1 END) as contactados,
                COUNT(CASE WHEN a.estado = 'en_tratamiento' THEN 1 END) as en_tratamiento,
                COUNT(CASE WHEN a.estado = 'completado' THEN 1 END) as completados,
                COUNT(CASE WHEN a.estado = 'cancelado' THEN 1 END) as cancelados,
                AVG(a.score_compatibilidad) as score_promedio,
                COUNT(CASE WHEN a.fecha_asignacion >= CURDATE() - INTERVAL 7 DAY THEN 1 END) as asignaciones_semana
            FROM asignaciones a
            WHERE a.id_estudiante = ?
        `, [estudianteData.id]);

        // Casos recientes
        const [casosRecientes] = await pool.execute(`
            SELECT 
                p.id,
                p.nombre_completo,
                p.edad,
                p.tipo_tratamiento_inferido,
                p.prioridad,
                a.estado,
                a.fecha_asignacion,
                a.fecha_primer_contacto
            FROM pacientes p
            INNER JOIN asignaciones a ON p.id = a.id_paciente
            WHERE a.id_estudiante = ?
            ORDER BY a.fecha_asignacion DESC
            LIMIT 5
        `, [estudianteData.id]);

        // Citas próximas
        const [citasProximas] = await pool.execute(`
            SELECT 
                p.nombre_completo,
                ah.dia_semana,
                ah.hora_inicio,
                ah.hora_fin,
                ah.fecha_asignacion,
                ah.especialidad,
                ah.clinica
            FROM asignaciones_horario ah
            INNER JOIN pacientes p ON ah.id_paciente = p.id
            WHERE ah.id_estudiante = ? 
                AND ah.fecha_asignacion >= CURDATE()
                AND ah.estado IN ('programada', 'confirmada')
            ORDER BY ah.fecha_asignacion ASC, ah.hora_inicio ASC
            LIMIT 10
        `, [estudianteData.id]);

        res.json({
            success: true,
            data: {
                estudiante: estudianteData,
                estadisticas: estadisticas[0],
                casos_recientes: casosRecientes,
                citas_proximas: citasProximas,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error obteniendo dashboard del estudiante:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

module.exports = router;