const express = require('express');
const router = express.Router();
const { getConnection, executeQuery } = require('../config/database');
const LegacyLoggerAdapter = require('./legacyLoggerAdapter');

// Importar middleware de autenticación
const { authenticateToken } = require('../src/shared/middleware/auth');
const studentCodeService = require('../services/studentCodeService');

// Inicializar logger estructurado para esta ruta
const logger = new LegacyLoggerAdapter('estudiantes');

// GET /api/estudiantes - Obtener todos los estudiantes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT 
        e.id, 
        e.codigo_estudiante, 
        e.nombre_completo, 
        e.año_carrera, 
        e.telefono, 
        e.email, 
        e.universidad, 
        e.ciudad, 
        e.estado,
        e.casos_completados, 
        e.casos_necesarios, 
        e.casos_activos,
        e.fecha_registro,
        e.especialidades,
        COALESCE(e.especialidades, 'General') as especialidades_display
      FROM estudiantes_odontologia e
      WHERE e.estado = ?
      ORDER BY e.nombre_completo ASC
    `, ['activo']);
    
    // Procesar los datos para asegurar que tengan valores por defecto
    const estudiantesProcesados = result.rows.map(estudiante => ({
      ...estudiante,
      nombre_completo: estudiante.nombre_completo || 'Sin nombre',
      codigo_estudiante: estudiante.codigo_estudiante || 'N/A',
      universidad: estudiante.universidad || 'No especificada',
      especialidades: estudiante.especialidades_display || 'General',
      casos_activos: estudiante.casos_activos || 0,
      casos_completados: estudiante.casos_completados || 0,
      año_carrera: estudiante.año_carrera || 'N/A'
    }));

    // Verificar y corregir códigos inválidos o faltantes
    const db = await getConnection();
    for (let estudiante of estudiantesProcesados) {
      if (!studentCodeService.validateCodeFormat(estudiante.codigo_estudiante)) {
        try {
          // Generar nuevo código único
          const newCode = await studentCodeService.generateUniqueCode();
          
          // Actualizar en la base de datos
          await db.execute(
            'UPDATE estudiantes_odontologia SET codigo_estudiante = ?, fecha_actualizacion = NOW() WHERE id = ?',
            [newCode, estudiante.id]
          );
          
          // Actualizar en el objeto local
          estudiante.codigo_estudiante = newCode;
          
          console.log(`🔄 Código corregido para estudiante ${estudiante.id}: ${newCode}`);
        } catch (error) {
          console.error(`Error corrigiendo código para estudiante ${estudiante.id}:`, error);
        }
      }
    }
    
    res.json({
      success: true,
      total: estudiantesProcesados.length,
      data: estudiantesProcesados
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
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = await executeQuery(`
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
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener estadísticas' 
    });
  }
});

// POST /api/estudiantes - Crear nuevo estudiante con código único
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      nombre_completo, 
      año_carrera, 
      telefono, 
      email, 
      universidad, 
      ciudad, 
      estado,
      especialidades 
    } = req.body;

    if (!nombre_completo || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nombre completo y email son requeridos'
      });
    }

    // Generar código único para el nuevo estudiante
    const codigo_estudiante = await studentCodeService.generateUniqueCode();
    
    // Insertar nuevo estudiante
    const result = await executeQuery(`
      INSERT INTO estudiantes_odontologia (
        codigo_estudiante, 
        nombre_completo, 
        año_carrera, 
        telefono, 
        email, 
        universidad, 
        ciudad, 
        estado,
        especialidades,
        fecha_registro,
        fecha_actualizacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      codigo_estudiante,
      nombre_completo,
      año_carrera || null,
      telefono || null,
      email,
      universidad || null,
      ciudad || null,
      estado || 'activo',
      especialidades || null
    ]);

    const nuevoEstudiante = {
      id: result.result.insertId,
      codigo_estudiante,
      nombre_completo,
      año_carrera,
      telefono,
      email,
      universidad,
      ciudad,
      estado,
      especialidades,
      casos_activos: 0,
      casos_completados: 0,
      fecha_registro: new Date(),
      fecha_actualizacion: new Date()
    };

    res.status(201).json({
      success: true,
      message: 'Estudiante creado exitosamente',
      data: nuevoEstudiante
    });

  } catch (error) {
    console.error('Error creando estudiante:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando estudiante: ' + error.message
    });
  }
});

// PUT /api/estudiantes/:id - Actualizar estudiante
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre_completo, 
      año_carrera, 
      telefono, 
      email, 
      universidad, 
      ciudad, 
      estado,
      especialidades 
    } = req.body;

    if (!nombre_completo || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nombre completo y email son requeridos'
      });
    }

    // Verificar que el estudiante existe
    const existingResult = await executeQuery(
      'SELECT id FROM estudiantes_odontologia WHERE id = ?',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado'
      });
    }

    // Actualizar estudiante
    await executeQuery(`
      UPDATE estudiantes_odontologia SET 
        nombre_completo = ?, 
        año_carrera = ?, 
        telefono = ?, 
        email = ?, 
        universidad = ?, 
        ciudad = ?, 
        estado = ?,
        especialidades = ?,
        fecha_actualizacion = NOW()
      WHERE id = ?
    `, [
      nombre_completo,
      año_carrera || null,
      telefono || null,
      email,
      universidad || null,
      ciudad || null,
      estado || 'activo',
      especialidades || null,
      id
    ]);

    res.json({
      success: true,
      message: 'Estudiante actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando estudiante:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando estudiante: ' + error.message
    });
  }
});

module.exports = router;