const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');
// Importar middleware de autenticación
const { authenticateToken } = require('../src/shared/middleware/auth');

// Logger simple para desarrollo
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};

// GET /api/pacientes - Obtener todos los pacientes (DESARROLLO: SIN AUTH)
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
    const { handleRouteError } = require('../src/shared/utils/errorHandlerHelper');
    handleRouteError(error, req, res, 'obtener_pacientes');
  }
});

// POST /api/pacientes - Crear nuevo paciente
router.post('/', async (req, res) => {
  try {
    const db = await getConnection();
    const { nombre_completo, edad, telefono, email, ciudad, sintomas_seleccionados, nivel_dolor, dias_disponibles, horario_preferencia, tipo_tratamiento_inferido, tipo_tratamiento, prioridad, urgencia, descripcion_caso } = req.body;

    if (!nombre_completo || !telefono || !ciudad) {
      return res.status(400).json({ success: false, error: 'Nombre, telefono y ciudad son obligatorios' });
    }

    const [result] = await db.execute(
      `INSERT INTO pacientes (nombre_completo, edad, telefono, email, ciudad, sintomas_seleccionados, nivel_dolor, dias_disponibles, horario_preferencia, tipo_tratamiento_inferido, prioridad, estado, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 1)`,
      [
        nombre_completo,
        edad || null,
        telefono,
        email || null,
        ciudad,
        sintomas_seleccionados ? JSON.stringify(sintomas_seleccionados) : null,
        nivel_dolor || 0,
        dias_disponibles || null,
        horario_preferencia || null,
        tipo_tratamiento_inferido || tipo_tratamiento || null,
        prioridad || urgencia || 'Moderada'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Paciente registrado exitosamente',
      data: { id: result.insertId, nombre_completo, estado: 'pendiente' }
    });
  } catch (error) {
    const { handleRouteError } = require('../src/shared/utils/errorHandlerHelper');
    handleRouteError(error, req, res, 'crear_paciente');
  }
});

// GET /api/pacientes/stats - Obtener estadísticas de pacientes
router.get('/stats', async (req, res) => {
  try {
    const db = await getConnection();
    const [rows] = await db.execute('SELECT estado, prioridad, ciudad, fecha_registro FROM pacientes WHERE activo = 1');
    
    const stats = {
      total: rows.length,
      pendientes: rows.filter(p => p.estado === 'pendiente').length,
      asignados: rows.filter(p => p.estado === 'asignado').length,
      completados: rows.filter(p => p.estado === 'completado').length,
      byPrioridad: {},
      byCiudad: {},
      nuevosHoy: 0
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const row of rows) {
      // Stats by priority
      if (row.prioridad) {
        stats.byPrioridad[row.prioridad] = (stats.byPrioridad[row.prioridad] || 0) + 1;
      }

      // Stats by city
      if (row.ciudad) {
        stats.byCiudad[row.ciudad] = (stats.byCiudad[row.ciudad] || 0) + 1;
      }

      // new today
      const fechaRegistro = new Date(row.fecha_registro);
      if (fechaRegistro >= today) {
        stats.nuevosHoy++;
      }
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error obteniendo estadísticas de pacientes', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
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
    logger.error('Error obteniendo paciente', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener paciente' 
    });
  }
});

module.exports = router;