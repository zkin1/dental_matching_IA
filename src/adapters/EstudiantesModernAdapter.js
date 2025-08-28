/**
 * ESTUDIANTES MODERN ADAPTER
 * Adaptador moderno para endpoints legacy de estudiantes
 * Conecta con StudentController enterprise usando async/await
 */

const ModernLegacyAdapter = require('./ModernLegacyAdapter');
const StudentController = require('../presentation/controllers/StudentController');
const { authenticateToken } = require('../shared/middleware/auth');
const { body } = require('express-validator');

class EstudiantesModernAdapter extends ModernLegacyAdapter {
    constructor() {
        const studentController = new StudentController();
        super(studentController, 'estudiantes');
        
        this.setupRoutes();
    }

    /**
     * Configurar rutas modernas para endpoints legacy de estudiantes
     */
    setupRoutes() {
        const validators = this.createValidators();
        const rateLimiter = this.createRateLimiter({
            max: 50,
            windowMs: 10 * 60 * 1000
        });

        // GET /api/estudiantes - Lista de estudiantes
        this.router.get('/',
            rateLimiter,
            authenticateToken,
            ...validators.pagination(),
            ...this.createStudentFilters(),
            this.handleValidationErrors(),
            this.wrapController(this.controller.getAll)
        );

        // GET /api/estudiantes/disponibles - Estudiantes disponibles (temporalmente deshabilitado)
        // this.router.get('/disponibles',
        //     rateLimiter,
        //     authenticateToken,
        //     this.wrapController(this.getAvailableStudents.bind(this))
        // );

        // GET /api/estudiantes/stats - Estadísticas de estudiantes (temporalmente deshabilitado)
        // this.router.get('/stats',
        //     rateLimiter,
        //     authenticateToken,
        //     this.wrapController(this.getStudentStats.bind(this))
        // );

        // GET /api/estudiantes/:id - Estudiante específico
        this.router.get('/:id',
            rateLimiter,
            authenticateToken,
            ...validators.idParam(),
            this.handleValidationErrors(),
            this.wrapController(this.getStudentById.bind(this))
        );

        // POST /api/estudiantes - Crear estudiante
        this.router.post('/',
            rateLimiter,
            authenticateToken,
            ...this.createStudentValidators(),
            this.handleValidationErrors(),
            this.wrapController(this.createStudent.bind(this))
        );

        // PUT /api/estudiantes/:id - Actualizar estudiante
        this.router.put('/:id',
            rateLimiter,
            authenticateToken,
            ...validators.idParam(),
            ...this.createStudentValidators(),
            this.handleValidationErrors(),
            this.wrapController(this.updateStudent.bind(this))
        );
    }

    /**
     * Crear validadores específicos para estudiantes
     */
    createStudentFilters() {
        const { query } = require('express-validator');
        return [
            query('especialidad')
                .optional()
                .isIn(['odontologia_general', 'ortodoncia', 'endodoncia', 'cirugia', 'periodoncia', 'pediatrica'])
                .withMessage('Especialidad inválida'),
            query('semestre')
                .optional()
                .isInt({ min: 1, max: 10 })
                .withMessage('Semestre debe ser entre 1 y 10')
                .toInt(),
            query('disponible')
                .optional()
                .isBoolean()
                .withMessage('Disponible debe ser true o false')
                .toBoolean()
        ];
    }

    /**
     * Crear validadores para creación/actualización de estudiantes
     */
    createStudentValidators() {
        return [
            body('nombre_completo')
                .notEmpty()
                .isLength({ min: 3, max: 100 })
                .withMessage('Nombre completo debe tener entre 3 y 100 caracteres')
                .trim()
                .escape(),
            body('email')
                .isEmail()
                .normalizeEmail()
                .withMessage('Email inválido'),
            body('codigo_estudiante')
                .notEmpty()
                .isLength({ min: 6, max: 20 })
                .withMessage('Código de estudiante debe tener entre 6 y 20 caracteres')
                .trim(),
            body('semestre')
                .isInt({ min: 1, max: 10 })
                .withMessage('Semestre debe ser entre 1 y 10')
                .toInt(),
            body('especialidad')
                .isIn(['odontologia_general', 'ortodoncia', 'endodoncia', 'cirugia', 'periodoncia', 'pediatrica'])
                .withMessage('Especialidad inválida'),
            body('telefono')
                .optional()
                .isMobilePhone('es-CO')
                .withMessage('Teléfono inválido para Colombia'),
            body('universidad')
                .optional()
                .isLength({ max: 100 })
                .withMessage('Universidad no puede tener más de 100 caracteres')
                .trim()
                .escape()
        ];
    }

    /**
     * Handler moderno para obtener estudiantes
     */
    async getStudents(req, res, next) {
        try {
            const startTime = process.hrtime.bigint();

            // Parámetros modernos con validación
            const page = req.query.page || 1;
            const limit = Math.min(req.query.limit || 20, 100);
            const offset = req.query.offset || (page - 1) * limit;

            // Filtros modernos
            const filters = {
                ...(req.query.especialidad && { especialidad: req.query.especialidad }),
                ...(req.query.semestre && { semestre: parseInt(req.query.semestre) }),
                ...(req.query.disponible !== undefined && { disponible: req.query.disponible }),
                ...(req.query.ciudad && { ciudad: req.query.ciudad }),
                activo: 1
            };

            this.logger.info('Getting students with modern filters', {
                page,
                limit,
                offset,
                filters,
                userId: req.user?.id,
                requestId: req.requestId
            });

            // Llamar al controlador enterprise
            const result = await this.controller.getAll({
                ...req,
                query: { page, limit, offset, ...filters }
            }, res, next);

            // Log performance
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000;
            
            this.logger.info('Students retrieved successfully', {
                count: result?.data?.length || 0,
                duration,
                page,
                limit
            });

            return result;

        } catch (error) {
            this.logger.error('Error getting students', {
                error: error.message,
                stack: error.stack,
                filters: req.query,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Handler moderno para estudiantes disponibles
     */
    async getAvailableStudents(req, res, next) {
        try {
            this.logger.info('Getting available students', {
                userId: req.user?.id,
                requestId: req.requestId
            });

            // Mapear a endpoint enterprise
            const enterpriseReq = {
                ...req,
                url: '/available',
                query: {
                    ...req.query,
                    disponible: true,
                    activo: 1
                }
            };

            return await this.controller.getAvailable(enterpriseReq, res, next);

        } catch (error) {
            this.logger.error('Error getting available students', {
                error: error.message,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Handler moderno para estadísticas de estudiantes
     */
    async getStudentStats(req, res, next) {
        try {
            this.logger.info('Getting student statistics', {
                userId: req.user?.id,
                requestId: req.requestId
            });

            const enterpriseReq = {
                ...req,
                url: '/statistics'
            };

            return await this.controller.getStatistics(enterpriseReq, res, next);

        } catch (error) {
            this.logger.error('Error getting student statistics', {
                error: error.message,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Handler moderno para estudiante por ID
     */
    async getStudentById(req, res, next) {
        try {
            const studentId = parseInt(req.params.id);
            
            this.logger.info('Getting student by ID', {
                studentId,
                userId: req.user?.id,
                requestId: req.requestId
            });

            if (!studentId || studentId <= 0) {
                const error = new Error('ID de estudiante inválido');
                error.statusCode = 400;
                error.code = 'INVALID_STUDENT_ID';
                throw error;
            }

            return await this.controller.getById(req, res, next);

        } catch (error) {
            this.logger.error('Error getting student by ID', {
                error: error.message,
                studentId: req.params.id,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Handler moderno para crear estudiante
     */
    async createStudent(req, res, next) {
        try {
            this.logger.info('Creating new student', {
                studentData: {
                    nombre_completo: req.body.nombre_completo,
                    email: req.body.email,
                    codigo_estudiante: req.body.codigo_estudiante,
                    especialidad: req.body.especialidad,
                    semestre: req.body.semestre
                },
                userId: req.user?.id,
                requestId: req.requestId
            });

            // Validar duplicados antes de crear
            await this.validateUniqueStudent(req.body);

            return await this.controller.create(req, res, next);

        } catch (error) {
            this.logger.error('Error creating student', {
                error: error.message,
                studentData: req.body,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Handler moderno para actualizar estudiante
     */
    async updateStudent(req, res, next) {
        try {
            const studentId = parseInt(req.params.id);
            
            this.logger.info('Updating student', {
                studentId,
                updateData: req.body,
                userId: req.user?.id,
                requestId: req.requestId
            });

            if (!studentId || studentId <= 0) {
                const error = new Error('ID de estudiante inválido');
                error.statusCode = 400;
                error.code = 'INVALID_STUDENT_ID';
                throw error;
            }

            return await this.controller.update(req, res, next);

        } catch (error) {
            this.logger.error('Error updating student', {
                error: error.message,
                studentId: req.params.id,
                updateData: req.body,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Validar que el estudiante no existe (email y código únicos)
     */
    async validateUniqueStudent(studentData) {
        try {
            // Esta lógica debería estar en el service layer, pero para el adapter legacy...
            const db = require('../../config/database').getConnection();
            
            const [existingStudents] = await (await db).execute(
                'SELECT id, email, codigo_estudiante FROM estudiantes_odontologia WHERE email = ? OR codigo_estudiante = ?',
                [studentData.email, studentData.codigo_estudiante]
            );

            if (existingStudents.length > 0) {
                const existing = existingStudents[0];
                let message = 'Ya existe un estudiante con ';
                
                if (existing.email === studentData.email) {
                    message += 'ese email';
                } else if (existing.codigo_estudiante === studentData.codigo_estudiante) {
                    message += 'ese código';
                }

                const error = new Error(message);
                error.statusCode = 409;
                error.code = 'DUPLICATE_STUDENT';
                throw error;
            }

        } catch (error) {
            if (error.code === 'DUPLICATE_STUDENT') {
                throw error;
            }
            
            this.logger.warn('Error validating unique student, proceeding anyway', {
                error: error.message,
                studentData
            });
            // No fallar aquí, dejar que el controlador maneje los duplicados
        }
    }

    /**
     * Transformar respuesta enterprise a formato legacy
     */
    transformResponseToLegacy(data) {
        // Lista de estudiantes
        if (data && data.students && Array.isArray(data.students)) {
            return {
                success: true,
                total: data.total || data.students.length,
                data: data.students.map(student => ({
                    ...student,
                    // Mapear campos enterprise a legacy
                    nombre_completo: student.fullName || student.nombre_completo,
                    codigo_estudiante: student.code || student.codigo_estudiante,
                    fecha_registro: student.createdAt || student.fecha_registro,
                    fecha_actualizacion: student.updatedAt || student.fecha_actualizacion,
                    // Mantener compatibilidad
                    pacientes_asignados: student.assignedPatientsCount || student.pacientes_asignados || 0,
                    carga_trabajo: student.workload || student.carga_trabajo || 'baja'
                })),
                timestamp: new Date().toISOString()
            };
        }

        // Estudiante único
        if (data && data.id) {
            return {
                success: true,
                data: {
                    ...data,
                    nombre_completo: data.fullName || data.nombre_completo,
                    codigo_estudiante: data.code || data.codigo_estudiante,
                    fecha_registro: data.createdAt || data.fecha_registro
                },
                timestamp: new Date().toISOString()
            };
        }

        return super.transformResponseToLegacy(data);
    }
}

module.exports = EstudiantesModernAdapter;