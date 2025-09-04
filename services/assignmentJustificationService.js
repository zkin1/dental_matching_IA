/**
 * SERVICIO DE JUSTIFICACIÓN DE ASIGNACIONES
 * Genera explicaciones inteligentes de por qué se realizó cada asignación
 */

const { getConnection } = require('../config/database');

class AssignmentJustificationService {
    constructor() {
        this.ALGORITMOS = {
            'v1.0': 'Sistema Básico de Matching',
            'v2.0': 'Sistema Avanzado con IA',
            'v3.0': 'Sistema Inteligente con ML',
            'v3.1': 'Sistema Inteligente Optimizado'
        };

        this.ESPECIALIDADES = {
            'Operatoria Dental': 'tratamientos de caries y restauraciones',
            'Endodoncia': 'tratamiento de conductos',
            'Cirugía Oral': 'extracciones y cirugías bucales',
            'Periodoncia': 'tratamiento de encías',
            'Ortodoncia': 'corrección de malposiciones dentales',
            'Odontopediatría': 'tratamientos dentales infantiles',
            'Prótesis': 'rehabilitación protésica'
        };

        this.PRIORIDADES = {
            'Muy Alta': { score: 40, texto: 'caso de extrema urgencia' },
            'Alta': { score: 30, texto: 'caso urgente' },
            'Moderada': { score: 15, texto: 'caso de prioridad estándar' },
            'Baja': { score: 5, texto: 'caso no urgente' }
        };
    }

    /**
     * Genera justificación para una asignación específica
     */
    async generateJustification(asignacionData) {
        try {
            const justificacion = [];
            let scoreTotal = 0;

            // 1. Análisis de compatibilidad de especialidad
            const especialidadMatch = this.analizarEspecialidad(asignacionData);
            if (especialidadMatch.puntos > 0) {
                justificacion.push(especialidadMatch.razon);
                scoreTotal += especialidadMatch.puntos;
            }

            // 2. Análisis de prioridad del paciente
            const prioridadAnalysis = this.analizarPrioridad(asignacionData);
            if (prioridadAnalysis.puntos > 0) {
                justificacion.push(prioridadAnalysis.razon);
                scoreTotal += prioridadAnalysis.puntos;
            }

            // 3. Análisis de disponibilidad horaria
            const horarioAnalysis = this.analizarHorario(asignacionData);
            if (horarioAnalysis.puntos > 0) {
                justificacion.push(horarioAnalysis.razon);
                scoreTotal += horarioAnalysis.puntos;
            }

            // 4. Análisis del algoritmo utilizado
            const algoritmoAnalysis = this.analizarAlgoritmo(asignacionData);
            justificacion.push(algoritmoAnalysis.razon);
            scoreTotal += algoritmoAnalysis.puntos;

            // 5. Análisis de carga de trabajo del estudiante
            const cargaAnalysis = await this.analizarCargaEstudiante(asignacionData);
            if (cargaAnalysis.puntos > 0) {
                justificacion.push(cargaAnalysis.razon);
                scoreTotal += cargaAnalysis.puntos;
            }

            // 6. Análisis de score de compatibilidad
            const scoreAnalysis = this.analizarScore(asignacionData.score_compatibilidad);
            justificacion.push(scoreAnalysis.razon);

            // Crear justificación final
            const justificacionFinal = this.crearJustificacionFinal(justificacion, scoreTotal, asignacionData);

            return justificacionFinal;

        } catch (error) {
            console.error('Error generando justificación:', error);
            return 'Asignación realizada por el sistema automático de matching.';
        }
    }

    analizarEspecialidad(data) {
        const especialidadRequerida = data.especialidad_asignada || data.tipo_tratamiento_inferido;
        const especialidadEstudiante = data.especialidades || 'General';

        if (especialidadRequerida && especialidadEstudiante.includes(especialidadRequerida)) {
            return {
                puntos: 35,
                razon: `✓ **Especialidad perfecta**: El estudiante tiene experiencia en ${especialidadRequerida}, la especialidad exacta requerida por el paciente.`
            };
        }

        if (especialidadRequerida && this.ESPECIALIDADES[especialidadRequerida]) {
            return {
                puntos: 20,
                razon: `✓ **Tratamiento compatible**: El caso requiere ${this.ESPECIALIDADES[especialidadRequerida]}, compatible con el perfil del estudiante.`
            };
        }

        return {
            puntos: 10,
            razon: `✓ **Asignación general**: Caso asignado dentro del perfil de competencias generales del estudiante.`
        };
    }

    analizarPrioridad(data) {
        const prioridad = data.prioridad || 'Moderada';
        const prioridadData = this.PRIORIDADES[prioridad] || this.PRIORIDADES['Moderada'];
        
        return {
            puntos: prioridadData.score,
            razon: `⚡ **Prioridad ${prioridad}**: Este ${prioridadData.texto}, por lo que fue asignado prioritariamente.`
        };
    }

    analizarHorario(data) {
        const dia = data.dia_semana_asignado;
        const horaInicio = data.hora_inicio_asignada;
        const horaFin = data.hora_fin_asignada;

        if (dia && horaInicio && horaFin) {
            return {
                puntos: 25,
                razon: `🕒 **Compatibilidad horaria**: Asignado para ${dia} de ${horaInicio} a ${horaFin}, horario disponible tanto para el paciente como el estudiante.`
            };
        }

        return { puntos: 0, razon: '' };
    }

    analizarAlgoritmo(data) {
        const version = data.algoritmo_version || 'v1.0';
        const nombreAlgoritmo = this.ALGORITMOS[version] || 'Sistema de Matching';

        const puntos = {
            'v3.1': 30,
            'v3.0': 25,
            'v2.0': 20,
            'v1.0': 15
        }[version] || 15;

        return {
            puntos,
            razon: `🤖 **${nombreAlgoritmo}**: Asignación calculada con algoritmos ${version === 'v3.1' ? 'de última generación' : version === 'v3.0' ? 'con inteligencia artificial' : version === 'v2.0' ? 'avanzados' : 'automatizados'}.`
        };
    }

    async analizarCargaEstudiante(data) {
        try {
            const pool = await getConnection();
            const [cargaActual] = await pool.execute(
                'SELECT COUNT(*) as total FROM asignaciones WHERE id_estudiante = ? AND estado IN ("asignado", "notificado", "contactado", "en_tratamiento")',
                [data.id_estudiante]
            );

            const totalCasos = cargaActual[0].total || 0;

            if (totalCasos <= 3) {
                return {
                    puntos: 20,
                    razon: `👨‍🎓 **Carga óptima**: El estudiante tiene ${totalCasos} caso${totalCasos !== 1 ? 's' : ''} activo${totalCasos !== 1 ? 's' : ''}, lo que permite dedicación completa al nuevo paciente.`
                };
            } else if (totalCasos <= 6) {
                return {
                    puntos: 10,
                    razon: `👨‍🎓 **Carga moderada**: El estudiante maneja ${totalCasos} casos activos, dentro del rango recomendado para un aprendizaje efectivo.`
                };
            } else {
                return {
                    puntos: 5,
                    razon: `👨‍🎓 **Alta experiencia**: El estudiante tiene ${totalCasos} casos activos, lo que demuestra experiencia y capacidad de manejo múltiple.`
                };
            }
        } catch (error) {
            return { puntos: 0, razon: '' };
        }
    }

    analizarScore(score) {
        const scoreNum = parseFloat(score) || 0;
        const scorePorcentaje = Math.round(scoreNum * 100);

        if (scorePorcentaje >= 90) {
            return { razon: `🎯 **Compatibilidad excepcional**: Score de matching de ${scorePorcentaje}%, indicando una combinación ideal entre paciente y estudiante.` };
        } else if (scorePorcentaje >= 80) {
            return { razon: `✅ **Alta compatibilidad**: Score de matching de ${scorePorcentaje}%, mostrando una muy buena compatibilidad entre ambos perfiles.` };
        } else if (scorePorcentaje >= 70) {
            return { razon: `✓ **Buena compatibilidad**: Score de matching de ${scorePorcentaje}%, indicando una asignación apropiada y balanceada.` };
        } else if (scorePorcentaje >= 60) {
            return { razon: `⚖️ **Compatibilidad aceptable**: Score de matching de ${scorePorcentaje}%, asignación dentro de parámetros aceptables del sistema.` };
        } else {
            return { razon: `📊 **Asignación automática**: Score de matching de ${scorePorcentaje}%, asignado por disponibilidad y criterios del algoritmo.` };
        }
    }

    crearJustificacionFinal(razones, scoreTotal, data) {
        const fechaAsignacion = new Date(data.fecha_asignacion).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let justificacion = `## 📋 Justificación de Asignación\n\n`;
        justificacion += `**Fecha**: ${fechaAsignacion}\n`;
        justificacion += `**Paciente**: ${data.paciente_nombre || 'N/A'}\n`;
        justificacion += `**Estudiante**: ${data.estudiante_nombre || 'N/A'}\n\n`;

        justificacion += `### 🎯 Factores de Decisión\n\n`;
        razones.forEach((razon, index) => {
            if (razon.trim()) {
                justificacion += `${index + 1}. ${razon}\n\n`;
            }
        });

        justificacion += `### 📊 Resumen\n\n`;
        justificacion += `Esta asignación fue generada automáticamente por el sistema de matching, `;
        justificacion += `evaluando múltiples factores como compatibilidad de especialidad, prioridad del caso, `;
        justificacion += `disponibilidad horaria y carga de trabajo del estudiante. `;
        
        if (scoreTotal >= 100) {
            justificacion += `El análisis indica una **excelente compatibilidad** entre el paciente y el estudiante asignado.`;
        } else if (scoreTotal >= 80) {
            justificacion += `El análisis muestra una **muy buena compatibilidad** para esta asignación.`;
        } else if (scoreTotal >= 60) {
            justificacion += `El análisis confirma una **buena compatibilidad** entre ambos perfiles.`;
        } else {
            justificacion += `La asignación cumple con los criterios mínimos del sistema y ha sido optimizada según disponibilidad.`;
        }

        return justificacion;
    }

    /**
     * Actualiza las justificaciones para asignaciones existentes
     */
    async updateExistingJustifications() {
        try {
            const pool = await getConnection();
            
            // Obtener todas las asignaciones sin justificación
            const [asignaciones] = await pool.execute(`
                SELECT 
                    a.id,
                    a.score_compatibilidad,
                    a.algoritmo_version,
                    a.especialidad_asignada,
                    a.dia_semana_asignado,
                    a.hora_inicio_asignada,
                    a.hora_fin_asignada,
                    a.fecha_asignacion,
                    a.id_estudiante,
                    p.nombre_completo as paciente_nombre,
                    p.tipo_tratamiento_inferido,
                    p.prioridad,
                    e.nombre_completo as estudiante_nombre,
                    e.especialidades
                FROM asignaciones a
                LEFT JOIN pacientes p ON a.id_paciente = p.id
                LEFT JOIN estudiantes_odontologia e ON a.id_estudiante = e.id
                WHERE a.justificacion_asignacion IS NULL OR a.justificacion_asignacion = ''
                ORDER BY a.fecha_asignacion DESC
            `);

            console.log(`🔍 Procesando ${asignaciones.length} asignaciones sin justificación...`);

            let procesadas = 0;
            for (const asignacion of asignaciones) {
                try {
                    const justificacion = await this.generateJustification(asignacion);
                    
                    await pool.execute(
                        'UPDATE asignaciones SET justificacion_asignacion = ? WHERE id = ?',
                        [justificacion, asignacion.id]
                    );
                    
                    procesadas++;
                    console.log(`✅ Asignación #${asignacion.id} actualizada (${procesadas}/${asignaciones.length})`);
                    
                    // Pequeña pausa para no sobrecargar la base de datos
                    if (procesadas % 10 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (error) {
                    console.error(`❌ Error procesando asignación #${asignacion.id}:`, error.message);
                }
            }

            console.log(`🎉 Justificaciones actualizadas: ${procesadas}/${asignaciones.length}`);
            return { procesadas, total: asignaciones.length };

        } catch (error) {
            console.error('❌ Error actualizando justificaciones:', error);
            throw error;
        }
    }
}

module.exports = AssignmentJustificationService;