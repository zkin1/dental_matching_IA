const PatientService = require('../../application/services/PatientService');
const { CreatePatientDTO, UpdatePatientDTO, PatientResponseDTO, PatientSearchDTO } = require('../../application/dtos/PatientDTO');
const { asyncHandler } = require('../../shared/middleware/errorHandler');
const logger = require('../../shared/utils/logger');

/**
 * Controlador para endpoints de Pacientes
 * Responsabilidad: Manejar HTTP, validaciones de entrada, formateo de respuestas
 */
class PatientController {
    constructor() {
        this.patientService = new PatientService();
    }

    /**
     * GET /api/patients
     * Obtiene todos los pacientes con filtros y paginación
     */
    getAll = asyncHandler(async (req, res) => {
        // Los filtros ya fueron validados por el middleware
        const filters = req.validated?.query || req.query;
        
        const result = await this.patientService.getAllPatients(filters);
        
        res.json({
            success: true,
            data: PatientResponseDTO.fromPatientList(result.data),
            pagination: {
                page: result.page,
                limit: filters.limit || 20,
                total: result.total,
                totalPages: result.totalPages
            }
        });
    });

    /**
     * GET /api/patients/:id
     * Obtiene un paciente específico por ID
     */
    getById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        const patient = await this.patientService.getPatientById(id);
        
        res.json({
            success: true,
            data: PatientResponseDTO.fromPatient(patient, true)
        });
    });

    /**
     * POST /api/patients
     * Crea un nuevo paciente
     */
    create = asyncHandler(async (req, res) => {
        const validatedData = req.validated?.body || req.body;
        
        const patient = await this.patientService.createPatient(validatedData);
        
        res.status(201).json({
            success: true,
            message: 'Paciente creado exitosamente',
            data: PatientResponseDTO.fromPatient(patient)
        });
    });

    /**
     * PUT /api/patients/:id
     * Actualiza un paciente existente
     */
    update = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const validatedData = req.validated?.body || req.body;
        
        const patient = await this.patientService.updatePatient(id, validatedData);
        
        res.json({
            success: true,
            message: 'Paciente actualizado exitosamente',
            data: PatientResponseDTO.fromPatient(patient)
        });
    });

    /**
     * DELETE /api/patients/:id
     * Elimina un paciente (soft delete)
     */
    delete = asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        const result = await this.patientService.deletePatient(id);
        
        res.json({
            success: true,
            message: 'Paciente eliminado exitosamente',
            data: result
        });
    });

    /**
     * GET /api/patients/search
     * Busca pacientes por síntomas
     */
    searchBySymptoms = asyncHandler(async (req, res) => {
        const { query: searchText } = req.query;
        
        if (!searchText) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere el parámetro "query" para la búsqueda'
            });
        }
        
        const patients = await this.patientService.searchPatientsBySymptoms(searchText);
        
        res.json({
            success: true,
            data: PatientResponseDTO.fromPatientList(patients),
            searchTerm: searchText,
            count: patients.length
        });
    });

    /**
     * GET /api/patients/pending
     * Obtiene pacientes pendientes de asignación
     */
    getPending = asyncHandler(async (req, res) => {
        const { limit = 50 } = req.query;
        
        const patients = await this.patientService.getPendingPatients(parseInt(limit));
        
        res.json({
            success: true,
            data: patients,
            count: patients.length
        });
    });

    /**
     * GET /api/patients/statistics
     * Obtiene estadísticas de pacientes
     */
    getStatistics = asyncHandler(async (req, res) => {
        const stats = await this.patientService.getPatientStatistics();
        
        res.json({
            success: true,
            data: stats
        });
    });

    /**
     * PATCH /api/patients/:id/status
     * Actualiza solo el estado de un paciente
     */
    updateStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { estado } = req.body;
        
        if (!estado) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere el campo "estado"'
            });
        }
        
        const validStates = ['pendiente', 'asignado', 'en_tratamiento', 'completado', 'cancelado'];
        if (!validStates.includes(estado)) {
            return res.status(400).json({
                success: false,
                error: `Estado inválido. Estados válidos: ${validStates.join(', ')}`
            });
        }
        
        const patient = await this.patientService.updatePatient(id, { estado });
        
        res.json({
            success: true,
            message: `Estado actualizado a: ${estado}`,
            data: PatientResponseDTO.fromPatient(patient)
        });
    });

    /**
     * GET /api/patients/by-city/:city
     * Obtiene pacientes por ciudad
     */
    getByCity = asyncHandler(async (req, res) => {
        const { city } = req.params;
        
        const result = await this.patientService.getAllPatients({ 
            ciudad: city, 
            limit: req.query.limit || 100 
        });
        
        res.json({
            success: true,
            data: PatientResponseDTO.fromPatientList(result.data),
            city: city,
            count: result.total
        });
    });

    /**
     * GET /api/patients/by-priority/:priority
     * Obtiene pacientes por prioridad
     */
    getByPriority = asyncHandler(async (req, res) => {
        const { priority } = req.params;
        
        const validPriorities = ['baja', 'moderada', 'alta', 'muy_alta'];
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                error: `Prioridad inválida. Prioridades válidas: ${validPriorities.join(', ')}`
            });
        }
        
        const result = await this.patientService.getAllPatients({ 
            prioridad: priority, 
            limit: req.query.limit || 100 
        });
        
        res.json({
            success: true,
            data: PatientResponseDTO.fromPatientList(result.data),
            priority: priority,
            count: result.total
        });
    });

    /**
     * GET /api/patients/pediatric
     * Obtiene pacientes pediátricos
     */
    getPediatric = asyncHandler(async (req, res) => {
        const result = await this.patientService.getAllPatients({ 
            isPediatric: true, 
            limit: req.query.limit || 100 
        });
        
        res.json({
            success: true,
            data: PatientResponseDTO.fromPatientList(result.data),
            count: result.total
        });
    });

    /**
     * GET /api/patients/adult
     * Obtiene pacientes adultos
     */
    getAdult = asyncHandler(async (req, res) => {
        const result = await this.patientService.getAllPatients({ 
            isPediatric: false, 
            limit: req.query.limit || 100 
        });
        
        res.json({
            success: true,
            data: PatientResponseDTO.fromPatientList(result.data),
            count: result.total
        });
    });

    /**
     * POST /api/patients/batch
     * Crea múltiples pacientes en lote
     */
    createBatch = asyncHandler(async (req, res) => {
        const { patients } = req.body;
        
        if (!Array.isArray(patients) || patients.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de pacientes'
            });
        }
        
        if (patients.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Máximo 100 pacientes por lote'
            });
        }
        
        const results = {
            created: [],
            errors: []
        };
        
        for (let i = 0; i < patients.length; i++) {
            try {
                const patient = await this.patientService.createPatient(patients[i]);
                results.created.push({
                    index: i,
                    patient: PatientResponseDTO.fromPatient(patient)
                });
            } catch (error) {
                results.errors.push({
                    index: i,
                    error: error.message,
                    data: patients[i]
                });
                
                logger.warn(`Error creando paciente en lote (índice ${i})`, error);
            }
        }
        
        const status = results.errors.length > 0 ? 207 : 201; // 207 Multi-Status
        
        res.status(status).json({
            success: results.created.length > 0,
            message: `${results.created.length} pacientes creados, ${results.errors.length} errores`,
            data: results
        });
    });
}

module.exports = PatientController;