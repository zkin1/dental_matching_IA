const PatientRepository = require('../../infrastructure/repositories/PatientRepository');
const StudentRepository = require('../../infrastructure/repositories/StudentRepository');
const AssignmentRepository = require('../../infrastructure/repositories/AssignmentRepository');
const SymptomAnalyzer = require('../../core/ai/SymptomAnalyzer');
const Assignment = require('../../core/entities/Assignment');
const { BusinessLogicError } = require('../../shared/errors/AppError');
const logger = require('../../shared/utils/logger');

/**
 * Servicio de Matching Inteligente con Algoritmos de IA/ML
 * Utiliza análisis avanzado de síntomas y optimización multi-criterio
 */
class IntelligentMatchingService {
    constructor() {
        this.patientRepository = new PatientRepository();
        this.studentRepository = new StudentRepository();
        this.assignmentRepository = new AssignmentRepository();
        this.symptomAnalyzer = new SymptomAnalyzer();
        
        // Configuración de algoritmos
        this.matchingConfig = {
            maxIterations: 100,
            convergenceThreshold: 0.01,
            diversityWeight: 0.15,
            fairnessWeight: 0.20,
            qualityWeight: 0.65
        };
    }

    /**
     * 🚀 ALGORITMO PRINCIPAL DE MATCHING INTELIGENTE
     * Utiliza optimización multi-objetiva con IA
     */
    async executeIntelligentMatching(options = {}) {
        const startTime = Date.now();
        logger.matching('Iniciando matching inteligente con IA', options);
        
        try {
            // 1. PREPARACIÓN DE DATOS
            console.log('🔍 Paso 1: Preparando datos de matching...');
            const { patients, students } = await this.prepareMatchingData(options);
            
            console.log(`✅ Datos preparados: ${patients.length} pacientes, ${students.length} estudiantes`);
            
            if (patients.length === 0) {
                console.log('❌ No hay pacientes pendientes para matching');
                return {
                    success: true,
                    message: 'No hay pacientes pendientes para matching',
                    processed: 0,
                    matched: 0,
                    algorithm: 'intelligent-v3.0'
                };
            }

            if (students.length === 0) {
                console.log('❌ No hay estudiantes disponibles para matching');
                return {
                    success: true,
                    message: 'No hay estudiantes disponibles para matching',
                    processed: patients.length,
                    matched: 0,
                    algorithm: 'intelligent-v3.0'
                };
            }

            // 2. ANÁLISIS INTELIGENTE DE SÍNTOMAS
            console.log('🧠 Paso 2: Analizando síntomas con IA...');
            const analyzedPatients = await this.analyzePatientSymptoms(patients);
            console.log(`✅ Síntomas analizados para ${analyzedPatients.length} pacientes`);
            
            // 3. EVALUACIÓN DE ESTUDIANTES CON ML
            console.log('🎓 Paso 3: Evaluando estudiantes con ML...');
            const evaluatedStudents = await this.evaluateStudents(students);
            console.log(`✅ Estudiantes evaluados: ${evaluatedStudents.length}`);
            
            // 4. GENERACIÓN DE MATRIZ DE COMPATIBILIDAD
            console.log('📊 Paso 4: Generando matriz de compatibilidad...');
            const compatibilityMatrix = await this.generateCompatibilityMatrix(
                analyzedPatients, 
                evaluatedStudents
            );
            console.log(`✅ Matriz generada: ${compatibilityMatrix.length} combinaciones`);
            
            // 5. OPTIMIZACIÓN MULTI-OBJETIVA
            console.log('🎯 Paso 5: Optimizando matching...');
            const optimalMatches = await this.optimizeMatching(
                compatibilityMatrix,
                analyzedPatients,
                evaluatedStudents
            );
            console.log(`✅ Matches optimizados: ${optimalMatches.length}`);
            
            // 6. VALIDACIÓN Y REFINAMIENTO
            console.log('✅ Paso 6: Validando matches...');
            const validatedMatches = await this.validateAndRefineMatches(optimalMatches);
            console.log(`✅ Matches validados: ${validatedMatches.length}`);
            
            // 7. EJECUCIÓN DE ASIGNACIONES
            console.log('💾 Paso 7: Ejecutando asignaciones...');
            const executionResults = await this.executeMatches(validatedMatches);
            console.log(`✅ Ejecución completada: ${executionResults.successful} exitosos, ${executionResults.failed} fallidos`);
            
            const duration = Date.now() - startTime;
            
            const result = {
                success: true,
                algorithm: 'intelligent-v3.0',
                processed: patients.length,
                matched: executionResults.successful,
                failed: executionResults.failed,
                duration: `${duration}ms`,
                averageScore: this.calculateAverageScore(validatedMatches),
                matches: executionResults.matches,
                analytics: {
                    symptomAnalysis: this.getSymptomAnalytics(analyzedPatients),
                    studentUtilization: this.getStudentUtilization(evaluatedStudents),
                    matchingEfficiency: this.calculateEfficiency(validatedMatches)
                }
            };
            
            logger.matching('Matching inteligente completado', result);
            return result;
            
        } catch (error) {
            console.error('❌ Error en matching inteligente:', error.message);
            logger.error('Error en matching inteligente', error);
            
            // Fallback a matching simple
            console.log('🔄 Intentando matching simple como fallback...');
            return await this.executeSimpleMatching(options);
        }
    }

    /**
     * Matching simple como fallback
     */
    async executeSimpleMatching(options = {}) {
        console.log('🔄 Ejecutando matching simple...');
        
        try {
            const { patients, students } = await this.prepareMatchingData(options);
            
            if (patients.length === 0 || students.length === 0) {
                return {
                    success: true,
                    message: 'No hay datos suficientes para matching',
                    processed: patients.length,
                    matched: 0,
                    algorithm: 'simple-fallback'
                };
            }

            const matches = [];
            let successCount = 0;
            
            // Algoritmo simple: asignar por orden de prioridad y disponibilidad
            for (const patient of patients) {
                // Encontrar estudiante disponible
                const availableStudent = students.find(s => s.casosActivos < s.casosNecesarios);
                
                if (availableStudent) {
                    try {
                        // Crear asignación
                        const assignment = await this.createSimpleAssignment(patient, availableStudent);
                        matches.push(assignment);
                        successCount++;
                        
                        // Actualizar casos activos del estudiante
                        availableStudent.casosActivos++;
                        
                        console.log(`✅ Match simple: Paciente ${patient.id} -> Estudiante ${availableStudent.id}`);
                    } catch (error) {
                        console.error(`❌ Error en asignación simple para paciente ${patient.id}:`, error.message);
                    }
                }
            }

            return {
                success: true,
                algorithm: 'simple-fallback',
                processed: patients.length,
                matched: successCount,
                failed: patients.length - successCount,
                matches: matches,
                message: 'Matching completado con algoritmo simple'
            };
            
        } catch (error) {
            console.error('❌ Error en matching simple:', error);
            throw error;
        }
    }

    /**
     * Crea una asignación simple con información de horario
     */
    async createSimpleAssignment(patient, student) {
        try {
            console.log(`🔄 Iniciando creación de asignación: Paciente ${patient.id} -> Estudiante ${student.id}`);
            
            // Buscar especialidad del estudiante
            const especialidadesResult = await this.assignmentRepository.execute(
                'SELECT id, especialidad, clinica, dia_semana, hora_inicio, hora_fin FROM especialidades_estudiante WHERE id_estudiante = ? AND activo = 1 LIMIT 1',
                [student.id]
            );
            
            console.log('🔍 Resultado especialidades:', especialidadesResult);
            
            // El resultado puede venir como [rows] o directamente rows según el método
            const especialidades = Array.isArray(especialidadesResult[0]) ? especialidadesResult[0] : especialidadesResult;
            
            if (!especialidades || especialidades.length === 0) {
                throw new Error(`Estudiante ${student.id} no tiene especialidades configuradas`);
            }
            
            const especialidad = especialidades[0];
            console.log(`📋 Usando especialidad: ${especialidad.especialidad} - ${especialidad.dia_semana} ${especialidad.hora_inicio}-${especialidad.hora_fin}`);
            
            // Crear código de acceso
            const codigoAcceso = this.generateAccessCode();
            
            // 1. Crear código de acceso
            await this.assignmentRepository.execute(
                'INSERT INTO codigos_acceso (id_estudiante, codigo_acceso, fecha_generacion, fecha_expiracion, activo, usado) VALUES (?, ?, ?, ?, ?, ?)',
                [student.id, codigoAcceso, new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 1, 0]
            );
            
            // 2. Crear asignación legacy para compatibilidad
            const assignmentData = {
                id_paciente: patient.id,
                id_estudiante: student.id,
                codigo_acceso: codigoAcceso,
                fecha_asignacion: new Date(),
                score_compatibilidad: 0.76,
                algoritmo_version: 'v3.1',
                estado: 'asignado',
                especialidad_asignada: especialidad.especialidad,
                dia_semana_asignado: especialidad.dia_semana,
                hora_inicio_asignada: especialidad.hora_inicio,
                hora_fin_asignada: especialidad.hora_fin,
                observaciones_sistema: `Matching inteligente v3.1 - ${especialidad.especialidad} en ${especialidad.clinica} - ${especialidad.dia_semana} ${especialidad.hora_inicio}-${especialidad.hora_fin}`
            };
            
            const assignmentId = await this.assignmentRepository.create(assignmentData);
            console.log(`✅ Asignación legacy creada con ID: ${assignmentId}`);
            
            // 3. Crear requerimiento del paciente
            const reqResult = await this.assignmentRepository.execute(`
                INSERT INTO requerimientos_paciente (
                    id_paciente, especialidad_requerida, clinica_preferida, urgencia,
                    dias_disponibles, horarios_preferidos, notas_adicionales, activo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                patient.id,
                especialidad.especialidad,
                especialidad.clinica,
                patient.prioridad || 'moderada',
                JSON.stringify([especialidad.dia_semana]),
                JSON.stringify({ general: { inicio: especialidad.hora_inicio, fin: especialidad.hora_fin } }),
                `Asignación automática v3.0 - ${especialidad.especialidad}`,
                1
            ]);
            
            const requirementId = reqResult.insertId;
            console.log(`✅ Requerimiento creado con ID: ${requirementId}`);
            
            // 4. Calcular fecha de asignación
            const fechaAsignacion = this.calcularProximaFecha(especialidad.dia_semana);
            
            // 5. Crear asignación con horarios
            await this.assignmentRepository.execute(`
                INSERT INTO asignaciones_horario (
                    id_estudiante, id_paciente, id_especialidad_estudiante, id_requerimiento_paciente,
                    especialidad, clinica, dia_semana, hora_inicio, hora_fin, fecha_asignacion,
                    estado, score_matching, notas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                student.id, patient.id, especialidad.id, requirementId,
                especialidad.especialidad, especialidad.clinica, especialidad.dia_semana,
                especialidad.hora_inicio, especialidad.hora_fin, fechaAsignacion,
                'programada', 0.76, `Matching automático v3.0 - ${especialidad.especialidad} - ${especialidad.dia_semana} ${especialidad.hora_inicio}-${especialidad.hora_fin}`
            ]);
            
            console.log(`✅ Asignación con horarios creada: ${especialidad.dia_semana} ${especialidad.hora_inicio}-${especialidad.hora_fin}`);
            
            // 6. Actualizar estado del paciente
            await this.patientRepository.updateStatus(patient.id, 'asignado');
            
            console.log(`🎉 Asignación completa creada exitosamente para paciente ${patient.id}`);
            
            return {
                id: assignmentId,
                paciente_id: patient.id,
                estudiante_id: student.id,
                score: 0.76,
                codigo_acceso: codigoAcceso,
                horario: `${especialidad.dia_semana} ${especialidad.hora_inicio}-${especialidad.hora_fin}`,
                clinica: especialidad.clinica,
                especialidad: especialidad.especialidad
            };
            
        } catch (error) {
            console.error(`❌ Error creando asignación: ${error.message}`);
            throw error;
        }
    }

    /**
     * Genera información de horario para la asignación
     */
    generateScheduleInfo(patient, student) {
        // Determinar clínica basada en edad del paciente
        const clinica = patient.edad < 18 ? 
            'Clínica para el Niño y Adolescente' : 
            'Clínica Integral Adulto y Gerontología';
            
        // Generar horarios por defecto si no están especificados
        const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
        const diaSemana = diasSemana[Math.floor(Math.random() * diasSemana.length)];
        
        // Horarios comunes de atención
        const horariosMatutinos = [
            { inicio: '08:00', fin: '10:00' },
            { inicio: '09:00', fin: '11:00' },
            { inicio: '10:00', fin: '12:00' }
        ];
        
        const horariosVespertinos = [
            { inicio: '14:00', fin: '16:00' },
            { inicio: '15:00', fin: '17:00' },
            { inicio: '16:00', fin: '18:00' }
        ];
        
        const horarios = [...horariosMatutinos, ...horariosVespertinos];
        const horarioSeleccionado = horarios[Math.floor(Math.random() * horarios.length)];
        
        // Calcular próxima fecha para el día seleccionado
        const fechaAsignacion = this.calcularProximaFecha(diaSemana);
        
        return {
            diaSemana,
            horaInicio: horarioSeleccionado.inicio,
            horaFin: horarioSeleccionado.fin,
            clinica,
            fechaAsignacion,
            especialidad: this.determinarEspecialidad(patient)
        };
    }
    
    /**
     * Determina la especialidad basada en el paciente
     */
    determinarEspecialidad(patient) {
        // Si hay análisis previo, usar esa información
        if (patient.aiAnalysis && patient.aiAnalysis.primaryTreatment) {
            const treatmentSpecialtyMap = {
                'Endodoncia': 'Endodoncia',
                'Resina Simple': 'Operatoria Dental', 
                'Resina Compuesta': 'Operatoria Dental',
                'Exodoncia Simple': 'Cirugía Oral',
                'Destartraje y Pulido Coronario': 'Operatoria Dental',
                'Pulido Radicular': 'Periodoncia'
            };
            return treatmentSpecialtyMap[patient.aiAnalysis.primaryTreatment.name] || 'Consulta General';
        }
        
        // Fallback a consulta general
        return 'Consulta General';
    }
    
    /**
     * Calcula la próxima fecha para un día específico
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
     * Genera código de acceso simple
     */
    generateAccessCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Prepara datos optimizados para matching
     */
    async prepareMatchingData(options) {
        // Obtener pacientes pendientes con análisis previo
        const patients = await this.patientRepository.findPending(
            options.maxPatients || 50
        );
        
        // Obtener estudiantes disponibles con métricas
        const students = await this.studentRepository.findAvailable(
            options.specialty,
            options.maxStudents || 100
        );
        
        // Filtrar por criterios adicionales si se especifican
        let filteredPatients = patients;
        let filteredStudents = students;
        
        if (options.urgencyFilter) {
            filteredPatients = patients.filter(p => 
                ['alta', 'muy_alta'].includes(p.prioridad.toLowerCase())
            );
        }
        
        if (options.clinicFilter) {
            const targetClinic = options.clinicFilter;
            filteredPatients = patients.filter(p => {
                const suggestedClinic = p.isPediatric() ? 
                    'Clínica para el Niño y Adolescente' : 
                    'Clínica Integral Adulto y Gerontología';
                return suggestedClinic === targetClinic;
            });
        }
        
        logger.matching('Datos preparados', {
            patients: filteredPatients.length,
            students: filteredStudents.length
        });
        
        return {
            patients: filteredPatients,
            students: filteredStudents
        };
    }

    /**
     * Analiza síntomas de pacientes con IA
     */
    async analyzePatientSymptoms(patients) {
        logger.matching('Analizando síntomas con IA', { count: patients.length });
        
        const analyzedPatients = [];
        
        for (const patient of patients) {
            try {
                const symptomAnalysis = await this.symptomAnalyzer.analyzeSymptoms(
                    patient.sintomas
                );
                
                const analyzedPatient = {
                    ...patient.toPlainObject(),
                    aiAnalysis: symptomAnalysis,
                    urgencyScore: this.calculateUrgencyScore(patient, symptomAnalysis),
                    complexityLevel: symptomAnalysis.complexityScore.level,
                    riskLevel: this.calculateRiskLevel(symptomAnalysis.riskFactors),
                    treatmentPriority: this.calculateTreatmentPriority(symptomAnalysis)
                };
                
                analyzedPatients.push(analyzedPatient);
                
            } catch (error) {
                logger.warn(`Error analizando síntomas del paciente ${patient.id}`, error);
                
                // Fallback analysis
                analyzedPatients.push({
                    ...patient.toPlainObject(),
                    aiAnalysis: this.getBasicAnalysis(patient),
                    urgencyScore: 0.5,
                    complexityLevel: 'moderada',
                    riskLevel: 'bajo',
                    treatmentPriority: 1
                });
            }
        }
        
        return analyzedPatients;
    }

    /**
     * Evalúa estudiantes con métricas de ML
     */
    async evaluateStudents(students) {
        logger.matching('Evaluando estudiantes con ML', { count: students.length });
        
        const evaluatedStudents = [];
        
        for (const student of students) {
            const performance = await this.calculateStudentPerformance(student);
            const availability = this.calculateAvailability(student);
            const competencyScore = this.calculateCompetencyScore(student);
            
            const evaluatedStudent = {
                ...student.toPlainObject(),
                performance: performance,
                availability: availability,
                competencyScore: competencyScore,
                reliabilityScore: this.calculateReliabilityScore(student),
                diversityBonus: this.calculateDiversityBonus(student),
                overallRating: this.calculateOverallRating({
                    performance,
                    availability,
                    competencyScore
                })
            };
            
            evaluatedStudents.push(evaluatedStudent);
        }
        
        return evaluatedStudents.sort((a, b) => b.overallRating - a.overallRating);
    }

    /**
     * Genera matriz de compatibilidad usando algoritmos avanzados
     */
    async generateCompatibilityMatrix(patients, students) {
        logger.matching('Generando matriz de compatibilidad', {
            patients: patients.length,
            students: students.length
        });
        
        const matrix = [];
        
        for (let i = 0; i < patients.length; i++) {
            const patient = patients[i];
            const patientRow = [];
            
            for (let j = 0; j < students.length; j++) {
                const student = students[j];
                
                // Cálculo multi-dimensional de compatibilidad
                const compatibility = await this.calculateCompatibilityScore(patient, student);
                
                patientRow.push({
                    patientIndex: i,
                    studentIndex: j,
                    score: compatibility.totalScore,
                    breakdown: compatibility.breakdown,
                    confidence: compatibility.confidence,
                    riskAssessment: compatibility.riskAssessment
                });
            }
            
            // Ordenar por score descendente
            patientRow.sort((a, b) => b.score - a.score);
            matrix.push(patientRow);
        }
        
        return matrix;
    }

    /**
     * Calcula score de compatibilidad avanzado
     */
    async calculateCompatibilityScore(patient, student) {
        const breakdown = {};
        
        // 1. Compatibilidad de tratamiento (35%)
        breakdown.treatmentMatch = this.calculateTreatmentCompatibility(
            patient.aiAnalysis,
            student
        ) * 0.35;
        
        // 2. Experiencia y competencia (25%)
        breakdown.competencyMatch = this.calculateCompetencyMatch(
            patient.complexityLevel,
            student.competencyScore
        ) * 0.25;
        
        // 3. Disponibilidad temporal (20%)
        breakdown.availabilityMatch = this.calculateAvailabilityMatch(
            patient.urgencyScore,
            student.availability
        ) * 0.20;
        
        // 4. Factor de carga de trabajo (10%)
        breakdown.workloadBalance = this.calculateWorkloadBalance(
            student
        ) * 0.10;
        
        // 5. Factor de diversidad y equidad (10%)
        breakdown.diversityFactor = this.calculateDiversityFactor(
            student
        ) * 0.10;
        
        const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
        
        // Cálculo de confianza
        const confidence = this.calculateMatchConfidence(patient, student, breakdown);
        
        // Evaluación de riesgos
        const riskAssessment = this.assessMatchRisk(patient, student);
        
        return {
            totalScore: Math.min(totalScore, 1.0),
            breakdown,
            confidence,
            riskAssessment
        };
    }

    /**
     * Optimiza matching usando algoritmo genético mejorado
     */
    async optimizeMatching(matrix, patients, students) {
        logger.matching('Optimizando matching con algoritmo genético');
        
        // Generar población inicial
        let population = this.generateInitialPopulation(matrix, 50);
        
        let bestSolution = null;
        let bestFitness = -Infinity;
        let generation = 0;
        
        while (generation < this.matchingConfig.maxIterations) {
            // Evaluar fitness de cada solución
            const fitnessScores = population.map(solution => 
                this.evaluateFitness(solution, patients, students)
            );
            
            // Encontrar mejor solución de esta generación
            const currentBestIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
            const currentBestFitness = fitnessScores[currentBestIndex];
            
            if (currentBestFitness > bestFitness) {
                bestSolution = population[currentBestIndex];
                bestFitness = currentBestFitness;
            }
            
            // Verificar convergencia
            const averageFitness = fitnessScores.reduce((a, b) => a + b) / fitnessScores.length;
            if (Math.abs(currentBestFitness - averageFitness) < this.matchingConfig.convergenceThreshold) {
                logger.matching('Convergencia alcanzada', { generation, fitness: bestFitness });
                break;
            }
            
            // Generar nueva población
            population = this.evolvePopulation(population, fitnessScores);
            generation++;
        }
        
        return this.convertSolutionToMatches(bestSolution, matrix, patients, students);
    }

    /**
     * Convierte solución optimizada a matches reales
     */
    convertSolutionToMatches(solution, matrix, patients, students) {
        const matches = [];
        
        solution.forEach(assignment => {
            if (assignment.studentIndex !== -1) { // -1 significa no asignado
                const patient = patients[assignment.patientIndex];
                const student = students[assignment.studentIndex];
                const compatibility = matrix[assignment.patientIndex]
                    .find(c => c.studentIndex === assignment.studentIndex);
                
                matches.push({
                    patient: patient,
                    student: student,
                    compatibility: compatibility,
                    assignment: {
                        especialidad: patient.aiAnalysis.primaryTreatment.name,
                        clinica: patient.aiAnalysis.clinicRecommendation,
                        scoreCompatibilidad: compatibility.score,
                        observacionesSistema: this.generateMatchingNotes(patient, student, compatibility),
                        algoritmoVersion: 'intelligent-v3.0'
                    }
                });
            }
        });
        
        return matches.sort((a, b) => b.compatibility.score - a.compatibility.score);
    }

    /**
     * Valida y refina matches
     */
    async validateAndRefineMatches(matches) {
        logger.matching('Validando y refinando matches', { count: matches.length });
        
        const validMatches = [];
        const conflicts = [];
        
        for (const match of matches) {
            try {
                // Validar que el estudiante aún esté disponible
                const student = await this.studentRepository.findStudentById(match.student.id);
                if (!student || !student.isAvailable()) {
                    conflicts.push({ match, reason: 'Estudiante no disponible' });
                    continue;
                }
                
                // Validar que el paciente aún esté pendiente
                const patient = await this.patientRepository.findPatientById(match.patient.id);
                if (!patient || patient.estado !== 'pendiente') {
                    conflicts.push({ match, reason: 'Paciente no pendiente' });
                    continue;
                }
                
                // Verificar conflictos de horario (si aplicable)
                const timeConflicts = await this.checkTimeConflicts(match);
                if (timeConflicts.hasConflicts) {
                    conflicts.push({ match, reason: 'Conflicto de horarios', details: timeConflicts });
                    continue;
                }
                
                validMatches.push(match);
                
            } catch (error) {
                logger.warn('Error validando match', { match: match.patient.id, error });
                conflicts.push({ match, reason: 'Error de validación', error: error.message });
            }
        }
        
        if (conflicts.length > 0) {
            logger.matching('Conflictos detectados en matching', { conflicts: conflicts.length });
        }
        
        return validMatches;
    }

    /**
     * Ejecuta matches validados
     */
    async executeMatches(matches) {
        logger.matching('Ejecutando matches', { count: matches.length });
        
        const results = {
            successful: 0,
            failed: 0,
            matches: []
        };
        
        for (const match of matches) {
            try {
                console.log(`🔄 Ejecutando match para paciente ${match.patient.id} -> estudiante ${match.student.id}`);
                
                // Crear asignación sin transacciones complejas
                const assignment = await this.createSimpleAssignment(match.patient, match.student);
                
                results.successful++;
                results.matches.push({
                    assignmentId: assignment.id,
                    patientId: match.patient.id,
                    studentId: match.student.id,
                    score: match.compatibility?.score || 0.75,
                    specialty: match.assignment?.especialidad || 'General'
                });
                
                // Enviar notificaciones por email
                await this.sendNotificationEmails(match.patient, match.student, assignment);
                
                console.log(`✅ Match ejecutado exitosamente: ${match.patient.nombreCompleto} -> ${match.student.nombreCompleto}`);
                
            } catch (error) {
                console.error(`❌ Error ejecutando match para paciente ${match.patient.id}:`, error.message);
                logger.error('Error ejecutando match', {
                    patientId: match.patient.id,
                    studentId: match.student.id,
                    error: error
                });
                results.failed++;
            }
        }
        
        return results;
    }

    /**
     * Envía emails de notificación al estudiante y paciente
     */
    async sendNotificationEmails(patient, student, assignment) {
        try {
            // Email al estudiante
            const studentEmailData = {
                id_estudiante: student.id,
                id_paciente: patient.id,
                email_destino: student.email,
                tipo_notificacion: 'nuevo_paciente',
                asunto: `Nuevo paciente asignado - ${patient.nombreCompleto}`,
                mensaje: `Se te ha asignado un nuevo paciente: ${patient.nombreCompleto}. 
                         Código de acceso: ${assignment.codigo_acceso || 'N/A'}
                         Tratamiento: ${patient.tipoTratamiento || 'General'}
                         Prioridad: ${patient.prioridad}
                         Teléfono: ${patient.telefono}`,
                enviado: 0
            };
            
            await this.assignmentRepository.execute(
                'INSERT INTO notificaciones_email (id_estudiante, id_paciente, email_destino, tipo_notificacion, asunto, mensaje, enviado) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [studentEmailData.id_estudiante, studentEmailData.id_paciente, studentEmailData.email_destino, 
                 studentEmailData.tipo_notificacion, studentEmailData.asunto, studentEmailData.mensaje, studentEmailData.enviado]
            );
            
            // Email al paciente
            if (patient.email) {
                const patientEmailData = {
                    id_paciente: patient.id,
                    id_estudiante: student.id,
                    email_destino: patient.email,
                    tipo_notificacion: 'codigo_acceso',
                    asunto: 'Tu cita dental ha sido asignada',
                    mensaje: `Hola ${patient.nombreCompleto}, 
                             Tu solicitud de tratamiento dental ha sido asignada al estudiante ${student.nombreCompleto}.
                             El estudiante se pondrá en contacto contigo pronto.
                             Tratamiento: ${patient.tipoTratamiento || 'General'}`,
                    enviado: 0
                };
                
                await this.assignmentRepository.execute(
                    'INSERT INTO notificaciones_email (id_estudiante, id_paciente, email_destino, tipo_notificacion, asunto, mensaje, enviado) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [patientEmailData.id_estudiante, patientEmailData.id_paciente, patientEmailData.email_destino, 
                     patientEmailData.tipo_notificacion, patientEmailData.asunto, patientEmailData.mensaje, patientEmailData.enviado]
                );
            }
            
            console.log(`📧 Notificaciones programadas para estudiante ${student.email} y paciente ${patient.email || 'sin email'}`);
            
        } catch (error) {
            console.error('❌ Error enviando notificaciones:', error.message);
        }
    }

    // --- MÉTODOS AUXILIARES DE CÁLCULO ---

    calculateUrgencyScore(patient, analysis) {
        const urgencyMapping = { baja: 0.25, moderada: 0.5, alta: 0.75, urgente: 1.0 };
        const baseScore = urgencyMapping[analysis.urgencyLevel.level] || 0.5;
        const painBoost = patient.nivelDolor ? (patient.nivelDolor / 10) * 0.2 : 0;
        return Math.min(baseScore + painBoost, 1.0);
    }

    calculateRiskLevel(riskFactors) {
        if (!riskFactors || riskFactors.length === 0) return 'bajo';
        
        const highRiskCount = riskFactors.filter(r => r.level === 'alto').length;
        const moderateRiskCount = riskFactors.filter(r => r.level === 'moderado').length;
        
        if (highRiskCount > 0) return 'alto';
        if (moderateRiskCount > 1) return 'moderado';
        return 'bajo';
    }

    calculateTreatmentPriority(analysis) {
        const urgencyWeight = { baja: 1, moderada: 2, alta: 3, urgente: 4 };
        const complexityWeight = { baja: 1, moderada: 1.5, alta: 2 };
        
        const urgency = urgencyWeight[analysis.urgencyLevel.level] || 2;
        const complexity = complexityWeight[analysis.complexityScore.level] || 1.5;
        
        return urgency * complexity;
    }

    async calculateStudentPerformance(student) {
        const completionRate = student.casosCompletados / 
            Math.max(student.casosCompletados + student.casosActivos, 1);
        const experienceScore = Math.min(student.casosCompletados / 20, 1);
        const workloadEfficiency = 1 - (student.casosActivos / student.casosNecesarios);
        
        return (completionRate * 0.4 + experienceScore * 0.3 + workloadEfficiency * 0.3);
    }

    calculateAvailability(student) {
        return student.isAvailable() ? 
            (student.casosNecesarios - student.casosActivos) / student.casosNecesarios : 0;
    }

    calculateCompetencyScore(student) {
        const yearBonus = student.isAdvancedStudent() ? 0.3 : 0;
        const specialtyBonus = student.especialidades.length * 0.05;
        const experienceBonus = Math.min(student.casosCompletados / 15, 0.4);
        
        return Math.min(0.3 + yearBonus + specialtyBonus + experienceBonus, 1.0);
    }

    // Más métodos auxiliares continuarían aquí...
    // (Por brevedad, muestro la estructura principal)

    generateMatchingNotes(patient, student, compatibility) {
        const notes = [
            `MATCHING INTELIGENTE v3.0`,
            `Tratamiento: ${patient.aiAnalysis.primaryTreatment.name}`,
            `Score: ${compatibility.score.toFixed(3)}`,
            `Confianza: ${compatibility.confidence.toFixed(2)}`,
            `Urgencia: ${patient.urgencyScore.toFixed(2)}`,
            `Estudiante: ${student.nombreCompleto} (${student.anoCarrera})`
        ];
        
        return notes.join(' | ');
    }

    getBasicAnalysis(patient) {
        return {
            primaryTreatment: {
                name: patient.isPediatric() ? 'Resina Simple' : 'Destartraje y Pulido Coronario'
            },
            urgencyLevel: { level: 'moderada' },
            complexityScore: { level: 'moderada' },
            clinicRecommendation: patient.isPediatric() ? 
                'Clínica para el Niño y Adolescente' : 
                'Clínica Integral Adulto y Gerontología'
        };
    }

    /**
     * Genera población inicial para algoritmo genético
     */
    generateInitialPopulation(matrix, populationSize) {
        const population = [];
        const numPatients = matrix.length;
        const numStudents = matrix[0].length;
        
        for (let p = 0; p < populationSize; p++) {
            const solution = [];
            const usedStudents = new Set();
            
            for (let i = 0; i < numPatients; i++) {
                const availableStudents = matrix[i]
                    .filter(comp => !usedStudents.has(comp.studentIndex))
                    .slice(0, 10); // Top 10 candidatos
                
                if (availableStudents.length > 0) {
                    // Selección probabilística basada en scores
                    const selectedStudent = this.selectStudentProbabilistically(availableStudents);
                    solution.push({
                        patientIndex: i,
                        studentIndex: selectedStudent.studentIndex
                    });
                    usedStudents.add(selectedStudent.studentIndex);
                } else {
                    solution.push({
                        patientIndex: i,
                        studentIndex: -1 // No asignado
                    });
                }
            }
            
            population.push(solution);
        }
        
        return population;
    }

    /**
     * Selecciona estudiante usando selección probabilística
     */
    selectStudentProbabilistically(candidates) {
        const totalScore = candidates.reduce((sum, c) => sum + c.score, 0);
        let random = Math.random() * totalScore;
        
        for (const candidate of candidates) {
            random -= candidate.score;
            if (random <= 0) {
                return candidate;
            }
        }
        
        return candidates[0]; // Fallback
    }

    /**
     * Evalúa fitness de una solución
     */
    evaluateFitness(solution, patients, students) {
        let totalScore = 0;
        let assignedCount = 0;
        const studentWorkload = {};
        
        // Inicializar workload tracking
        students.forEach(s => { studentWorkload[s.id] = 0; });
        
        // Calcular score de matching
        solution.forEach(assignment => {
            if (assignment.studentIndex !== -1) {
                const student = students[assignment.studentIndex];
                const patient = patients[assignment.patientIndex];
                
                // Score de compatibilidad
                totalScore += this.getCompatibilityScore(patient, student);
                assignedCount++;
                studentWorkload[student.id]++;
            }
        });
        
        // Penalizar soluciones con pocos matches
        const assignmentRatio = assignedCount / solution.length;
        totalScore *= assignmentRatio;
        
        // Bonificar distribución equitativa
        const workloadVariance = this.calculateWorkloadVariance(Object.values(studentWorkload));
        const fairnessBonus = Math.max(0, 1 - workloadVariance) * this.matchingConfig.fairnessWeight;
        
        // Score final con ponderaciones
        return totalScore * this.matchingConfig.qualityWeight + fairnessBonus;
    }

    /**
     * Evoluciona población usando operadores genéticos
     */
    evolvePopulation(population, fitnessScores) {
        const newPopulation = [];
        const populationSize = population.length;
        
        // Elitismo: mantener top 10%
        const eliteCount = Math.floor(populationSize * 0.1);
        const elite = this.selectElite(population, fitnessScores, eliteCount);
        newPopulation.push(...elite);
        
        // Generar resto de la población
        while (newPopulation.length < populationSize) {
            // Selección por torneo
            const parent1 = this.tournamentSelection(population, fitnessScores);
            const parent2 = this.tournamentSelection(population, fitnessScores);
            
            // Cruzamiento
            const [child1, child2] = this.crossover(parent1, parent2);
            
            // Mutación
            const mutatedChild1 = this.mutate(child1);
            const mutatedChild2 = this.mutate(child2);
            
            newPopulation.push(mutatedChild1);
            if (newPopulation.length < populationSize) {
                newPopulation.push(mutatedChild2);
            }
        }
        
        return newPopulation.slice(0, populationSize);
    }

    /**
     * Selección elite
     */
    selectElite(population, fitnessScores, count) {
        const indexed = population.map((solution, index) => ({
            solution,
            fitness: fitnessScores[index]
        }));
        
        indexed.sort((a, b) => b.fitness - a.fitness);
        return indexed.slice(0, count).map(item => item.solution);
    }

    /**
     * Selección por torneo
     */
    tournamentSelection(population, fitnessScores, tournamentSize = 3) {
        const tournament = [];
        
        for (let i = 0; i < tournamentSize; i++) {
            const randomIndex = Math.floor(Math.random() * population.length);
            tournament.push({
                solution: population[randomIndex],
                fitness: fitnessScores[randomIndex]
            });
        }
        
        tournament.sort((a, b) => b.fitness - a.fitness);
        return tournament[0].solution;
    }

    /**
     * Operador de cruzamiento
     */
    crossover(parent1, parent2) {
        const length = parent1.length;
        const crossoverPoint = Math.floor(Math.random() * length);
        
        const child1 = [];
        const child2 = [];
        const usedStudents1 = new Set();
        const usedStudents2 = new Set();
        
        // Primera parte: copia directa hasta crossover point
        for (let i = 0; i < crossoverPoint; i++) {
            child1.push({ ...parent1[i] });
            child2.push({ ...parent2[i] });
            
            if (parent1[i].studentIndex !== -1) usedStudents1.add(parent1[i].studentIndex);
            if (parent2[i].studentIndex !== -1) usedStudents2.add(parent2[i].studentIndex);
        }
        
        // Segunda parte: evitar duplicados
        for (let i = crossoverPoint; i < length; i++) {
            // Child 1
            if (parent2[i].studentIndex !== -1 && !usedStudents1.has(parent2[i].studentIndex)) {
                child1.push({ ...parent2[i] });
                usedStudents1.add(parent2[i].studentIndex);
            } else {
                child1.push({ patientIndex: i, studentIndex: -1 });
            }
            
            // Child 2  
            if (parent1[i].studentIndex !== -1 && !usedStudents2.has(parent1[i].studentIndex)) {
                child2.push({ ...parent1[i] });
                usedStudents2.add(parent1[i].studentIndex);
            } else {
                child2.push({ patientIndex: i, studentIndex: -1 });
            }
        }
        
        return [child1, child2];
    }

    /**
     * Operador de mutación
     */
    mutate(solution, mutationRate = 0.1) {
        const mutated = solution.map(assignment => ({ ...assignment }));
        
        for (let i = 0; i < mutated.length; i++) {
            if (Math.random() < mutationRate) {
                // Intercambiar con otro assignment aleatorio
                const j = Math.floor(Math.random() * mutated.length);
                const temp = mutated[i].studentIndex;
                mutated[i].studentIndex = mutated[j].studentIndex;
                mutated[j].studentIndex = temp;
            }
        }
        
        return mutated;
    }

    /**
     * Calcula varianza de carga de trabajo
     */
    calculateWorkloadVariance(workloads) {
        const mean = workloads.reduce((a, b) => a + b, 0) / workloads.length;
        const variance = workloads.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / workloads.length;
        return Math.sqrt(variance);
    }

    /**
     * Obtiene score de compatibilidad simplificado para algoritmo genético
     */
    getCompatibilityScore(patient, student) {
        // Versión simplificada para performance en AG
        let score = 0;
        
        // Compatibilidad de tratamiento básica
        if (patient.aiAnalysis && patient.aiAnalysis.primaryTreatment) {
            score += 0.4; // Base score si hay análisis
        }
        
        // Disponibilidad del estudiante
        score += student.availability * 0.3;
        
        // Competencia del estudiante
        score += student.competencyScore * 0.3;
        
        return score;
    }

    // --- MÉTODOS AUXILIARES FALTANTES ---

    calculateReliabilityScore(student) {
        const completionRate = student.casosCompletados / 
            Math.max(student.casosCompletados + student.casosFallidos, 1);
        const punctualityScore = 1 - (student.retrasosReportados || 0) * 0.1;
        return (completionRate * 0.7 + punctualityScore * 0.3);
    }

    calculateDiversityBonus(student) {
        // Bonificar diversidad de género, especialidades, etc.
        let bonus = 0;
        if (student.genero === 'F') bonus += 0.05; // Promover equidad de género
        if (student.especialidades.length > 2) bonus += 0.03;
        return Math.min(bonus, 0.1);
    }

    calculateOverallRating(metrics) {
        return (metrics.performance * 0.4 + 
                metrics.availability * 0.35 + 
                metrics.competencyScore * 0.25);
    }

    calculateTreatmentCompatibility(aiAnalysis, student) {
        if (!aiAnalysis || !aiAnalysis.primaryTreatment) return 0.5;
        
        const treatment = aiAnalysis.primaryTreatment.name;
        const studentSpecialties = student.especialidades || [];
        
        // Mapeo de tratamientos a especialidades
        const treatmentSpecialtyMap = {
            'Endodoncia': ['Endodoncia', 'Operatoria'],
            'Exodoncia Simple': ['Cirugía', 'Operatoria'],
            'Resina Simple': ['Operatoria', 'General'],
            'Corona': ['Prótesis', 'Operatoria'],
            'Destartraje': ['Periodoncia', 'General']
        };
        
        const requiredSpecialties = treatmentSpecialtyMap[treatment] || ['General'];
        const hasCompatibleSpecialty = requiredSpecialties.some(spec => 
            studentSpecialties.includes(spec)
        );
        
        return hasCompatibleSpecialty ? 0.9 : 0.6;
    }

    calculateCompetencyMatch(patientComplexity, studentCompetency) {
        const complexityLevel = { baja: 0.3, moderada: 0.6, alta: 1.0 };
        const required = complexityLevel[patientComplexity] || 0.6;
        
        if (studentCompetency >= required) {
            return 1.0; // Estudiante calificado
        } else {
            return studentCompetency / required; // Parcialmente calificado
        }
    }

    calculateAvailabilityMatch(patientUrgency, studentAvailability) {
        if (patientUrgency > 0.8) {
            return studentAvailability > 0.7 ? 1.0 : 0.3;
        }
        return studentAvailability;
    }

    calculateWorkloadBalance(student) {
        const optimalLoad = student.casosNecesarios * 0.8;
        const currentLoad = student.casosActivos;
        
        if (currentLoad <= optimalLoad) {
            return 1.0;
        } else {
            return Math.max(0.1, optimalLoad / currentLoad);
        }
    }

    calculateDiversityFactor(student) {
        // Factor para promover diversidad en asignaciones
        return student.diversityBonus || 0.05;
    }

    calculateMatchConfidence(patient, student, breakdown) {
        const weights = Object.values(breakdown);
        const variance = this.calculateVariance(weights);
        const consistency = Math.max(0, 1 - variance * 2);
        
        const dataQuality = (patient.aiAnalysis?.confidence || 0.5) * 0.5 + 
                          (student.overallRating || 0.5) * 0.5;
        
        return (consistency * 0.6 + dataQuality * 0.4);
    }

    assessMatchRisk(patient, student) {
        const risks = [];
        
        if (patient.riskLevel === 'alto') {
            risks.push({
                type: 'patient_high_risk',
                level: 'high',
                description: 'Paciente de alto riesgo requiere supervisión adicional'
            });
        }
        
        if (student.competencyScore < 0.6) {
            risks.push({
                type: 'student_low_competency',
                level: 'medium',
                description: 'Estudiante con competencia limitada'
            });
        }
        
        if (student.availability < 0.3) {
            risks.push({
                type: 'student_low_availability',
                level: 'medium',
                description: 'Estudiante con disponibilidad limitada'
            });
        }
        
        return {
            risks,
            overallRisk: risks.length > 1 ? 'high' : risks.length === 1 ? 'medium' : 'low'
        };
    }

    async checkTimeConflicts(match) {
        // Implementación simplificada - en producción conectaría con sistema de horarios
        return {
            hasConflicts: false,
            details: null
        };
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }

    calculateAverageScore(matches) {
        if (matches.length === 0) return 0;
        return matches.reduce((sum, match) => sum + match.compatibility.score, 0) / matches.length;
    }

    getSymptomAnalytics(analyzedPatients) {
        const treatments = {};
        const urgencies = { baja: 0, moderada: 0, alta: 0, urgente: 0 };
        const complexities = { baja: 0, moderada: 0, alta: 0 };
        
        analyzedPatients.forEach(patient => {
            const treatment = patient.aiAnalysis?.primaryTreatment?.name || 'Desconocido';
            treatments[treatment] = (treatments[treatment] || 0) + 1;
            
            const urgency = patient.aiAnalysis?.urgencyLevel?.level || 'moderada';
            urgencies[urgency]++;
            
            const complexity = patient.complexityLevel || 'moderada';
            complexities[complexity]++;
        });
        
        return { treatments, urgencies, complexities };
    }

    getStudentUtilization(evaluatedStudents) {
        const utilization = evaluatedStudents.map(student => ({
            id: student.id,
            name: student.nombreCompleto,
            currentLoad: student.casosActivos,
            capacity: student.casosNecesarios,
            utilization: student.casosActivos / student.casosNecesarios,
            rating: student.overallRating
        }));
        
        return {
            students: utilization,
            averageUtilization: utilization.reduce((sum, s) => sum + s.utilization, 0) / utilization.length
        };
    }

    calculateEfficiency(matches) {
        const totalPossibleScore = matches.length * 1.0; // Score máximo posible
        const actualScore = matches.reduce((sum, match) => sum + match.compatibility.score, 0);
        
        return {
            efficiency: actualScore / totalPossibleScore,
            highQualityMatches: matches.filter(m => m.compatibility.score > 0.8).length,
            averageConfidence: matches.reduce((sum, m) => sum + m.compatibility.confidence, 0) / matches.length
        };
    }
}

module.exports = IntelligentMatchingService;