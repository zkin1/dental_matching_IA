const express = require('express');
const StudentController = require('../controllers/StudentController');
const { validateDTO, validateId, validatePagination, sanitizeStrings } = require('../../shared/middleware/validation');
const { CreateStudentDTO, UpdateStudentDTO } = require('../../application/dtos/StudentDTO');

const router = express.Router();
const studentController = new StudentController();

// Middleware común para todas las rutas
router.use(sanitizeStrings());

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Obtiene todos los estudiantes con filtros y paginación
 *     tags: [Students]
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
 *         name: especialidad
 *         schema:
 *           type: string
 *       - in: query
 *         name: anoCarrera
 *         schema:
 *           type: string
 *       - in: query
 *         name: disponible
 *         schema:
 *           type: boolean
 */
router.get('/', 
    validatePagination(),
    studentController.getAll
);

/**
 * @swagger
 * /api/students/available:
 *   get:
 *     summary: Obtiene estudiantes disponibles para asignación
 *     tags: [Students]
 */
router.get('/available', studentController.getAvailable);

/**
 * @swagger
 * /api/students/search:
 *   get:
 *     summary: Busca estudiantes por nombre o código
 *     tags: [Students]
 */
router.get('/search', studentController.search);

/**
 * @swagger
 * /api/students/statistics:
 *   get:
 *     summary: Obtiene estadísticas de estudiantes
 *     tags: [Students]
 */
router.get('/statistics', studentController.getStatistics);

/**
 * @swagger
 * /api/students/performance-ranking:
 *   get:
 *     summary: Obtiene ranking de rendimiento de estudiantes
 *     tags: [Students]
 */
router.get('/performance-ranking', studentController.getPerformanceRanking);

/**
 * @swagger
 * /api/students/low-workload:
 *   get:
 *     summary: Obtiene estudiantes con poca carga de trabajo
 *     tags: [Students]
 */
router.get('/low-workload', studentController.getLowWorkload);

/**
 * @swagger
 * /api/students/advanced:
 *   get:
 *     summary: Obtiene estudiantes avanzados (4to y 5to año)
 *     tags: [Students]
 */
router.get('/advanced', studentController.getAdvanced);

/**
 * @swagger
 * /api/students/by-specialty/{specialty}:
 *   get:
 *     summary: Obtiene estudiantes por especialidad
 *     tags: [Students]
 */
router.get('/by-specialty/:specialty', studentController.getBySpecialty);

/**
 * @swagger
 * /api/students/by-year/{year}:
 *   get:
 *     summary: Obtiene estudiantes por año de carrera
 *     tags: [Students]
 */
router.get('/by-year/:year', studentController.getByYear);

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Obtiene un estudiante por ID
 *     tags: [Students]
 */
router.get('/:id', 
    validateId(),
    studentController.getById
);

/**
 * @swagger
 * /api/students/{id}/workload-details:
 *   get:
 *     summary: Obtiene detalles de carga de trabajo de un estudiante
 *     tags: [Students]
 */
router.get('/:id/workload-details', 
    validateId(),
    studentController.getWorkloadDetails
);

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Crea un nuevo estudiante
 *     tags: [Students]
 */
router.post('/', 
    validateDTO(CreateStudentDTO, 'body'),
    studentController.create
);

/**
 * @swagger
 * /api/students/{id}/specialties:
 *   post:
 *     summary: Agrega especialidades a un estudiante
 *     tags: [Students]
 */
router.post('/:id/specialties', 
    validateId(),
    studentController.addSpecialties
);

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Actualiza un estudiante
 *     tags: [Students]
 */
router.put('/:id', 
    validateId(),
    validateDTO(UpdateStudentDTO, 'body'),
    studentController.update
);

/**
 * @swagger
 * /api/students/{id}/workload:
 *   patch:
 *     summary: Actualiza la carga de trabajo de un estudiante
 *     tags: [Students]
 */
router.patch('/:id/workload', 
    validateId(),
    studentController.updateWorkload
);

/**
 * @swagger
 * /api/students/{id}/specialties:
 *   delete:
 *     summary: Remueve especialidades de un estudiante
 *     tags: [Students]
 */
router.delete('/:id/specialties', 
    validateId(),
    studentController.removeSpecialties
);

module.exports = router;