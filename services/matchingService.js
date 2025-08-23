const { getConnection } = require('../config/database');

class MatchingService {
    constructor() {
        this.matchingRules = {
            especialidad: 0.4,
            experiencia: 0.2,
            prioridad: 0.2,
            disponibilidad: 0.1,
            cargaTrabajo: 0.1
        };

        this.sintomasAEspecialidades = {
            'dolor constante': ['Endodoncia'],
            'me duele una muela': ['Endodoncia'],
            'dolor insoportable': ['Endodoncia'],
            'tratamiento de conducto': ['Endodoncia'],
            'dolor al masticar': ['Endodoncia'],
            'sensibilidad al frío': ['Endodoncia'],
            'sensibilidad al calor': ['Endodoncia'],
            'inflamación': ['Endodoncia'],
            'limpieza dental': ['Destartraje y Pulido Coronario'],
            'limpieza profunda': ['Destartraje y Pulido Coronario'],
            'chequeo general': ['Destartraje y Pulido Coronario'],
            'sarro': ['Destartraje y Pulido Coronario'],
            'placa': ['Destartraje y Pulido Coronario'],
            'dientes amarillos': ['Destartraje y Pulido Coronario'],
            'mal aliento': ['Destartraje y Pulido Coronario', 'Pulido Radicular'],
            'sangran las encías': ['Pulido Radicular'],
            'problemas en las encías': ['Pulido Radicular'],
            'encías inflamadas': ['Pulido Radicular'],
            'gingivitis': ['Pulido Radicular'],
            'encías rojas': ['Pulido Radicular'],
            'encías sensibles': ['Pulido Radicular'],
            'sacar una muela': ['Exodoncia Simple'],
            'extraer una muela': ['Exodoncia Simple'],
            'muelas del juicio': ['Exodoncia Simple'],
            'se me mueve': ['Exodoncia Simple'],
            'diente flojo': ['Exodoncia Simple'],
            'muela rota que no se puede arreglar': ['Exodoncia Simple'],
            'hoyo': ['Resina Simple'],
            'caries': ['Resina Simple', 'Resina Compuesta'],
            'empaste': ['Resina Simple'],
            'tapadura': ['Resina Simple'],
            'empastes': ['Resina Simple'],
            'mancha negra': ['Resina Simple', 'Resina Compuesta'],
            'picadura': ['Resina Simple'],
            'muela rota': ['Resina Compuesta', 'Corona'],
            'se me cayó': ['Resina Compuesta'],
            'diente partido': ['Resina Compuesta', 'Corona'],
            'fractura': ['Resina Compuesta', 'Corona'],
            'diente negro': ['Corona'],
            'muy manchado': ['Corona'],
            'corona': ['Corona'],
            'diente desgastado': ['Corona'],
            'estética': ['Corona'],
            'rota grande': ['Incrustación'],
            'restauración grande': ['Incrustación'],
            'falta un diente': ['Protesis Parcial Removible'],
            'faltan dientes': ['Protesis Total Removible', 'Protesis Parcial Removible'],
            'prótesis': ['Protesis Parcial Removible', 'Protesis Total Removible'],
            'dentadura': ['Protesis Total Removible'],
            'sin dientes': ['Protesis Total Removible']
        };

        this.complejidadPorAno = {
            'Destartraje y Pulido Coronario': { '4to': 1.0, '5to': 1.0 },
            'Pulido Radicular': { '4to': 0.8, '5to': 1.0 },
            'Resina Simple': { '4to': 1.0, '5to': 1.0 },
            'Resina Compuesta': { '4to': 0.7, '5to': 1.0 },
            'Exodoncia Simple': { '4to': 0.6, '5to': 0.9 },
            'Endodoncia': { '4to': 0.3, '5to': 0.8 },
            'Corona': { '4to': 0.2, '5to': 0.7 },
            'Incrustación': { '4to': 0.1, '5to': 0.6 },
            'Protesis Parcial Removible': { '4to': 0.1, '5to': 0.5 },
            'Protesis Total Removible': { '4to': 0.05, '5to': 0.4 }
        };

        // Semáforo para prevenir race conditions
        this.isMatching = false;
    }

    // ===== MÉTODO PRINCIPAL CORREGIDO =====
    async executeAutoMatching() {
        // Prevenir race conditions
        if (this.isMatching) {
            console.log('⚠️ Matching ya en progreso, saltando ejecución');
            return {
                success: true,
                processed: 0,
                matched: 0,
                message: 'Matching ya en progreso'
            };
        }

        this.isMatching = true;
        const startTime = Date.now();
        console.log('🔄 Iniciando matching automático mejorado...');
        
        let connection = null;
        
        try {
            // Usar una sola conexión con transacciones
            const db = await getConnection();
            connection = await db.getConnection();
            await connection.beginTransaction();

            const [pacientesPendientes, estudiantesDisponibles] = await Promise.all([
                this.getPacientesPendientes(connection),
                this.getEstudiantesDisponibles(connection)
            ]);
            
            if (pacientesPendientes.length === 0) {
                console.log('ℹ️ No hay pacientes pendientes para asignar');
                await connection.commit();
                return {
                    success: true,
                    processed: 0,
                    matched: 0,
                    message: 'No hay pacientes pendientes'
                };
            }
            
            if (estudiantesDisponibles.length === 0) {
                console.log('⚠️ No hay estudiantes disponibles');
                await connection.commit();
                return {
                    success: true,
                    processed: pacientesPendientes.length,
                    matched: 0,
                    message: 'No hay estudiantes disponibles'
                };
            }

            let matched = 0;
            let processed = 0;
            const matchResults = [];
            const estudiantesMap = new Map(estudiantesDisponibles.map(e => [e.id, e]));

            // Ordenar pacientes por prioridad
            const pacientesOrdenados = this.sortPatientsByPriority(pacientesPendientes);
            
            for (const paciente of pacientesOrdenados) {
                processed++;
                
                // Encontrar el mejor estudiante disponible
                const mejorEstudiante = this.findBestMatchFromMap(paciente, estudiantesMap);
                
                if (mejorEstudiante) {
                    const matchResult = await this.createMatchWithConnection(connection, paciente, mejorEstudiante);
                    
                    if (matchResult.success) {
                        matched++;
                        matchResults.push({
                            pacienteId: paciente.id,
                            pacienteNombre: paciente.nombre_completo,
                            estudianteId: mejorEstudiante.id,
                            estudianteNombre: mejorEstudiante.nombre_completo,
                            score: matchResult.score,
                            tratamiento: paciente.tipo_tratamiento_inferido,
                            especialidadMatch: matchResult.especialidadMatch
                        });
                        
                        // Actualizar disponibilidad en el Map
                        mejorEstudiante.casos_activos = (mejorEstudiante.casos_activos || 0) + 1;
                        if (mejorEstudiante.casos_activos >= mejorEstudiante.casos_necesarios) {
                            estudiantesMap.delete(mejorEstudiante.id);
                        }
                        
                        console.log(`✅ Match: ${paciente.nombre_completo} ↔ ${mejorEstudiante.nombre_completo}`);
                        console.log(`   Tratamiento: ${paciente.tipo_tratamiento_inferido}, Score: ${matchResult.score.toFixed(2)}`);
                    }
                } else {
                    console.log(`⚠️ No se encontró match adecuado para: ${paciente.nombre_completo} (${paciente.tipo_tratamiento_inferido})`);
                }

                // Si no quedan estudiantes disponibles, terminar
                if (estudiantesMap.size === 0) {
                    console.log('📝 No quedan estudiantes disponibles');
                    break;
                }
            }
            
            await connection.commit();
            
            const duration = Date.now() - startTime;
            const message = `Matching completado: ${matched}/${processed} pacientes asignados`;
            
            console.log(`🎉 ${message} en ${duration}ms`);
            
            return {
                success: true,
                processed,
                matched,
                duration,
                message,
                matches: matchResults
            };
            
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                    console.log('🔄 Rollback ejecutado correctamente');
                } catch (rollbackError) {
                    console.error('❌ Error en rollback:', rollbackError.message);
                }
            }
            console.error('❌ Error en matching automático:', error);
            return {
                success: false,
                error: error.message,
                processed: 0,
                matched: 0
            };
        } finally {
            if (connection) {
                connection.release();
            }
            this.isMatching = false;
        }
    }

    // ===== MÉTODOS DE BASE DE DATOS CORREGIDOS =====
    async getPacientesPendientes(connection = null) {
        const executor = connection || await getConnection();
        
        try {
            const [rows] = await executor.execute(`
                SELECT 
                    id, nombre_completo, edad, telefono, email, ciudad,
                    tipo_tratamiento_inferido, complejidad, prioridad,
                    nivel_dolor, fecha_registro, dias_disponibles,
                    horario_preferencia, disponibilidad_cita, sintomas_seleccionados
                FROM pacientes
                WHERE estado = 'pendiente' AND activo = TRUE
                ORDER BY 
                    FIELD(prioridad, 'Muy Alta', 'Alta', 'Moderada', 'Baja'),
                    nivel_dolor DESC,
                    fecha_registro ASC
                LIMIT 100
            `);
            
            return rows.map(row => this.sanitizePacienteData(row));
        } catch (error) {
            console.error('❌ Error obteniendo pacientes pendientes:', error);
            throw new Error(`Error obteniendo pacientes pendientes: ${error.message}`);
        }
    }

    async getEstudiantesDisponibles(connection = null) {
        const executor = connection || await getConnection();
        
        try {
            const [rows] = await executor.execute(`
                SELECT 
                    e.id, e.codigo_estudiante, e.nombre_completo,
                    e.telefono, e.email, e.año_carrera, e.ciudad,
                    e.especialidades, e.casos_activos, e.casos_necesarios,
                    e.casos_completados, e.dias_disponibles, e.horarios_disponibles,
                    COUNT(a.id) as asignaciones_activas_real
                FROM estudiantes_odontologia e
                LEFT JOIN asignaciones a ON e.id = a.id_estudiante AND a.estado IN ('asignado', 'en_tratamiento')
                WHERE e.estado = 'activo'
                GROUP BY e.id
                HAVING (e.casos_activos < e.casos_necesarios) OR (asignaciones_activas_real < e.casos_necesarios)
                ORDER BY asignaciones_activas_real ASC, e.casos_completados ASC
                LIMIT 50
            `);
            
            return rows.map(row => this.sanitizeEstudianteData(row));
        } catch (error) {
            console.error('❌ Error obteniendo estudiantes disponibles:', error);
            throw new Error(`Error obteniendo estudiantes disponibles: ${error.message}`);
        }
    }

    // ===== MÉTODOS DE SANITIZACIÓN =====
    sanitizePacienteData(paciente) {
        return {
            ...paciente,
            nombre_completo: this.sanitizeString(paciente.nombre_completo),
            telefono: this.sanitizeString(paciente.telefono),
            email: this.sanitizeString(paciente.email),
            ciudad: this.sanitizeString(paciente.ciudad) || 'Metropolitana',
            tipo_tratamiento_inferido: this.sanitizeString(paciente.tipo_tratamiento_inferido) || 'Destartraje y Pulido Coronario',
            complejidad: this.sanitizeString(paciente.complejidad) || 'Básico',
            prioridad: this.sanitizeString(paciente.prioridad) || 'Moderada',
            nivel_dolor: this.sanitizeNumber(paciente.nivel_dolor, 0, 10),
            edad: this.sanitizeNumber(paciente.edad, 1, 120),
            sintomas_seleccionados: this.parseSintomasArray(paciente.sintomas_seleccionados)
        };
    }

    sanitizeEstudianteData(estudiante) {
        return {
            ...estudiante,
            nombre_completo: this.sanitizeString(estudiante.nombre_completo),
            telefono: this.sanitizeString(estudiante.telefono),
            email: this.sanitizeString(estudiante.email),
            ciudad: this.sanitizeString(estudiante.ciudad) || 'Metropolitana',
            año_carrera: this.sanitizeString(estudiante.año_carrera) || '4to',
            especialidades: this.parseEspecialidadesArray(estudiante.especialidades),
            casos_activos: this.sanitizeNumber(estudiante.casos_activos, 0),
            casos_necesarios: this.sanitizeNumber(estudiante.casos_necesarios, 1),
            casos_completados: this.sanitizeNumber(estudiante.casos_completados, 0),
            asignaciones_activas_real: this.sanitizeNumber(estudiante.asignaciones_activas_real, 0)
        };
    }

    sanitizeString(value) {
        if (!value || typeof value !== 'string') {
            return '';
        }
        return value.toString().trim();
    }

    sanitizeNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
        const num = parseInt(value) || min;
        return Math.max(min, Math.min(max, num));
    }

    parseSintomasArray(sintomas) {
        try {
            if (Array.isArray(sintomas)) return sintomas;
            if (typeof sintomas === 'string') {
                // Intentar parse JSON
                try {
                    const parsed = JSON.parse(sintomas);
                    return Array.isArray(parsed) ? parsed : [sintomas];
                } catch {
                    // Si falla JSON, split por comas
                    return sintomas.split(',').map(s => s.trim()).filter(s => s);
                }
            }
            return [];
        } catch {
            return [];
        }
    }

    parseEspecialidadesArray(especialidades) {
        try {
            if (Array.isArray(especialidades)) return especialidades;
            if (typeof especialidades === 'string' && especialidades.trim()) {
                return especialidades.split(',').map(e => e.trim()).filter(e => e);
            }
            return [];
        } catch {
            return [];
        }
    }

    // ===== ALGORITMO DE MATCHING CORREGIDO =====
    findBestMatchFromMap(paciente, estudiantesMap) {
        if (estudiantesMap.size === 0) return null;

        let mejorEstudiante = null;
        let mejorScore = -1;
        let mejorEspecialidadMatch = null;

        for (const [_, estudiante] of estudiantesMap) {
            const { score, especialidadMatch } = this.calculateMatchScore(paciente, estudiante);
            
            if (score > mejorScore) {
                mejorScore = score;
                mejorEstudiante = estudiante;
                mejorEspecialidadMatch = especialidadMatch;
            }
        }

        if (mejorScore >= 0.20) { // Umbral más bajo pero realista
            mejorEstudiante.especialidadMatch = mejorEspecialidadMatch;
            return mejorEstudiante;
        }
        
        return null;
    }

    calculateMatchScore(paciente, estudiante) {
        let score = 0;
        let especialidadMatch = null;

        try {
            // 1. Score por especialidad/tratamiento (40%)
            const { especialidadScore, matchedEspecialidad } = this.getEspecialidadScore(paciente, estudiante);
            score += especialidadScore * this.matchingRules.especialidad;
            especialidadMatch = matchedEspecialidad;

            // 2. Score por experiencia vs complejidad (20%)
            const experienciaScore = this.getExperienciaScore(paciente.tipo_tratamiento_inferido, estudiante);
            score += experienciaScore * this.matchingRules.experiencia;

            // 3. Score por prioridad del paciente (20%)
            const prioridadScore = this.getPriorityScore(paciente.prioridad, paciente.nivel_dolor);
            score += prioridadScore * this.matchingRules.prioridad;

            // 4. Score por disponibilidad geográfica (10%)
            const disponibilidadScore = this.getAvailabilityScore(paciente, estudiante);
            score += disponibilidadScore * this.matchingRules.disponibilidad;

            // 5. Score por carga de trabajo del estudiante (10%)
            const cargaScore = this.getWorkloadScore(estudiante);
            score += cargaScore * this.matchingRules.cargaTrabajo;

            return { 
                score: Math.min(Math.max(score, 0), 1), // Clamp entre 0 y 1
                especialidadMatch 
            };
        } catch (error) {
            console.error('❌ Error calculando score de matching:', error);
            return { score: 0, especialidadMatch: null };
        }
    }

    // ===== SCORE POR ESPECIALIDAD CORREGIDO =====
    getEspecialidadScore(paciente, estudiante) {
        try {
            const tratamientoRequerido = paciente.tipo_tratamiento_inferido || '';
            const especialidadesEstudiante = estudiante.especialidades || [];
            
            // Si no tiene especialidades definidas, score base
            if (especialidadesEstudiante.length === 0) {
                return { especialidadScore: 0.3, matchedEspecialidad: null };
            }

            // Buscar match directo por nombre de tratamiento
            const tratamientoLower = tratamientoRequerido.toLowerCase();
            const matchDirecto = especialidadesEstudiante.find(esp => 
                tratamientoLower.includes(esp.toLowerCase()) || esp.toLowerCase().includes(tratamientoLower)
            );

            if (matchDirecto) {
                return { especialidadScore: 1.0, matchedEspecialidad: matchDirecto };
            }

            // Buscar match por síntomas del paciente
            let mejorScore = 0;
            let mejorEspecialidad = null;

            const sintomas = paciente.sintomas_seleccionados || [];
            
            for (const sintoma of sintomas) {
                const sintomaLower = sintoma.toLowerCase();
                const especialidadesPosibles = this.sintomasAEspecialidades[sintomaLower] || [];
                
                for (const especialidadPosible of especialidadesPosibles) {
                    const especialidadPosibleLower = especialidadPosible.toLowerCase();
                    
                    const match = especialidadesEstudiante.find(esp => 
                        especialidadPosibleLower.includes(esp.toLowerCase()) || esp.toLowerCase().includes(especialidadPosibleLower)
                    );
                    
                    if (match && mejorScore < 0.8) {
                        mejorScore = 0.8;
                        mejorEspecialidad = match;
                    }
                }
            }

            // Especialidades generales que pueden manejar casos básicos
            const especialidadesGenerales = ['operatoria', 'restauradora', 'general'];
            const tieneEspecialidadGeneral = especialidadesEstudiante.some(esp => 
                especialidadesGenerales.some(gen => esp.toLowerCase().includes(gen))
            );

            if (tieneEspecialidadGeneral && mejorScore < 0.4) {
                mejorScore = 0.4;
                mejorEspecialidad = especialidadesEstudiante.find(esp => 
                    especialidadesGenerales.some(gen => esp.toLowerCase().includes(gen))
                );
            }

            return { 
                especialidadScore: mejorScore, 
                matchedEspecialidad: mejorEspecialidad 
            };
        } catch (error) {
            console.error('❌ Error en getEspecialidadScore:', error);
            return { especialidadScore: 0.2, matchedEspecialidad: null };
        }
    }

    // ===== MÉTODOS DE SCORING (SIN CAMBIOS SIGNIFICATIVOS) =====
    getExperienciaScore(tratamiento, estudiante) {
        try {
            const año = estudiante.año_carrera || '4to';
            const casosCompletados = estudiante.casos_completados || 0;
            
            const factorComplejidad = this.complejidadPorAno[tratamiento]?.[año] || 0.5;
            const bonusExperiencia = Math.min(casosCompletados * 0.02, 0.2);
            
            return Math.min(factorComplejidad + bonusExperiencia, 1.0);
        } catch (error) {
            console.error('❌ Error en getExperienciaScore:', error);
            return 0.3;
        }
    }

    getPriorityScore(prioridad, nivelDolor) {
        const scores = {
            'Muy Alta': 1.0,
            'Alta': 0.8,
            'Moderada': 0.6,
            'Baja': 0.4
        };
        
        let score = scores[prioridad] || 0.5;
        
        if (nivelDolor >= 8) {
            score = Math.min(score + 0.2, 1.0);
        } else if (nivelDolor >= 6) {
            score = Math.min(score + 0.1, 1.0);
        }
        
        return score;
    }

    getAvailabilityScore(paciente, estudiante) {
        let score = 0.5;

        if (paciente.ciudad && estudiante.ciudad && 
            paciente.ciudad.toLowerCase() === estudiante.ciudad.toLowerCase()) {
            score += 0.4;
        } else if (paciente.ciudad && estudiante.ciudad) {
            score -= 0.1;
        }

        return Math.max(Math.min(score, 1), 0);
    }

    getWorkloadScore(estudiante) {
        const capacidadTotal = estudiante.casos_necesarios || 1;
        const asignacionesActivas = estudiante.asignaciones_activas_real || estudiante.casos_activos || 0;
        const utilization = asignacionesActivas / capacidadTotal;

        return Math.max(1 - utilization, 0);
    }

    sortPatientsByPriority(pacientes) {
        const prioridadValues = {
            'Muy Alta': 4,
            'Alta': 3,
            'Moderada': 2,
            'Baja': 1
        };

        return pacientes.sort((a, b) => {
            const prioridadA = prioridadValues[a.prioridad] || 1;
            const prioridadB = prioridadValues[b.prioridad] || 1;
            
            if (prioridadA !== prioridadB) {
                return prioridadB - prioridadA;
            }
            
            if (a.nivel_dolor !== b.nivel_dolor) {
                return b.nivel_dolor - a.nivel_dolor;
            }
            
            return new Date(a.fecha_registro) - new Date(b.fecha_registro);
        });
    }

    // ===== CREACIÓN DE MATCH CON TRANSACCIONES CORREGIDA =====
    async createMatchWithConnection(connection, paciente, estudiante) {
    try {
        const { score, especialidadMatch } = this.calculateMatchScore(paciente, estudiante);
        
        // Verificar si el estudiante ya tiene un código de acceso activo
        const [codigosExistentes] = await connection.execute(`
            SELECT codigo_acceso 
            FROM codigos_acceso 
            WHERE id_estudiante = ? AND activo = TRUE AND fecha_expiracion > NOW()
            ORDER BY fecha_generacion DESC 
            LIMIT 1
        `, [estudiante.id]);
        
        let codigoAcceso;
        
        if (codigosExistentes.length > 0) {
            // Usar código existente
            codigoAcceso = codigosExistentes[0].codigo_acceso;
        } else {
            // Generar nuevo código para el estudiante
            codigoAcceso = await this.generarCodigoAcceso();
            const fechaExpiracion = new Date();
            fechaExpiracion.setDate(fechaExpiracion.getDate() + 30); // 30 días de validez
            
            // Crear nuevo código de acceso para el estudiante
            await connection.execute(`
                INSERT INTO codigos_acceso (
                    id_estudiante, codigo_acceso, fecha_expiracion, activo
                ) VALUES (?, ?, ?, TRUE)
            `, [estudiante.id, codigoAcceso, fechaExpiracion]);
        }
        
        // Crear la asignación usando el código del estudiante
        const [result] = await connection.execute(`
            INSERT INTO asignaciones (
                id_paciente, id_estudiante, fecha_asignacion,
                score_compatibilidad, estado, observaciones_sistema, codigo_acceso
            ) VALUES (?, ?, NOW(), ?, 'asignado', ?, ?)
        `, [
            paciente.id, 
            estudiante.id, 
            score,
            `Match automático - Especialidad: ${especialidadMatch || 'General'} - Tratamiento: ${paciente.tipo_tratamiento_inferido}`,
            codigoAcceso
        ]);

        // Actualizar el estado del paciente
        await connection.execute(`
            UPDATE pacientes 
            SET estado = 'asignado', 
                fecha_asignacion = NOW(),
                estudiante_asignado = ?
            WHERE id = ?
        `, [estudiante.id, paciente.id]);

        return {
            success: true,
            score: score,
            pacienteId: paciente.id,
            estudianteId: estudiante.id,
            especialidadMatch: especialidadMatch,
            asignacionId: result.insertId,
            codigoAcceso: codigoAcceso
        };
        
    } catch (error) {
        console.error('❌ Error creando match:', error);
        throw new Error(`Error creando match: ${error.message}`);
    }
}


// Función para obtener pacientes de un estudiante por código
async getPacientesPorCodigo(codigoAcceso) {
    try {
        const db = await getConnection();
        
        const [pacientes] = await db.execute(`
            SELECT 
                p.*, 
                a.id as asignacion_id,
                a.fecha_asignacion,
                a.estado as estado_asignacion,
                a.score_compatibilidad,
                a.observaciones_estudiante
            FROM codigos_acceso ca
            JOIN asignaciones a ON ca.codigo_acceso = a.codigo_acceso
            JOIN pacientes p ON a.id_paciente = p.id
            WHERE ca.codigo_acceso = ? 
                AND ca.activo = TRUE 
                AND ca.fecha_expiracion > NOW()
                AND a.estado IN ('asignado', 'contactado', 'en_tratamiento')
            ORDER BY a.fecha_asignacion DESC
        `, [codigoAcceso]);
        
        return pacientes.map(paciente => ({
            ...paciente,
            sintomas_parseados: this.parseSintomasArray(paciente.sintomas_seleccionados)
        }));
        
    } catch (error) {
        console.error('Error obteniendo pacientes por código:', error);
        throw new Error(`Error obteniendo pacientes por código: ${error.message}`);
    }
}

// Función para validar código de acceso
async validarCodigoAcceso(codigoAcceso) {
    try {
        const db = await getConnection();
        
        const [resultado] = await db.execute(`
            SELECT 
                ca.*,
                e.nombre_completo,
                e.codigo_estudiante,
                e.año_carrera,
                e.email
            FROM codigos_acceso ca
            JOIN estudiantes_odontologia e ON ca.id_estudiante = e.id
            WHERE ca.codigo_acceso = ? 
                AND ca.activo = TRUE 
                AND ca.fecha_expiracion > NOW()
        `, [codigoAcceso]);
        
        if (resultado.length === 0) {
            return { valido: false, mensaje: 'Código inválido o expirado' };
        }
        
        // Actualizar último acceso
        await db.execute(`
            UPDATE codigos_acceso 
            SET ultimo_intento = NOW() 
            WHERE codigo_acceso = ?
        `, [codigoAcceso]);
        
        return {
            valido: true,
            estudiante: resultado[0],
            mensaje: 'Código válido'
        };
        
    } catch (error) {
        console.error('Error validando código:', error);
        return { valido: false, mensaje: 'Error del sistema' };
    }
}
async generarCodigoAcceso() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo;
    let existe = true;
    let intentos = 0;
    const maxIntentos = 100;
    
    const db = await getConnection();
    
    while (existe && intentos < maxIntentos) {
        // Generar código formato: AA######AA
        codigo = '';
        codigo += caracteres.charAt(Math.floor(Math.random() * 26)); // A-Z
        codigo += caracteres.charAt(Math.floor(Math.random() * 26)); // A-Z
        for (let i = 0; i < 6; i++) {
            codigo += Math.floor(Math.random() * 10); // 0-9
        }
        codigo += caracteres.charAt(Math.floor(Math.random() * 26)); // A-Z
        codigo += caracteres.charAt(Math.floor(Math.random() * 26)); // A-Z
        
        // Verificar si ya existe
        const [rows] = await db.execute(
            'SELECT codigo_acceso FROM codigos_acceso WHERE codigo_acceso = ?',
            [codigo]
        );
        
        existe = rows.length > 0;
        intentos++;
    }
    
    if (intentos >= maxIntentos) {
        throw new Error('No se pudo generar un código único después de múltiples intentos');
    }
    
    return codigo;
}

    // ===== MÉTODO LEGACY PARA COMPATIBILIDAD =====
    async createMatch(paciente, estudiante) {
        let connection = null;
        
        try {
            const db = await getConnection();
            connection = await db.getConnection();
            await connection.beginTransaction();
            
            const result = await this.createMatchWithConnection(connection, paciente, estudiante);
            
            await connection.commit();
            return result;
            
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('❌ Error en rollback:', rollbackError);
                }
            }
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    // ===== MÉTODOS DE ESTADÍSTICAS (SIN CAMBIOS SIGNIFICATIVOS) =====
    async getMatchingStats() {
    try {
        const db = await getConnection();
        
        // First, let's verify the column exists
        const [columns] = await db.execute(`
            SHOW COLUMNS FROM estudiantes_odontologia LIKE 'casos_necesarios'
        `);
        
        if (columns.length === 0) {
            console.log('⚠️ Column casos_necesarios not found, using default value of 10');
        }
        
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_asignaciones,
                COUNT(CASE WHEN observaciones_sistema LIKE '%MANUAL%' THEN 1 END) as manuales,
                COUNT(CASE WHEN observaciones_sistema NOT LIKE '%MANUAL%' OR observaciones_sistema IS NULL THEN 1 END) as automaticas,
                AVG(score_compatibilidad) as score_promedio,
                COUNT(CASE WHEN DATE(fecha_asignacion) = CURDATE() THEN 1 END) as hoy
            FROM asignaciones
            WHERE estado IN ('asignado', 'en_tratamiento')
        `);

        const [pendientes] = await db.execute(`
            SELECT COUNT(*) as pacientes_pendientes
            FROM pacientes
            WHERE estado = 'pendiente' AND activo = TRUE
        `);

        // Fixed query for available students
        const [disponibles] = await db.execute(`
            SELECT COUNT(*) as estudiantes_disponibles
            FROM (
                SELECT e.id
                FROM estudiantes_odontologia e
                LEFT JOIN asignaciones a ON e.id = a.id_estudiante 
                    AND a.estado IN ('asignado', 'en_tratamiento')
                WHERE e.estado = 'activo'
                GROUP BY e.id, e.casos_necesarios
                HAVING COUNT(a.id) < COALESCE(e.casos_necesarios, 10)
            ) as disponible_count
        `);

        return {
            ...stats[0],
            pacientes_pendientes: pendientes[0].pacientes_pendientes,
            estudiantes_disponibles: disponibles[0].estudiantes_disponibles,
            ultima_actualizacion: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de matching:', error);
        throw new Error(`Error obteniendo estadísticas de matching: ${error.message}`);
    }
}

    async undoAutoMatch(asignacionId) {
        let connection = null;
        
        try {
            const db = await getConnection();
            connection = await db.getConnection();
            await connection.beginTransaction();
            
            // Verificar que la asignación existe y está en estado asignado
            const [asignacion] = await connection.execute(`
                SELECT a.*, p.nombre_completo as paciente_nombre,
                    e.nombre_completo as estudiante_nombre
                FROM asignaciones a
                JOIN pacientes p ON a.id_paciente = p.id
                JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
                WHERE a.id = ? AND a.estado = 'asignado'
            `, [asignacionId]);
            
            if (asignacion.length === 0) {
                throw new Error('Asignación no encontrada o no está en estado asignado');
            }
            
            const match = asignacion[0];
            
            // Actualizar el estado del paciente a pendiente
            await connection.execute(`
                UPDATE pacientes 
                SET estado = 'pendiente', 
                    fecha_asignacion = NULL,
                    estudiante_asignado = NULL
                WHERE id = ?
            `, [match.id_paciente]);
            
            // Marcar la asignación como cancelada
            await connection.execute(`
                UPDATE asignaciones 
                SET estado = 'cancelado', 
                    fecha_actualizacion = NOW(),
                    motivo_cancelacion = 'Cancelado manualmente por administrador',
                    observaciones_sistema = CONCAT(
                        COALESCE(observaciones_sistema, ''), 
                        ' - Cancelado manualmente el ', 
                        NOW()
                    )
                WHERE id = ?
            `, [asignacionId]);
            
            await connection.commit();
            
            console.log(`✅ Match deshecho exitosamente: ${match.paciente_nombre} ↔ ${match.estudiante_nombre}`);
            
            return {
                success: true,
                message: 'Asignación deshecha exitosamente',
                data: {
                    asignacionId: asignacionId,
                    paciente: match.paciente_nombre,
                    estudiante: match.estudiante_nombre
                }
            };
            
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                    console.log('🔄 Rollback ejecutado correctamente');
                } catch (rollbackError) {
                    console.error('❌ Error en rollback:', rollbackError.message);
                }
            }
            
            console.error('❌ Error deshaciendo match automático:', error);
            return {
                success: false,
                error: error.message,
                message: 'Error al deshacer la asignación'
            };
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    analizarSintomas(sintomas) {
        try {
            const sintomasArray = this.parseSintomasArray(sintomas);
            const especialidadesContador = {};
            
            for (const sintoma of sintomasArray) {
                const sintomaLower = sintoma.toLowerCase();
                const especialidades = this.sintomasAEspecialidades[sintomaLower] || [];
                
                for (const especialidad of especialidades) {
                    especialidadesContador[especialidad] = (especialidadesContador[especialidad] || 0) + 1;
                }
            }
            
            let mejorEspecialidad = null;
            let maxCount = 0;
            
            for (const [especialidad, count] of Object.entries(especialidadesContador)) {
                if (count > maxCount) {
                    maxCount = count;
                    mejorEspecialidad = especialidad;
                }
            }
            
            return {
                tratamientoSugerido: mejorEspecialidad || 'Destartraje y Pulido Coronario',
                confianza: sintomasArray.length > 0 ? maxCount / sintomasArray.length : 0,
                especialidadesDetectadas: especialidadesContador
            };
        } catch (error) {
            console.error('❌ Error analizando síntomas:', error);
            return {
                tratamientoSugerido: 'Destartraje y Pulido Coronario',
                confianza: 0,
                especialidadesDetectadas: {}
            };
        }
    }
}

module.exports = new MatchingService();