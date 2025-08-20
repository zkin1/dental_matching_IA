const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');

// GET /api/estudiantes - Obtener todos los estudiantes
router.get('/', async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute(`
      SELECT 
        id, codigo_estudiante, nombre_completo, año_carrera, 
        telefono, email, universidad, ciudad, estado,
        casos_completados, casos_necesarios, casos_activos,
        fecha_registro
      FROM estudiantes_odontologia 
      WHERE estado = 'activo'
      ORDER BY nombre_completo ASC
    `);
    
    res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener estudiantes' 
    });
  }
});

// GET /api/estudiantes/stats - Estadísticas de estudiantes
router.get('/stats', async (req, res) => {
  try {
    const db = await getConnection();
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_estudiantes,
        COUNT(CASE WHEN estado = 'activo' THEN 1 END) as activos,
        COUNT(CASE WHEN estado = 'completo' THEN 1 END) as completados,
        SUM(casos_activos) as total_casos_activos,
        SUM(casos_completados) as total_casos_completados
      FROM estudiantes_odontologia
    `);
    
    res.json({
      success: true,
      data: stats[0]
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