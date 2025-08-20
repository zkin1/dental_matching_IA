const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');

// GET /api/asignaciones - Obtener todas las asignaciones
router.get('/', async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute(`
      SELECT 
        a.id, a.estado, a.fecha_asignacion, a.score_compatibilidad,
        p.nombre_completo as paciente_nombre,
        p.telefono as paciente_telefono,
        p.tipo_tratamiento_inferido,
        p.nivel_dolor,
        e.nombre_completo as estudiante_nombre,
        e.codigo_estudiante,
        e.año_carrera
      FROM asignaciones a
      JOIN pacientes p ON a.id_paciente = p.id
      JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
      ORDER BY a.fecha_asignacion DESC
      LIMIT 50
    `);
    
    res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error obteniendo asignaciones:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener asignaciones' 
    });
  }
});

// GET /api/asignaciones/stats - Estadísticas de asignaciones
router.get('/stats', async (req, res) => {
  try {
    const db = await getConnection();
    const [stats] = await db.execute(`
      SELECT 
        estado,
        COUNT(*) as cantidad
      FROM asignaciones
      GROUP BY estado
    `);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener estadísticas' 
    });
  }
});

module.exports = router;