const googleSheetsService = require('../config/googleSheets');
const { getConnection } = require('../config/database');

class SyncService {
    async syncPacientes() {
    try {
        console.log('🔄 Iniciando sincronización con Google Sheets...');
        
        // Primero, obtener los headers para debugging
        await googleSheetsService.getHeaders();
        
        // Obtener pacientes de Google Sheets
        const pacientesSheets = await googleSheetsService.getPacientes();
        
        if (pacientesSheets.length === 0) {
            console.log('ℹ️ No se encontraron pacientes válidos en Google Sheets');
            return { 
                success: true, 
                processed: 0, 
                skipped: 0, 
                updated: 0, 
                created: 0,
                errors: 0,
                message: 'No hay pacientes para procesar' 
            };
        }

        console.log(`📥 ${pacientesSheets.length} pacientes válidos obtenidos de Google Sheets`);

        let created = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Procesar cada paciente
        for (const paciente of pacientesSheets) {
            try {
                const result = await this.processPaciente(paciente);
                
                switch (result.action) {
                    case 'created':
                        created++;
                        console.log(`✅ Nuevo paciente creado: ${paciente.nombre || paciente.nombre_completo}`);
                        break;
                    case 'updated':
                        updated++;
                        console.log(`🔄 Paciente actualizado: ${paciente.nombre || paciente.nombre_completo}`);
                        break;
                    case 'skipped':
                        skipped++;
                        // Log más silencioso para pacientes omitidos
                        break;
                    default:
                        console.log(`📝 Paciente procesado: ${paciente.nombre || paciente.nombre_completo}`);
                }
            } catch (error) {
                errors++;
                console.error(`❌ Error procesando paciente ${paciente.nombre || paciente.nombre_completo}:`, error.message);
            }
        }

        const totalProcessed = created + updated;
        let message;
        
        if (totalProcessed === 0 && skipped > 0) {
            message = `No hay pacientes nuevos. ${skipped} pacientes ya existían sin cambios`;
        } else if (created === 0 && updated > 0) {
            message = `${updated} pacientes actualizados, ${skipped} sin cambios`;
        } else if (created > 0 && updated === 0) {
            message = `${created} pacientes nuevos agregados, ${skipped} ya existían`;
        } else {
            message = `${created} nuevos, ${updated} actualizados, ${skipped} sin cambios`;
        }

        console.log(`🎉 Sincronización completada: ${message}${errors > 0 ? `, ${errors} errores` : ''}`);
        
        return {
            success: true,
            processed: totalProcessed,
            created,
            updated,
            skipped,
            errors,
            message
        };

    } catch (error) {
        console.error('❌ Error en sincronización:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

    async processPaciente(paciente) {
    const db = await getConnection();
    
    try {
        // Función helper para convertir undefined a null
        const safeValue = (value, defaultValue = null) => {
            if (value === undefined || value === '') {
                return defaultValue;
            }
            return value;
        };

        // Limpiar y validar todos los campos antes de la inserción
        const cleanPaciente = {
            nombre: safeValue(paciente.nombre || paciente.nombre_completo),
            edad: parseInt(paciente.edad) || 0,
            telefono: safeValue(paciente.telefono),
            email: safeValue(paciente.email),
            ciudad: safeValue(paciente.ciudad, 'Metropolitana'),
            sintomas_seleccionados: JSON.stringify(paciente.sintomas_seleccionados || []),
            diagnostico_previo: safeValue(paciente.tieneDiagnostico || paciente.diagnostico_previo),
            tiempo_problema: safeValue(paciente.tiempoProblema || paciente.tiempo_problema),
            nivel_dolor: parseInt(paciente.intensidadMolestia || paciente.nivel_dolor) || 0,
            dias_disponibles: safeValue(paciente.diasDisponibles || paciente.dias_disponibles),
            horario_preferencia: safeValue(paciente.horarioDisponible || paciente.horario_preferencia),
            disponibilidad_cita: safeValue(paciente.proximaCita || paciente.disponibilidad_cita),
            tipo_tratamiento_inferido: safeValue(paciente.tipo_tratamiento_inferido, 'Por determinar'),
            complejidad: safeValue(paciente.complejidad, 'Básico'),
            prioridad: safeValue(paciente.prioridad, 'Moderada')
        };

        // Verificar si el paciente ya existe (por email o teléfono)
        const [existing] = await db.execute(
            'SELECT id, email, telefono, nombre_completo, nivel_dolor, fecha_actualizacion FROM pacientes WHERE email = ? OR telefono = ?',
            [cleanPaciente.email, cleanPaciente.telefono]
        );

        if (existing.length > 0) {
            const existingPatient = existing[0];
            
            // Comparar datos para ver si hay cambios significativos
            const hasChanges = (
                existingPatient.nombre_completo !== cleanPaciente.nombre ||
                existingPatient.nivel_dolor !== cleanPaciente.nivel_dolor ||
                !existingPatient.fecha_actualizacion || 
                new Date() - new Date(existingPatient.fecha_actualizacion) > 24 * 60 * 60 * 1000 // 24 horas
            );

            if (!hasChanges) {
                console.log(`⏭️ Paciente sin cambios, omitido: ${cleanPaciente.nombre}`);
                return { action: 'skipped', reason: 'no_changes' };
            }

            // Actualizar paciente existente solo si hay cambios
            await db.execute(`
                UPDATE pacientes SET 
                    nombre_completo = ?, 
                    edad = ?, 
                    ciudad = ?, 
                    sintomas_seleccionados = ?,
                    diagnostico_previo = ?, 
                    tiempo_problema = ?,
                    nivel_dolor = ?, 
                    dias_disponibles = ?, 
                    horario_preferencia = ?,
                    disponibilidad_cita = ?, 
                    fecha_actualizacion = NOW()
                WHERE id = ?
            `, [
                cleanPaciente.nombre,
                cleanPaciente.edad,
                cleanPaciente.ciudad,
                cleanPaciente.sintomas_seleccionados,
                cleanPaciente.diagnostico_previo,
                cleanPaciente.tiempo_problema,
                cleanPaciente.nivel_dolor,
                cleanPaciente.dias_disponibles,
                cleanPaciente.horario_preferencia,
                cleanPaciente.disponibilidad_cita,
                existingPatient.id
            ]);
            
            console.log(`🔄 Paciente actualizado: ${cleanPaciente.nombre}`);
            return { action: 'updated', id: existingPatient.id };
        } else {
            // Insertar nuevo paciente
            const [result] = await db.execute(`
                INSERT INTO pacientes (
                    timestamp,
                    nombre_completo, 
                    edad, 
                    telefono, 
                    email, 
                    ciudad, 
                    sintomas_seleccionados,
                    diagnostico_previo, 
                    tiempo_problema, 
                    nivel_dolor,
                    dias_disponibles, 
                    horario_preferencia, 
                    disponibilidad_cita, 
                    tipo_tratamiento_inferido,
                    complejidad,
                    prioridad,
                    estado,
                    fecha_registro, 
                    fecha_actualizacion
                ) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                cleanPaciente.nombre,
                cleanPaciente.edad,
                cleanPaciente.telefono,
                cleanPaciente.email,
                cleanPaciente.ciudad,
                cleanPaciente.sintomas_seleccionados,
                cleanPaciente.diagnostico_previo,
                cleanPaciente.tiempo_problema,
                cleanPaciente.nivel_dolor,
                cleanPaciente.dias_disponibles,
                cleanPaciente.horario_preferencia,
                cleanPaciente.disponibilidad_cita,
                cleanPaciente.tipo_tratamiento_inferido,
                cleanPaciente.complejidad,
                cleanPaciente.prioridad,
                'pendiente'
            ]);
            
            console.log(`➕ Nuevo paciente agregado: ${cleanPaciente.nombre}`);
            return { action: 'created', id: result.insertId };
        }

    } catch (dbError) {
        console.error(`❌ Error de base de datos para ${paciente.nombre || paciente.nombre_completo}:`, dbError.message);
        throw dbError;
    }
}

    async getPacientesFromDB() {
        const db = await getConnection();
        
        try {
            const [rows] = await db.execute(`
                SELECT p.*, 
                       e.nombre_completo as estudiante_nombre,
                       e.email as estudiante_email,
                       e.telefono as estudiante_telefono,
                       e.codigo_estudiante,
                       e.año_carrera
                FROM pacientes p
                LEFT JOIN estudiantes_odontologia e ON p.estudiante_asignado = e.id
                WHERE p.activo = TRUE
                ORDER BY p.fecha_registro DESC
            `);
            
            return rows;
        } catch (error) {
            console.error('❌ Error obteniendo pacientes de DB:', error.message);
            throw error;
        }
    }

    async getEstudiantesFromDB() {
        const db = await getConnection();
        
        try {
            const [rows] = await db.execute(`
                SELECT e.*,
                       COUNT(p.id) as pacientes_asignados
                FROM estudiantes_odontologia e
                LEFT JOIN pacientes p ON e.id = p.estudiante_asignado AND p.estado = 'asignado'
                WHERE e.estado = 'activo'
                GROUP BY e.id
                ORDER BY e.nombre_completo
            `);
            
            return rows;
        } catch (error) {
            console.error('❌ Error obteniendo estudiantes de DB:', error.message);
            throw error;
        }
    }

    async asignarPacienteAEstudiante(pacienteId, estudianteId) {
        const db = await getConnection();
        
        try {
            // Verificar que el paciente existe y está pendiente
            const [paciente] = await db.execute(
                'SELECT id, nombre_completo, estado FROM pacientes WHERE id = ? AND activo = TRUE',
                [pacienteId]
            );

            if (paciente.length === 0) {
                throw new Error('Paciente no encontrado');
            }

            if (paciente[0].estado !== 'pendiente') {
                throw new Error('El paciente ya ha sido asignado');
            }

            // Verificar que el estudiante existe y está activo
            const [estudiante] = await db.execute(
                'SELECT id, nombre_completo FROM estudiantes_odontologia WHERE id = ? AND estado = "activo"',
                [estudianteId]
            );

            if (estudiante.length === 0) {
                throw new Error('Estudiante no encontrado o no activo');
            }

            // Realizar la asignación
            await db.execute(`
                UPDATE pacientes 
                SET estudiante_asignado = ?, estado = 'asignado', fecha_asignacion = NOW()
                WHERE id = ?
            `, [estudianteId, pacienteId]);

            console.log(`✅ Paciente ${paciente[0].nombre_completo} asignado a ${estudiante[0].nombre_completo}`);

            return {
                success: true,
                message: `Paciente asignado exitosamente a ${estudiante[0].nombre_completo}`
            };

        } catch (error) {
            console.error('❌ Error en asignación:', error.message);
            throw error;
        }
    }

    async desasignarPaciente(pacienteId) {
        const db = await getConnection();
        
        try {
            // Verificar que el paciente existe y está asignado
            const [paciente] = await db.execute(
                'SELECT id, nombre_completo, estado FROM pacientes WHERE id = ? AND activo = TRUE',
                [pacienteId]
            );

            if (paciente.length === 0) {
                throw new Error('Paciente no encontrado');
            }

            if (paciente[0].estado !== 'asignado') {
                throw new Error('El paciente no está asignado');
            }

            // Desasignar el paciente
            await db.execute(`
                UPDATE pacientes 
                SET estudiante_asignado = NULL, estado = 'pendiente', fecha_asignacion = NULL
                WHERE id = ?
            `, [pacienteId]);

            console.log(`✅ Paciente ${paciente[0].nombre_completo} desasignado`);

            return {
                success: true,
                message: 'Paciente desasignado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error en desasignación:', error.message);
            throw error;
        }
    }

    // Método para testing y debugging
    async testConnection() {
        try {
            console.log('🧪 Iniciando test de conexión...');
            console.log('🧪 Probando conexión con Google Sheets...');
            
            // Probar inicialización
            await googleSheetsService.initialize();
            
            // Obtener headers
            const headers = await googleSheetsService.getHeaders();
            console.log('📋 Headers disponibles:', headers);
            
            // Probar lectura de datos
            const pacientes = await googleSheetsService.getPacientes();
            console.log(`📥 ${pacientes.length} pacientes encontrados`);
            
            if (pacientes.length > 0) {
                console.log('👤 Ejemplo del primer paciente:');
                console.log(JSON.stringify(pacientes[0], null, 2));
            }
            
            // Probar conexión a base de datos
            const dbPacientes = await this.getPacientesFromDB();
            const dbEstudiantes = await this.getEstudiantesFromDB();
            
            return {
                success: true,
                googleSheets: {
                    headers,
                    pacientesCount: pacientes.length,
                    sample: pacientes[0] || null
                },
                database: {
                    pacientesCount: dbPacientes.length,
                    estudiantesCount: dbEstudiantes.length
                }
            };
            
        } catch (error) {
            console.error('❌ Error en test:', error.message);
            return {
                success: false,
                error: error.message,
                stack: error.stack
            };
        }
    }

    // Método para obtener estadísticas del sistema
    async getStats() {
        const db = await getConnection();
        
        try {
            // Estadísticas de pacientes
            const [pacientesStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
                    SUM(CASE WHEN estado = 'asignado' THEN 1 ELSE 0 END) as asignados,
                    SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completados,
                    SUM(CASE WHEN DATE(fecha_registro) = CURDATE() THEN 1 ELSE 0 END) as hoy
                FROM pacientes
                WHERE activo = TRUE
            `);

            // Estadísticas de estudiantes
            const [estudiantesStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
                    SUM(casos_activos) as total_casos_activos,
                    SUM(casos_completados) as total_casos_completados
                FROM estudiantes_odontologia
            `);

            // Top estudiantes con más pacientes
            const [topEstudiantes] = await db.execute(`
                SELECT 
                    e.nombre_completo,
                    e.email,
                    e.codigo_estudiante,
                    e.año_carrera,
                    COUNT(p.id) as pacientes_asignados,
                    e.casos_completados
                FROM estudiantes_odontologia e
                LEFT JOIN pacientes p ON e.id = p.estudiante_asignado AND p.estado = 'asignado'
                WHERE e.estado = 'activo'
                GROUP BY e.id, e.nombre_completo, e.email, e.codigo_estudiante, e.año_carrera, e.casos_completados
                ORDER BY pacientes_asignados DESC
                LIMIT 5
            `);

            return {
                pacientes: pacientesStats[0],
                estudiantes: estudiantesStats[0],
                topEstudiantes,
                ultimaActualizacion: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error.message);
            throw error;
        }
    }

    // Método para limpiar datos duplicados o inválidos
    async cleanupData() {
        const db = await getConnection();
        
        try {
            console.log('🧹 Iniciando limpieza de datos...');

            // Eliminar pacientes sin nombre o contacto
            const [deleted] = await db.execute(`
                DELETE FROM pacientes 
                WHERE nombre_completo IS NULL OR nombre_completo = '' 
                OR ((telefono IS NULL OR telefono = '') AND (email IS NULL OR email = ''))
            `);

            console.log(`🗑️ ${deleted.affectedRows} pacientes inválidos eliminados`);

            // Actualizar estados inconsistentes
            const [updated] = await db.execute(`
                UPDATE pacientes 
                SET estado = 'pendiente', estudiante_asignado = NULL, fecha_asignacion = NULL
                WHERE estudiante_asignado IS NOT NULL 
                AND estudiante_asignado NOT IN (SELECT id FROM estudiantes_odontologia)
            `);

            console.log(`🔄 ${updated.affectedRows} asignaciones inconsistentes corregidas`);

            // Marcar como inactivos pacientes muy antiguos sin asignar
            const [inactivos] = await db.execute(`
                UPDATE pacientes 
                SET activo = FALSE
                WHERE estado = 'pendiente' 
                AND fecha_registro < DATE_SUB(NOW(), INTERVAL 90 DAY)
            `);

            console.log(`📅 ${inactivos.affectedRows} pacientes antiguos marcados como inactivos`);

            return {
                success: true,
                deleted: deleted.affectedRows,
                updated: updated.affectedRows,
                inactivos: inactivos.affectedRows,
                message: 'Limpieza completada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error en limpieza:', error.message);
            throw error;
        }
    }

    // Nuevo método para obtener pacientes pendientes con prioridad
    async getPacientesPendientes() {
        const db = await getConnection();
        
        try {
            const [rows] = await db.execute(`
                SELECT 
                    id,
                    nombre_completo,
                    telefono,
                    email,
                    edad,
                    ciudad,
                    tipo_tratamiento_inferido,
                    complejidad,
                    prioridad,
                    nivel_dolor,
                    fecha_registro,
                    dias_disponibles,
                    horario_preferencia
                FROM pacientes
                WHERE estado = 'pendiente' AND activo = TRUE
                ORDER BY 
                    FIELD(prioridad, 'Muy Alta', 'Alta', 'Moderada', 'Baja'),
                    nivel_dolor DESC,
                    fecha_registro ASC
            `);
            
            return rows;
        } catch (error) {
            console.error('❌ Error obteniendo pacientes pendientes:', error.message);
            throw error;
        }
    }

    // Nuevo método para obtener estudiantes disponibles
    async getEstudiantesDisponibles() {
        const db = await getConnection();
        
        try {
            const [rows] = await db.execute(`
                SELECT 
                    id,
                    codigo_estudiante,
                    nombre_completo,
                    telefono,
                    email,
                    año_carrera,
                    especialidades,
                    casos_activos,
                    casos_necesarios,
                    casos_completados,
                    dias_disponibles,
                    horarios_disponibles
                FROM estudiantes_odontologia
                WHERE estado = 'activo' 
                AND casos_activos < casos_necesarios
                ORDER BY casos_activos ASC, casos_completados ASC
            `);
            
            return rows;
        } catch (error) {
            console.error('❌ Error obteniendo estudiantes disponibles:', error.message);
            throw error;
        }
    }
}


module.exports = new SyncService();

// Exportar también la clase para testing
module.exports.SyncService = SyncService;