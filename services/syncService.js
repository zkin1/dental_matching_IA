const googleSheetsService = require('../config/googleSheets');
const { getConnection } = require('../config/database');

class SyncService {
    constructor() {
        // Mapeo mejorado de síntomas a tratamientos (igual que en matchingService)
        this.sintomasATratamientos = {
            // Endodoncia - dolor intenso, conducto
            'dolor constante': { tratamiento: 'Endodoncia', complejidad: 'Avanzado', prioridad: 'Muy Alta' },
            'me duele una muela': { tratamiento: 'Endodoncia', complejidad: 'Intermedio', prioridad: 'Alta' },
            'dolor insoportable': { tratamiento: 'Endodoncia', complejidad: 'Avanzado', prioridad: 'Muy Alta' },
            'tratamiento de conducto': { tratamiento: 'Endodoncia', complejidad: 'Avanzado', prioridad: 'Alta' },
            'dolor al masticar': { tratamiento: 'Endodoncia', complejidad: 'Intermedio', prioridad: 'Alta' },
            'sensibilidad al frío': { tratamiento: 'Endodoncia', complejidad: 'Intermedio', prioridad: 'Moderada' },
            'sensibilidad al calor': { tratamiento: 'Endodoncia', complejidad: 'Avanzado', prioridad: 'Alta' },
            'inflamación': { tratamiento: 'Endodoncia', complejidad: 'Intermedio', prioridad: 'Alta' },

            // Destartraje y Pulido Coronario - limpieza
            'limpieza dental': { tratamiento: 'Destartraje y Pulido Coronario', complejidad: 'Básico', prioridad: 'Baja' },
            'limpieza profunda': { tratamiento: 'Destartraje y Pulido Coronario', complejidad: 'Básico', prioridad: 'Moderada' },
            'chequeo general': { tratamiento: 'Destartraje y Pulido Coronario', complejidad: 'Básico', prioridad: 'Baja' },
            'sarro': { tratamiento: 'Destartraje y Pulido Coronario', complejidad: 'Básico', prioridad: 'Moderada' },
            'placa': { tratamiento: 'Destartraje y Pulido Coronario', complejidad: 'Básico', prioridad: 'Moderada' },
            'dientes amarillos': { tratamiento: 'Destartraje y Pulido Coronario', complejidad: 'Básico', prioridad: 'Baja' },

            // Pulido Radicular - problemas de encías
            'sangran las encías': { tratamiento: 'Pulido Radicular', complejidad: 'Intermedio', prioridad: 'Alta' },
            'problemas en las encías': { tratamiento: 'Pulido Radicular', complejidad: 'Intermedio', prioridad: 'Moderada' },
            'encías inflamadas': { tratamiento: 'Pulido Radicular', complejidad: 'Intermedio', prioridad: 'Alta' },
            'gingivitis': { tratamiento: 'Pulido Radicular', complejidad: 'Intermedio', prioridad: 'Alta' },
            'encías rojas': { tratamiento: 'Pulido Radicular', complejidad: 'Intermedio', prioridad: 'Moderada' },
            'encías sensibles': { tratamiento: 'Pulido Radicular', complejidad: 'Intermedio', prioridad: 'Moderada' },
            'mal aliento': { tratamiento: 'Pulido Radicular', complejidad: 'Básico', prioridad: 'Moderada' },

            // Exodoncia Simple - extracciones
            'sacar una muela': { tratamiento: 'Exodoncia Simple', complejidad: 'Intermedio', prioridad: 'Moderada' },
            'extraer una muela': { tratamiento: 'Exodoncia Simple', complejidad: 'Intermedio', prioridad: 'Moderada' },
            'muelas del juicio': { tratamiento: 'Exodoncia Simple', complejidad: 'Avanzado', prioridad: 'Alta' },
            'se me mueve': { tratamiento: 'Exodoncia Simple', complejidad: 'Intermedio', prioridad: 'Alta' },
            'diente flojo': { tratamiento: 'Exodoncia Simple', complejidad: 'Intermedio', prioridad: 'Alta' },
            'muela rota que no se puede arreglar': { tratamiento: 'Exodoncia Simple', complejidad: 'Intermedio', prioridad: 'Moderada' },

            // Resina Simple - empastes, caries básicas
            'hoyo': { tratamiento: 'Resina Simple', complejidad: 'Básico', prioridad: 'Moderada' },
            'caries': { tratamiento: 'Resina Simple', complejidad: 'Básico', prioridad: 'Moderada' },
            'empaste': { tratamiento: 'Resina Simple', complejidad: 'Básico', prioridad: 'Moderada' },
            'tapadura': { tratamiento: 'Resina Simple', complejidad: 'Básico', prioridad: 'Moderada' },
            'empastes': { tratamiento: 'Resina Simple', complejidad: 'Básico', prioridad: 'Moderada' },
            'mancha negra': { tratamiento: 'Resina Simple', complejidad: 'Básico', prioridad: 'Moderada' },
            'picadura': { tratamiento: 'Resina Simple', complejidad: 'Básico', prioridad: 'Moderada' },

            // Resina Compuesta - casos más complejos
            'muela rota': { tratamiento: 'Resina Compuesta', complejidad: 'Intermedio', prioridad: 'Alta' },
            'se me cayó': { tratamiento: 'Resina Compuesta', complejidad: 'Intermedio', prioridad: 'Alta' },
            'diente partido': { tratamiento: 'Resina Compuesta', complejidad: 'Intermedio', prioridad: 'Alta' },
            'fractura': { tratamiento: 'Resina Compuesta', complejidad: 'Avanzado', prioridad: 'Alta' },

            // Corona - casos estéticos/funcionales severos
            'diente negro': { tratamiento: 'Corona', complejidad: 'Avanzado', prioridad: 'Moderada' },
            'muy manchado': { tratamiento: 'Corona', complejidad: 'Avanzado', prioridad: 'Baja' },
            'corona': { tratamiento: 'Corona', complejidad: 'Avanzado', prioridad: 'Moderada' },
            'diente desgastado': { tratamiento: 'Corona', complejidad: 'Avanzado', prioridad: 'Moderada' },
            'estética': { tratamiento: 'Corona', complejidad: 'Avanzado', prioridad: 'Baja' },

            // Incrustación - restauraciones mayores
            'rota grande': { tratamiento: 'Incrustación', complejidad: 'Avanzado', prioridad: 'Alta' },
            'restauración grande': { tratamiento: 'Incrustación', complejidad: 'Avanzado', prioridad: 'Moderada' },

            // Prótesis - dientes faltantes
            'falta un diente': { tratamiento: 'Protesis Parcial Removible', complejidad: 'Avanzado', prioridad: 'Moderada' },
            'faltan dientes': { tratamiento: 'Protesis Total Removible', complejidad: 'Avanzado', prioridad: 'Moderada' },
            'prótesis': { tratamiento: 'Protesis Parcial Removible', complejidad: 'Avanzado', prioridad: 'Moderada' },
            'dentadura': { tratamiento: 'Protesis Total Removible', complejidad: 'Avanzado', prioridad: 'Moderada' },
            'sin dientes': { tratamiento: 'Protesis Total Removible', complejidad: 'Avanzado', prioridad: 'Alta' }
        };
    }

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
                disponibilidad_cita: safeValue(paciente.proximaCita || paciente.disponibilidad_cita)
            };

            // MEJORADO: Inferir tratamiento, complejidad y prioridad basado en síntomas
            const inferencia = this.inferirTratamientoMejorado(
                paciente.sintomas_seleccionados || [],
                cleanPaciente.diagnostico_previo,
                cleanPaciente.nivel_dolor,
                cleanPaciente.tiempo_problema
            );

            cleanPaciente.tipo_tratamiento_inferido = inferencia.tratamiento;
            cleanPaciente.complejidad = inferencia.complejidad;
            cleanPaciente.prioridad = inferencia.prioridad;

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
                        tipo_tratamiento_inferido = ?,
                        complejidad = ?,
                        prioridad = ?, 
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
                    cleanPaciente.tipo_tratamiento_inferido,
                    cleanPaciente.complejidad,
                    cleanPaciente.prioridad,
                    existingPatient.id
                ]);
                
                console.log(`🔄 Paciente actualizado: ${cleanPaciente.nombre} (${inferencia.tratamiento})`);
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
                
                console.log(`➕ Nuevo paciente agregado: ${cleanPaciente.nombre} (${inferencia.tratamiento} - ${inferencia.prioridad})`);
                return { action: 'created', id: result.insertId };
            }

        } catch (dbError) {
            console.error(`❌ Error de base de datos para ${paciente.nombre || paciente.nombre_completo}:`, dbError.message);
            throw dbError;
        }
    }

    // NUEVO MÉTODO MEJORADO: Inferir tratamiento basado en síntomas reales
    inferirTratamientoMejorado(sintomas, diagnostico, nivelDolor, tiempoProblema) {
        try {
            // Convertir sintomas a array si es necesario
            let sintomasArray = [];
            if (Array.isArray(sintomas)) {
                sintomasArray = sintomas;
            } else if (typeof sintomas === 'string') {
                try {
                    sintomasArray = JSON.parse(sintomas);
                } catch {
                    sintomasArray = sintomas.split(';').map(s => s.trim()).filter(s => s);
                }
            }

            const diagnosticoLower = (diagnostico || '').toLowerCase();
            const contadorTratamientos = {};
            const contadorComplejidad = {};
            const contadorPrioridad = {};

            // Analizar cada síntoma
            for (const sintoma of sintomasArray) {
                const sintomaLower = sintoma.toLowerCase().trim();
                
                // Buscar coincidencias exactas
                if (this.sintomasATratamientos[sintomaLower]) {
                    const match = this.sintomasATratamientos[sintomaLower];
                    contadorTratamientos[match.tratamiento] = (contadorTratamientos[match.tratamiento] || 0) + 2;
                    contadorComplejidad[match.complejidad] = (contadorComplejidad[match.complejidad] || 0) + 2;
                    contadorPrioridad[match.prioridad] = (contadorPrioridad[match.prioridad] || 0) + 2;
                    continue;
                }

                // Buscar coincidencias parciales
                let matchFound = false;
                for (const [patron, datos] of Object.entries(this.sintomasATratamientos)) {
                    if (sintomaLower.includes(patron) || patron.includes(sintomaLower)) {
                        contadorTratamientos[datos.tratamiento] = (contadorTratamientos[datos.tratamiento] || 0) + 1;
                        contadorComplejidad[datos.complejidad] = (contadorComplejidad[datos.complejidad] || 0) + 1;
                        contadorPrioridad[datos.prioridad] = (contadorPrioridad[datos.prioridad] || 0) + 1;
                        matchFound = true;
                        break;
                    }
                }

                // Si no hay match, analizar por palabras clave generales
                if (!matchFound) {
                    if (sintomaLower.includes('dolor') || sintomaLower.includes('duele')) {
                        contadorTratamientos['Endodoncia'] = (contadorTratamientos['Endodoncia'] || 0) + 1;
                        contadorPrioridad['Alta'] = (contadorPrioridad['Alta'] || 0) + 1;
                    } else if (sintomaLower.includes('limpieza') || sintomaLower.includes('chequeo')) {
                        contadorTratamientos['Destartraje y Pulido Coronario'] = (contadorTratamientos['Destartraje y Pulido Coronario'] || 0) + 1;
                        contadorPrioridad['Baja'] = (contadorPrioridad['Baja'] || 0) + 1;
                    } else if (sintomaLower.includes('encía') || sintomaLower.includes('sangra')) {
                        contadorTratamientos['Pulido Radicular'] = (contadorTratamientos['Pulido Radicular'] || 0) + 1;
                        contadorPrioridad['Moderada'] = (contadorPrioridad['Moderada'] || 0) + 1;
                    }
                }
            }

            // Analizar diagnóstico previo
            if (diagnosticoLower.includes('no he ido al dentista') || diagnosticoLower.includes('nunca')) {
                contadorTratamientos['Destartraje y Pulido Coronario'] = (contadorTratamientos['Destartraje y Pulido Coronario'] || 0) + 1;
                contadorPrioridad['Moderada'] = (contadorPrioridad['Moderada'] || 0) + 1;
            }

            // Determinar tratamiento más votado
            let tratamiento = 'Destartraje y Pulido Coronario'; // Default
            let maxVotos = 0;
            for (const [trat, votos] of Object.entries(contadorTratamientos)) {
                if (votos > maxVotos) {
                    maxVotos = votos;
                    tratamiento = trat;
                }
            }

            // Determinar complejidad más votada
            let complejidad = 'Básico'; // Default
            maxVotos = 0;
            for (const [comp, votos] of Object.entries(contadorComplejidad)) {
                if (votos > maxVotos) {
                    maxVotos = votos;
                    complejidad = comp;
                }
            }

            // Determinar prioridad más votada, ajustada por nivel de dolor
            let prioridad = 'Moderada'; // Default
            maxVotos = 0;
            for (const [prio, votos] of Object.entries(contadorPrioridad)) {
                if (votos > maxVotos) {
                    maxVotos = votos;
                    prioridad = prio;
                }
            }

            // Ajustar prioridad por nivel de dolor
            if (nivelDolor >= 8) {
                prioridad = 'Muy Alta';
            } else if (nivelDolor >= 6 && prioridad !== 'Muy Alta') {
                prioridad = 'Alta';
            } else if (nivelDolor >= 3 && prioridad === 'Baja') {
                prioridad = 'Moderada';
            }

            // Ajustar complejidad por tiempo del problema
            if (tiempoProblema && tiempoProblema.toLowerCase().includes('años') && complejidad === 'Básico') {
                complejidad = 'Intermedio';
            }

            console.log(`🔍 Inferencia para síntomas [${sintomasArray.join(', ')}]: ${tratamiento} (${complejidad}, ${prioridad})`);

            return {
                tratamiento,
                complejidad,
                prioridad
            };

        } catch (error) {
            console.error('Error en inferencia de tratamiento:', error);
            return {
                tratamiento: 'Destartraje y Pulido Coronario',
                complejidad: 'Básico',
                prioridad: 'Moderada'
            };
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
                
                // Probar inferencia de tratamiento
                const inferencia = this.inferirTratamientoMejorado(
                    pacientes[0].sintomas_seleccionados || [],
                    pacientes[0].diagnostico_previo,
                    pacientes[0].nivel_dolor || 0,
                    pacientes[0].tiempo_problema
                );
                console.log('🔍 Inferencia de tratamiento:', inferencia);
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

            // Estadísticas por tratamiento
            const [tratamientosStats] = await db.execute(`
                SELECT 
                    tipo_tratamiento_inferido as tratamiento,
                    COUNT(*) as cantidad,
                    AVG(nivel_dolor) as dolor_promedio
                FROM pacientes
                WHERE activo = TRUE AND tipo_tratamiento_inferido IS NOT NULL
                GROUP BY tipo_tratamiento_inferido
                ORDER BY cantidad DESC
                LIMIT 10
            `);

            // Top estudiantes con más pacientes
            const [topEstudiantes] = await db.execute(`
                SELECT 
                    e.nombre_completo,
                    e.email,
                    e.codigo_estudiante,
                    e.año_carrera,
                    e.especialidades,
                    COUNT(p.id) as pacientes_asignados,
                    e.casos_completados
                FROM estudiantes_odontologia e
                LEFT JOIN pacientes p ON e.id = p.estudiante_asignado AND p.estado = 'asignado'
                WHERE e.estado = 'activo'
                GROUP BY e.id, e.nombre_completo, e.email, e.codigo_estudiante, e.año_carrera, e.casos_completados, e.especialidades
                ORDER BY pacientes_asignados DESC
                LIMIT 5
            `);

            return {
                pacientes: pacientesStats[0],
                estudiantes: estudiantesStats[0],
                tratamientos: tratamientosStats,
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
                UPDATE pacientes p
                LEFT JOIN asignaciones a ON p.id = a.id_paciente AND a.estado IN ('asignado', 'en_tratamiento')
                SET p.estado = 'pendiente'
                WHERE p.estado = 'asignado' AND a.id IS NULL
            `);

            console.log(`🔄 ${updated.affectedRows} estados inconsistentes corregidos`);

            // Marcar como inactivos pacientes muy antiguos sin asignar
            const [inactivos] = await db.execute(`
                UPDATE pacientes 
                SET activo = FALSE
                WHERE estado = 'pendiente' 
                AND fecha_registro < DATE_SUB(NOW(), INTERVAL 90 DAY)
            `);

            console.log(`📅 ${inactivos.affectedRows} pacientes antiguos marcados como inactivos`);

            // Recalcular tratamientos para pacientes sin tratamiento inferido
            const [sinTratamiento] = await db.execute(`
                SELECT id, sintomas_seleccionados, diagnostico_previo, nivel_dolor, tiempo_problema
                FROM pacientes
                WHERE (tipo_tratamiento_inferido IS NULL OR tipo_tratamiento_inferido = '')
                AND activo = TRUE
                LIMIT 50
            `);

            let recalculados = 0;
            for (const paciente of sinTratamiento) {
                const inferencia = this.inferirTratamientoMejorado(
                    paciente.sintomas_seleccionados,
                    paciente.diagnostico_previo,
                    paciente.nivel_dolor,
                    paciente.tiempo_problema
                );

                await db.execute(`
                    UPDATE pacientes 
                    SET tipo_tratamiento_inferido = ?, complejidad = ?, prioridad = ?
                    WHERE id = ?
                `, [inferencia.tratamiento, inferencia.complejidad, inferencia.prioridad, paciente.id]);
                
                recalculados++;
            }

            console.log(`🔄 ${recalculados} tratamientos recalculados`);

            return {
                success: true,
                deleted: deleted.affectedRows,
                updated: updated.affectedRows,
                inactivos: inactivos.affectedRows,
                recalculados,
                message: 'Limpieza completada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error en limpieza:', error.message);
            throw error;
        }
    }

    // Nuevos métodos para obtener pacientes pendientes con prioridad
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
                    horario_preferencia,
                    sintomas_seleccionados
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

    // Método para obtener estudiantes disponibles
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