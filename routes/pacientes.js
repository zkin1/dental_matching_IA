const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');

// GET /api/pacientes - Obtener todos los pacientes
router.get('/', async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute(`
      SELECT 
        id, nombre_completo, edad, telefono, email, ciudad,
        tipo_tratamiento_inferido, nivel_dolor, prioridad,
        fecha_registro, activo
      FROM pacientes 
      WHERE activo = 1 
      ORDER BY fecha_registro DESC 
      LIMIT 50
    `);
    
    res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error obteniendo pacientes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener pacientes' 
    });
  }
});

// GET /api/pacientes/:id - Obtener un paciente específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getConnection();
    const [rows] = await db.execute(
      'SELECT * FROM pacientes WHERE id = ? AND activo = 1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Paciente no encontrado' 
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error obteniendo paciente:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener paciente' 
    });
  }
});

module.exports = router;