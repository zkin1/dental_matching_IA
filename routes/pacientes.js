const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');

// GET /api/pacientes - Obtener todos los pacientes
router.get('/', async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute(`
      SELECT 
        p.id, 
        p.nombre_completo, 
        p.edad, 
        p.telefono, 
        p.email, 
        p.ciudad,
        p.tipo_tratamiento_inferido, 
        p.nivel_dolor, 
        p.prioridad,
        p.fecha_registro, 
        p.activo,
        p.estado,
        a.id_estudiante as estudiante_asignado,
        e.nombre_completo as estudiante_nombre,
        e.codigo_estudiante as estudiante_codigo
      FROM pacientes p
      LEFT JOIN asignaciones a ON p.id = a.id_paciente AND a.estado IN ('asignado', 'en_tratamiento')
      LEFT JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
      WHERE p.activo = 1 
      ORDER BY p.fecha_registro DESC 
      LIMIT 100
    `);
    
    // Procesar los datos para determinar el estado real
    const pacientesProcesados = rows.map(paciente => {
      let estadoReal = 'pendiente';
      
      // Si tiene estudiante asignado, el estado es 'asignado'
      if (paciente.estudiante_asignado) {
        estadoReal = 'asignado';
      } else if (paciente.estado && paciente.estado !== '') {
        // Si no tiene estudiante pero tiene estado, usar ese estado
        estadoReal = paciente.estado;
      }
      
      return {
        ...paciente,
        estado: estadoReal,
        // Asegurar que los campos críticos tengan valores por defecto
        nombre_completo: paciente.nombre_completo || 'Sin nombre',
        telefono: paciente.telefono || 'No especificado',
        tipo_tratamiento_inferido: paciente.tipo_tratamiento_inferido || 'No especificado',
        prioridad: paciente.prioridad || 'Moderada',
        nivel_dolor: paciente.nivel_dolor || 0
      };
    });
    
    res.json({
      success: true,
      total: pacientesProcesados.length,
      data: pacientesProcesados
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