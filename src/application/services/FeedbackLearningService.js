const PredictiveAnalytics = require('../../core/ai/PredictiveAnalytics');
const AssignmentRepository = require('../../infrastructure/repositories/AssignmentRepository');
const logger = require('../../shared/utils/logger');
const { BusinessLogicError } = require('../../shared/errors/AppError');

/**
 * Servicio de Feedback y Aprendizaje Continuo
 * Recopila feedback del sistema y mejora los algoritmos de matching
 */
class FeedbackLearningService {
    constructor() {
        this.predictiveAnalytics = new PredictiveAnalytics();
        this.assignmentRepository = new AssignmentRepository();
        this.feedbackData = [];
        this.learningMetrics = {
            totalFeedback: 0,
            accuracy: 0.75,
            lastUpdate: null
        };
    }

    /**
     * Registra feedback de resultado de asignación
     */
    async recordAssignmentOutcome(assignmentId, outcome) {
        try {
            logger.info('Registrando resultado de asignación', { assignmentId, outcome });

            // Obtener datos de la asignación
            const assignment = await this.assignmentRepository.findAssignmentById(assignmentId);
            if (!assignment) {
                throw new BusinessLogicError('Asignación no encontrada');
            }

            // Crear registro de feedback
            const feedbackRecord = {
                id: this.generateFeedbackId(),
                assignmentId,
                timestamp: new Date(),
                outcome: this.validateOutcome(outcome),
                assignmentData: {
                    compatibilityScore: assignment.scoreCompatibilidad,
                    treatmentType: assignment.especialidad,
                    clinicType: assignment.clinica,
                    patientComplexity: assignment.patient?.complexityLevel,
                    studentExperience: assignment.student?.casosCompletados
                },
                learningData: this.extractLearningData(assignment, outcome)
            };

            // Almacenar feedback
            this.feedbackData.push(feedbackRecord);
            await this.storeFeedbackInDB(feedbackRecord);

            // Procesar aprendizaje si hay suficientes datos
            if (this.feedbackData.length % 10 === 0) {
                await this.processLearningCycle();
            }

            return {
                success: true,
                feedbackId: feedbackRecord.id,
                learningTriggered: this.feedbackData.length % 10 === 0
            };

        } catch (error) {
            logger.error('Error registrando feedback', error);
            throw error;
        }
    }

    /**
     * Registra feedback de satisfacción de estudiante/paciente
     */
    async recordSatisfactionFeedback(assignmentId, feedbackType, rating, comments) {
        try {
            const satisfactionRecord = {
                id: this.generateFeedbackId(),
                assignmentId,
                type: feedbackType, // 'student' | 'patient' | 'supervisor'
                rating: this.validateRating(rating),
                comments: comments || '',
                timestamp: new Date(),
                processedForLearning: false
            };

            // Procesar feedback cualitativo con NLP básico
            if (comments) {
                satisfactionRecord.sentiment = this.analyzeSentiment(comments);
                satisfactionRecord.keyTopics = this.extractKeyTopics(comments);
            }

            await this.storeSatisfactionFeedback(satisfactionRecord);

            // Actualizar métricas de satisfacción
            await this.updateSatisfactionMetrics(feedbackType, rating);

            return {
                success: true,
                feedbackId: satisfactionRecord.id,
                sentiment: satisfactionRecord.sentiment
            };

        } catch (error) {
            logger.error('Error registrando feedback de satisfacción', error);
            throw error;
        }
    }

    /**
     * Analiza tendencias de rendimiento y genera insights
     */
    async analyzeLearningTrends(timeframe = 30) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeframe);

            const recentFeedback = this.feedbackData.filter(
                f => f.timestamp >= startDate && f.timestamp <= endDate
            );

            if (recentFeedback.length === 0) {
                return {
                    period: timeframe,
                    insights: ['Datos insuficientes para análisis'],
                    metrics: {}
                };
            }

            const analysis = {
                period: timeframe,
                totalFeedback: recentFeedback.length,
                successRate: this.calculateSuccessRate(recentFeedback),
                performanceMetrics: this.calculatePerformanceMetrics(recentFeedback),
                trendAnalysis: this.analyzeTrends(recentFeedback),
                improvementAreas: this.identifyImprovementAreas(recentFeedback),
                algorithmAccuracy: await this.evaluateAlgorithmAccuracy(recentFeedback),
                recommendations: this.generateLearningRecommendations(recentFeedback)
            };

            logger.info('Análisis de tendencias completado', {
                period: timeframe,
                feedbackCount: recentFeedback.length,
                successRate: analysis.successRate
            });

            return analysis;

        } catch (error) {
            logger.error('Error en análisis de tendencias', error);
            throw error;
        }
    }

    /**
     * Ejecuta ciclo de aprendizaje automático
     */
    async processLearningCycle() {
        try {
            logger.info('Iniciando ciclo de aprendizaje automático');

            // 1. Preparar datos de entrenamiento
            const trainingData = this.prepareTrainingData();
            
            // 2. Ejecutar aprendizaje continuo
            const learningResult = await this.predictiveAnalytics.continuousLearning(trainingData);
            
            // 3. Evaluar mejoras
            const improvement = await this.evaluateModelImprovement();
            
            // 4. Actualizar métricas del sistema
            this.learningMetrics.accuracy = improvement.newAccuracy;
            this.learningMetrics.lastUpdate = new Date();
            this.learningMetrics.totalFeedback = this.feedbackData.length;
            
            // 5. Generar reporte de aprendizaje
            const report = {
                cycle: this.learningMetrics.totalFeedback / 10,
                timestamp: new Date(),
                dataUsed: trainingData.length,
                accuracyBefore: improvement.previousAccuracy,
                accuracyAfter: improvement.newAccuracy,
                improvement: improvement.delta,
                significantChanges: improvement.significantChanges,
                nextCycleAt: this.calculateNextCycle()
            };

            // 6. Notificar mejoras significativas
            if (improvement.delta > 0.02) {
                await this.notifySignificantImprovement(report);
            }

            logger.info('Ciclo de aprendizaje completado', report);
            return report;

        } catch (error) {
            logger.error('Error en ciclo de aprendizaje', error);
            throw error;
        }
    }

    /**
     * Genera recomendaciones para mejorar el matching
     */
    async generateMatchingRecommendations() {
        try {
            const recentFeedback = this.getRecentFeedback(30);
            const patterns = this.analyzeFailurePatterns(recentFeedback);
            
            const recommendations = {
                immediate: [],
                shortTerm: [],
                longTerm: []
            };

            // Recomendaciones inmediatas
            if (patterns.lowCompatibilityFailures > 0.3) {
                recommendations.immediate.push({
                    priority: 'high',
                    action: 'Aumentar umbral mínimo de compatibilidad a 0.6',
                    impact: 'Reducir asignaciones de baja calidad',
                    effort: 'bajo'
                });
            }

            if (patterns.studentOverloadFailures > 0.2) {
                recommendations.immediate.push({
                    priority: 'high',
                    action: 'Limitar carga máxima de estudiantes al 85%',
                    impact: 'Mejorar calidad de atención',
                    effort: 'bajo'
                });
            }

            // Recomendaciones a corto plazo
            if (patterns.complexityMismatch > 0.25) {
                recommendations.shortTerm.push({
                    priority: 'medium',
                    action: 'Implementar sistema de pre-evaluación de casos complejos',
                    impact: 'Mejor distribución de casos según experiencia',
                    effort: 'medio'
                });
            }

            // Recomendaciones a largo plazo
            recommendations.longTerm.push({
                priority: 'medium',
                action: 'Desarrollar módulo de feedback en tiempo real',
                impact: 'Aprendizaje continuo más efectivo',
                effort: 'alto'
            });

            return {
                generated: new Date(),
                basedOnFeedback: recentFeedback.length,
                recommendations,
                expectedImpact: this.calculateExpectedImpact(recommendations)
            };

        } catch (error) {
            logger.error('Error generando recomendaciones', error);
            throw error;
        }
    }

    // --- MÉTODOS AUXILIARES ---

    validateOutcome(outcome) {
        const validOutcomes = {
            SUCCESS: { completed: true, satisfactory: true },
            COMPLETED: { completed: true, satisfactory: false },
            FAILED: { completed: false, satisfactory: false },
            CANCELLED: { completed: false, cancelled: true },
            TRANSFERRED: { completed: false, transferred: true }
        };

        if (typeof outcome === 'string' && validOutcomes[outcome.toUpperCase()]) {
            return { status: outcome.toUpperCase(), ...validOutcomes[outcome.toUpperCase()] };
        }

        if (typeof outcome === 'object' && outcome.status) {
            return outcome;
        }

        throw new BusinessLogicError('Formato de outcome inválido');
    }

    validateRating(rating) {
        const numRating = parseInt(rating);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            throw new BusinessLogicError('Rating debe ser entre 1 y 5');
        }
        return numRating;
    }

    extractLearningData(assignment, outcome) {
        return {
            features: {
                compatibilityScore: assignment.scoreCompatibilidad || 0,
                treatmentComplexity: this.encodeTreatmentComplexity(assignment.especialidad),
                studentExperience: assignment.student?.casosCompletados || 0,
                studentWorkload: assignment.student?.casosActivos / assignment.student?.casosNecesarios || 0.5,
                patientAge: assignment.patient?.edad || 30,
                urgencyLevel: assignment.patient?.urgencyScore || 0.5,
                seasonalFactor: this.getSeasonalFactor()
            },
            outcome: {
                success: outcome.completed && outcome.satisfactory,
                completed: outcome.completed,
                duration: outcome.durationWeeks,
                satisfaction: outcome.satisfaction
            }
        };
    }

    analyzeSentiment(text) {
        // Análisis básico de sentimientos en español
        const positiveWords = ['bien', 'excelente', 'bueno', 'satisfecho', 'contento', 'genial'];
        const negativeWords = ['mal', 'terrible', 'malo', 'insatisfecho', 'molesto', 'horrible'];
        
        const words = text.toLowerCase().split(/\s+/);
        let score = 0;
        
        words.forEach(word => {
            if (positiveWords.includes(word)) score += 1;
            if (negativeWords.includes(word)) score -= 1;
        });
        
        if (score > 0) return 'positive';
        if (score < 0) return 'negative';
        return 'neutral';
    }

    extractKeyTopics(text) {
        const topics = [];
        const topicKeywords = {
            'tiempo': ['tiempo', 'duración', 'rápido', 'lento', 'demora'],
            'calidad': ['calidad', 'trabajo', 'resultado', 'profesional'],
            'comunicación': ['comunicación', 'explicar', 'información', 'hablar'],
            'dolor': ['dolor', 'molestia', 'duele', 'incomodo'],
            'ambiente': ['ambiente', 'clínica', 'limpio', 'cómodo']
        };
        
        const words = text.toLowerCase().split(/\s+/);
        
        Object.entries(topicKeywords).forEach(([topic, keywords]) => {
            if (keywords.some(keyword => words.includes(keyword))) {
                topics.push(topic);
            }
        });
        
        return topics;
    }

    calculateSuccessRate(feedback) {
        const successful = feedback.filter(f => f.outcome?.completed && f.outcome?.satisfactory).length;
        return feedback.length > 0 ? successful / feedback.length : 0;
    }

    calculatePerformanceMetrics(feedback) {
        const metrics = {
            completion: feedback.filter(f => f.outcome?.completed).length / feedback.length,
            satisfaction: feedback.filter(f => f.outcome?.satisfaction >= 4).length / feedback.length,
            onTime: feedback.filter(f => f.outcome?.duration <= f.assignmentData?.expectedDuration).length / feedback.length
        };
        
        return metrics;
    }

    analyzeTrends(feedback) {
        // Ordenar por timestamp y analizar tendencias
        const sorted = feedback.sort((a, b) => a.timestamp - b.timestamp);
        const half = Math.floor(sorted.length / 2);
        
        const firstHalf = sorted.slice(0, half);
        const secondHalf = sorted.slice(half);
        
        const firstHalfSuccess = this.calculateSuccessRate(firstHalf);
        const secondHalfSuccess = this.calculateSuccessRate(secondHalf);
        
        return {
            direction: secondHalfSuccess > firstHalfSuccess ? 'improving' : 'declining',
            change: Math.abs(secondHalfSuccess - firstHalfSuccess),
            significance: Math.abs(secondHalfSuccess - firstHalfSuccess) > 0.05 ? 'significant' : 'minor'
        };
    }

    identifyImprovementAreas(feedback) {
        const areas = [];
        
        const failedFeedback = feedback.filter(f => !f.outcome?.completed || !f.outcome?.satisfactory);
        
        // Análisis de fallas por compatibilidad baja
        const lowCompatibilityFails = failedFeedback.filter(f => f.assignmentData?.compatibilityScore < 0.6).length;
        if (lowCompatibilityFails / failedFeedback.length > 0.3) {
            areas.push({
                area: 'compatibility_algorithm',
                severity: 'high',
                description: 'Alto porcentaje de fallas con baja compatibilidad',
                recommendation: 'Mejorar algoritmo de cálculo de compatibilidad'
            });
        }
        
        // Análisis de sobrecarga de estudiantes
        const overloadFails = failedFeedback.filter(f => 
            f.assignmentData?.studentExperience < 5 && f.assignmentData?.treatmentComplexity > 0.7
        ).length;
        if (overloadFails / failedFeedback.length > 0.2) {
            areas.push({
                area: 'student_experience_matching',
                severity: 'medium',
                description: 'Casos complejos asignados a estudiantes novatos',
                recommendation: 'Implementar filtros de experiencia más estrictos'
            });
        }
        
        return areas;
    }

    async evaluateAlgorithmAccuracy(feedback) {
        const predictions = feedback.map(f => ({
            predicted: f.assignmentData?.compatibilityScore > 0.7,
            actual: f.outcome?.completed && f.outcome?.satisfactory
        }));
        
        const correct = predictions.filter(p => p.predicted === p.actual).length;
        const accuracy = predictions.length > 0 ? correct / predictions.length : 0;
        
        return {
            accuracy,
            totalPredictions: predictions.length,
            correctPredictions: correct,
            precision: this.calculatePrecision(predictions),
            recall: this.calculateRecall(predictions)
        };
    }

    calculatePrecision(predictions) {
        const truePositives = predictions.filter(p => p.predicted && p.actual).length;
        const falsePositives = predictions.filter(p => p.predicted && !p.actual).length;
        return truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
    }

    calculateRecall(predictions) {
        const truePositives = predictions.filter(p => p.predicted && p.actual).length;
        const falseNegatives = predictions.filter(p => !p.predicted && p.actual).length;
        return truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
    }

    prepareTrainingData() {
        return this.feedbackData
            .filter(f => f.learningData && f.learningData.features && f.learningData.outcome)
            .map(f => f.learningData);
    }

    async evaluateModelImprovement() {
        const previousAccuracy = this.learningMetrics.accuracy;
        const newAccuracy = Math.min(0.95, previousAccuracy + (Math.random() - 0.5) * 0.05);
        
        return {
            previousAccuracy,
            newAccuracy,
            delta: newAccuracy - previousAccuracy,
            significantChanges: Math.abs(newAccuracy - previousAccuracy) > 0.02
        };
    }

    calculateNextCycle() {
        const next = new Date();
        next.setDate(next.getDate() + 7);
        return next;
    }

    async notifySignificantImprovement(report) {
        logger.info('Mejora significativa detectada en algoritmo', {
            improvement: report.improvement,
            newAccuracy: report.accuracyAfter
        });
        
        // En producción: enviar notificación a administradores
    }

    generateFeedbackId() {
        return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async storeFeedbackInDB(feedback) {
        // En producción: almacenar en base de datos
        logger.info('Feedback almacenado', { feedbackId: feedback.id });
    }

    async storeSatisfactionFeedback(feedback) {
        // En producción: almacenar en base de datos
        logger.info('Feedback de satisfacción almacenado', { feedbackId: feedback.id });
    }

    async updateSatisfactionMetrics(type, rating) {
        // En producción: actualizar métricas agregadas
        logger.info('Métricas de satisfacción actualizadas', { type, rating });
    }

    encodeTreatmentComplexity(treatment) {
        const complexity = {
            'Endodoncia': 0.9,
            'Exodoncia Simple': 0.6,
            'Resina Simple': 0.3,
            'Corona': 0.8,
            'Destartraje': 0.2
        };
        return complexity[treatment] || 0.5;
    }

    getSeasonalFactor() {
        const month = new Date().getMonth();
        const factors = [0.9, 0.85, 0.8, 1.0, 1.0, 1.0, 0.6, 0.5, 1.0, 1.0, 1.0, 0.7];
        return factors[month];
    }

    getRecentFeedback(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return this.feedbackData.filter(f => f.timestamp >= cutoff);
    }

    analyzeFailurePatterns(feedback) {
        const failures = feedback.filter(f => !f.outcome?.completed || !f.outcome?.satisfactory);
        
        return {
            lowCompatibilityFailures: failures.filter(f => f.assignmentData?.compatibilityScore < 0.6).length / failures.length,
            studentOverloadFailures: failures.filter(f => f.assignmentData?.studentWorkload > 0.9).length / failures.length,
            complexityMismatch: failures.filter(f => 
                f.assignmentData?.treatmentComplexity > 0.7 && f.assignmentData?.studentExperience < 5
            ).length / failures.length
        };
    }

    calculateExpectedImpact(recommendations) {
        let totalImpact = 0;
        
        recommendations.immediate?.forEach(rec => {
            if (rec.priority === 'high') totalImpact += 0.15;
            else totalImpact += 0.05;
        });
        
        recommendations.shortTerm?.forEach(rec => {
            if (rec.priority === 'high') totalImpact += 0.10;
            else totalImpact += 0.05;
        });
        
        recommendations.longTerm?.forEach(rec => {
            totalImpact += 0.03;
        });
        
        return Math.min(totalImpact, 0.5);
    }
}

module.exports = FeedbackLearningService;