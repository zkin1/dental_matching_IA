const AssignmentService = require('../../application/services/AssignmentService');
const { CreateAssignmentDTO, UpdateAssignmentDTO, AssignmentResponseDTO, AssignmentSearchDTO } = require('../../application/dtos/AssignmentDTO');
const { asyncHandler } = require('../../shared/middleware/errorHandler');
const logger = require('../../shared/utils/logger');

/**
 * Controlador para endpoints de Asignaciones
 * Responsabilidad: Manejar HTTP, validaciones de entrada, formateo de respuestas
 */
class AssignmentController {
    constructor() {
        this.assignmentService = new AssignmentService();
    }

    /**
     * GET /api/assignments
     * Obtiene todas las asignaciones con filtros y paginación
     */
    getAll = asyncHandler(async (req, res) => {
        // Los filtros ya fueron validados por el middleware
        const filters = req.validated?.query || req.query;
        
        const result = await this.assignmentService.getAllAssignments(filters);
        
        res.json({
            success: true,
            data: AssignmentResponseDTO.fromAssignmentList(result.data, true),
            pagination: {
                page: result.page,
                limit: filters.limit || 20,
                total: result.total,
                totalPages: result.totalPages
            },
            filters: filters
        });
    });

    /**
     * GET /api/assignments/:id
     * Obtiene una asignación específica por ID
     */
    getById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        const assignment = await this.assignmentService.getAssignmentById(id);
        
        res.json({
            success: true,
            data: AssignmentResponseDTO.fromAssignment(assignment, true)
        });
    });

    /**
     * POST /api/assignments/manual
     * Crea una nueva asignación manual
     */
    createManual = asyncHandler(async (req, res) => {
        const validatedData = req.validated?.body || req.body;
        
        const assignment = await this.assignmentService.createManualAssignment(validatedData);
        
        res.status(201).json({
            success: true,
            message: 'Asignación manual creada exitosamente',
            data: AssignmentResponseDTO.fromAssignment(assignment, true)
        });
    });

    /**
     * PUT /api/assignments/:id
     * Actualiza una asignación existente
     */
    update = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const validatedData = req.validated?.body || req.body;
        
        const assignment = await this.assignmentService.updateAssignment(id, validatedData);
        
        res.json({
            success: true,
            message: 'Asignación actualizada exitosamente',
            data: AssignmentResponseDTO.fromAssignment(assignment, true)
        });
    });

    /**
     * PATCH /api/assignments/:id/status
     * Actualiza solo el estado de una asignación
     */
    updateStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { estado, observaciones } = req.body;
        
        if (!estado) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere el campo "estado"'
            });
        }
        
        const validStates = ['asignado', 'notificado', 'contactado', 'confirmado', 'en_tratamiento', 'completado', 'cancelado'];
        if (!validStates.includes(estado)) {
            return res.status(400).json({
                success: false,
                error: `Estado inválido. Estados válidos: ${validStates.join(', ')}`
            });
        }
        
        const updateData = { estado };
        if (observaciones) {
            updateData.observacionesSistema = observaciones;
        }
        
        const assignment = await this.assignmentService.updateAssignment(id, updateData);
        
        res.json({
            success: true,
            message: `Estado actualizado a: ${estado}`,
            data: AssignmentResponseDTO.fromAssignment(assignment, true)
        });
    });

    /**
     * POST /api/assignments/:id/cancel
     * Cancela una asignación
     */
    cancel = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;
        
        const assignment = await this.assignmentService.cancelAssignment(id, reason);
        
        res.json({
            success: true,
            message: 'Asignación cancelada exitosamente',
            data: AssignmentResponseDTO.fromAssignment(assignment, true)
        });
    });

    /**
     * POST /api/assignments/:id/complete
     * Completa una asignación
     */
    complete = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { observaciones } = req.body;
        
        const assignment = await this.assignmentService.completeAssignment(id, observaciones);
        
        res.json({
            success: true,
            message: 'Asignación completada exitosamente',
            data: AssignmentResponseDTO.fromAssignment(assignment, true)
        });
    });

    /**
     * GET /api/assignments/statistics
     * Obtiene estadísticas de asignaciones
     */
    getStatistics = asyncHandler(async (req, res) => {
        const stats = await this.assignmentService.getAssignmentStatistics();
        
        res.json({
            success: true,
            data: stats
        });
    });

    /**
     * GET /api/assignments/active
     * Obtiene asignaciones activas
     */
    getActive = asyncHandler(async (req, res) => {
        const filters = { ...req.query, estado: undefined };
        
        // Obtener todas las asignaciones y filtrar las activas
        const result = await this.assignmentService.getAllAssignments(filters);
        const activeAssignments = result.data.filter(assignment => assignment.isActive());
        
        res.json({
            success: true,
            data: AssignmentResponseDTO.fromAssignmentList(activeAssignments, true),
            count: activeAssignments.length
        });
    });

    /**
     * GET /api/assignments/by-patient/:patientId
     * Obtiene historial de asignaciones de un paciente
     */
    getByPatient = asyncHandler(async (req, res) => {
        const { patientId } = req.params;
        
        const history = await this.assignmentService.getPatientHistory(parseInt(patientId));
        
        res.json({
            success: true,
            data: history,
            patientId: parseInt(patientId),
            count: history.length
        });
    });

    /**
     * GET /api/assignments/by-student/:studentId
     * Obtiene carga de trabajo y asignaciones de un estudiante
     */
    getByStudent = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const includeHistory = req.query.includeHistory === 'true';
        
        const workload = await this.assignmentService.getStudentWorkload(parseInt(studentId));
        
        let response = {
            success: true,
            data: {
                workload: workload,
                studentId: parseInt(studentId)
            }
        };
        
        if (includeHistory) {
            const result = await this.assignmentService.getAllAssignments({
                estudianteId: parseInt(studentId),
                limit: 100
            });
            
            response.data.assignments = AssignmentResponseDTO.fromAssignmentList(result.data);
            response.data.assignmentCount = result.total;
        }
        
        res.json(response);
    });

    /**
     * GET /api/assignments/by-specialty/:specialty
     * Obtiene asignaciones por especialidad
     */
    getBySpecialty = asyncHandler(async (req, res) => {
        const { specialty } = req.params;
        
        const result = await this.assignmentService.getAllAssignments({
            especialidad: specialty,
            limit: req.query.limit || 100
        });
        
        res.json({
            success: true,
            data: AssignmentResponseDTO.fromAssignmentList(result.data, true),
            specialty: specialty,
            count: result.total
        });
    });

    /**
     * GET /api/assignments/by-clinic/:clinic
     * Obtiene asignaciones por clínica
     */
    getByClinic = asyncHandler(async (req, res) => {
        const { clinic } = req.params;
        
        const result = await this.assignmentService.getAllAssignments({
            clinica: clinic,
            limit: req.query.limit || 100
        });
        
        res.json({
            success: true,
            data: AssignmentResponseDTO.fromAssignmentList(result.data, true),
            clinic: clinic,
            count: result.total
        });
    });

    /**
     * GET /api/assignments/by-date/:date
     * Obtiene asignaciones por fecha específica
     */
    getByDate = asyncHandler(async (req, res) => {
        const { date } = req.params;
        
        // Validar formato de fecha
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Formato de fecha inválido. Use YYYY-MM-DD'
            });
        }
        
        const result = await this.assignmentService.getAllAssignments({
            fechaDesde: date,
            fechaHasta: date,
            limit: req.query.limit || 100
        });
        
        res.json({
            success: true,
            data: AssignmentResponseDTO.fromAssignmentList(result.data, true),
            date: date,
            count: result.total
        });
    });

    /**
     * GET /api/assignments/date-range
     * Obtiene asignaciones por rango de fechas
     */
    getByDateRange = asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren los parámetros startDate y endDate'
            });
        }
        
        const result = await this.assignmentService.getAllAssignments({
            fechaDesde: startDate,
            fechaHasta: endDate,
            limit: req.query.limit || 200
        });
        
        res.json({
            success: true,
            data: AssignmentResponseDTO.fromAssignmentList(result.data, true),
            dateRange: {
                start: startDate,
                end: endDate
            },
            count: result.total
        });
    });

    /**
     * GET /api/assignments/conflicts/:studentId
     * Verifica conflictos de horarios para un estudiante
     */
    checkTimeConflicts = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { fecha, horaInicio, horaFin } = req.query;
        
        if (!fecha || !horaInicio || !horaFin) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren los parámetros: fecha, horaInicio, horaFin'
            });
        }
        
        try {
            // Intentar verificar conflictos (esto lanzará error si los hay)
            const filters = {
                estudianteId: parseInt(studentId),
                fechaDesde: fecha,
                fechaHasta: fecha
            };
            
            const result = await this.assignmentService.getAllAssignments(filters);
            
            // Verificar conflictos manualmente
            const conflicts = result.data.filter(assignment => {
                if (!assignment.horaInicio || !assignment.horaFin) return false;
                
                const assignmentStart = assignment.horaInicio;
                const assignmentEnd = assignment.horaFin;
                
                return (horaInicio < assignmentEnd && horaFin > assignmentStart);
            });
            
            res.json({
                success: true,
                hasConflicts: conflicts.length > 0,
                conflicts: conflicts.map(conflict => AssignmentResponseDTO.fromAssignment(conflict)),
                query: {
                    studentId: parseInt(studentId),
                    fecha,
                    horaInicio,
                    horaFin
                }
            });
            
        } catch (error) {
            logger.error('Error verificando conflictos de horarios', error);
            res.json({
                success: true,
                hasConflicts: false,
                conflicts: [],
                query: {
                    studentId: parseInt(studentId),
                    fecha,
                    horaInicio,
                    horaFin
                }
            });
        }
    });

    /**
     * GET /api/assignments/summary
     * Obtiene resumen ejecutivo de asignaciones
     */
    getSummary = asyncHandler(async (req, res) => {
        const { period = '30' } = req.query; // Días por defecto
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(period));
        
        const result = await this.assignmentService.getAllAssignments({
            fechaDesde: startDate.toISOString().split('T')[0],
            fechaHasta: endDate.toISOString().split('T')[0],
            limit: 1000
        });
        
        const stats = await this.assignmentService.getAssignmentStatistics();
        
        // Agrupar por estado
        const byStatus = result.data.reduce((acc, assignment) => {
            acc[assignment.estado] = (acc[assignment.estado] || 0) + 1;
            return acc;
        }, {});
        
        // Agrupar por especialidad
        const bySpecialty = result.data.reduce((acc, assignment) => {
            if (assignment.especialidad) {
                acc[assignment.especialidad] = (acc[assignment.especialidad] || 0) + 1;
            }
            return acc;
        }, {});
        
        const summary = {
            period: {
                days: parseInt(period),
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            },
            totals: {
                assignments: result.total,
                ...stats
            },
            breakdown: {
                byStatus,
                bySpecialty
            },
            trends: {
                dailyAverage: (result.total / parseInt(period)).toFixed(2),
                completionRate: stats.completionRate,
                cancellationRate: stats.cancellationRate
            }
        };
        
        res.json({
            success: true,
            data: summary
        });
    });
}

module.exports = AssignmentController;