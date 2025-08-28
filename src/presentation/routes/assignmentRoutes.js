const express = require('express');
const AssignmentController = require('../controllers/AssignmentController');
const { validateDTO, validateId, validatePagination, validateDateRange, sanitizeStrings } = require('../../shared/middleware/validation');
const { CreateAssignmentDTO, UpdateAssignmentDTO } = require('../../application/dtos/AssignmentDTO');

const router = express.Router();
const assignmentController = new AssignmentController();

// Middleware común para todas las rutas
router.use(sanitizeStrings());

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     summary: Obtiene todas las asignaciones con filtros y paginación
 *     tags: [Assignments]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [asignado, notificado, contactado, confirmado, en_tratamiento, completado, cancelado]
 *       - in: query
 *         name: especialidad
 *         schema:
 *           type: string
 *       - in: query
 *         name: clinica
 *         schema:
 *           type: string
 *       - in: query
 *         name: fechaDesde
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaHasta
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/', 
    validatePagination(),
    validateDateRange(),
    assignmentController.getAll
);

/**
 * @swagger
 * /api/assignments/active:
 *   get:
 *     summary: Obtiene asignaciones activas
 *     tags: [Assignments]
 */
router.get('/active', assignmentController.getActive);

/**
 * @swagger
 * /api/assignments/statistics:
 *   get:
 *     summary: Obtiene estadísticas de asignaciones
 *     tags: [Assignments]
 */
router.get('/statistics', assignmentController.getStatistics);

/**
 * @swagger
 * /api/assignments/summary:
 *   get:
 *     summary: Obtiene resumen ejecutivo de asignaciones
 *     tags: [Assignments]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Número de días para el resumen
 */
router.get('/summary', assignmentController.getSummary);

/**
 * @swagger
 * /api/assignments/date-range:
 *   get:
 *     summary: Obtiene asignaciones por rango de fechas
 *     tags: [Assignments]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/date-range', 
    validateDateRange('startDate', 'endDate'),
    assignmentController.getByDateRange
);

/**
 * @swagger
 * /api/assignments/by-patient/{patientId}:
 *   get:
 *     summary: Obtiene historial de asignaciones de un paciente
 *     tags: [Assignments]
 */
router.get('/by-patient/:patientId', 
    validateId('patientId'),
    assignmentController.getByPatient
);

/**
 * @swagger
 * /api/assignments/by-student/{studentId}:
 *   get:
 *     summary: Obtiene carga de trabajo y asignaciones de un estudiante
 *     tags: [Assignments]
 *     parameters:
 *       - in: query
 *         name: includeHistory
 *         schema:
 *           type: boolean
 *           default: false
 */
router.get('/by-student/:studentId', 
    validateId('studentId'),
    assignmentController.getByStudent
);

/**
 * @swagger
 * /api/assignments/by-specialty/{specialty}:
 *   get:
 *     summary: Obtiene asignaciones por especialidad
 *     tags: [Assignments]
 */
router.get('/by-specialty/:specialty', assignmentController.getBySpecialty);

/**
 * @swagger
 * /api/assignments/by-clinic/{clinic}:
 *   get:
 *     summary: Obtiene asignaciones por clínica
 *     tags: [Assignments]
 */
router.get('/by-clinic/:clinic', assignmentController.getByClinic);

/**
 * @swagger
 * /api/assignments/by-date/{date}:
 *   get:
 *     summary: Obtiene asignaciones por fecha específica
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^\d{4}-\d{2}-\d{2}$
 *         example: "2024-01-15"
 */
router.get('/by-date/:date', assignmentController.getByDate);

/**
 * @swagger
 * /api/assignments/conflicts/{studentId}:
 *   get:
 *     summary: Verifica conflictos de horarios para un estudiante
 *     tags: [Assignments]
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: horaInicio
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^([01]?[0-9]|2[0-3]):[0-5][0-9]$
 *       - in: query
 *         name: horaFin
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^([01]?[0-9]|2[0-3]):[0-5][0-9]$
 */
router.get('/conflicts/:studentId', 
    validateId('studentId'),
    assignmentController.checkTimeConflicts
);

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Obtiene una asignación por ID
 *     tags: [Assignments]
 */
router.get('/:id', 
    validateId(),
    assignmentController.getById
);

/**
 * @swagger
 * /api/assignments/manual:
 *   post:
 *     summary: Crea una nueva asignación manual
 *     tags: [Assignments]
 */
router.post('/manual', 
    validateDTO(CreateAssignmentDTO, 'body'),
    assignmentController.createManual
);

/**
 * @swagger
 * /api/assignments/{id}/cancel:
 *   post:
 *     summary: Cancela una asignación
 *     tags: [Assignments]
 */
router.post('/:id/cancel', 
    validateId(),
    assignmentController.cancel
);

/**
 * @swagger
 * /api/assignments/{id}/complete:
 *   post:
 *     summary: Completa una asignación
 *     tags: [Assignments]
 */
router.post('/:id/complete', 
    validateId(),
    assignmentController.complete
);

/**
 * @swagger
 * /api/assignments/{id}:
 *   put:
 *     summary: Actualiza una asignación
 *     tags: [Assignments]
 */
router.put('/:id', 
    validateId(),
    validateDTO(UpdateAssignmentDTO, 'body'),
    assignmentController.update
);

/**
 * @swagger
 * /api/assignments/{id}/status:
 *   patch:
 *     summary: Actualiza solo el estado de una asignación
 *     tags: [Assignments]
 */
router.patch('/:id/status', 
    validateId(),
    assignmentController.updateStatus
);

module.exports = router;