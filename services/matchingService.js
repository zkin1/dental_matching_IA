const { getConnection } = require('../config/database');
const autoNotificationService = require('./autoNotificationService');

/**
 * Servicio de Matching Avanzado para Sistema Dental
 * Versión 2.0 - Matching por Horarios Específicos
 * 
 * ALGORITMO DE MATCHING INTELIGENTE:
 * 1. Detección de tratamiento basada en síntomas del paciente
 * 2. Asignación automática de clínica según edad (Niño/Adulto)
 * 3. Búsqueda de estudiantes disponibles por especialidad y horario
 * 4. Validación de disponibilidad sin solapamientos
 * 5. Scoring avanzado para matching óptimo
 * 6. Creación de asignaciones específicas por horario
 * 7. Actualización de disponibilidad en tiempo real
 * 8. Notificaciones automáticas personalizadas
 */
class AdvancedMatchingService {
    constructor() {
        this.connection = null;
        this.isMatching = false;
        
        // Mapeo inteligente de síntomas a tratamientos con IA
        this.sintomasATratamientos = {
            // ENDODONCIA - Problemas de raíz/nervio
            'dolor constante': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.9 },
            'dolor insoportable': { tratamientos: ['Endodoncia'], prioridad: 'urgente', confianza: 0.95 },
            'dolor al masticar': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.8 },
            'sensibilidad al frío': { tratamientos: ['Endodoncia'], prioridad: 'moderada', confianza: 0.7 },
            'sensibilidad al calor': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.85 },
            'inflamación': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.75 },
            'tratamiento de conducto': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 1.0 },
            'me duele una muela': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.85 },
            
            // DESTARTRAJE Y PULIDO - Limpieza y mantenimiento
            'limpieza dental': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'baja', confianza: 1.0 },
            'limpieza profunda': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'moderada', confianza: 0.9 },
            'chequeo general': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'baja', confianza: 0.8 },
            'sarro': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'moderada', confianza: 0.9 },
            'placa': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'moderada', confianza: 0.85 },
            'dientes amarillos': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'baja', confianza: 0.7 },
            
            // PULIDO RADICULAR - Problemas de encías
            'sangran las encías': { tratamientos: ['Pulido Radicular'], prioridad: 'moderada', confianza: 0.9 },
            'problemas en las encías': { tratamientos: ['Pulido Radicular'], prioridad: 'moderada', confianza: 0.85 },
            'encías inflamadas': { tratamientos: ['Pulido Radicular'], prioridad: 'moderada', confianza: 0.9 },
            'gingivitis': { tratamientos: ['Pulido Radicular'], prioridad: 'moderada', confianza: 0.95 },
            'encías rojas': { tratamientos: ['Pulido Radicular'], prioridad: 'moderada', confianza: 0.8 },
            'encías sensibles': { tratamientos: ['Pulido Radicular'], prioridad: 'moderada', confianza: 0.75 },
            'mal aliento': { tratamientos: ['Destartraje y Pulido Coronario', 'Pulido Radicular'], prioridad: 'baja', confianza: 0.6 },
            
            // EXODONCIA - Extracciones
            'sacar una muela': { tratamientos: ['Exodoncia Simple'], prioridad: 'alta', confianza: 1.0 },
            'extraer una muela': { tratamientos: ['Exodoncia Simple'], prioridad: 'alta', confianza: 1.0 },
            'muelas del juicio': { tratamientos: ['Exodoncia Simple'], prioridad: 'moderada', confianza: 0.9 },
            'se me mueve': { tratamientos: ['Exodoncia Simple'], prioridad: 'alta', confianza: 0.85 },
            'diente flojo': { tratamientos: ['Exodoncia Simple'], prioridad: 'alta', confianza: 0.85 },
            'muela rota que no se puede arreglar': { tratamientos: ['Exodoncia Simple'], prioridad: 'alta', confianza: 0.95 },
            
            // RESINAS - Restauraciones
            'hoyo': { tratamientos: ['Resina Simple'], prioridad: 'moderada', confianza: 0.9 },
            'caries': { tratamientos: ['Resina Simple', 'Resina Compuesta'], prioridad: 'moderada', confianza: 0.85 },
            'empaste': { tratamientos: ['Resina Simple'], prioridad: 'moderada', confianza: 0.9 },
            'tapadura': { tratamientos: ['Resina Simple'], prioridad: 'moderada', confianza: 0.9 },
            'mancha negra': { tratamientos: ['Resina Simple', 'Resina Compuesta'], prioridad: 'moderada', confianza: 0.8 },
            'picadura': { tratamientos: ['Resina Simple'], prioridad: 'moderada', confianza: 0.85 },
            
            // RESTAURACIONES AVANZADAS
            'muela rota': { tratamientos: ['Resina Compuesta', 'Corona'], prioridad: 'alta', confianza: 0.8 },
            'se me cayó': { tratamientos: ['Resina Compuesta'], prioridad: 'alta', confianza: 0.85 },
            'diente partido': { tratamientos: ['Resina Compuesta', 'Corona'], prioridad: 'alta', confianza: 0.9 },
            'fractura': { tratamientos: ['Resina Compuesta', 'Corona'], prioridad: 'alta', confianza: 0.9 },
            'diente negro': { tratamientos: ['Corona'], prioridad: 'moderada', confianza: 0.8 },
            'muy manchado': { tratamientos: ['Corona'], prioridad: 'baja', confianza: 0.7 },
            'corona': { tratamientos: ['Corona'], prioridad: 'moderada', confianza: 1.0 },
            'diente desgastado': { tratamientos: ['Corona'], prioridad: 'moderada', confianza: 0.85 },
            'estética': { tratamientos: ['Corona'], prioridad: 'baja', confianza: 0.6 },
            'rota grande': { tratamientos: ['Incrustación'], prioridad: 'alta', confianza: 0.9 },
            'restauración grande': { tratamientos: ['Incrustación'], prioridad: 'moderada', confianza: 0.9 },
            
            // PRÓTESIS
            'falta un diente': { tratamientos: ['Protesis Parcial Removible'], prioridad: 'moderada', confianza: 0.9 },
            'faltan dientes': { tratamientos: ['Protesis Total Removible', 'Protesis Parcial Removible'], prioridad: 'moderada', confianza: 0.85 },
            'prótesis': { tratamientos: ['Protesis Parcial Removible', 'Protesis Total Removible'], prioridad: 'moderada', confianza: 0.8 },
            'dentadura': { tratamientos: ['Protesis Total Removible'], prioridad: 'moderada', confianza: 0.9 },
            'sin dientes': { tratamientos: ['Protesis Total Removible'], prioridad: 'moderada', confianza: 1.0 }
        };
        
        // Mapping de tratamientos a especialidades
        this.tratamientosAEspecialidades = {
            'Endodoncia': 'Endodoncia',
            'Destartraje y Pulido Coronario': 'Operatoria Dental',
            'Pulido Radicular': 'Periodoncia',
            'Exodoncia Simple': 'Cirugía Oral',
            'Resina Simple': 'Operatoria Dental',
            'Resina Compuesta': 'Operatoria Dental',
            'Corona': 'Prótesis Fija',
            'Incrustación': 'Prótesis Fija',
            'Protesis Parcial Removible': 'Prótesis Removible',
            'Protesis Total Removible': 'Prótesis Removible'
        };
        
        // Complejidad por año de carrera para scoring
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
        
        this.diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    }
    
    /**
     * 🚀 MÉTODO PRINCIPAL DE MATCHING AVANZADO
     * Ejecuta el algoritmo completo de matching por horarios específicos
     */
    async executeAdvancedMatching() {
        if (this.isMatching) {
            console.log('⚠️ Matching ya en progreso');
            return { success: false, message: 'Matching ya en progreso' };
        }
        
        this.isMatching = true;
        const startTime = Date.now();
        console.log('🚀 Iniciando matching avanzado por horarios específicos...');
        
        try {
            const db = await getConnection();
            this.connection = await db.getConnection();
            
            // 1. Obtener pacientes pendientes
            const pacientesPendientes = await this.getPacientesPendientes();
            console.log(`📋 Pacientes pendientes: ${pacientesPendientes.length}`);
            
            if (pacientesPendientes.length === 0) {
                return {
                    success: true,
                    message: 'No hay pacientes pendientes de asignación',
                    processed: 0,
                    matched: 0
                };
            }
            
            let totalMatched = 0;
            let totalProcessed = 0;
            const matchingResults = [];
            
            for (const paciente of pacientesPendientes) {
                totalProcessed++;
                console.log(`\n🔍 Procesando: ${paciente.nombre_completo} (Edad: ${paciente.edad})`);
                
                try {
                    // 2. DETECCIÓN INTELIGENTE DE TRATAMIENTO
                    const tratamientoDetectado = await this.detectarTratamientoPorSintomas(paciente);
                    console.log(`💡 Tratamiento detectado: ${tratamientoDetectado.tratamiento} (Confianza: ${tratamientoDetectado.confianza.toFixed(2)})`);
                    
                    // 3. ASIGNACIÓN AUTOMÁTICA DE CLÍNICA POR EDAD
                    const clinicaAsignada = this.determinarClinicaPorEdad(paciente.edad);
                    console.log(`🏥 Clínica asignada: ${clinicaAsignada}`);
                    
                    // 4. CREAR REQUERIMIENTO DEL PACIENTE
                    await this.crearRequerimientoPaciente(paciente, tratamientoDetectado, clinicaAsignada);
                    
                    // 5. BÚSQUEDA DE MATCHING ÓPTIMO
                    const matchingResult = await this.encontrarMatchingOptimo(paciente, tratamientoDetectado, clinicaAsignada);
                    
                    if (matchingResult.success) {
                        // 6. CREAR ASIGNACIÓN POR HORARIO
                        await this.crearAsignacionHorario(paciente, matchingResult);
                        
                        // 7. ACTUALIZAR DISPONIBILIDAD
                        await this.actualizarDisponibilidad(matchingResult);
                        
                        // 8. ENVIAR NOTIFICACIONES ESPECÍFICAS
                        await this.enviarNotificacionesAsignacion(paciente, matchingResult);
                        
                        totalMatched++;
                        matchingResults.push(matchingResult);
                        console.log(`✅ Matching exitoso: ${matchingResult.estudiante.nombre_completo} - ${matchingResult.dia_semana} ${matchingResult.hora_inicio}-${matchingResult.hora_fin}`);
                    } else {
                        console.log(`❌ Sin matching: ${matchingResult.reason}`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error procesando paciente ${paciente.id}:`, error.message);
                }
            }
            
            const duration = Date.now() - startTime;
            const result = {
                success: true,
                processed: totalProcessed,
                matched: totalMatched,
                duration: `${duration}ms`,
                successRate: totalProcessed > 0 ? ((totalMatched / totalProcessed) * 100).toFixed(1) : 0,
                results: matchingResults
            };
            
            console.log(`\n🎉 Matching completado: ${totalMatched}/${totalProcessed} asignaciones (${result.successRate}%) en ${duration}ms`);
            return result;
            
        } catch (error) {
            console.error('❌ Error en matching avanzado:', error);
            return { success: false, error: error.message };
        } finally {
            if (this.connection) {
                this.connection.release();
            }
            this.isMatching = false;
        }
    }
    
    /**
     * 📋 Obtiene pacientes que necesitan asignación
     */
    async getPacientesPendientes() {
        const query = `
            SELECT p.*, 
                   p.sintomas_seleccionados,
                   p.diagnostico_previo,
                   p.tiempo_problema,
                   p.nivel_dolor,
                   p.dias_disponibles,
                   p.horario_preferencia,
                   p.prioridad
            FROM pacientes p
            LEFT JOIN requerimientos_paciente rp ON p.id = rp.id_paciente AND rp.activo = TRUE
            WHERE p.activo = TRUE 
                AND rp.id IS NULL
                AND p.edad IS NOT NULL
            ORDER BY 
                CASE p.prioridad 
                    WHEN 'Muy Alta' THEN 1 
                    WHEN 'Alta' THEN 2 
                    WHEN 'Moderada' THEN 3 
                    ELSE 4 
                END,
                p.nivel_dolor DESC,
                p.fecha_registro ASC
            LIMIT 50
        `;
        
        const [rows] = await this.connection.execute(query);
        return rows;
    }
    
    /**
     * 🧠 DETECCIÓN INTELIGENTE DE TRATAMIENTO BASADA EN SÍNTOMAS
     * Analiza los síntomas del paciente y predice el tratamiento más probable
     */
    async detectarTratamientoPorSintomas(paciente) {
        let mejorTratamiento = null;
        let mejorScore = 0;
        let prioridadDetectada = 'moderada';
        let especialidadesDetectadas = {};
        
        // Combinar todos los textos del paciente para análisis de IA
        const textoCompleto = [
            paciente.sintomas_seleccionados ? JSON.stringify(paciente.sintomas_seleccionados).toLowerCase() : '',
            paciente.diagnostico_previo || '',
            paciente.tiempo_problema || ''
        ].join(' ').toLowerCase();
        
        console.log(`🔍 Analizando síntomas: "${textoCompleto.substring(0, 80)}..."`);
        
        // ALGORITMO DE IA: Análisis de cada síntoma conocido
        for (const [sintoma, data] of Object.entries(this.sintomasATratamientos)) {
            if (textoCompleto.includes(sintoma.toLowerCase())) {
                console.log(`🎯 Síntoma encontrado: "${sintoma}" -> ${data.tratamientos.join(', ')} (Confianza: ${data.confianza})`);
                
                // Calcular score considerando confianza y nivel de dolor
                let score = data.confianza;
                if (paciente.nivel_dolor && paciente.nivel_dolor >= 7) {
                    score += 0.2; // Bonus por dolor alto
                }
                
                // Seleccionar el mejor tratamiento
                for (const tratamiento of data.tratamientos) {
                    if (score > mejorScore) {
                        mejorTratamiento = tratamiento;
                        mejorScore = score;
                        prioridadDetectada = data.prioridad;
                    }
                    
                    const especialidad = this.tratamientosAEspecialidades[tratamiento];
                    if (especialidad) {
                        especialidadesDetectadas[especialidad] = (especialidadesDetectadas[especialidad] || 0) + score;
                    }
                }
            }
        }
        
        // Fallback: tratamiento por defecto según edad
        if (!mejorTratamiento) {
            if (paciente.edad < 18) {
                mejorTratamiento = 'Resina Simple';
                mejorScore = 0.5;
                console.log('🔄 Tratamiento por defecto para niño: Resina Simple');
            } else {
                mejorTratamiento = 'Destartraje y Pulido Coronario';
                mejorScore = 0.5;
                console.log('🔄 Tratamiento por defecto para adulto: Destartraje y Pulido Coronario');
            }
        }
        
        return {
            tratamiento: mejorTratamiento,
            especialidad: this.tratamientosAEspecialidades[mejorTratamiento],
            confianza: mejorScore,
            prioridad: prioridadDetectada,
            especialidadesDetectadas: especialidadesDetectadas
        };
    }
    
    /**
     * 🏥 ASIGNACIÓN AUTOMÁTICA DE CLÍNICA SEGÚN EDAD
     */
    determinarClinicaPorEdad(edad) {
        if (edad < 18) {
            return 'Clínica para el Niño y Adolescente';
        } else {
            return 'Clínica Integral Adulto y Gerontología';
        }
    }
    
    /**
     * 📝 Crea requerimiento del paciente en la base de datos
     */
    async crearRequerimientoPaciente(paciente, tratamientoDetectado, clinica) {
        // Parsear días disponibles
        let diasDisponibles = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
        if (paciente.dias_disponibles) {
            try {
                const diasTexto = paciente.dias_disponibles.toLowerCase();
                diasDisponibles = this.diasSemana.filter(dia => diasTexto.includes(dia));
                if (diasDisponibles.length === 0) {
                    diasDisponibles = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
                }
            } catch (error) {
                console.log('⚠️ Error parseando días disponibles, usando default');
            }
        }
        
        // Parsear horarios preferidos
        let horariosPreferidos = {
            manana: { inicio: '08:00', fin: '13:00' },
            tarde: { inicio: '14:00', fin: '20:00' }
        };
        
        if (paciente.horario_preferencia) {
            try {
                const horarioTexto = paciente.horario_preferencia.toLowerCase();
                if (horarioTexto.includes('mañana') || horarioTexto.includes('manana')) {
                    horariosPreferidos = { manana: { inicio: '08:00', fin: '13:00' } };
                } else if (horarioTexto.includes('tarde')) {
                    horariosPreferidos = { tarde: { inicio: '14:00', fin: '20:00' } };
                }
            } catch (error) {
                console.log('⚠️ Error parseando horarios preferidos, usando default');
            }
        }
        
        const query = `
            INSERT INTO requerimientos_paciente (
                id_paciente,
                especialidad_requerida,
                clinica_preferida,
                urgencia,
                dias_disponibles,
                horarios_preferidos,
                notas_adicionales
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const urgencia = this.mapearPrioridadAUrgencia(tratamientoDetectado.prioridad);
        
        await this.connection.execute(query, [
            paciente.id,
            tratamientoDetectado.especialidad,
            clinica,
            urgencia,
            JSON.stringify(diasDisponibles),
            JSON.stringify(horariosPreferidos),
            `Tratamiento detectado: ${tratamientoDetectado.tratamiento} (Confianza: ${tratamientoDetectado.confianza.toFixed(2)})`
        ]);
        
        console.log(`📝 Requerimiento creado: ${tratamientoDetectado.especialidad} en ${clinica}`);
    }
    
    /**
     * 🔄 Mapea prioridad a urgencia
     */
    mapearPrioridadAUrgencia(prioridad) {
        const mapping = {
            'urgente': 'urgente',
            'alta': 'alta',
            'moderada': 'moderada',
            'baja': 'baja'
        };
        return mapping[prioridad] || 'moderada';
    }
    
    /**
     * 🎯 ALGORITMO DE MATCHING ÓPTIMO
     * Encuentra el mejor estudiante disponible considerando múltiples factores
     */
    async encontrarMatchingOptimo(paciente, tratamientoDetectado, clinica) {
        console.log(`🔍 Buscando matching óptimo para ${tratamientoDetectado.especialidad} en ${clinica}`);
        
        // Obtener estudiantes disponibles
        const estudiantesDisponibles = await this.getEstudiantesDisponibles(tratamientoDetectado.especialidad, clinica);
        console.log(`👥 Estudiantes disponibles: ${estudiantesDisponibles.length}`);
        
        if (estudiantesDisponibles.length === 0) {
            return {
                success: false,
                reason: `No hay estudiantes disponibles para ${tratamientoDetectado.especialidad} en ${clinica}`
            };
        }
        
        let mejorMatch = null;
        let mejorScore = 0;
        
        for (const estudiante of estudiantesDisponibles) {
            // VALIDACIÓN DE HORARIOS SIN SOLAPAMIENTOS
            const disponibilidadHorarios = await this.verificarDisponibilidadHorarios(
                estudiante.id_estudiante,
                estudiante.dia_semana,
                estudiante.hora_inicio,
                estudiante.hora_fin
            );
            
            if (!disponibilidadHorarios.disponible) {
                console.log(`⏰ ${estudiante.nombre_completo} no disponible: ${disponibilidadHorarios.motivo}`);
                continue;
            }
            
            // CÁLCULO DE SCORE DE MATCHING
            const score = this.calcularScoreMatching(paciente, estudiante, tratamientoDetectado);
            
            if (score > mejorScore) {
                mejorScore = score;
                mejorMatch = {
                    success: true,
                    estudiante: estudiante,
                    especialidad: tratamientoDetectado.especialidad,
                    tratamiento: tratamientoDetectado.tratamiento,
                    clinica: clinica,
                    dia_semana: estudiante.dia_semana,
                    hora_inicio: estudiante.hora_inicio,
                    hora_fin: estudiante.hora_fin,
                    fecha_asignacion: this.calcularProximaFecha(estudiante.dia_semana),
                    score: score,
                    disponibilidad: disponibilidadHorarios
                };
            }
        }
        
        if (!mejorMatch) {
            return {
                success: false,
                reason: 'No hay horarios disponibles para los estudiantes encontrados'
            };
        }
        
        console.log(`✅ Mejor match: ${mejorMatch.estudiante.nombre_completo} (Score: ${mejorScore.toFixed(2)})`);
        return mejorMatch;
    }
    
    /**
     * 👥 Obtiene estudiantes disponibles para una especialidad y clínica específica
     */
    async getEstudiantesDisponibles(especialidad, clinica) {
        const query = `
            SELECT 
                e.id as id_estudiante,
                e.nombre_completo,
                e.año_carrera,
                e.telefono,
                e.email,
                e.casos_activos,
                e.casos_completados,
                ee.id as id_especialidad_estudiante,
                ee.especialidad,
                ee.clinica,
                ee.dia_semana,
                ee.hora_inicio,
                ee.hora_fin,
                ee.capacidad_pacientes
            FROM estudiantes_odontologia e
            INNER JOIN especialidades_estudiante ee ON e.id = ee.id_estudiante
            WHERE e.estado = 'activo'
                AND ee.activo = TRUE
                AND ee.especialidad = ?
                AND ee.clinica = ?
                AND e.casos_activos < e.casos_necesarios
            ORDER BY 
                e.casos_activos ASC,
                ee.dia_semana ASC,
                ee.hora_inicio ASC
        `;
        
        const [rows] = await this.connection.execute(query, [especialidad, clinica]);
        return rows;
    }
    
    /**
     * ⏰ VALIDACIÓN DE HORARIOS SIN SOLAPAMIENTOS
     * Verifica que no hay conflictos de horarios
     */
    async verificarDisponibilidadHorarios(idEstudiante, diaSemana, horaInicio, horaFin) {
        const fechaAsignacion = this.calcularProximaFecha(diaSemana);
        
        // Verificar solapamientos en asignaciones_horario
        const queryAsignaciones = `
            SELECT COUNT(*) as conflictos
            FROM asignaciones_horario ah
            WHERE ah.id_estudiante = ?
                AND ah.dia_semana = ?
                AND ah.fecha_asignacion = ?
                AND ah.estado IN ('programada', 'confirmada', 'en_progreso')
                AND (
                    (ah.hora_inicio < ? AND ah.hora_fin > ?) OR
                    (ah.hora_inicio < ? AND ah.hora_fin > ?) OR
                    (ah.hora_inicio >= ? AND ah.hora_fin <= ?)
                )
        `;
        
        const [conflictos] = await this.connection.execute(queryAsignaciones, [
            idEstudiante, diaSemana, fechaAsignacion,
            horaFin, horaInicio,    // Overlap case 1
            horaInicio, horaInicio, // Overlap case 2
            horaInicio, horaFin     // Overlap case 3
        ]);
        
        const tieneConflictos = conflictos[0].conflictos > 0;
        
        // Verificar capacidad
        let tieneCapacidad = true;
        let capacidadDisponible = 1;
        
        const queryCapacidad = `
            SELECT 
                de.capacidad_total,
                de.pacientes_asignados,
                de.disponible
            FROM disponibilidad_estudiante de
            WHERE de.id_estudiante = ?
                AND de.fecha = ?
                AND de.dia_semana = ?
                AND de.hora_inicio = ?
        `;
        
        const [capacidad] = await this.connection.execute(queryCapacidad, [
            idEstudiante, fechaAsignacion, diaSemana, horaInicio
        ]);
        
        if (capacidad.length > 0) {
            tieneCapacidad = capacidad[0].disponible === 1;
            capacidadDisponible = capacidad[0].capacidad_total - capacidad[0].pacientes_asignados;
        }
        
        const disponible = !tieneConflictos && tieneCapacidad && capacidadDisponible > 0;
        
        return {
            disponible: disponible,
            conflictos: tieneConflictos,
            capacidadDisponible: capacidadDisponible,
            motivo: !disponible ? 
                (tieneConflictos ? 'Conflicto de horarios' : 
                 !tieneCapacidad ? 'Sin capacidad disponible' : 'Capacidad agotada') : 
                'Disponible'
        };
    }
    
    /**
     * 📊 SISTEMA DE SCORING AVANZADO
     * Calcula el score óptimo considerando múltiples factores
     */
    calcularScoreMatching(paciente, estudiante, tratamientoDetectado) {
        let score = 0;
        
        // Factor 1: Compatibilidad de tratamiento con año de carrera (40%)
        const compatibilidadTratamiento = this.complejidadPorAno[tratamientoDetectado.tratamiento]?.[estudiante.año_carrera] || 0.5;
        score += compatibilidadTratamiento * 0.4;
        
        // Factor 2: Carga de trabajo del estudiante (30%)
        const factorCarga = 1 - (estudiante.casos_activos / (estudiante.casos_necesarios || 10));
        score += Math.max(0, factorCarga) * 0.3;
        
        // Factor 3: Urgencia del paciente (20%)
        const urgenciaScore = {
            'urgente': 1.0,
            'alta': 0.8,
            'moderada': 0.6,
            'baja': 0.4
        };
        score += (urgenciaScore[tratamientoDetectado.prioridad] || 0.6) * 0.2;
        
        // Factor 4: Nivel de dolor del paciente (10%)
        if (paciente.nivel_dolor) {
            const dolorScore = paciente.nivel_dolor / 10;
            score += dolorScore * 0.1;
        } else {
            score += 0.05;
        }
        
        return Math.min(1.0, Math.max(0, score));
    }
    
    /**
     * 📅 Calcula la próxima fecha para un día específico
     */
    calcularProximaFecha(diaSemana) {
        const hoy = new Date();
        const diasMap = {
            'lunes': 1, 'martes': 2, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6, 'domingo': 0
        };
        
        const targetDay = diasMap[diaSemana];
        const currentDay = hoy.getDay();
        
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) {
            daysToAdd += 7; // Siguiente semana
        }
        
        const fechaAsignacion = new Date(hoy);
        fechaAsignacion.setDate(hoy.getDate() + daysToAdd);
        
        return fechaAsignacion.toISOString().split('T')[0];
    }
    
    /**
     * 💾 Crea asignación por horario específico en la base de datos
     */
    async crearAsignacionHorario(paciente, matchingResult) {
        const query = `
            INSERT INTO asignaciones_horario (
                id_estudiante,
                id_paciente,
                id_especialidad_estudiante,
                id_requerimiento_paciente,
                especialidad,
                clinica,
                dia_semana,
                hora_inicio,
                hora_fin,
                fecha_asignacion,
                estado,
                score_matching,
                notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // Obtener ID del requerimiento del paciente
        const [requerimiento] = await this.connection.execute(
            'SELECT id FROM requerimientos_paciente WHERE id_paciente = ? AND activo = TRUE LIMIT 1',
            [paciente.id]
        );
        
        const idRequerimiento = requerimiento[0]?.id;
        if (!idRequerimiento) {
            throw new Error('No se encontró requerimiento del paciente');
        }
        
        await this.connection.execute(query, [
            matchingResult.estudiante.id_estudiante,
            paciente.id,
            matchingResult.estudiante.id_especialidad_estudiante,
            idRequerimiento,
            matchingResult.especialidad,
            matchingResult.clinica,
            matchingResult.dia_semana,
            matchingResult.hora_inicio,
            matchingResult.hora_fin,
            matchingResult.fecha_asignacion,
            'programada',
            matchingResult.score,
            `Matching automático - Tratamiento: ${matchingResult.tratamiento}`
        ]);
        
        // Crear en tabla legacy para compatibilidad
        await this.crearAsignacionLegacy(paciente, matchingResult);
    }
    
    /**
     * 🔄 Crea asignación en tabla legacy para compatibilidad
     */
    async crearAsignacionLegacy(paciente, matchingResult) {
        const query = `
            INSERT INTO asignaciones (
                id_paciente,
                id_estudiante,
                codigo_acceso,
                fecha_asignacion,
                estado,
                algoritmo_version
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const [codigo] = await this.connection.execute(
            'SELECT codigo_acceso FROM codigos_acceso WHERE id_estudiante = ? AND activo = TRUE LIMIT 1',
            [matchingResult.estudiante.id_estudiante]
        );
        
        const codigoAcceso = codigo[0]?.codigo_acceso || 'TEMP001';
        
        await this.connection.execute(query, [
            paciente.id,
            matchingResult.estudiante.id_estudiante,
            codigoAcceso,
            new Date(),
            'asignado',
            '2.0'
        ]);
    }
    
    /**
     * ⚡ Actualiza disponibilidad del estudiante en tiempo real
     */
    async actualizarDisponibilidad(matchingResult) {
        const query = `
            INSERT INTO disponibilidad_estudiante (
                id_estudiante,
                fecha,
                dia_semana,
                hora_inicio,
                hora_fin,
                especialidad,
                clinica,
                capacidad_total,
                pacientes_asignados
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE
                pacientes_asignados = pacientes_asignados + 1
        `;
        
        await this.connection.execute(query, [
            matchingResult.estudiante.id_estudiante,
            matchingResult.fecha_asignacion,
            matchingResult.dia_semana,
            matchingResult.hora_inicio,
            matchingResult.hora_fin,
            matchingResult.especialidad,
            matchingResult.clinica,
            matchingResult.estudiante.capacidad_pacientes || 1
        ]);
        
        // Actualizar casos activos del estudiante
        await this.connection.execute(
            'UPDATE estudiantes_odontologia SET casos_activos = casos_activos + 1 WHERE id = ?',
            [matchingResult.estudiante.id_estudiante]
        );
    }
    
    /**
     * 📧 NOTIFICACIONES PERSONALIZADAS ESPECÍFICAS
     * Envía mensajes exactos como "Ana se ha asignado a tu clase de 8:00 a 13:00 del día lunes"
     */
    async enviarNotificacionesAsignacion(paciente, matchingResult) {
        try {
            const fechaFormateada = new Date(matchingResult.fecha_asignacion).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // NOTIFICACIÓN AL ESTUDIANTE (formato específico solicitado)
            const mensajeEstudiante = `${paciente.nombre_completo} se ha asignado a tu clase de ${matchingResult.hora_inicio} a ${matchingResult.hora_fin} del día ${matchingResult.dia_semana} (${fechaFormateada}) en ${matchingResult.clinica}. Tratamiento: ${matchingResult.tratamiento}`;
            
            await autoNotificationService.crearNotificacion({
                id_estudiante: matchingResult.estudiante.id_estudiante,
                email_destino: matchingResult.estudiante.email,
                tipo_notificacion: 'nuevo_paciente',
                asunto: 'Nueva Asignación de Paciente',
                mensaje: mensajeEstudiante,
                id_referencia: paciente.id,
                tipo_referencia: 'asignacion'
            });
            
            // NOTIFICACIÓN AL PACIENTE
            if (paciente.email) {
                const mensajePaciente = `Hola ${paciente.nombre_completo}, has sido asignado/a con el estudiante ${matchingResult.estudiante.nombre_completo} para tu tratamiento de ${matchingResult.tratamiento}. Tu cita será el ${matchingResult.dia_semana} de ${matchingResult.hora_inicio} a ${matchingResult.hora_fin} en ${matchingResult.clinica}.`;
                
                await autoNotificationService.crearNotificacion({
                    id_paciente: paciente.id,
                    email_destino: paciente.email,
                    tipo_notificacion: 'asignacion_confirmada',
                    asunto: 'Asignación de Tratamiento Confirmada',
                    mensaje: mensajePaciente,
                    id_referencia: matchingResult.estudiante.id_estudiante,
                    tipo_referencia: 'asignacion'
                });
            }
            
        } catch (error) {
            console.error('⚠️ Error enviando notificaciones:', error.message);
        }
    }
    
    /**
     * 📊 Obtiene estadísticas del sistema de matching
     */
    async getStats() {
        try {
            const db = await getConnection();
            const connection = await db.getConnection();
            
            const [stats] = await connection.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM asignaciones_horario WHERE estado = 'programada') as asignaciones_programadas,
                    (SELECT COUNT(*) FROM asignaciones_horario WHERE estado = 'completada') as asignaciones_completadas,
                    (SELECT COUNT(*) FROM asignaciones_horario WHERE DATE(fecha_asignacion) = CURDATE()) as asignaciones_hoy,
                    (SELECT COUNT(*) FROM pacientes WHERE activo = TRUE) as pacientes_activos,
                    (SELECT COUNT(*) FROM estudiantes_odontologia WHERE estado = 'activo') as estudiantes_activos,
                    (SELECT COUNT(*) FROM especialidades_estudiante WHERE activo = TRUE) as especialidades_disponibles,
                    (SELECT AVG(score_matching) FROM asignaciones_horario WHERE score_matching > 0) as score_promedio
            `);
            
            connection.release();
            
            return {
                totalMatches: stats[0].asignaciones_programadas + stats[0].asignaciones_completadas,
                asignacionesProgramadas: stats[0].asignaciones_programadas,
                asignacionesCompletadas: stats[0].asignaciones_completadas,
                asignacionesHoy: stats[0].asignaciones_hoy,
                pacientesActivos: stats[0].pacientes_activos,
                estudiantesActivos: stats[0].estudiantes_activos,
                especialidadesDisponibles: stats[0].especialidades_disponibles,
                scorePromedio: parseFloat(stats[0].score_promedio || 0).toFixed(2),
                successRate: stats[0].asignaciones_completadas > 0 ? 
                    ((stats[0].asignaciones_completadas / (stats[0].asignaciones_programadas + stats[0].asignaciones_completadas)) * 100).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return {
                totalMatches: 0,
                successRate: 0,
                error: error.message
            };
        }
    }
    
    // ===== MANTENER COMPATIBILIDAD CON MÉTODO LEGACY =====
    async executeAutoMatching() {
        console.log('🔄 Redirigiendo a executeAdvancedMatching...');
        return await this.executeAdvancedMatching();
    }
}

module.exports = new AdvancedMatchingService();
