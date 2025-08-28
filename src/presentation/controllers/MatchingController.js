const IntelligentMatchingService = require('../../application/services/IntelligentMatchingService');
const PatientService = require('../../application/services/PatientService');
const StudentService = require('../../application/services/StudentService');
const SymptomAnalyzer = require('../../core/ai/SymptomAnalyzer');
const { asyncHandler } = require('../../shared/middleware/errorHandler');
const { BusinessLogicError } = require('../../shared/errors/AppError');
const logger = require('../../shared/utils/logger');

/**
 * Controlador para endpoints de Matching Inteligente
 * Maneja operaciones de matching automatizado con IA
 */
class MatchingController {
    constructor() {
        this.matchingService = new IntelligentMatchingService();
        this.patientService = new PatientService();
        this.studentService = new StudentService();
        this.symptomAnalyzer = new SymptomAnalyzer();
    }

    /**
     * POST /api/matching/intelligent
     * Ejecuta matching inteligente con IA
     */
    executeIntelligentMatching = asyncHandler(async (req, res) => {
        const options = req.body || {};
        
        // Validar opciones
        if (options.maxPatients && (options.maxPatients < 1 || options.maxPatients > 100)) {
            throw new BusinessLogicError('maxPatients debe estar entre 1 y 100');
        }
        
        logger.matching('Iniciando matching inteligente desde API', options);
        
        const result = await this.matchingService.executeIntelligentMatching(options);
        
        res.json({
            success: true,
            message: `Matching inteligente completado: ${result.matched}/${result.processed} asignaciones`,
            data: result
        });
    });

    /**
     * POST /api/matching/analyze-symptoms
     * Analiza síntomas usando IA para inferir tratamiento
     */
    analyzeSymptoms = asyncHandler(async (req, res) => {
        const { symptoms, patientId } = req.body;
        
        if (!symptoms) {
            throw new BusinessLogicError('Se requiere el campo "symptoms"');
        }
        
        const analysis = await this.symptomAnalyzer.analyzeSymptoms(symptoms);
        
        // Si se proporciona ID del paciente, guardar análisis
        if (patientId) {
            try {
                await this.patientService.updatePatient(patientId, {
                    tipoTratamiento: analysis.primaryTreatment.name,
                    prioridad: analysis.urgencyLevel.level
                });
                
                logger.info(`Análisis de síntomas aplicado al paciente ${patientId}`);
            } catch (error) {
                logger.warn(`No se pudo actualizar paciente ${patientId}`, error);
            }
        }
        
        res.json({
            success: true,
            data: {
                analysis: analysis,
                patientUpdated: !!patientId,
                recommendations: {
                    treatmentType: analysis.primaryTreatment.name,
                    urgencyLevel: analysis.urgencyLevel.level,
                    specialtyRecommendation: analysis.specialtyRecommendations[0]?.specialty || 'General',
                    clinicRecommendation: analysis.clinicRecommendation
                }
            }
        });
    });

    /**
     * GET /api/matching/suggestions/:patientId
     * Obtiene sugerencias inteligentes de estudiantes para un paciente
     */
    getIntelligentSuggestions = asyncHandler(async (req, res) => {
        const { patientId } = req.params;
        const { limit = 5, includeAnalysis = true } = req.query;
        
        // Obtener paciente
        const patient = await this.patientService.getPatientById(parseInt(patientId));
        
        // Analizar síntomas si se solicita
        let symptomAnalysis = null;
        if (includeAnalysis === 'true' && patient.sintomas) {
            symptomAnalysis = await this.symptomAnalyzer.analyzeSymptoms(patient.sintomas);
        }
        
        // Obtener estudiantes disponibles
        const availableStudents = await this.studentService.getAvailableStudents(
            symptomAnalysis?.specialtyRecommendations[0]?.specialty
        );
        
        // Generar matriz de compatibilidad para este paciente
        const suggestions = [];
        
        for (const student of availableStudents.slice(0, parseInt(limit))) {
            const compatibility = await this.calculateCompatibilityPreview(
                patient,
                student,
                symptomAnalysis
            );
            
            suggestions.push({
                student: {
                    id: student.id,
                    nombreCompleto: student.nombreCompleto,
                    codigoEstudiante: student.codigoEstudiante,
                    anoCarrera: student.anoCarrera,
                    especialidades: student.especialidades,
                    casosActivos: student.casosActivos,
                    casosCompletados: student.casosCompletados,
                    isAvailable: student.isAvailable,
                    workloadPercentage: student.workloadPercentage
                },
                compatibility: compatibility,
                reasoning: this.generateMatchingReasoning(patient, student, compatibility, symptomAnalysis)
            });
        }
        
        // Ordenar por score de compatibilidad
        suggestions.sort((a, b) => b.compatibility.totalScore - a.compatibility.totalScore);
        
        res.json({
            success: true,
            data: {
                patient: {
                    id: patient.id,
                    nombreCompleto: patient.nombreCompleto,
                    edad: patient.edad,
                    prioridad: patient.prioridad,
                    sintomas: patient.sintomas,
                    isPediatric: patient.isPediatric()
                },
                symptomAnalysis: symptomAnalysis,
                suggestions: suggestions,
                totalSuggestions: suggestions.length,
                generatedAt: new Date().toISOString()
            }
        });
    });

    /**
     * GET /api/matching/statistics
     * Obtiene estadísticas del sistema de matching inteligente
     */
    getMatchingStatistics = asyncHandler(async (req, res) => {
        const { period = 30 } = req.query;
        
        // Obtener estadísticas básicas
        const basicStats = await this.patientService.getPatientStatistics();
        const studentStats = await this.studentService.getStudentStatistics();
        
        // Calcular métricas de matching inteligente
        const matchingMetrics = await this.calculateMatchingMetrics(parseInt(period));
        
        const statistics = {
            overview: {
                totalPatients: basicStats.total,
                pendingPatients: basicStats.pendientes,
                totalStudents: studentStats.total,
                availableStudents: studentStats.disponibles,
                utilizationRate: studentStats.workloadAnalysis?.utilizationRate || 0
            },
            matching: {
                period: `${period} días`,
                ...matchingMetrics
            },
            ai: {
                symptomAnalysisAccuracy: await this.calculateAnalysisAccuracy(),
                averageConfidenceScore: await this.calculateAverageConfidence(),
                treatmentPredictionRate: await this.calculatePredictionRate()
            },
            performance: {
                averageMatchingTime: matchingMetrics.averageProcessingTime || 0,
                successRate: matchingMetrics.successRate || 0,
                optimizationEfficiency: matchingMetrics.optimizationEfficiency || 0
            }
        };
        
        res.json({
            success: true,
            data: statistics,
            generatedAt: new Date().toISOString()
        });
    });

    /**
     * POST /api/matching/batch-analyze
     * Analiza múltiples pacientes en lote
     */
    batchAnalyzePatients = asyncHandler(async (req, res) => {
        const { patientIds, updatePatients = false } = req.body;
        
        if (!Array.isArray(patientIds) || patientIds.length === 0) {
            throw new BusinessLogicError('Se requiere un array de IDs de pacientes');
        }
        
        if (patientIds.length > 50) {
            throw new BusinessLogicError('Máximo 50 pacientes por lote');
        }
        
        const results = {
            analyzed: [],
            errors: [],
            summary: {
                total: patientIds.length,
                successful: 0,
                failed: 0
            }
        };
        
        for (const patientId of patientIds) {
            try {
                const patient = await this.patientService.getPatientById(patientId);
                
                if (patient.sintomas && patient.sintomas.length > 0) {
                    const analysis = await this.symptomAnalyzer.analyzeSymptoms(patient.sintomas);
                    
                    results.analyzed.push({
                        patientId: patientId,
                        patientName: patient.nombreCompleto,
                        analysis: {
                            primaryTreatment: analysis.primaryTreatment,
                            urgencyLevel: analysis.urgencyLevel,
                            complexityScore: analysis.complexityScore,
                            confidence: analysis.confidence
                        }
                    });
                    
                    // Actualizar paciente si se solicita
                    if (updatePatients) {
                        await this.patientService.updatePatient(patientId, {
                            tipoTratamiento: analysis.primaryTreatment.name,
                            prioridad: analysis.urgencyLevel.level
                        });
                    }
                    
                    results.summary.successful++;
                } else {
                    results.errors.push({
                        patientId: patientId,
                        error: 'Paciente sin síntomas para analizar'
                    });
                    results.summary.failed++;
                }
                
            } catch (error) {
                results.errors.push({
                    patientId: patientId,
                    error: error.message
                });
                results.summary.failed++;
                
                logger.warn(`Error analizando paciente ${patientId} en lote`, error);
            }
        }
        
        const statusCode = results.summary.failed > 0 ? 207 : 200; // Multi-status si hay errores
        
        res.status(statusCode).json({
            success: results.summary.successful > 0,
            message: `${results.summary.successful} pacientes analizados, ${results.summary.failed} errores`,
            data: results
        });
    });

    /**
     * GET /api/matching/algorithm-info
     * Información sobre el algoritmo de matching inteligente
     */
    getAlgorithmInfo = asyncHandler(async (req, res) => {
        res.json({
            success: true,
            data: {
                algorithm: {
                    name: 'Intelligent Matching System v3.0',
                    version: '3.0.0',
                    type: 'Multi-Objective Genetic Algorithm with AI/ML',
                    description: 'Sistema avanzado de matching que utiliza análisis de síntomas con IA, optimización genética y aprendizaje automático para asignaciones óptimas'
                },
                components: {
                    symptomAnalyzer: {
                        name: 'AI Symptom Analyzer',
                        description: 'Analizador de síntomas con procesamiento de lenguaje natural y patrones de machine learning',
                        techniques: ['NLP', 'Pattern Matching', 'Confidence Scoring', 'Risk Assessment']
                    },
                    optimizationEngine: {
                        name: 'Genetic Optimization Engine',
                        description: 'Motor de optimización multi-objetiva usando algoritmos genéticos',
                        objectives: ['Quality Maximization', 'Fairness', 'Diversity', 'Workload Balance']
                    },
                    compatibilityMatrix: {
                        name: 'Multi-Dimensional Compatibility Matrix',
                        description: 'Matriz de compatibilidad que considera múltiples factores',
                        factors: ['Treatment Match', 'Student Competency', 'Availability', 'Performance History']
                    }
                },
                metrics: {
                    qualityFactors: [
                        { name: 'Treatment Compatibility', weight: '35%' },
                        { name: 'Student Competency', weight: '25%' },
                        { name: 'Availability Match', weight: '20%' },
                        { name: 'Workload Balance', weight: '10%' },
                        { name: 'Diversity Factor', weight: '10%' }
                    ],
                    performanceIndicators: [
                        'Average Compatibility Score',
                        'Success Rate',
                        'Processing Time',
                        'Optimization Efficiency'
                    ]
                },
                configuration: {
                    maxIterations: 100,
                    convergenceThreshold: 0.01,
                    populationSize: 50,
                    mutationRate: 0.1,
                    crossoverRate: 0.8
                }
            }
        });
    });

    // --- MÉTODOS AUXILIARES PRIVADOS ---

    /**
     * Calcula vista previa de compatibilidad para sugerencias
     */
    async calculateCompatibilityPreview(patient, student, symptomAnalysis) {
        // Versión simplificada del cálculo de compatibilidad
        const breakdown = {};
        
        // Treatment match
        if (symptomAnalysis) {
            const treatmentMatch = this.calculateTreatmentMatch(
                symptomAnalysis.primaryTreatment.name,
                student.especialidades
            );
            breakdown.treatmentMatch = treatmentMatch * 0.4;
        } else {
            breakdown.treatmentMatch = 0.5 * 0.4;
        }
        
        // Student performance
        const performanceScore = this.calculatePerformanceScore(student);
        breakdown.performanceMatch = performanceScore * 0.3;
        
        // Availability
        const availabilityScore = student.isAvailable ? 
            (student.remainingCapacity / student.casosNecesarios) : 0;
        breakdown.availabilityMatch = availabilityScore * 0.3;
        
        const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
        const confidence = this.calculatePreviewConfidence(breakdown);
        
        return {
            totalScore: parseFloat(totalScore.toFixed(3)),
            breakdown: breakdown,
            confidence: parseFloat(confidence.toFixed(2))
        };
    }

    calculateTreatmentMatch(treatmentName, studentSpecialties) {
        if (!treatmentName || !studentSpecialties) return 0.5;
        
        const treatmentSpecialtyMap = {
            'Endodoncia': 'Endodoncia',
            'Resina Simple': 'Operatoria Dental',
            'Resina Compuesta': 'Operatoria Dental',
            'Exodoncia Simple': 'Cirugía Oral',
            'Destartraje y Pulido Coronario': 'Operatoria Dental',
            'Pulido Radicular': 'Periodoncia'
        };
        
        const requiredSpecialty = treatmentSpecialtyMap[treatmentName];
        if (!requiredSpecialty) return 0.7; // Default for general treatments
        
        const hasSpecialty = studentSpecialties.some(s => 
            s.toLowerCase().includes(requiredSpecialty.toLowerCase())
        );
        
        return hasSpecialty ? 0.9 : 0.6;
    }

    calculatePerformanceScore(student) {
        if (!student.casosCompletados && !student.casosActivos) return 0.5;
        
        const completionRate = student.casosCompletados / 
            Math.max(student.casosCompletados + student.casosActivos, 1);
        const experienceBonus = Math.min(student.casosCompletados / 10, 0.3);
        
        return Math.min(completionRate + experienceBonus, 1.0);
    }

    calculatePreviewConfidence(breakdown) {
        const scores = Object.values(breakdown);
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
        
        // Menor varianza = mayor confianza
        return Math.max(0.5, 1 - Math.sqrt(variance));
    }

    generateMatchingReasoning(patient, student, compatibility, symptomAnalysis) {
        const reasons = [];
        
        if (compatibility.breakdown.treatmentMatch > 0.7) {
            reasons.push('Excelente compatibilidad de tratamiento');
        }
        
        if (compatibility.breakdown.performanceMatch > 0.8) {
            reasons.push('Estudiante con alto rendimiento');
        }
        
        if (compatibility.breakdown.availabilityMatch > 0.8) {
            reasons.push('Alta disponibilidad del estudiante');
        }
        
        if (student.isAdvanced) {
            reasons.push('Estudiante de año avanzado');
        }
        
        if (symptomAnalysis && symptomAnalysis.urgencyLevel.level === 'alta' && student.casosActivos < 3) {
            reasons.push('Estudiante disponible para casos urgentes');
        }
        
        return reasons.length > 0 ? reasons : ['Match basado en disponibilidad general'];
    }

    async calculateMatchingMetrics(days) {
        // Esta sería una implementación completa que consulta la base de datos
        // Por ahora retorno valores de ejemplo
        return {
            totalMatches: 45,
            successfulMatches: 42,
            successRate: '93.3%',
            averageCompatibilityScore: 0.847,
            averageProcessingTime: '1.2s',
            optimizationEfficiency: '89.5%',
            treatmentAccuracy: '91.2%'
        };
    }

    async calculateAnalysisAccuracy() {
        return 92.5; // Implementar cálculo real
    }

    async calculateAverageConfidence() {
        return 0.876; // Implementar cálculo real
    }

    async calculatePredictionRate() {
        return 88.3; // Implementar cálculo real
    }
}

module.exports = MatchingController;