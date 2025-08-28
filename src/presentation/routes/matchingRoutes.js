const express = require('express');
const MatchingController = require('../controllers/MatchingController');
const { validateId, validatePagination, sanitizeStrings } = require('../../shared/middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const matchingController = new MatchingController();

// Middleware común para todas las rutas
router.use(sanitizeStrings());

// Rate limiting específico para operaciones de matching (más restrictivo)
const matchingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // máximo 10 requests por minuto
    message: {
        success: false,
        error: 'Demasiadas operaciones de matching. Intenta en 1 minuto.',
        retryAfter: '1 minute'
    }
});

// Rate limiting muy restrictivo para matching automático
const autoMatchingLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 3, // máximo 3 requests cada 5 minutos
    message: {
        success: false,
        error: 'Límite de matching automático alcanzado. Intenta en 5 minutos.',
        retryAfter: '5 minutes'
    }
});

/**
 * @swagger
 * /api/matching/intelligent:
 *   post:
 *     summary: Ejecuta matching inteligente con IA
 *     tags: [Matching]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxPatients:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 50
 *               maxStudents:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 100
 *               urgencyFilter:
 *                 type: boolean
 *                 description: Solo pacientes de alta/muy alta prioridad
 *               clinicFilter:
 *                 type: string
 *                 enum: [Clínica para el Niño y Adolescente, Clínica Integral Adulto y Gerontología]
 *               specialty:
 *                 type: string
 *                 description: Filtrar estudiantes por especialidad
 *     responses:
 *       200:
 *         description: Matching ejecutado exitosamente
 *       429:
 *         description: Límite de rate limiting alcanzado
 */
router.post('/intelligent', 
    autoMatchingLimiter,
    matchingController.executeIntelligentMatching
);

/**
 * @swagger
 * /api/matching/analyze-symptoms:
 *   post:
 *     summary: Analiza síntomas usando IA para inferir tratamiento
 *     tags: [Matching]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symptoms
 *             properties:
 *               symptoms:
 *                 type: string
 *                 description: Descripción de síntomas del paciente
 *                 example: "Dolor constante en muela, sensibilidad al frío"
 *               patientId:
 *                 type: integer
 *                 description: ID del paciente (opcional, para actualizar automáticamente)
 */
router.post('/analyze-symptoms', 
    matchingLimiter,
    matchingController.analyzeSymptoms
);

/**
 * @swagger
 * /api/matching/suggestions/{patientId}:
 *   get:
 *     summary: Obtiene sugerencias inteligentes de estudiantes para un paciente
 *     tags: [Matching]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *           minimum: 1
 *           maximum: 20
 *       - in: query
 *         name: includeAnalysis
 *         schema:
 *           type: boolean
 *           default: true
 */
router.get('/suggestions/:patientId', 
    validateId('patientId'),
    matchingController.getIntelligentSuggestions
);

/**
 * @swagger
 * /api/matching/statistics:
 *   get:
 *     summary: Obtiene estadísticas del sistema de matching inteligente
 *     tags: [Matching]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Período en días para las estadísticas
 */
router.get('/statistics', matchingController.getMatchingStatistics);

/**
 * @swagger
 * /api/matching/batch-analyze:
 *   post:
 *     summary: Analiza múltiples pacientes en lote
 *     tags: [Matching]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientIds
 *             properties:
 *               patientIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 maxItems: 50
 *                 description: Array de IDs de pacientes a analizar
 *               updatePatients:
 *                 type: boolean
 *                 default: false
 *                 description: Si actualizar automáticamente los pacientes con el análisis
 */
router.post('/batch-analyze', 
    matchingLimiter,
    matchingController.batchAnalyzePatients
);

/**
 * @swagger
 * /api/matching/algorithm-info:
 *   get:
 *     summary: Información detallada sobre el algoritmo de matching inteligente
 *     tags: [Matching]
 *     responses:
 *       200:
 *         description: Información del algoritmo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 algorithm:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Intelligent Matching System v3.0"
 *                     version:
 *                       type: string
 *                     type:
 *                       type: string
 *                     description:
 *                       type: string
 */
router.get('/algorithm-info', matchingController.getAlgorithmInfo);

/**
 * Endpoints de compatibilidad con el sistema anterior
 * (mantener durante migración)
 */

/**
 * @swagger
 * /api/matching/auto:
 *   post:
 *     summary: Ejecuta matching automático (compatibilidad con v1)
 *     tags: [Matching]
 *     deprecated: true
 *     description: Este endpoint redirige al nuevo sistema inteligente
 */
router.post('/auto', 
    autoMatchingLimiter,
    async (req, res, next) => {
        // Redirigir al nuevo sistema inteligente
        req.url = '/intelligent';
        req.body = { 
            maxPatients: 50,
            ...req.body 
        };
        matchingController.executeIntelligentMatching(req, res, next);
    }
);

/**
 * @swagger
 * /api/matching/pending:
 *   get:
 *     summary: Obtiene pacientes pendientes con análisis de síntomas
 *     tags: [Matching]
 */
router.get('/pending', async (req, res, next) => {
    try {
        const PatientService = require('../../application/services/PatientService');
        const patientService = new PatientService();
        
        const patients = await patientService.getPendingPatients(
            parseInt(req.query.limit) || 50
        );
        
        // Enriquecer con análisis básico de IA
        const enrichedPatients = await Promise.all(
            patients.map(async (patient) => {
                try {
                    if (patient.sintomas && patient.sintomas.length > 0) {
                        const analysis = await matchingController.symptomAnalyzer.analyzeSymptoms(patient.sintomas);
                        return {
                            ...patient,
                            aiAnalysis: {
                                primaryTreatment: analysis.primaryTreatment.name,
                                urgencyLevel: analysis.urgencyLevel.level,
                                confidence: analysis.confidence,
                                clinicRecommendation: analysis.clinicRecommendation
                            }
                        };
                    }
                    return patient;
                } catch (error) {
                    return patient; // Fallback sin análisis
                }
            })
        );
        
        res.json({
            success: true,
            total: enrichedPatients.length,
            data: enrichedPatients
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/matching/available:
 *   get:
 *     summary: Obtiene estudiantes disponibles con métricas de IA
 *     tags: [Matching]
 */
router.get('/available', async (req, res, next) => {
    try {
        const StudentService = require('../../application/services/StudentService');
        const studentService = new StudentService();
        
        const students = await studentService.getAvailableStudents(
            req.query.especialidad,
            req.query.clinica
        );
        
        res.json({
            success: true,
            total: students.length,
            data: students
        });
        
    } catch (error) {
        next(error);
    }
});

module.exports = router;