const express = require('express');
const PatientController = require('../controllers/PatientController');
const { validateDTO, validateId, validatePagination, sanitizeStrings } = require('../../shared/middleware/validation');
const { CreatePatientDTO, UpdatePatientDTO, PatientSearchDTO } = require('../../application/dtos/PatientDTO');

const router = express.Router();
const patientController = new PatientController();

// Middleware común para todas las rutas
router.use(sanitizeStrings());

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Obtiene todos los pacientes con filtros y paginación
 *     tags: [Patients]
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
 *         name: ciudad
 *         schema:
 *           type: string
 *       - in: query
 *         name: prioridad
 *         schema:
 *           type: string
 *           enum: [baja, moderada, alta, muy_alta]
 */
router.get('/', 
    validatePagination(),
    patientController.getAll
);

/**
 * @swagger
 * /api/patients/search:
 *   get:
 *     summary: Busca pacientes por síntomas
 *     tags: [Patients]
 */
router.get('/search', patientController.searchBySymptoms);

/**
 * @swagger
 * /api/patients/pending:
 *   get:
 *     summary: Obtiene pacientes pendientes de asignación
 *     tags: [Patients]
 */
router.get('/pending', patientController.getPending);

/**
 * @swagger
 * /api/patients/statistics:
 *   get:
 *     summary: Obtiene estadísticas de pacientes
 *     tags: [Patients]
 */
router.get('/statistics', patientController.getStatistics);

/**
 * @swagger
 * /api/patients/pediatric:
 *   get:
 *     summary: Obtiene pacientes pediátricos
 *     tags: [Patients]
 */
router.get('/pediatric', patientController.getPediatric);

/**
 * @swagger
 * /api/patients/adult:
 *   get:
 *     summary: Obtiene pacientes adultos
 *     tags: [Patients]
 */
router.get('/adult', patientController.getAdult);

/**
 * @swagger
 * /api/patients/by-city/{city}:
 *   get:
 *     summary: Obtiene pacientes por ciudad
 *     tags: [Patients]
 */
router.get('/by-city/:city', patientController.getByCity);

/**
 * @swagger
 * /api/patients/by-priority/{priority}:
 *   get:
 *     summary: Obtiene pacientes por prioridad
 *     tags: [Patients]
 */
router.get('/by-priority/:priority', patientController.getByPriority);

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Obtiene un paciente por ID
 *     tags: [Patients]
 */
router.get('/:id', 
    validateId(),
    patientController.getById
);

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Crea un nuevo paciente
 *     tags: [Patients]
 */
router.post('/', 
    validateDTO(CreatePatientDTO, 'body'),
    patientController.create
);

/**
 * @swagger
 * /api/patients/batch:
 *   post:
 *     summary: Crea múltiples pacientes en lote
 *     tags: [Patients]
 */
router.post('/batch', patientController.createBatch);

/**
 * @swagger
 * /api/patients/{id}:
 *   put:
 *     summary: Actualiza un paciente
 *     tags: [Patients]
 */
router.put('/:id', 
    validateId(),
    validateDTO(UpdatePatientDTO, 'body'),
    patientController.update
);

/**
 * @swagger
 * /api/patients/{id}/status:
 *   patch:
 *     summary: Actualiza solo el estado de un paciente
 *     tags: [Patients]
 */
router.patch('/:id/status', 
    validateId(),
    patientController.updateStatus
);

/**
 * @swagger
 * /api/patients/{id}:
 *   delete:
 *     summary: Elimina un paciente (soft delete)
 *     tags: [Patients]
 */
router.delete('/:id', 
    validateId(),
    patientController.delete
);

module.exports = router;