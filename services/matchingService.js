const { getConnection } = require('../config/database');
const autoNotificationService = require('./autoNotificationService');

/**
 * Servicio de Matching Avanzado para Sistema Dental
 * Versión 2.1 - Matching Inteligente con Horarios de Pacientes y Estudiantes
 * 
 * ALGORITMO DE MATCHING INTELIGENTE MEJORADO:
 * 1. Detección de tratamiento basada en síntomas del paciente
 * 2. Asignación automática de clínica según edad (Niño/Adulto)
 * 3. 🆕 Extracción y análisis de preferencias horarias del paciente
 * 4. 🆕 Verificación de compatibilidad horarios paciente-estudiante
 * 5. Búsqueda de estudiantes disponibles por especialidad y horario
 * 6. Validación de disponibilidad sin solapamientos
 * 7. 🆕 Scoring IA v4.0 con prioridad en compatibilidad horaria (30% del score)
 * 8. Creación de asignaciones específicas por horario
 * 9. Actualización de disponibilidad en tiempo real
 * 10. Notificaciones automáticas personalizadas
 * 
 * MEJORAS v2.1:
 * - Sistema de scoring rediseñado con horarios como factor principal
 * - Análisis inteligente de solapamiento de horarios paciente-estudiante  
 * - Flexibilidad horaria como factor de scoring
 * - Validación estricta de compatibilidad (mínimo 50% solapamiento)
 * - Logs detallados para debugging y optimización
 */
class AdvancedMatchingService {
    constructor() {
        this.connection = null;
        this.isMatching = false;
        
        // MAPEO INTELIGENTE DE IA MEJORADO - Versión 3.0
        this.sintomasATratamientos = {
            // ENDODONCIA - Problemas de raíz/nervio - IA Mejorada
            'dolor constante': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.92 },
            'dolor insoportable': { tratamientos: ['Endodoncia'], prioridad: 'urgente', confianza: 0.98 },
            'dolor al masticar': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.85 },
            'dolor punzante': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.88 },
            'dolor pulsátil': { tratamientos: ['Endodoncia'], prioridad: 'urgente', confianza: 0.95 },
            'sensibilidad al frío': { tratamientos: ['Endodoncia'], prioridad: 'moderada', confianza: 0.75 },
            'sensibilidad al calor': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.90 },
            'sensibilidad extrema': { tratamientos: ['Endodoncia'], prioridad: 'urgente', confianza: 0.93 },
            'inflamación': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.80 },
            'hinchazón': { tratamientos: ['Endodoncia'], prioridad: 'urgente', confianza: 0.90 },
            'absceso': { tratamientos: ['Endodoncia'], prioridad: 'urgente', confianza: 0.98 },
            'tratamiento de conducto': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 1.0 },
            'me duele una muela': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.88 },
            'dolor de muelas': { tratamientos: ['Endodoncia'], prioridad: 'alta', confianza: 0.90 },
            'muela infectada': { tratamientos: ['Endodoncia'], prioridad: 'urgente', confianza: 0.95 },
            'pus': { tratamientos: ['Endodoncia'], prioridad: 'urgente', confianza: 0.92 },
            'flemón': { tratamientos: ['Endodoncia'], prioridad: 'urgente', confianza: 0.96 },
            
            // DESTARTRAJE Y PULIDO - Limpieza y mantenimiento - IA Mejorada
            'limpieza dental': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'baja', confianza: 1.0 },
            'limpieza profunda': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'moderada', confianza: 0.95 },
            'chequeo general': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'baja', confianza: 0.85 },
            'chequeo de rutina': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'baja', confianza: 0.90 },
            'profilaxis': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'baja', confianza: 0.95 },
            'sarro': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'moderada', confianza: 0.92 },
            'cálculo dental': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'moderada', confianza: 0.88 },
            'placa bacteriana': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'moderada', confianza: 0.90 },
            'placa': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'moderada', confianza: 0.88 },
            'dientes amarillos': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'baja', confianza: 0.75 },
            'dientes manchados': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'baja', confianza: 0.80 },
            'mal aliento persistente': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'moderada', confianza: 0.70 },
            'halitosis': { tratamientos: ['Destartraje y Pulido Coronario'], prioridad: 'moderada', confianza: 0.75 },
            
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
            
            // ENVIAR REPORTE ADMINISTRATIVO CON TEMPLATES PROFESIONALES
            if (totalProcessed > 0) {
                try {
                    console.log(`📧 Enviando reporte administrativo de matching...`);
                    await autoNotificationService.sendAdminMatchingReport(matchingResults, {
                        processed: totalProcessed,
                        matched: totalMatched,
                        successRate: result.successRate,
                        duration: result.duration,
                        averageScore: matchingResults.length > 0 ? 
                            (matchingResults.reduce((sum, r) => sum + (r.score * 100), 0) / matchingResults.length).toFixed(1) : 
                            '0'
                    });
                } catch (adminError) {
                    console.error('⚠️ Error enviando reporte administrativo:', adminError.message);
                    // No fallar el matching por error en reporte admin
                }
            }
            
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
     * 🎯 ALGORITMO DE MATCHING ÓPTIMO CON HORARIOS DE PACIENTES
     * Encuentra el mejor estudiante disponible considerando horarios de estudiantes Y pacientes
     */
    async encontrarMatchingOptimo(paciente, tratamientoDetectado, clinica) {
        console.log(`🔍 Buscando matching óptimo para ${tratamientoDetectado.especialidad} en ${clinica}`);
        
        // Obtener preferencias de horario del paciente
        const preferenciasHorario = await this.obtenerPreferenciasHorarioPaciente(paciente);
        console.log(`⏰ Preferencias del paciente: ${JSON.stringify(preferenciasHorario)}`);
        
        // Obtener estudiantes disponibles con sus horarios
        const estudiantesDisponibles = await this.getEstudiantesDisponiblesConHorarios(tratamientoDetectado.especialidad, clinica);
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
            // VALIDACIÓN DE COMPATIBILIDAD DE HORARIOS PACIENTE-ESTUDIANTE
            const compatibilidadHorarios = this.verificarCompatibilidadHorarios(
                preferenciasHorario, 
                estudiante
            );
            
            if (!compatibilidadHorarios.compatible) {
                console.log(`⏰ ${estudiante.nombre_completo} horarios incompatibles: ${compatibilidadHorarios.motivo}`);
                continue;
            }
            
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
            
            // CÁLCULO DE SCORE DE MATCHING MEJORADO (incluye compatibilidad horarios)
            const score = this.calcularScoreMatchingConHorarios(
                paciente, 
                estudiante, 
                tratamientoDetectado, 
                compatibilidadHorarios
            );
            
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
                    disponibilidad: disponibilidadHorarios,
                    compatibilidadHorarios: compatibilidadHorarios
                };
            }
        }
        
        if (!mejorMatch) {
            return {
                success: false,
                reason: 'No hay horarios compatibles entre estudiantes y paciente'
            };
        }
        
        console.log(`✅ Mejor match: ${mejorMatch.estudiante.nombre_completo} (Score: ${mejorScore.toFixed(2)}) - Compatibilidad: ${mejorMatch.compatibilidadHorarios.scoreCompatibilidad.toFixed(2)}`);
        return mejorMatch;
    }
    
    /**
     * ⏰ OBTENER PREFERENCIAS DE HORARIO DEL PACIENTE
     * Extrae y normaliza las preferencias horarias desde requerimientos_paciente
     */
    async obtenerPreferenciasHorarioPaciente(paciente) {
        // Buscar requerimientos específicos del paciente
        const queryRequerimientos = `
            SELECT dias_disponibles, horarios_preferidos
            FROM requerimientos_paciente 
            WHERE id_paciente = ? AND activo = TRUE 
            LIMIT 1
        `;
        
        const [requerimientos] = await this.connection.execute(queryRequerimientos, [paciente.id]);
        
        let diasDisponibles = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
        let horariosPreferidos = {
            manana: { inicio: '08:00', fin: '13:00' },
            tarde: { inicio: '14:00', fin: '20:00' }
        };
        
        // Si existe requerimiento específico, usar esos datos
        if (requerimientos.length > 0) {
            try {
                if (requerimientos[0].dias_disponibles) {
                    diasDisponibles = JSON.parse(requerimientos[0].dias_disponibles);
                }
                if (requerimientos[0].horarios_preferidos) {
                    horariosPreferidos = JSON.parse(requerimientos[0].horarios_preferidos);
                }
            } catch (error) {
                console.log('⚠️ Error parseando horarios de requerimientos, usando fallback');
            }
        }
        
        // Fallback a datos del paciente original
        if (paciente.dias_disponibles) {
            try {
                const diasTexto = paciente.dias_disponibles.toLowerCase();
                const diasDetectados = this.diasSemana.filter(dia => diasTexto.includes(dia));
                if (diasDetectados.length > 0) {
                    diasDisponibles = diasDetectados;
                }
            } catch (error) {
                console.log('⚠️ Error parseando días del paciente');
            }
        }
        
        if (paciente.horario_preferencia) {
            try {
                const horarioTexto = paciente.horario_preferencia.toLowerCase();
                if (horarioTexto.includes('mañana') || horarioTexto.includes('manana')) {
                    horariosPreferidos = { manana: { inicio: '08:00', fin: '13:00' } };
                } else if (horarioTexto.includes('tarde')) {
                    horariosPreferidos = { tarde: { inicio: '14:00', fin: '20:00' } };
                }
            } catch (error) {
                console.log('⚠️ Error parseando preferencia horaria del paciente');
            }
        }
        
        return {
            diasDisponibles: diasDisponibles,
            horariosPreferidos: horariosPreferidos,
            flexibilidad: this.calcularFlexibilidadHoraria(diasDisponibles, horariosPreferidos)
        };
    }
    
    /**
     * 📊 Calcula flexibilidad horaria del paciente (para scoring)
     */
    calcularFlexibilidadHoraria(dias, horarios) {
        const totalDias = dias.length;
        const totalTurnos = Object.keys(horarios).length;
        
        // Más días y turnos = mayor flexibilidad
        const scoreDias = Math.min(1.0, totalDias / 5); // Máximo 5 días
        const scoreTurnos = Math.min(1.0, totalTurnos / 2); // Máximo mañana + tarde
        
        return (scoreDias + scoreTurnos) / 2;
    }
    
    /**
     * 🔄 VERIFICAR COMPATIBILIDAD DE HORARIOS PACIENTE-ESTUDIANTE
     * Comprueba si los horarios del estudiante son compatibles con preferencias del paciente
     */
    verificarCompatibilidadHorarios(preferenciasHorario, estudiante) {
        const { diasDisponibles, horariosPreferidos } = preferenciasHorario;
        
        // 1. Verificar compatibilidad de día
        const diaCompatible = diasDisponibles.includes(estudiante.dia_semana);
        
        if (!diaCompatible) {
            return {
                compatible: false,
                motivo: `Día ${estudiante.dia_semana} no disponible para el paciente`,
                scoreCompatibilidad: 0
            };
        }
        
        // 2. Verificar compatibilidad de horario
        const horaInicioEst = this.convertirHoraAMinutos(estudiante.hora_inicio);
        const horaFinEst = this.convertirHoraAMinutos(estudiante.hora_fin);
        
        let mejorOverlap = 0;
        let mejorTurno = '';
        
        for (const [turno, horario] of Object.entries(horariosPreferidos)) {
            const horaInicioPac = this.convertirHoraAMinutos(horario.inicio);
            const horaFinPac = this.convertirHoraAMinutos(horario.fin);
            
            // Calcular solapamiento
            const inicioOverlap = Math.max(horaInicioEst, horaInicioPac);
            const finOverlap = Math.min(horaFinEst, horaFinPac);
            
            if (finOverlap > inicioOverlap) {
                const duracionOverlap = finOverlap - inicioOverlap;
                const duracionEstudiante = horaFinEst - horaInicioEst;
                const porcentajeOverlap = duracionOverlap / duracionEstudiante;
                
                if (porcentajeOverlap > mejorOverlap) {
                    mejorOverlap = porcentajeOverlap;
                    mejorTurno = turno;
                }
            }
        }
        
        // Requerir al menos 50% de solapamiento para ser compatible
        const compatible = mejorOverlap >= 0.5;
        
        return {
            compatible: compatible,
            motivo: compatible ? 
                `Compatible con turno ${mejorTurno} (${(mejorOverlap * 100).toFixed(0)}% solapamiento)` :
                'Sin solapamiento suficiente con horarios preferidos',
            scoreCompatibilidad: mejorOverlap,
            turnoPreferido: mejorTurno,
            porcentajeSolapamiento: mejorOverlap
        };
    }
    
    /**
     * 🕒 Convierte hora formato "HH:MM" a minutos desde medianoche
     */
    convertirHoraAMinutos(hora) {
        const [horas, minutos] = hora.split(':').map(Number);
        return horas * 60 + minutos;
    }
    
    /**
     * 👥 OBTIENE ESTUDIANTES DISPONIBLES CON HORARIOS DETALLADOS
     * Versión mejorada que incluye horarios completos de disponibilidad
     */
    async getEstudiantesDisponiblesConHorarios(especialidad, clinica) {
        const query = `
            SELECT DISTINCT
                e.id as id_estudiante,
                e.nombre_completo,
                e.año_carrera,
                e.telefono,
                e.email,
                e.casos_activos,
                e.casos_completados,
                e.casos_necesarios,
                de.fecha,
                de.dia_semana,
                de.hora_inicio,
                de.hora_fin,
                de.especialidad,
                de.clinica,
                de.capacidad_total,
                de.pacientes_asignados,
                (de.capacidad_total - de.pacientes_asignados) as espacios_disponibles
            FROM estudiantes_odontologia e
            INNER JOIN disponibilidad_estudiante de ON e.id = de.id_estudiante
            WHERE e.estado = 'activo'
                AND de.especialidad = ?
                AND de.clinica LIKE ?
                AND de.fecha >= CURDATE()
                AND de.disponible = 1
                AND (de.capacidad_total - de.pacientes_asignados) > 0
                AND e.casos_activos < e.casos_necesarios
            ORDER BY 
                de.fecha ASC,
                e.casos_activos ASC,
                de.hora_inicio ASC
        `;
        
        const clinicaPattern = clinica.includes('Nino') ? '%Nino%' : '%Adulto%';
        const [rows] = await this.connection.execute(query, [especialidad, clinicaPattern]);
        return rows;
    }
    
    /**
     * 👥 Obtiene estudiantes disponibles para una especialidad y clínica específica (método legacy)
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
     * 📊 SISTEMA DE SCORING AVANZADO CON IA v4.0 - CON HORARIOS DE PACIENTES
     * Algoritmo mejorado que incluye compatibilidad de horarios paciente-estudiante
     */
    calcularScoreMatchingConHorarios(paciente, estudiante, tratamientoDetectado, compatibilidadHorarios) {
        let score = 0;
        const factores = {};
        
        // Factor 1: Compatibilidad de tratamiento con año de carrera (25%) - REDUCIDO
        const compatibilidadTratamiento = this.complejidadPorAno[tratamientoDetectado.tratamiento]?.[estudiante.año_carrera] || 0.5;
        const scoreCompatibilidad = compatibilidadTratamiento * 0.25;
        score += scoreCompatibilidad;
        factores.compatibilidad = scoreCompatibilidad;
        
        // Factor 2: NUEVO - Compatibilidad de horarios paciente-estudiante (30%) - PRIORIDAD MÁXIMA
        const scoreHorarios = compatibilidadHorarios.scoreCompatibilidad * 0.30;
        score += scoreHorarios;
        factores.horarios = scoreHorarios;
        
        // Factor 3: Carga de trabajo optimizada (20%) - REDUCIDO
        const casosActivos = estudiante.casos_activos || 0;
        const casosNecesarios = estudiante.casos_necesarios || 10;
        const factorCarga = Math.max(0, 1 - (casosActivos / casosNecesarios));
        const bonoCarga = casosActivos === 0 ? 0.05 : 0; // REDUCIDO
        const scoreCarga = (factorCarga * 0.20) + bonoCarga;
        score += scoreCarga;
        factores.carga = scoreCarga;
        
        // Factor 4: Urgencia inteligente (15%) - REDUCIDO
        const urgenciaScores = {
            'urgente': 1.0,
            'alta': 0.85,
            'moderada': 0.65,
            'baja': 0.4
        };
        const scoreUrgencia = (urgenciaScores[tratamientoDetectado.prioridad] || 0.65) * 0.15;
        score += scoreUrgencia;
        factores.urgencia = scoreUrgencia;
        
        // Factor 5: Análisis de dolor (5%) - REDUCIDO
        let scoreDolor = 0.025; // valor base reducido
        if (paciente.nivel_dolor) {
            const nivelDolor = parseInt(paciente.nivel_dolor) || 5;
            if (nivelDolor >= 8) {
                scoreDolor = 0.05;
            } else if (nivelDolor >= 6) {
                scoreDolor = 0.04;
            } else if (nivelDolor >= 4) {
                scoreDolor = 0.03;
            } else {
                scoreDolor = 0.02;
            }
        }
        score += scoreDolor;
        factores.dolor = scoreDolor;
        
        // Factor 6: Experiencia del estudiante (5%) - REDUCIDO
        const casosCompletados = estudiante.casos_completados || 0;
        let scoreExperiencia = 0;
        if (casosCompletados >= 20) {
            scoreExperiencia = 0.05;
        } else if (casosCompletados >= 10) {
            scoreExperiencia = 0.04;
        } else if (casosCompletados >= 5) {
            scoreExperiencia = 0.03;
        } else {
            scoreExperiencia = 0.02;
        }
        score += scoreExperiencia;
        factores.experiencia = scoreExperiencia;
        
        // Multiplicadores de IA v4.0 - Incluye horarios
        let multiplicadorIA = 1.0;
        
        // BONUS MÁXIMO para matching perfecto de horarios
        if (compatibilidadHorarios.scoreCompatibilidad >= 0.9) {
            multiplicadorIA += 0.15; // NUEVO - Bonus grande para horarios perfectos
        } else if (compatibilidadHorarios.scoreCompatibilidad >= 0.7) {
            multiplicadorIA += 0.1; // Bonus medio para horarios buenos
        }
        
        // Bonus para matching perfecto de especialidad
        if (tratamientoDetectado.confianza >= 0.9 && compatibilidadTratamiento >= 0.8) {
            multiplicadorIA += 0.05; // REDUCIDO
        }
        
        // Penalty para sobrecarga de estudiante (más estricto)
        if (casosActivos > casosNecesarios * 0.7) {
            multiplicadorIA -= 0.1; // AUMENTADO
        }
        
        // NUEVO - Bonus para combinación perfecta: horarios + urgencia
        if (compatibilidadHorarios.scoreCompatibilidad >= 0.8 && tratamientoDetectado.prioridad === 'urgente') {
            multiplicadorIA += 0.05;
        }
        
        // NUEVO - Penalty si horarios son apenas compatibles
        if (compatibilidadHorarios.scoreCompatibilidad < 0.6) {
            multiplicadorIA -= 0.05;
        }
        
        const scoreFinal = Math.min(1.0, Math.max(0, score * multiplicadorIA));
        
        // Log mejorado para debugging
        if (process.env.NODE_ENV === 'development') {
            console.log(`🧮 Score IA v4.0: ${scoreFinal.toFixed(3)} | Horarios: ${scoreHorarios.toFixed(3)} | Otros: ${JSON.stringify(factores)} | Mult: ${multiplicadorIA.toFixed(2)}`);
        }
        
        return scoreFinal;
    }
    
    /**
     * 📊 SISTEMA DE SCORING AVANZADO CON IA v3.0 (método legacy)
     * Algoritmo mejorado con machine learning patterns
     */
    calcularScoreMatching(paciente, estudiante, tratamientoDetectado) {
        let score = 0;
        const factores = {};
        
        // Factor 1: Compatibilidad de tratamiento con año de carrera (35%)
        const compatibilidadTratamiento = this.complejidadPorAno[tratamientoDetectado.tratamiento]?.[estudiante.año_carrera] || 0.5;
        const scoreCompatibilidad = compatibilidadTratamiento * 0.35;
        score += scoreCompatibilidad;
        factores.compatibilidad = scoreCompatibilidad;
        
        // Factor 2: Carga de trabajo optimizada (25%) - IA Mejorada
        const casosActivos = estudiante.casos_activos || 0;
        const casosNecesarios = estudiante.casos_necesarios || 10;
        const factorCarga = Math.max(0, 1 - (casosActivos / casosNecesarios));
        // Bonificación para estudiantes con poca carga
        const bonoCarga = casosActivos === 0 ? 0.1 : 0;
        const scoreCarga = (factorCarga * 0.25) + bonoCarga;
        score += scoreCarga;
        factores.carga = scoreCarga;
        
        // Factor 3: Urgencia inteligente (20%) - IA Mejorada
        const urgenciaScores = {
            'urgente': 1.0,
            'alta': 0.85,
            'moderada': 0.65,
            'baja': 0.4
        };
        const scoreUrgencia = (urgenciaScores[tratamientoDetectado.prioridad] || 0.65) * 0.2;
        score += scoreUrgencia;
        factores.urgencia = scoreUrgencia;
        
        // Factor 4: Análisis de dolor avanzado (10%) - IA Mejorada
        let scoreDolor = 0.05; // valor base
        if (paciente.nivel_dolor) {
            const nivelDolor = parseInt(paciente.nivel_dolor) || 5;
            // Scoring no lineal para dolor alto
            if (nivelDolor >= 8) {
                scoreDolor = 0.1; // Máximo para dolor severo
            } else if (nivelDolor >= 6) {
                scoreDolor = 0.08;
            } else if (nivelDolor >= 4) {
                scoreDolor = 0.06;
            } else {
                scoreDolor = 0.04;
            }
        }
        score += scoreDolor;
        factores.dolor = scoreDolor;
        
        // Factor 5: Experiencia del estudiante (10%) - NUEVO
        const casosCompletados = estudiante.casos_completados || 0;
        let scoreExperiencia = 0;
        if (casosCompletados >= 20) {
            scoreExperiencia = 0.1; // Muy experimentado
        } else if (casosCompletados >= 10) {
            scoreExperiencia = 0.08;
        } else if (casosCompletados >= 5) {
            scoreExperiencia = 0.06;
        } else {
            scoreExperiencia = 0.04;
        }
        score += scoreExperiencia;
        factores.experiencia = scoreExperiencia;
        
        // Aplicar multiplicadores de IA para casos especiales
        let multiplicadorIA = 1.0;
        
        // Bonus para matching perfecto de especialidad
        if (tratamientoDetectado.confianza >= 0.9 && compatibilidadTratamiento >= 0.8) {
            multiplicadorIA += 0.1;
        }
        
        // Penalty para sobrecarga de estudiante
        if (casosActivos > casosNecesarios * 0.8) {
            multiplicadorIA -= 0.05;
        }
        
        // Bonus para casos urgentes con estudiantes experimentados
        if (tratamientoDetectado.prioridad === 'urgente' && casosCompletados >= 15) {
            multiplicadorIA += 0.05;
        }
        
        const scoreFinal = Math.min(1.0, Math.max(0, score * multiplicadorIA));
        
        // Log para debugging (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            console.log(`🧮 Score IA v3.0: ${scoreFinal.toFixed(3)} | Factores: ${JSON.stringify(factores)} | Mult: ${multiplicadorIA}`);
        }
        
        return scoreFinal;
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
                algoritmo_version,
                especialidad_asignada,
                dia_semana_asignado,
                hora_inicio_asignada,
                hora_fin_asignada,
                score_compatibilidad,
                observaciones_sistema
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            '2.1',
            matchingResult.especialidad,
            matchingResult.dia_semana,
            matchingResult.hora_inicio,
            matchingResult.hora_fin,
            matchingResult.score,
            `Matching automático IA v2.1 - Tratamiento: ${matchingResult.tratamiento} - Compatibilidad horarios: ${matchingResult.compatibilidadHorarios.scoreCompatibilidad.toFixed(2)}`
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
     * 📧 NOTIFICACIONES PROFESIONALES MEJORADAS
     * Utiliza los templates profesionales del EmailTemplateService
     */
    async enviarNotificacionesAsignacion(paciente, matchingResult) {
        try {
            console.log(`📧 Enviando notificaciones profesionales para asignación: ${paciente.nombre_completo} → ${matchingResult.estudiante.nombre_completo}`);
            
            // Usar el método mejorado de notificaciones con templates profesionales
            const notificationResult = await autoNotificationService.sendEnhancedMatchingNotification(
                paciente, 
                matchingResult.estudiante, 
                matchingResult
            );
            
            if (notificationResult.success) {
                console.log(`✅ Notificaciones enviadas exitosamente para la asignación`);
            } else {
                console.error(`⚠️ Problemas en notificaciones: ${notificationResult.message}`);
            }
            
        } catch (error) {
            console.error('❌ Error enviando notificaciones profesionales:', error.message);
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
