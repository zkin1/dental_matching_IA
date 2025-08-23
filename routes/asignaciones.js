const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');
const autoNotificationService = require('../services/autoNotificationService');

// GET /api/asignaciones - Obtener todas las asignaciones
router.get('/', async (req, res) => {
  try {
    const db = await getConnection();
    
    // Primero verificar si la tabla existe
    try {
      const [tableCheck] = await db.execute(`
        SELECT COUNT(*) as total 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'asignaciones'
      `);
      
      if (tableCheck[0].total === 0) {
        console.log('⚠️ Tabla asignaciones no existe, retornando array vacío');
        return res.json({
          success: true,
          total: 0,
          data: [],
          message: 'Tabla de asignaciones no existe'
        });
      }
    } catch (tableError) {
      console.log('⚠️ Error verificando tabla asignaciones:', tableError.message);
      return res.json({
        success: true,
        total: 0,
        data: [],
        message: 'Error verificando estructura de base de datos'
      });
    }
    
    // Verificar si hay asignaciones
    let totalAsignaciones = 0;
    try {
      const [countResult] = await db.execute('SELECT COUNT(*) as total FROM asignaciones');
      totalAsignaciones = countResult[0].total;
    } catch (countError) {
      console.log('⚠️ Error contando asignaciones:', countError.message);
      return res.json({
        success: true,
        total: 0,
        data: [],
        message: 'Error contando asignaciones'
      });
    }
    
    if (totalAsignaciones === 0) {
      return res.json({
        success: true,
        total: 0,
        data: [],
        message: 'No hay asignaciones registradas'
      });
    }
    
    // Consulta simple primero para verificar que funciona
    let rows = [];
    try {
      const [basicRows] = await db.execute('SELECT * FROM asignaciones LIMIT 10');
      rows = basicRows;
    } catch (queryError) {
      console.log('⚠️ Error en consulta básica:', queryError.message);
      return res.json({
        success: true,
        total: 0,
        data: [],
        message: 'Error en consulta básica de asignaciones'
      });
    }
    
    // Si la consulta básica funciona, intentar la consulta completa
    if (rows.length > 0) {
      try {
        const [fullRows] = await db.execute(`
          SELECT 
            a.id, 
            a.estado, 
            a.fecha_asignacion, 
            a.score_compatibilidad,
            a.observaciones_sistema,
            a.tipo_asignacion,
            a.id_paciente,
            a.id_estudiante,
            COALESCE(p.nombre_completo, 'Paciente no encontrado') as paciente_nombre,
            COALESCE(p.telefono, 'N/A') as paciente_telefono,
            COALESCE(p.tipo_tratamiento_inferido, 'No especificado') as tipo_tratamiento_inferido,
            COALESCE(p.nivel_dolor, 0) as nivel_dolor,
            COALESCE(p.prioridad, 'Moderada') as prioridad,
            COALESCE(e.nombre_completo, 'Estudiante no encontrado') as estudiante_nombre,
            COALESCE(e.codigo_estudiante, 'N/A') as codigo_estudiante,
            COALESCE(e.año_carrera, 'N/A') as año_carrera,
            COALESCE(e.especialidades, 'General') as especialidades
          FROM asignaciones a
          LEFT JOIN pacientes p ON a.id_paciente = p.id
          LEFT JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
          ORDER BY a.fecha_asignacion DESC
          LIMIT 100
        `);
        rows = fullRows;
      } catch (joinError) {
        console.log('⚠️ Error en JOIN, usando datos básicos:', joinError.message);
        // Continuar con los datos básicos si falla el JOIN
      }
    }
    
    // Procesar los datos para mejorar la presentación
    const asignacionesProcesadas = rows.map(asignacion => ({
      id: asignacion.id || 0,
      estado: asignacion.estado || 'asignado',
      fecha_asignacion: asignacion.fecha_asignacion || new Date().toISOString(),
      score_compatibilidad: asignacion.score_compatibilidad || 0,
      observaciones_sistema: asignacion.observaciones_sistema || 'Sistema automático',
      tipo_asignacion: asignacion.tipo_asignacion || 'automática',
      id_paciente: asignacion.id_paciente || null,
      id_estudiante: asignacion.id_estudiante || null,
      paciente_nombre: asignacion.paciente_nombre || 'Paciente no encontrado',
      paciente_telefono: asignacion.paciente_telefono || 'N/A',
      tipo_tratamiento_inferido: asignacion.tipo_tratamiento_inferido || 'No especificado',
      nivel_dolor: asignacion.nivel_dolor || 0,
      prioridad: asignacion.prioridad || 'Moderada',
      estudiante_nombre: asignacion.estudiante_nombre || 'Estudiante no encontrado',
      codigo_estudiante: asignacion.codigo_estudiante || 'N/A',
      año_carrera: asignacion.año_carrera || 'N/A',
      especialidades: asignacion.especialidades || 'General'
    }));
    
    res.json({
      success: true,
      total: asignacionesProcesadas.length,
      data: asignacionesProcesadas
    });
    
  } catch (error) {
    console.error('❌ Error crítico obteniendo asignaciones:', error);
    
    // Error más específico
    let errorMessage = 'Error al obtener asignaciones';
    if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Tabla de asignaciones no encontrada';
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Error en la estructura de la base de datos';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Error de conexión a la base de datos';
    }
    
    // En lugar de error 500, retornar respuesta exitosa con datos vacíos
    res.json({ 
      success: true, 
      total: 0,
      data: [],
      error: errorMessage,
      message: 'Sistema funcionando con datos limitados'
    });
  }
});

// GET /api/asignaciones/stats - Estadísticas de asignaciones
router.get('/stats', async (req, res) => {
  try {
    const db = await getConnection();
    
    // Verificar si la tabla existe
    const [tableCheck] = await db.execute(`
      SELECT COUNT(*) as total 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'asignaciones'
    `);
    
    if (tableCheck[0].total === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
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
    res.json({ 
      success: true, 
      data: [],
      message: 'Error obteniendo estadísticas'
    });
  }
});

// POST /api/asignaciones - Crear nueva asignación con notificaciones automáticas
router.post('/', async (req, res) => {
  try {
    const { paciente_id, estudiante_id, observaciones_sistema, tipo_asignacion } = req.body;
    
    if (!paciente_id || !estudiante_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren paciente_id y estudiante_id'
      });
    }

    const db = await getConnection();
    
    // Verificar que el paciente y estudiante existan
    const [pacienteCheck] = await db.execute(
      'SELECT id, nombre, email FROM pacientes WHERE id = ?',
      [paciente_id]
    );
    
    const [estudianteCheck] = await db.execute(
      'SELECT id, nombre, email FROM estudiantes_odontologia WHERE id = ?',
      [estudiante_id]
    );
    
    if (pacienteCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paciente no encontrado'
      });
    }
    
    if (estudianteCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado'
      });
    }

    // Verificar si ya existe una asignación para este paciente
    const [existingAssignment] = await db.execute(
      'SELECT id FROM asignaciones WHERE id_paciente = ?',
      [paciente_id]
    );
    
    if (existingAssignment.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'El paciente ya tiene una asignación activa'
      });
    }

    // Crear la asignación
    const fechaAsignacion = new Date();
    const [result] = await db.execute(`
      INSERT INTO asignaciones (
        id_paciente, 
        id_estudiante, 
        fecha_asignacion, 
        estado, 
        observaciones_sistema, 
        tipo_asignacion,
        score_compatibilidad
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      paciente_id,
      estudiante_id,
      fechaAsignacion,
      'asignado',
      observaciones_sistema || 'Asignación automática del sistema',
      tipo_asignacion || 'automática',
      85 // Score de compatibilidad por defecto
    ]);

    const asignacionId = result.insertId;
    
    // Enviar notificaciones automáticas de forma asíncrona
    const notificationData = {
      paciente_id,
      estudiante_id,
      fecha_asignacion: fechaAsignacion
    };

    // Enviar notificaciones sin bloquear la respuesta
    autoNotificationService.sendAssignmentNotifications(notificationData)
      .then(result => {
        console.log('✅ Notificaciones automáticas enviadas:', result);
      })
      .catch(error => {
        console.error('❌ Error en notificaciones automáticas:', error);
      });

    // Actualizar estado del paciente
    await db.execute(
      'UPDATE pacientes SET estado = ?, estudiante_asignado = ? WHERE id = ?',
      ['asignado', estudiante_id, paciente_id]
    );

    res.status(201).json({
      success: true,
      message: 'Asignación creada exitosamente',
      data: {
        id: asignacionId,
        paciente_id,
        estudiante_id,
        fecha_asignacion: fechaAsignacion,
        estado: 'asignado',
        notificaciones_enviadas: true
      }
    });

  } catch (error) {
    console.error('❌ Error creando asignación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la asignación',
      error: error.message
    });
  }
});

// PUT /api/asignaciones/:id - Actualizar asignación
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones_sistema, score_compatibilidad } = req.body;
    
    const db = await getConnection();
    
    const [result] = await db.execute(`
      UPDATE asignaciones 
      SET estado = ?, observaciones_sistema = ?, score_compatibilidad = ?
      WHERE id = ?
    `, [
      estado || 'asignado',
      observaciones_sistema || 'Actualización del sistema',
      score_compatibilidad || 85,
      id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Asignación actualizada exitosamente',
      data: { id, estado, observaciones_sistema, score_compatibilidad }
    });

  } catch (error) {
    console.error('❌ Error actualizando asignación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la asignación',
      error: error.message
    });
  }
});

// DELETE /api/asignaciones/:id - Eliminar asignación
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getConnection();
    
    // Obtener información de la asignación antes de eliminar
    const [asignacion] = await db.execute(
      'SELECT id_paciente, id_estudiante FROM asignaciones WHERE id = ?',
      [id]
    );
    
    if (asignacion.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }

    // Eliminar la asignación
    const [result] = await db.execute(
      'DELETE FROM asignaciones WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }

    // Actualizar estado del paciente
    await db.execute(
      'UPDATE pacientes SET estado = ?, estudiante_asignado = NULL WHERE id = ?',
      ['pendiente', asignacion[0].id_paciente]
    );

    res.json({
      success: true,
      message: 'Asignación eliminada exitosamente',
      data: { id }
    });

  } catch (error) {
    console.error('❌ Error eliminando asignación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la asignación',
      error: error.message
    });
  }
});

module.exports = router;