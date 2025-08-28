/**
 * PACIENTES MODERN ADAPTER
 * Adaptador moderno para endpoints legacy de pacientes
 * Conecta con PatientController enterprise usando async/await
 */

const ModernLegacyAdapter = require('./ModernLegacyAdapter');
const PatientController = require('../presentation/controllers/PatientController');
const { authenticateToken } = require('../shared/middleware/auth');

class PacientesModernAdapter extends ModernLegacyAdapter {
    constructor() {
        try {
            const patientController = new PatientController();
            super(patientController, 'pacientes');
            
            // Verify controller methods exist
            if (!patientController.getAll || typeof patientController.getAll !== 'function') {
                throw new Error('PatientController.getAll method is not available');
            }
            if (!patientController.getById || typeof patientController.getById !== 'function') {
                throw new Error('PatientController.getById method is not available');
            }
            
            this.setupRoutes();
        } catch (error) {
            console.error('Error initializing PacientesModernAdapter:', error.message);
            throw error;
        }
    }

    /**
     * Configurar rutas modernas para endpoints legacy
     */
    setupRoutes() {
        const validators = this.createValidators();
        const rateLimiter = this.createRateLimiter({
            max: 50, // Más restrictivo para datos sensibles
            windowMs: 10 * 60 * 1000 // 10 minutos
        });

        // GET /api/pacientes - Lista de pacientes con paginación moderna
        this.router.get('/',
            rateLimiter,
            authenticateToken,
            ...validators.pagination(),
            ...validators.commonFilters(),
            this.handleValidationErrors(),
            this.wrapController(this.controller.getAll)
        );

        // GET /api/pacientes/stats - Estadísticas modernas (temporalmente deshabilitado)
        // this.router.get('/stats',
        //     rateLimiter,
        //     authenticateToken,
        //     this.wrapController(this.getStatistics.bind(this))
        // );

        // GET /api/pacientes/:id - Paciente específico con validación moderna
        this.router.get('/:id',
            rateLimiter,
            authenticateToken,
            ...validators.idParam(),
            this.handleValidationErrors(),
            this.wrapController(this.controller.getById)
        );
    }

    /**
     * Handler moderno para obtener pacientes
     */
    async getPatients(req, res, next) {
        try {
            const startTime = process.hrtime.bigint();

            // Parámetros con valores por defecto modernos
            const page = req.query.page || 1;
            const limit = Math.min(req.query.limit || 20, 100);
            const offset = req.query.offset || (page - 1) * limit;

            // Filtros modernos
            const filters = {
                ...(req.query.ciudad && { ciudad: req.query.ciudad }),
                ...(req.query.estado && { estado: req.query.estado }),
                ...(req.query.prioridad && { prioridad: req.query.prioridad }),
                activo: 1
            };

            this.logger.info('Getting patients with modern pagination', {
                page,
                limit,
                offset,
                filters,
                userId: req.user?.id,
                requestId: req.requestId
            });

            // Llamar al controlador enterprise de manera moderna
            const result = await this.controller.getAll({
                ...req,
                query: { page, limit, offset, ...filters }
            }, res, next);

            // Log performance
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000;
            
            this.logger.info('Patients retrieved successfully', {
                count: result?.data?.length || 0,
                duration,
                page,
                limit
            });

            return result;

        } catch (error) {
            this.logger.error('Error getting patients', {
                error: error.message,
                stack: error.stack,
                filters: req.query,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Handler moderno para estadísticas
     */
    async getStatistics(req, res, next) {
        try {
            this.logger.info('Getting patient statistics', {
                userId: req.user?.id,
                requestId: req.requestId
            });

            // Usar el método enterprise de estadísticas
            const enterpriseReq = {
                ...req,
                params: { ...req.params },
                url: '/statistics' // Mapear a ruta enterprise
            };

            return await this.controller.getStatistics(enterpriseReq, res, next);

        } catch (error) {
            this.logger.error('Error getting patient statistics', {
                error: error.message,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Handler moderno para paciente por ID
     */
    async getPatientById(req, res, next) {
        try {
            const patientId = parseInt(req.params.id);
            
            this.logger.info('Getting patient by ID', {
                patientId,
                userId: req.user?.id,
                requestId: req.requestId
            });

            // Validación adicional
            if (!patientId || patientId <= 0) {
                const error = new Error('ID de paciente inválido');
                error.statusCode = 400;
                error.code = 'INVALID_PATIENT_ID';
                throw error;
            }

            return await this.controller.getById(req, res, next);

        } catch (error) {
            this.logger.error('Error getting patient by ID', {
                error: error.message,
                patientId: req.params.id,
                userId: req.user?.id
            });
            throw error;
        }
    }

    /**
     * Transformar respuesta enterprise a formato legacy esperado
     */
    transformResponseToLegacy(data) {
        // Si es una respuesta de lista de pacientes
        if (data && data.patients && Array.isArray(data.patients)) {
            return {
                success: true,
                total: data.total || data.patients.length,
                data: data.patients.map(patient => ({
                    ...patient,
                    // Mapear campos enterprise a legacy si es necesario
                    nombre_completo: patient.fullName || patient.nombre_completo,
                    fecha_registro: patient.createdAt || patient.fecha_registro,
                    tipo_tratamiento_inferido: patient.treatmentType || patient.tipo_tratamiento_inferido,
                    nivel_dolor: patient.painLevel || patient.nivel_dolor || 0,
                    // Mantener compatibilidad con campos legacy
                    estudiante_asignado: patient.assignedStudent?.id || patient.estudiante_asignado,
                    estudiante_nombre: patient.assignedStudent?.fullName || patient.estudiante_nombre,
                    estudiante_codigo: patient.assignedStudent?.code || patient.estudiante_codigo
                })),
                pagination: {
                    page: data.page || 1,
                    limit: data.limit || 20,
                    total: data.total || 0,
                    pages: Math.ceil((data.total || 0) / (data.limit || 20))
                },
                timestamp: new Date().toISOString()
            };
        }

        // Si es una respuesta de paciente único
        if (data && data.id) {
            return {
                success: true,
                data: {
                    ...data,
                    // Mapear campos si es necesario
                    nombre_completo: data.fullName || data.nombre_completo,
                    fecha_registro: data.createdAt || data.fecha_registro
                },
                timestamp: new Date().toISOString()
            };
        }

        // Si es estadísticas
        if (data && (data.total !== undefined || data.pendientes !== undefined)) {
            return {
                success: true,
                data: {
                    ...data,
                    // Asegurar que todos los campos esperados existan
                    total: data.total || 0,
                    pendientes: data.pendientes || data.pending || 0,
                    asignados: data.asignados || data.assigned || 0,
                    completados: data.completados || data.completed || 0,
                    byPrioridad: data.byPrioridad || data.byPriority || {},
                    byCiudad: data.byCiudad || data.byCity || {},
                    nuevosHoy: data.nuevosHoy || data.todayCount || 0
                },
                timestamp: new Date().toISOString()
            };
        }

        // Default transformation
        return super.transformResponseToLegacy(data);
    }
}

module.exports = PacientesModernAdapter;