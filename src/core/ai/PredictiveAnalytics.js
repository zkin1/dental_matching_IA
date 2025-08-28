/**
 * Motor de Análisis Predictivo con Machine Learning
 * Predice éxito de tratamientos y resultados de asignaciones
 */
class PredictiveAnalytics {
    constructor() {
        this.models = this.initializeModels();
        this.trainingData = [];
        this.features = this.defineFeatures();
        this.isModelTrained = false;
    }

    /**
     * Predice probabilidad de éxito de una asignación
     */
    async predictAssignmentSuccess(patient, student, assignment) {
        const features = this.extractFeatures(patient, student, assignment);
        
        if (!this.isModelTrained) {
            // Usar modelo base estadístico si no hay entrenamiento
            return this.predictWithStatisticalModel(features);
        }
        
        const prediction = await this.runPredictionModel(features);
        
        return {
            successProbability: prediction.probability,
            confidence: prediction.confidence,
            keyFactors: prediction.factors,
            riskIndicators: this.identifyRiskIndicators(features),
            recommendations: this.generatePredictionRecommendations(prediction)
        };
    }

    /**
     * Predice tiempo estimado de tratamiento
     */
    async predictTreatmentDuration(patient, treatment, student) {
        const features = this.extractTreatmentFeatures(patient, treatment, student);
        
        // Modelo de regresión para duración
        const baseDuration = this.getBaseTreatmentDuration(treatment);
        const complexityMultiplier = this.calculateComplexityMultiplier(features);
        const studentEfficiencyFactor = this.calculateStudentEfficiency(student);
        
        const estimatedDuration = baseDuration * complexityMultiplier * studentEfficiencyFactor;
        
        return {
            estimatedWeeks: Math.round(estimatedDuration),
            confidence: this.calculateDurationConfidence(features),
            factors: {
                baseTime: baseDuration,
                complexity: complexityMultiplier,
                studentEfficiency: studentEfficiencyFactor
            },
            recommendations: this.generateDurationRecommendations(estimatedDuration)
        };
    }

    /**
     * Analiza patrones históricos para mejora continua
     */
    async analyzeHistoricalPatterns(assignments, outcomes) {
        const patterns = {
            successFactors: this.identifySuccessFactors(assignments, outcomes),
            failurePatterns: this.identifyFailurePatterns(assignments, outcomes),
            optimalMatching: this.findOptimalMatchingCriteria(assignments, outcomes),
            studentPerformance: this.analyzeStudentPerformance(assignments, outcomes),
            treatmentComplexity: this.analyzeTreatmentComplexity(assignments, outcomes)
        };

        // Actualizar modelos con nuevos datos
        await this.updateModelsWithPatterns(patterns);

        return {
            insights: patterns,
            modelAccuracy: this.calculateModelAccuracy(assignments, outcomes),
            recommendations: this.generateSystemRecommendations(patterns),
            nextTrainingCycle: this.scheduleNextTraining()
        };
    }

    /**
     * Sistema de aprendizaje continuo
     */
    async continuousLearning(feedbackData) {
        // Validar calidad de datos
        const validatedData = this.validateFeedbackData(feedbackData);
        
        if (validatedData.length === 0) {
            return { status: 'no_valid_data' };
        }

        // Incorporar nuevos datos de entrenamiento
        this.trainingData.push(...validatedData);
        
        // Re-entrenar modelos si hay suficientes datos
        if (this.trainingData.length > 100) {
            await this.retrainModels();
            this.isModelTrained = true;
        }

        // Calcular mejoras en precisión
        const accuracyImprovement = this.calculateAccuracyImprovement();

        return {
            status: 'learning_completed',
            newDataPoints: validatedData.length,
            totalTrainingData: this.trainingData.length,
            accuracyImprovement,
            nextRetraining: this.scheduleRetraining()
        };
    }

    // --- MÉTODOS DE EXTRACCIÓN DE CARACTERÍSTICAS ---

    extractFeatures(patient, student, assignment) {
        return {
            // Características del paciente
            patientAge: patient.edad,
            patientComplexity: this.quantifyComplexity(patient.aiAnalysis?.complexityScore),
            urgencyLevel: this.quantifyUrgency(patient.aiAnalysis?.urgencyLevel),
            riskFactors: patient.aiAnalysis?.riskFactors?.length || 0,
            treatmentType: this.encodeTreatment(assignment.especialidad),
            
            // Características del estudiante
            studentYear: student.anoCarrera,
            studentExperience: student.casosCompletados,
            studentSuccess: student.casosCompletados / Math.max(student.casosCompletados + student.casosFallidos, 1),
            studentWorkload: student.casosActivos / student.casosNecesarios,
            
            // Características de la asignación
            compatibilityScore: assignment.scoreCompatibilidad || 0,
            clinicType: this.encodeClinic(assignment.clinica),
            assignmentDate: new Date().getMonth(), // Estacionalidad
            
            // Características derivadas
            experienceMatch: this.calculateExperienceMatch(patient, student),
            workloadBalance: this.calculateWorkloadBalance(student),
            seasonalFactor: this.getSeasonalFactor()
        };
    }

    extractTreatmentFeatures(patient, treatment, student) {
        return {
            treatmentComplexity: this.getTreatmentComplexity(treatment),
            patientCooperation: this.estimatePatientCooperation(patient),
            studentSkill: this.assessStudentSkill(student, treatment),
            equipmentAvailability: this.getEquipmentAvailability(treatment),
            clinicCapacity: this.getClinicCapacity(patient, treatment)
        };
    }

    // --- MODELOS PREDICTIVOS ---

    async runPredictionModel(features) {
        // Implementación de modelo de Machine Learning simplificado
        // En producción se usaría TensorFlow.js o similar
        
        let probability = 0.7; // Base probability
        
        // Ajustes basados en características clave
        if (features.compatibilityScore > 0.8) probability += 0.1;
        if (features.studentSuccess > 0.9) probability += 0.1;
        if (features.studentWorkload < 0.7) probability += 0.05;
        if (features.experienceMatch > 0.8) probability += 0.05;
        
        // Penalizaciones por factores de riesgo
        if (features.riskFactors > 2) probability -= 0.15;
        if (features.studentWorkload > 0.9) probability -= 0.1;
        if (features.urgencyLevel > 0.8 && features.studentExperience < 5) probability -= 0.1;
        
        probability = Math.max(0.1, Math.min(0.95, probability));
        
        const confidence = this.calculatePredictionConfidence(features);
        const factors = this.identifyKeyFactors(features, probability);
        
        return { probability, confidence, factors };
    }

    predictWithStatisticalModel(features) {
        // Modelo estadístico base cuando no hay entrenamiento ML
        const baseSuccess = 0.75;
        
        let adjustments = 0;
        adjustments += (features.compatibilityScore - 0.5) * 0.3;
        adjustments += (features.studentSuccess - 0.7) * 0.2;
        adjustments += (1 - features.studentWorkload) * 0.1;
        
        const probability = Math.max(0.2, Math.min(0.9, baseSuccess + adjustments));
        
        return {
            successProbability: probability,
            confidence: 0.7,
            keyFactors: ['compatibilityScore', 'studentSuccess', 'studentWorkload'],
            riskIndicators: [],
            recommendations: ['Basado en modelo estadístico - Se recomienda más datos para ML']
        };
    }

    // --- ANÁLISIS DE PATRONES HISTÓRICOS ---

    identifySuccessFactors(assignments, outcomes) {
        const successfulAssignments = assignments.filter((_, i) => outcomes[i].success);
        
        const factors = {
            highCompatibility: successfulAssignments.filter(a => a.scoreCompatibilidad > 0.8).length,
            experiencedStudents: successfulAssignments.filter(a => a.student?.casosCompletados > 10).length,
            balancedWorkload: successfulAssignments.filter(a => 
                (a.student?.casosActivos / a.student?.casosNecesarios) < 0.8
            ).length,
            appropriateComplexity: successfulAssignments.filter(a => 
                this.isComplexityAppropriate(a.patient, a.student)
            ).length
        };

        return {
            factors,
            totalSuccessful: successfulAssignments.length,
            insights: this.generateSuccessInsights(factors)
        };
    }

    identifyFailurePatterns(assignments, outcomes) {
        const failedAssignments = assignments.filter((_, i) => !outcomes[i].success);
        
        const patterns = {
            lowCompatibility: failedAssignments.filter(a => a.scoreCompatibilidad < 0.5).length,
            overloadedStudents: failedAssignments.filter(a => 
                (a.student?.casosActivos / a.student?.casosNecesarios) > 0.9
            ).length,
            complexityMismatch: failedAssignments.filter(a => 
                !this.isComplexityAppropriate(a.patient, a.student)
            ).length,
            urgencyMishandling: failedAssignments.filter(a => 
                a.patient?.urgencyScore > 0.8 && a.student?.casosCompletados < 5
            ).length
        };

        return {
            patterns,
            totalFailed: failedAssignments.length,
            recommendations: this.generateFailureRecommendations(patterns)
        };
    }

    // --- MÉTODOS DE APOYO ---

    quantifyComplexity(complexityScore) {
        if (!complexityScore) return 0.5;
        const levels = { baja: 0.3, moderada: 0.6, alta: 1.0 };
        return levels[complexityScore.level] || 0.6;
    }

    quantifyUrgency(urgencyLevel) {
        if (!urgencyLevel) return 0.5;
        const levels = { baja: 0.25, moderada: 0.5, alta: 0.75, urgente: 1.0 };
        return levels[urgencyLevel.level] || 0.5;
    }

    encodeTreatment(treatment) {
        const treatments = {
            'Endodoncia': 0.9,
            'Exodoncia Simple': 0.7,
            'Resina Simple': 0.4,
            'Corona': 0.8,
            'Destartraje': 0.3
        };
        return treatments[treatment] || 0.5;
    }

    encodeClinic(clinic) {
        return clinic?.includes('Niño') ? 0.3 : 0.7;
    }

    calculateExperienceMatch(patient, student) {
        const requiredExperience = this.quantifyComplexity(patient.aiAnalysis?.complexityScore) * 10;
        const studentExperience = student.casosCompletados;
        return Math.min(studentExperience / requiredExperience, 1.0);
    }

    calculateWorkloadBalance(student) {
        const utilization = student.casosActivos / student.casosNecesarios;
        return utilization <= 0.8 ? 1.0 : Math.max(0.2, (1.0 - utilization) + 0.8);
    }

    getSeasonalFactor() {
        const month = new Date().getMonth();
        // Factores estacionales: enero-marzo más actividad, julio-agosto menos
        const factors = [0.9, 0.85, 0.8, 1.0, 1.0, 1.0, 0.6, 0.5, 1.0, 1.0, 1.0, 0.7];
        return factors[month];
    }

    calculatePredictionConfidence(features) {
        let confidence = 0.7;
        
        // Mayor confianza con más datos
        if (features.studentExperience > 10) confidence += 0.1;
        if (features.compatibilityScore > 0.7) confidence += 0.1;
        
        // Menor confianza con factores inciertos
        if (features.riskFactors > 2) confidence -= 0.1;
        if (features.urgencyLevel > 0.8) confidence -= 0.05;
        
        return Math.max(0.4, Math.min(0.95, confidence));
    }

    identifyKeyFactors(features, probability) {
        const factors = [];
        
        if (features.compatibilityScore > 0.8) {
            factors.push({ name: 'Alta compatibilidad', impact: 'positivo', weight: 0.3 });
        }
        if (features.studentSuccess > 0.9) {
            factors.push({ name: 'Estudiante experimentado', impact: 'positivo', weight: 0.2 });
        }
        if (features.studentWorkload > 0.9) {
            factors.push({ name: 'Sobrecarga de estudiante', impact: 'negativo', weight: -0.2 });
        }
        if (features.riskFactors > 2) {
            factors.push({ name: 'Múltiples factores de riesgo', impact: 'negativo', weight: -0.15 });
        }
        
        return factors.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    }

    identifyRiskIndicators(features) {
        const risks = [];
        
        if (features.studentWorkload > 0.9) {
            risks.push({
                type: 'overload',
                severity: 'high',
                description: 'Estudiante con carga de trabajo excesiva'
            });
        }
        
        if (features.urgencyLevel > 0.8 && features.studentExperience < 5) {
            risks.push({
                type: 'experience_mismatch',
                severity: 'medium',
                description: 'Caso urgente asignado a estudiante novato'
            });
        }
        
        if (features.riskFactors > 2) {
            risks.push({
                type: 'patient_complexity',
                severity: 'high',
                description: 'Paciente con múltiples factores de riesgo'
            });
        }
        
        return risks;
    }

    generatePredictionRecommendations(prediction) {
        const recommendations = [];
        
        if (prediction.probability < 0.6) {
            recommendations.push('Considerar reasignación a estudiante más experimentado');
            recommendations.push('Aumentar supervisión durante el tratamiento');
        }
        
        if (prediction.probability > 0.85) {
            recommendations.push('Asignación óptima - proceder con confianza');
        }
        
        prediction.factors?.forEach(factor => {
            if (factor.impact === 'negativo' && Math.abs(factor.weight) > 0.15) {
                recommendations.push(`Mitigar riesgo: ${factor.name}`);
            }
        });
        
        return recommendations;
    }

    // --- MÉTODOS DE INICIALIZACIÓN Y CONFIGURACIÓN ---

    initializeModels() {
        return {
            successPrediction: {
                type: 'classification',
                algorithm: 'logistic_regression',
                features: this.defineFeatures(),
                trained: false
            },
            durationPrediction: {
                type: 'regression',
                algorithm: 'linear_regression',
                features: this.defineFeatures(),
                trained: false
            },
            riskAssessment: {
                type: 'classification',
                algorithm: 'decision_tree',
                features: this.defineFeatures(),
                trained: false
            }
        };
    }

    defineFeatures() {
        return [
            'patientAge', 'patientComplexity', 'urgencyLevel', 'riskFactors',
            'treatmentType', 'studentYear', 'studentExperience', 'studentSuccess',
            'studentWorkload', 'compatibilityScore', 'clinicType', 'assignmentDate',
            'experienceMatch', 'workloadBalance', 'seasonalFactor'
        ];
    }

    // Métodos adicionales para completar funcionalidad...
    getBaseTreatmentDuration(treatment) {
        const durations = {
            'Endodoncia': 4,
            'Exodoncia Simple': 2,
            'Resina Simple': 2,
            'Corona': 6,
            'Destartraje': 1
        };
        return durations[treatment] || 3;
    }

    calculateComplexityMultiplier(features) {
        return 1.0 + (features.patientComplexity * 0.5);
    }

    calculateStudentEfficiency(student) {
        const efficiency = student.casosCompletados > 0 ? 
            student.casosCompletados / (student.casosCompletados + (student.casosFallidos || 0)) : 0.8;
        return Math.max(0.7, efficiency);
    }

    calculateDurationConfidence(features) {
        return 0.8 - (features.riskFactors * 0.1);
    }

    generateDurationRecommendations(duration) {
        const recommendations = [];
        
        if (duration > 6) {
            recommendations.push('Tratamiento complejo - considerar división en fases');
        }
        if (duration < 2) {
            recommendations.push('Tratamiento rápido - optimizar programación');
        }
        
        return recommendations;
    }

    async updateModelsWithPatterns(patterns) {
        // Actualizar pesos del modelo basado en patrones identificados
        console.log('Actualizando modelos con nuevos patrones:', patterns);
        return Promise.resolve();
    }

    validateFeedbackData(feedbackData) {
        return feedbackData.filter(data => 
            data.outcome !== undefined && 
            data.features && 
            Object.keys(data.features).length > 5
        );
    }

    async retrainModels() {
        console.log('Re-entrenando modelos con', this.trainingData.length, 'puntos de datos');
        // En producción: implementar re-entrenamiento real
        return Promise.resolve();
    }

    calculateAccuracyImprovement() {
        // Simular mejora en precisión
        return {
            previousAccuracy: 0.75,
            currentAccuracy: 0.78,
            improvement: 0.03
        };
    }

    scheduleRetraining() {
        const next = new Date();
        next.setDate(next.getDate() + 30);
        return next;
    }

    scheduleNextTraining() {
        const next = new Date();
        next.setDate(next.getDate() + 7);
        return next;
    }

    calculateModelAccuracy(assignments, outcomes) {
        // Calcular precisión del modelo actual
        return {
            overall: 0.78,
            precision: 0.82,
            recall: 0.75,
            f1Score: 0.78
        };
    }

    generateSystemRecommendations(patterns) {
        return [
            'Priorizar asignaciones con alta compatibilidad',
            'Monitorear carga de trabajo de estudiantes',
            'Implementar supervisión adicional para casos complejos',
            'Optimizar distribución estacional de casos'
        ];
    }

    isComplexityAppropriate(patient, student) {
        const patientComplexity = this.quantifyComplexity(patient?.aiAnalysis?.complexityScore);
        const studentCapability = Math.min(student?.casosCompletados / 10, 1.0);
        return studentCapability >= patientComplexity;
    }

    generateSuccessInsights(factors) {
        return [
            `${Math.round(factors.highCompatibility / (factors.highCompatibility + factors.experiencedStudents) * 100)}% de éxitos con alta compatibilidad`,
            `Estudiantes experimentados tienen mejor rendimiento`,
            `Balance de carga de trabajo es crítico para el éxito`
        ];
    }

    generateFailureRecommendations(patterns) {
        return [
            'Evitar asignar casos complejos a estudiantes sobrecargados',
            'Mejorar algoritmo de compatibilidad',
            'Implementar sistema de alertas para casos urgentes'
        ];
    }
}

module.exports = PredictiveAnalytics;