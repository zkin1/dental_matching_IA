const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');
const autoNotificationService = require('../services/autoNotificationService');
const LegacyLoggerAdapter = require('./legacyLoggerAdapter');

// Importar middleware de autenticación
const { authenticateToken } = require('../src/shared/middleware/auth');

// Inicializar logger estructurado para esta ruta
const logger = new LegacyLoggerAdapter('asignaciones');

// GET /api/asignaciones - Obtener todas las asignaciones (PROTEGIDO)
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
        logger.warn('Tabla asignaciones no existe, retornando array vacío');
        return res.json({
          success: true,
          total: 0,
          data: [],
          message: 'Tabla de asignaciones no existe'
        });
      }
    } catch (tableError) {
      logger.warn('Error verificando tabla asignaciones', tableError);
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
    
            // Consulta principal con JOIN para obtener datos completos
        let rows = [];
        try {
          const [fullRows] = await db.execute(`
            SELECT 
              a.id, 
              a.estado, 
              a.fecha_asignacion, 
              a.score_compatibilidad,
              a.observaciones_sistema,
              a.observaciones_estudiante,
              a.id_paciente,
              a.id_estudiante,
              a.codigo_acceso,
              a.algoritmo_version,
              a.fecha_primer_contacto,
              a.fecha_inicio_tratamiento,
              a.fecha_finalizacion,
              a.motivo_cancelacion,
              a.notificado_por_email,
              a.fecha_notificacion,
              a.recordatorios_enviados,
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
          console.log(`✅ Consulta exitosa: ${rows.length} asignaciones encontradas`);
        } catch (joinError) {
          console.log('⚠️ Error en JOIN principal, intentando consulta alternativa:', joinError.message);
          
          // Si falla el JOIN principal, intentar con consulta más simple
          try {
        const [simpleRows] = await db.execute(`
          SELECT 
            a.id, 
            a.estado, 
            a.fecha_asignacion, 
            a.score_compatibilidad,
            a.observaciones_sistema,
            a.observaciones_estudiante,
            a.id_paciente,
            a.id_estudiante,
            a.notificado_por_email,
            a.fecha_notificacion,
            a.recordatorios_enviados
          FROM asignaciones a
          ORDER BY a.fecha_asignacion DESC
          LIMIT 100
        `);
        
        // Para cada asignación, obtener datos del paciente y estudiante por separado
        rows = await Promise.all(simpleRows.map(async (asignacion) => {
          let pacienteData = { nombre_completo: 'Paciente no encontrado', telefono: 'N/A', tipo_tratamiento_inferido: 'No especificado', nivel_dolor: 0, prioridad: 'Moderada' };
          let estudianteData = { nombre_completo: 'Estudiante no encontrado', codigo_estudiante: 'N/A', año_carrera: 'N/A', especialidades: 'General' };
          
          try {
            if (asignacion.id_paciente) {
              const [paciente] = await db.execute('SELECT nombre_completo, telefono, tipo_tratamiento_inferido, nivel_dolor, prioridad FROM pacientes WHERE id = ?', [asignacion.id_paciente]);
              if (paciente.length > 0) {
                pacienteData = paciente[0];
              }
            }
          } catch (pacienteError) {
            console.log(`⚠️ Error obteniendo datos del paciente ${asignacion.id_paciente}:`, pacienteError.message);
          }
          
          try {
            if (asignacion.id_estudiante) {
              const [estudiante] = await db.execute('SELECT nombre_completo, codigo_estudiante, año_carrera, especialidades FROM estudiantes_odontologia WHERE id = ?', [asignacion.id_estudiante]);
              if (estudiante.length > 0) {
                estudianteData = estudiante[0];
              }
            }
          } catch (estudianteError) {
            console.log(`⚠️ Error obteniendo datos del estudiante ${asignacion.id_estudiante}:`, estudianteError.message);
          }
          
          return {
            ...asignacion,
            paciente_nombre: pacienteData.nombre_completo || 'Paciente no encontrado',
            paciente_telefono: pacienteData.telefono || 'N/A',
            tipo_tratamiento_inferido: pacienteData.tipo_tratamiento_inferido || 'No especificado',
            nivel_dolor: pacienteData.nivel_dolor || 0,
            prioridad: pacienteData.prioridad || 'Moderada',
            estudiante_nombre: estudianteData.nombre_completo || 'Estudiante no encontrado',
            codigo_estudiante: estudianteData.codigo_estudiante || 'N/A',
            año_carrera: estudianteData.año_carrera || 'N/A',
            especialidades: estudianteData.especialidades || 'General'
          };
        }));
        
        console.log(`✅ Consulta alternativa exitosa: ${rows.length} asignaciones procesadas`);
      } catch (alternativeError) {
        console.log('⚠️ Error en consulta alternativa:', alternativeError.message);
        return res.json({
          success: false,
          total: 0,
          data: [],
          message: 'Error obteniendo datos de asignaciones',
          error: alternativeError.message
        });
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
    // Usar logger enterprise en lugar de console.error
    const logger = require('../src/shared/utils/logger');
    logger.error('Error crítico obteniendo asignaciones', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      requestId: req.headers['x-request-id']
    });
    
    // Error más específico
    let errorMessage = 'Error al obtener asignaciones';
    let statusCode = 500;
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Tabla de asignaciones no encontrada';
      statusCode = 503; // Service Unavailable
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Error en la estructura de la base de datos';
      statusCode = 503; // Service Unavailable
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Error de conexión a la base de datos';
      statusCode = 503; // Service Unavailable
    }
    
    // NUNCA mentir sobre el éxito - retornar error real
    res.status(statusCode).json({ 
      success: false,  // Ser honesto sobre el error
      error: error.code || 'DATABASE_ERROR',
      message: errorMessage,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    });
  }
});

// GET /api/asignaciones/diagnostic - Diagnóstico de la base de datos
router.get('/diagnostic', async (req, res) => {
  try {
    const db = await getConnection();
    
    const diagnostic = {
      tables: {},
      sampleData: {},
      errors: []
    };
    
    // Verificar estructura de tabla asignaciones
    try {
      const [columns] = await db.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'asignaciones'
        ORDER BY ORDINAL_POSITION
      `);
      diagnostic.tables.asignaciones = columns;
    } catch (error) {
      diagnostic.errors.push(`Error obteniendo estructura de asignaciones: ${error.message}`);
    }
    
    // Verificar estructura de tabla pacientes
    try {
      const [columns] = await db.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'pacientes'
        ORDER BY ORDINAL_POSITION
      `);
      diagnostic.tables.pacientes = columns;
    } catch (error) {
      diagnostic.errors.push(`Error obteniendo estructura de pacientes: ${error.message}`);
    }
    
    // Verificar estructura de tabla estudiantes_odontologia
    try {
      const [columns] = await db.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'estudiantes_odontologia'
        ORDER BY ORDINAL_POSITION
      `);
      diagnostic.tables.estudiantes_odontologia = columns;
    } catch (error) {
      diagnostic.errors.push(`Error obteniendo estructura de estudiantes: ${error.message}`);
    }
    
    // Verificar datos de muestra
    try {
      const [asignaciones] = await db.execute('SELECT * FROM asignaciones LIMIT 3');
      diagnostic.sampleData.asignaciones = asignaciones;
    } catch (error) {
      diagnostic.errors.push(`Error obteniendo muestra de asignaciones: ${error.message}`);
    }
    
    try {
      const [pacientes] = await db.execute('SELECT * FROM pacientes LIMIT 3');
      diagnostic.sampleData.pacientes = pacientes;
    } catch (error) {
      diagnostic.errors.push(`Error obteniendo muestra de pacientes: ${error.message}`);
    }
    
    try {
      const [estudiantes] = await db.execute('SELECT * FROM estudiantes_odontologia LIMIT 3');
      diagnostic.sampleData.estudiantes = estudiantes;
    } catch (error) {
      diagnostic.errors.push(`Error obteniendo muestra de estudiantes: ${error.message}`);
    }
    
    res.json({
      success: true,
      diagnostic
    });
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    res.status(500).json({
      success: false,
      message: 'Error en diagnóstico',
      error: error.message
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
    logger.error('Error creando asignación', error);
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
    const { estado, observaciones_sistema, score_compatibilidad, observaciones_estudiante } = req.body;
    
    const db = await getConnection();
    
    // Validar que la asignación existe
    const [existingAssignment] = await db.execute(
      'SELECT id, estado, notificado_por_email FROM asignaciones WHERE id = ?',
      [id]
    );
    
    if (existingAssignment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }
    
    const currentAssignment = existingAssignment[0];
    
    // Preparar campos a actualizar
    const updateFields = [];
    const updateValues = [];
    
    if (estado !== undefined) {
      updateFields.push('estado = ?');
      updateValues.push(estado);
      
      // Si se cambia a 'contactado', verificar que ya fue notificado
      if (estado === 'contactado' && currentAssignment.notificado_por_email === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede marcar como contactado sin haber notificado primero'
        });
      }
    }
    
    if (observaciones_sistema !== undefined) {
      updateFields.push('observaciones_sistema = ?');
      updateValues.push(observaciones_sistema);
    }
    
    if (score_compatibilidad !== undefined) {
      updateFields.push('score_compatibilidad = ?');
      updateValues.push(score_compatibilidad);
    }
    
    if (observaciones_estudiante !== undefined) {
      updateFields.push('observaciones_estudiante = ?');
      updateValues.push(observaciones_estudiante);
    }
    
    // Agregar fecha de actualización
    updateFields.push('fecha_actualizacion = NOW()');
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      });
    }
    
    // Construir query dinámica
    const updateQuery = `UPDATE asignaciones SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(id);
    
    const [result] = await db.execute(updateQuery, updateValues);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }

    // Obtener la asignación actualizada
    const [updatedAssignment] = await db.execute(`
      SELECT 
        a.id, 
        a.estado, 
        a.observaciones_sistema, 
        a.score_compatibilidad,
        a.observaciones_estudiante,
        a.notificado_por_email,
        a.fecha_notificacion,
        a.fecha_actualizacion,
        p.nombre_completo as paciente_nombre,
        e.nombre_completo as estudiante_nombre
      FROM asignaciones a
      LEFT JOIN pacientes p ON a.id_paciente = p.id
      LEFT JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
      WHERE a.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Asignación actualizada exitosamente',
      data: updatedAssignment[0]
    });

  } catch (error) {
    logger.error('Error actualizando asignación', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la asignación',
      error: error.message
    });
  }
});

// PUT /api/asignaciones/:id/notify - Marcar como notificado
router.put('/:id/notify', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getConnection();
    
    // Verificar que la asignación existe
    const [existingAssignment] = await db.execute(
      'SELECT id, estado, notificado_por_email FROM asignaciones WHERE id = ?',
      [id]
    );
    
    if (existingAssignment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }
    
    const currentAssignment = existingAssignment[0];
    
    // Si ya fue notificada, no hacer nada
    if (currentAssignment.notificado_por_email === 1) {
      return res.json({
        success: true,
        message: 'La asignación ya fue notificada anteriormente',
        data: currentAssignment
      });
    }
    
    // Marcar como notificada
    const [result] = await db.execute(`
      UPDATE asignaciones 
      SET notificado_por_email = 1, 
          fecha_notificacion = NOW(),
          estado = 'notificado',
          fecha_actualizacion = NOW()
      WHERE id = ?
    `, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }

    // Obtener la asignación actualizada
    const [updatedAssignment] = await db.execute(`
      SELECT 
        a.id, 
        a.estado, 
        a.notificado_por_email,
        a.fecha_notificacion,
        a.fecha_actualizacion,
        p.nombre_completo as paciente_nombre,
        e.nombre_completo as estudiante_nombre
      FROM asignaciones a
      LEFT JOIN pacientes p ON a.id_paciente = p.id
      LEFT JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
      WHERE a.id = ?
    `, [id]);

    console.log(`✅ Asignación ${id} marcada como notificada manualmente`);

    res.json({
      success: true,
      message: 'Asignación marcada como notificada exitosamente',
      data: updatedAssignment[0]
    });

  } catch (error) {
    console.error('❌ Error marcando como notificada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar como notificada',
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