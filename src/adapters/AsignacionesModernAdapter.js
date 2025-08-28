/**
 * ASIGNACIONES MODERN ADAPTER
 * Adaptador moderno para endpoints legacy de asignaciones
 * Conecta con AssignmentController enterprise usando async/await
 */

const ModernLegacyAdapter = require('./ModernLegacyAdapter');
const AssignmentController = require('../presentation/controllers/AssignmentController');
const { authenticateToken } = require('../shared/middleware/auth');
const { body } = require('express-validator');

class AsignacionesModernAdapter extends ModernLegacyAdapter {
    constructor() {
        const assignmentController = new AssignmentController();
        super(assignmentController, 'asignaciones');
        
        this.setupRoutes();
    }

    /**
     * Configurar rutas modernas para endpoints legacy de asignaciones
     */
    setupRoutes() {
        const validators = this.createValidators();
        const standardLimiter = this.createRateLimiter({
            max: 100,
            windowMs: 15 * 60 * 1000
        });

        const strictLimiter = this.createRateLimiter({
            max: 20,
            windowMs: 10 * 60 * 1000
        });

        // GET /api/asignaciones - Lista de asignaciones
        this.router.get('/',
            standardLimiter,
            authenticateToken,
            ...validators.pagination(),
            ...this.createAssignmentFilters(),
            this.handleValidationErrors(),
            this.wrapController(this.controller.getAll)
        );

        // GET /api/asignaciones/stats - Estadísticas de asignaciones (temporalmente deshabilitado)
        // this.router.get('/stats',
        //     standardLimiter,
        //     authenticateToken,
        //     this.wrapController(this.controller.getStatistics)
        // );

        // GET /api/asignaciones/diagnostico - Diagnóstico del sistema (deshabilitado temporalmente)
        // this.router.get('/diagnostico',
        //     strictLimiter,
        //     authenticateToken,
        //     this.wrapController(this.controller.getDiagnostico)
        // );

        // GET /api/asignaciones/:id - Asignación específica
        this.router.get('/:id',
            standardLimiter,
            authenticateToken,
            ...validators.idParam(),
            this.handleValidationErrors(),
            this.wrapController(this.controller.getById)
        );

        // POST /api/asignaciones - Crear asignación manual
        this.router.post('/',
            strictLimiter,
            authenticateToken,
            ...this.createAssignmentValidators(),
            this.handleValidationErrors(),
            this.wrapController(this.controller.create)
        );

        // PUT /api/asignaciones/:id - Actualizar asignación
        this.router.put('/:id',
            strictLimiter,
            authenticateToken,
            ...validators.idParam(),
            ...this.createUpdateValidators(),
            this.handleValidationErrors(),
            this.wrapController(this.controller.update)
        );

        // DELETE /api/asignaciones/:id - Eliminar asignación
        this.router.delete('/:id',
            strictLimiter,
            authenticateToken,
            ...validators.idParam(),
            this.handleValidationErrors(),
            this.wrapController(this.controller.delete)
        );

        // POST /api/asignaciones/:id/notificar - Marcar como notificado (deshabilitado temporalmente)
        // this.router.post('/:id/notificar',
        //     strictLimiter,
        //     authenticateToken,
        //     ...validators.idParam(),
        //     this.handleValidationErrors(),
        //     this.wrapController(this.controller.markAsNotified)
        // );
    }

    /**
     * Crear filtros específicos para asignaciones
     */
    createAssignmentFilters() {
        const { query } = require('express-validator');
        return [
            query('estado')
                .optional()
                .isIn(['pendiente', 'asignado', 'en_tratamiento', 'completado', 'cancelado'])
                .withMessage('Estado inválido'),
            query('prioridad')
                .optional()
                .isIn(['baja', 'moderada', 'alta', 'muy_alta'])
                .withMessage('Prioridad inválida'),
            query('fecha_desde')
                .optional()
                .isISO8601()
                .withMessage('Fecha desde debe ser válida (ISO 8601)')
                .toDate(),
            query('fecha_hasta')
                .optional()
                .isISO8601()
                .withMessage('Fecha hasta debe ser válida (ISO 8601)')
                .toDate(),
            query('estudiante_id')
                .optional()
                .isInt({ min: 1 })
                .withMessage('ID de estudiante inválido')
                .toInt(),
            query('paciente_id')
                .optional()
                .isInt({ min: 1 })
                .withMessage('ID de paciente inválido')
                .toInt()
        ];
    }

    /**
     * Validadores para crear asignaciones
     */
    createAssignmentValidators() {
        return [
            body('id_paciente')
                .isInt({ min: 1 })
                .withMessage('ID de paciente debe ser un número positivo')
                .toInt(),
            body('id_estudiante')
                .isInt({ min: 1 })
                .withMessage('ID de estudiante debe ser un número positivo')
                .toInt(),
            body('tipo_asignacion')
                .isIn(['automatica', 'manual', 'prioritaria'])
                .withMessage('Tipo de asignación inválido'),
            body('observaciones')
                .optional()
                .isLength({ max: 500 })
                .withMessage('Observaciones no pueden tener más de 500 caracteres')
                .trim()
                .escape(),
            body('fecha_cita')
                .optional()
                .isISO8601()
                .withMessage('Fecha de cita debe ser válida')
                .toDate(),
            body('prioridad')
                .optional()
                .isIn(['baja', 'moderada', 'alta', 'muy_alta'])
                .withMessage('Prioridad inválida')
        ];
    }

    /**
     * Validadores para actualizar asignaciones
     */
    createUpdateValidators() {
        return [
            body('estado')
                .optional()
                .isIn(['pendiente', 'asignado', 'en_tratamiento', 'completado', 'cancelado'])
                .withMessage('Estado inválido'),
            body('observaciones')
                .optional()
                .isLength({ max: 500 })
                .withMessage('Observaciones no pueden tener más de 500 caracteres')
                .trim()
                .escape(),
            body('fecha_cita')
                .optional()
                .isISO8601()
                .withMessage('Fecha de cita debe ser válida')
                .toDate(),
            body('notas_tratamiento')
                .optional()
                .isLength({ max: 1000 })
                .withMessage('Notas de tratamiento no pueden tener más de 1000 caracteres')
                .trim()
                .escape()
        ];
    }

    /**
     * Handler moderno para obtener asignaciones
     */
    async getAssignments(req, res, next) {
        try {
            const startTime = process.hrtime.bigint();

            // Parámetros de paginación
            const page = req.query.page || 1;
            const limit = Math.min(req.query.limit || 20, 100);
            const offset = req.query.offset || (page - 1) * limit;

            // Filtros avanzados
            const filters = {
                ...(req.query.estado && { estado: req.query.estado }),
                ...(req.query.prioridad && { prioridad: req.query.prioridad }),
                ...(req.query.estudiante_id && { estudiante_id: req.query.estudiante_id }),
                ...(req.query.paciente_id && { paciente_id: req.query.paciente_id }),
                ...(req.query.fecha_desde && { fecha_desde: req.query.fecha_desde }),
                ...(req.query.fecha_hasta && { fecha_hasta: req.query.fecha_hasta })
            };

            this.logger.info('Getting assignments with modern filters', {
                page,
                limit,
                offset,
                filters,
                userId: req.user?.id,
                requestId: req.requestId
            });

            // Verificar que la tabla existe (compatibilidad legacy)
            await this.verifyTableExists();

            const result = await this.controller.getAll({
                ...req,
                query: { page, limit, offset, ...filters }
            }, res, next);

            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000;
            
            this.logger.info('Assignments retrieved successfully', {
                count: result?.data?.length || 0,
                duration,
                page,
                limit,
                filters
            });

            return result;

        } catch (error) {
            this.logger.error('Error getting assignments', {
                error: error.message,
                stack: error.stack,
                filters: req.query,
                userId: req.user?.id
            });
            
            // Manejar caso donde la tabla no existe
            if (error.code === 'ER_NO_SUCH_TABLE') {
                return res.json({
                    success: true,
                    total: 0,
                    data: [],
                    message: 'Tabla de asignaciones no existe'
                });
            }
            
            throw error;
        }
    }

    /**
     * Verificar que la tabla de asignaciones existe
     */
    async verifyTableExists() {
        try {
            const db = require('../../config/database').getConnection();
            
            const [tableCheck] = await (await db).execute(`
                SELECT COUNT(*) as total 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'asignaciones'
            `);

            if (tableCheck[0].total === 0) {
                const error = new Error('Tabla de asignaciones no existe');
                error.code = 'ER_NO_SUCH_TABLE';
                throw error;
            }

        } catch (error) {
            this.logger.warn('Error verifying assignments table', error);
            throw error;
        }
    }

    /**
     * Handler moderno para estadísticas
     */
    async getAssignmentStats(req, res, next) {
        try {
            this.logger.info('Getting assignment statistics', {
                userId: req.user?.id,
                requestId: req.requestId
            });

            await this.verifyTableExists();

            const enterpriseReq = {
                ...req,
                url: '/statistics'
            };

            return await this.controller.getStatistics(enterpriseReq, res, next);

        } catch (error) {
            this.logger.error('Error getting assignment statistics', {
                error: error.message,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Handler moderno para diagnóstico del sistema
     */
    async getDiagnostico(req, res, next) {
        try {
            this.logger.info('Running system diagnostics', {
                userId: req.user?.id,
                requestId: req.requestId
            });

            const diagnostics = {
                timestamp: new Date().toISOString(),
                system: 'asignaciones',
                status: 'healthy',
                checks: {}
            };

            // Verificar tabla de asignaciones
            try {
                await this.verifyTableExists();
                diagnostics.checks.tabla_asignaciones = { status: 'ok', message: 'Tabla existe' };
            } catch (error) {
                diagnostics.checks.tabla_asignaciones = { status: 'error', message: error.message };
                diagnostics.status = 'degraded';
            }

            // Verificar conexión a base de datos
            try {
                const db = require('../../config/database').getConnection();
                await (await db).execute('SELECT 1');
                diagnostics.checks.database_connection = { status: 'ok', message: 'Conexión exitosa' };
            } catch (error) {
                diagnostics.checks.database_connection = { status: 'error', message: error.message };
                diagnostics.status = 'error';
            }

            return res.json({
                success: true,
                data: diagnostics,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Error running diagnostics', {
                error: error.message,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Handler moderno para crear asignación
     */
    async createAssignment(req, res, next) {
        try {
            this.logger.info('Creating new assignment', {
                assignmentData: {
                    id_paciente: req.body.id_paciente,
                    id_estudiante: req.body.id_estudiante,
                    tipo_asignacion: req.body.tipo_asignacion
                },
                userId: req.user?.id,
                requestId: req.requestId
            });

            // Validaciones adicionales
            await this.validateAssignmentCreation(req.body);

            // Agregar metadatos de creación
            req.body.creado_por = req.user?.id;
            req.body.fecha_creacion = new Date();
            req.body.ip_creacion = req.ip;

            return await this.controller.create(req, res, next);

        } catch (error) {
            this.logger.error('Error creating assignment', {
                error: error.message,
                assignmentData: req.body,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Validar creación de asignación
     */
    async validateAssignmentCreation(assignmentData) {
        try {
            const db = require('../../config/database').getConnection();
            
            // Verificar que el paciente existe y está disponible
            const [patients] = await (await db).execute(
                'SELECT id, estado FROM pacientes WHERE id = ? AND activo = 1',
                [assignmentData.id_paciente]
            );

            if (patients.length === 0) {
                const error = new Error('Paciente no encontrado o inactivo');
                error.statusCode = 404;
                error.code = 'PATIENT_NOT_FOUND';
                throw error;
            }

            // Verificar que el estudiante existe y está disponible
            const [students] = await (await db).execute(
                'SELECT id, activo FROM estudiantes_odontologia WHERE id = ? AND activo = 1',
                [assignmentData.id_estudiante]
            );

            if (students.length === 0) {
                const error = new Error('Estudiante no encontrado o inactivo');
                error.statusCode = 404;
                error.code = 'STUDENT_NOT_FOUND';
                throw error;
            }

            // Verificar que no existe asignación activa
            const [existing] = await (await db).execute(
                'SELECT id FROM asignaciones WHERE id_paciente = ? AND estado IN (?, ?) AND activo = 1',
                [assignmentData.id_paciente, 'asignado', 'en_tratamiento']
            );

            if (existing.length > 0) {
                const error = new Error('El paciente ya tiene una asignación activa');
                error.statusCode = 409;
                error.code = 'PATIENT_ALREADY_ASSIGNED';
                throw error;
            }

        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            
            this.logger.warn('Error validating assignment creation, proceeding anyway', {
                error: error.message,
                assignmentData
            });
        }
    }

    /**
     * Handler para marcar como notificado
     */
    async markAsNotified(req, res, next) {
        try {
            const assignmentId = parseInt(req.params.id);
            
            this.logger.info('Marking assignment as notified', {
                assignmentId,
                userId: req.user?.id,
                requestId: req.requestId
            });

            const db = require('../../config/database').getConnection();
            
            await (await db).execute(
                'UPDATE asignaciones SET notificado = 1, fecha_notificacion = NOW() WHERE id = ?',
                [assignmentId]
            );

            return res.json({
                success: true,
                message: `Asignación ${assignmentId} marcada como notificada`,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Error marking assignment as notified', {
                error: error.message,
                assignmentId: req.params.id,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Transformar respuesta enterprise a formato legacy
     */
    transformResponseToLegacy(data) {
        // Lista de asignaciones
        if (data && data.assignments && Array.isArray(data.assignments)) {
            return {
                success: true,
                total: data.total || data.assignments.length,
                data: data.assignments.map(assignment => ({
                    ...assignment,
                    // Mapear campos enterprise a legacy
                    fecha_asignacion: assignment.createdAt || assignment.fecha_asignacion,
                    fecha_actualizacion: assignment.updatedAt || assignment.fecha_actualizacion,
                    // Incluir datos relacionados
                    paciente_nombre: assignment.patient?.fullName || assignment.paciente_nombre,
                    estudiante_nombre: assignment.student?.fullName || assignment.estudiante_nombre,
                    estudiante_codigo: assignment.student?.code || assignment.estudiante_codigo
                })),
                timestamp: new Date().toISOString()
            };
        }

        return super.transformResponseToLegacy(data);
    }
}

module.exports = AsignacionesModernAdapter;