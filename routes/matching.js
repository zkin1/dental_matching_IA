const express = require('express');
const router = express.Router();
const matchingService = require('../services/matchingService');

// Ejecutar matching manual
router.post('/auto', async (req, res) => {
    try {
        console.log('🎯 Matching manual iniciado por usuario');
        const result = await matchingService.executeAutoMatching();
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message || 'Matching manual exitoso',
                data: {
                    processed: result.processed || 0,
                    matched: result.matched || 0,
                    duration: result.duration || 0,
                    matches: result.matches || []
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error
            });
        }
    } catch (error) {
        console.error('❌ Error en endpoint de matching:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Obtener estadísticas de matching
router.get('/stats', async (req, res) => {
    try {
        const stats = await matchingService.getMatchingStats();
        
        res.json({
            success: true,
            data: {
                ...stats,
                scheduler: {
                    isRunning: false,
                    lastMatchingRun: null,
                    totalMatchingRuns: 0,
                    successfulMatchingRuns: 0,
                    failedMatchingRuns: 0,
                    totalMatches: stats.total_asignaciones || 0
                }
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de matching:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Obtener pacientes pendientes con análisis de síntomas
router.get('/pending', async (req, res) => {
    try {
        const pacientes = await matchingService.getPacientesPendientes();
        
        // Analizar síntomas para cada paciente
        const pacientesConAnalisis = pacientes.map(paciente => ({
            ...paciente,
            analisisSintomas: matchingService.analizarSintomas(paciente.sintomas_seleccionados)
        }));
        
        res.json({
            success: true,
            total: pacientesConAnalisis.length,
            data: pacientesConAnalisis
        });
    } catch (error) {
        console.error('❌ Error obteniendo pacientes pendientes:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Obtener estudiantes disponibles con estadísticas
router.get('/available', async (req, res) => {
    try {
        const estudiantes = await matchingService.getEstudiantesDisponibles();
        
        res.json({
            success: true,
            total: estudiantes.length,
            data: estudiantes
        });
    } catch (error) {
        console.error('❌ Error obteniendo estudiantes disponibles:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Obtener sugerencias de match para un paciente específico
router.get('/suggestions/:pacienteId', async (req, res) => {
    try {
        const { pacienteId } = req.params;
        
        // Obtener el paciente
        const pacientes = await matchingService.getPacientesPendientes();
        const paciente = pacientes.find(p => p.id == pacienteId);
        
        if (!paciente) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado o ya asignado'
            });
        }
        
        // Obtener estudiantes disponibles
        const estudiantes = await matchingService.getEstudiantesDisponibles();
        
        // Calcular scores para todos los estudiantes
        const sugerencias = estudiantes.map(estudiante => {
            const { score, especialidadMatch } = matchingService.calculateMatchScore(paciente, estudiante);
            return {
                ...estudiante,
                compatibilityScore: score,
                especialidadMatch: especialidadMatch,
                razonMatch: `${especialidadMatch ? 'Especialidad: ' + especialidadMatch : 'Match general'}`
            };
        })
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, 5); // Top 5 sugerencias

        // Analizar síntomas del paciente
        const analisisSintomas = matchingService.analizarSintomas(paciente.sintomas_seleccionados);
        
        res.json({
            success: true,
            paciente: {
                id: paciente.id,
                nombre: paciente.nombre_completo,
                prioridad: paciente.prioridad,
                complejidad: paciente.complejidad,
                tratamiento: paciente.tipo_tratamiento_inferido,
                sintomas: paciente.sintomas_seleccionados,
                analisisSintomas
            },
            sugerencias
        });
    } catch (error) {
        console.error('❌ Error obteniendo sugerencias:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Crear match manual específico
router.post('/manual', async (req, res) => {
    try {
        const { pacienteId, estudianteId } = req.body;
        
        if (!pacienteId || !estudianteId) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren pacienteId y estudianteId'
            });
        }
        
        // Obtener datos para validación
        const pacientes = await matchingService.getPacientesPendientes();
        const estudiantes = await matchingService.getEstudiantesDisponibles();
        
        const paciente = pacientes.find(p => p.id == pacienteId);
        const estudiante = estudiantes.find(e => e.id == estudianteId);
        
        if (!paciente) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado o ya asignado'
            });
        }
        
        if (!estudiante) {
            return res.status(404).json({
                success: false,
                message: 'Estudiante no encontrado o no disponible'
            });
        }
        
        // Calcular score para mostrar
        const { score, especialidadMatch } = matchingService.calculateMatchScore(paciente, estudiante);
        
        // Crear el match manualmente
        const result = await matchingService.createMatch(paciente, estudiante);
        
        if (result.success) {
            // Marcar como manual en las observaciones del sistema
            const { getConnection } = require('../config/database');
            const db = await getConnection();
            await db.execute(
                'UPDATE asignaciones SET observaciones_sistema = ? WHERE id = ?',
                [`MANUAL - Especialidad: ${especialidadMatch || 'General'} - Score: ${score.toFixed(2)} - Asignado manualmente por administrador`, result.asignacionId]
            );
            
            res.json({
                success: true,
                message: `Paciente ${paciente.nombre_completo} asignado manualmente a ${estudiante.nombre_completo}`,
                data: {
                    pacienteId: paciente.id,
                    estudianteId: estudiante.id,
                    score: score,
                    especialidadMatch: especialidadMatch,
                    tratamiento: paciente.tipo_tratamiento_inferido
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error creando la asignación'
            });
        }
    } catch (error) {
        console.error('❌ Error en matching manual:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Deshacer una asignación automática
router.delete('/undo/:asignacionId', async (req, res) => {
    try {
        const { asignacionId } = req.params;
        
        const result = await matchingService.undoAutoMatch(asignacionId);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.message || 'Error deshaciendo la asignación'
            });
        }
    } catch (error) {
        console.error('❌ Error deshaciendo match:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Obtener historial de matching con detalles
router.get('/history', async (req, res) => {
    try {
        const { getConnection } = require('../config/database');
        const db = await getConnection();
        
        const [history] = await db.execute(`
            SELECT 
                a.id,
                a.fecha_asignacion,
                a.score_compatibilidad,
                a.estado,
                a.observaciones_sistema,
                CASE 
                    WHEN a.observaciones_sistema LIKE '%MANUAL%' THEN 'manual'
                    ELSE 'automatico'
                END as tipo_matching,
                p.nombre_completo as paciente_nombre,
                p.prioridad,
                p.complejidad,
                p.tipo_tratamiento_inferido,
                p.sintomas_seleccionados,
                e.nombre_completo as estudiante_nombre,
                e.codigo_estudiante,
                e.año_carrera,
                e.especialidades
            FROM asignaciones a
            JOIN pacientes p ON a.id_paciente = p.id
            JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
            ORDER BY a.fecha_asignacion DESC
            LIMIT 50
        `);
        
        // Procesar datos para mejor visualización
        const historyProcessed = history.map(h => ({
            ...h,
            sintomas_parseados: (() => {
                try {
                    return JSON.parse(h.sintomas_seleccionados || '[]');
                } catch {
                    return [];
                }
            })(),
            especialidades_estudiante: (h.especialidades || '').split(',').map(e => e.trim()).filter(e => e)
        }));
        
        res.json({
            success: true,
            total: historyProcessed.length,
            data: historyProcessed
        });
    } catch (error) {
        console.error('❌ Error obteniendo historial:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Obtener estado del algoritmo de matching
router.get('/algorithm/status', async (req, res) => {
    try {
        const stats = await matchingService.getMatchingStats();
        
        res.json({
            success: true,
            data: {
                algorithm: {
                    name: 'Advanced Matching System v3.0',
                    description: 'Sistema avanzado de matching basado en síntomas, especialidades, horarios y clínicas específicas',
                    rules: {
                        sintomas: '40% - Detección automática de tratamiento por síntomas',
                        especialidad: '25% - Match especialidad-tratamiento requerido',
                        clinica: '15% - Asignación correcta de clínica por edad',
                        horarios: '10% - Disponibilidad de horarios específicos',
                        experiencia: '10% - Año de carrera vs complejidad del caso'
                    },
                    clinicasDisponibles: [
                        'Clínica para el Niño y Adolescente',
                        'Clínica Integral Adulto y Gerontología'
                    ],
                    especialidadesSuportadas: [
                        'Endodoncia', 'Destartraje y Pulido Coronario', 'Pulido Radicular',
                        'Exodoncia Simple', 'Resina Simple', 'Resina Compuesta', 'Corona',
                        'Incrustación', 'Protesis Parcial Removible', 'Protesis Total Removible'
                    ]
                },
                performance: {
                    totalAsignaciones: stats.total_asignaciones,
                    scorePromedio: stats.score_promedio,
                    matchesHoy: stats.hoy
                },
                scheduler: {
                    isActive: false,
                    totalRuns: 0,
                    successRate: '100%',
                    lastRun: null,
                    totalMatches: stats.total_asignaciones || 0
                }
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo estado del algoritmo:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// NUEVA RUTA: Analizar síntomas de un texto
router.post('/analyze-symptoms', async (req, res) => {
    try {
        const { sintomas } = req.body;
        
        if (!sintomas) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el campo "sintomas"'
            });
        }
        
        const analisis = matchingService.analizarSintomas(sintomas);
        
        res.json({
            success: true,
            data: analisis
        });
    } catch (error) {
        console.error('❌ Error analizando síntomas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// NUEVA RUTA: Obtener estadísticas por tratamiento
router.get('/stats/by-treatment', async (req, res) => {
    try {
        const { getConnection } = require('../config/database');
        const db = await getConnection();
        
        const [stats] = await db.execute(`
            SELECT 
                p.tipo_tratamiento_inferido as tratamiento,
                COUNT(*) as total_pacientes,
                SUM(CASE WHEN p.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN p.estado = 'asignado' THEN 1 ELSE 0 END) as asignados,
                AVG(a.score_compatibilidad) as score_promedio,
                COUNT(CASE WHEN a.observaciones_sistema LIKE '%MANUAL%' THEN 1 END) as matches_manuales,
                COUNT(CASE WHEN a.observaciones_sistema NOT LIKE '%MANUAL%' OR a.observaciones_sistema IS NULL THEN 1 END) as matches_automaticos
            FROM pacientes p
            LEFT JOIN asignaciones a ON p.id = a.id_paciente AND a.estado IN ('asignado', 'en_tratamiento')
            WHERE p.activo = TRUE
            GROUP BY p.tipo_tratamiento_inferido
            ORDER BY total_pacientes DESC
        `);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas por tratamiento:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// NUEVA RUTA: Obtener estadísticas por especialidad de estudiante
router.get('/stats/by-speciality', async (req, res) => {
    try {
        const { getConnection } = require('../config/database');
        const db = await getConnection();
        
        const [students] = await db.execute(`
            SELECT 
                e.especialidades,
                e.año_carrera,
                COUNT(*) as total_estudiantes,
                SUM(e.casos_activos) as casos_activos_total,
                AVG(e.casos_completados) as promedio_casos_completados,
                COUNT(CASE WHEN e.casos_activos < e.casos_necesarios THEN 1 END) as disponibles
            FROM estudiantes_odontologia e
            WHERE e.estado = 'activo'
            GROUP BY e.especialidades, e.año_carrera
            ORDER BY total_estudiantes DESC
        `);
        
        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas por especialidad:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;