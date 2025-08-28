const AssignmentRepository = require('../../infrastructure/repositories/AssignmentRepository');
const PatientRepository = require('../../infrastructure/repositories/PatientRepository');
const StudentRepository = require('../../infrastructure/repositories/StudentRepository');
const Assignment = require('../../core/entities/Assignment');
const { NotFoundError, ConflictError, BusinessLogicError } = require('../../shared/errors/AppError');
const logger = require('../../shared/utils/logger');

/**
 * Servicio de aplicación para Asignaciones
 * Contiene la lógica de negocio y orchestración
 */
class AssignmentService {
    constructor() {
        this.assignmentRepository = new AssignmentRepository();
        this.patientRepository = new PatientRepository();
        this.studentRepository = new StudentRepository();
    }

    /**
     * Obtiene todas las asignaciones con filtros
     */
    async getAllAssignments(filters = {}) {
        try {
            const startTime = Date.now();
            
            // Usar método específico del repositorio si hay filtros complejos
            let assignments;
            
            if (filters.fechaDesde || filters.fechaHasta) {
                const startDate = filters.fechaDesde || '1900-01-01';
                const endDate = filters.fechaHasta || '2099-12-31';
                assignments = await this.assignmentRepository.findByDateRange(
                    startDate, 
                    endDate, 
                    filters.estado
                );
            } else if (filters.pacienteId) {
                assignments = await this.assignmentRepository.findByPatient(filters.pacienteId);
            } else if (filters.estudianteId) {
                assignments = await this.assignmentRepository.findByStudent(filters.estudianteId);
            } else if (filters.especialidad) {
                assignments = await this.assignmentRepository.findBySpecialty(filters.especialidad);
            } else if (filters.clinica) {
                assignments = await this.assignmentRepository.findByClinic(filters.clinica);
            } else {
                // Obtener con información detallada
                const allAssignments = await this.assignmentRepository.findAllWithDetails(filters.limit || 100);
                assignments = allAssignments.map(item => item.assignment);
            }
            
            // Filtros adicionales en memoria
            if (filters.scoreMinimo) {
                assignments = assignments.filter(assignment => 
                    assignment.scoreCompatibilidad >= filters.scoreMinimo
                );
            }
            
            if (filters.tipoAsignacion) {
                assignments = assignments.filter(assignment => {
                    const isManual = assignment.observacionesSistema?.includes('MANUAL');
                    return filters.tipoAsignacion === 'manual' ? isManual : !isManual;
                });
            }
            
            // Ordenamiento
            if (filters.sortBy) {
                assignments = this.sortAssignments(assignments, filters.sortBy, filters.sortOrder);
            }
            
            // Paginación
            const offset = filters.offset || 0;
            const limit = filters.limit || 20;
            const paginatedAssignments = assignments.slice(offset, offset + limit);
            
            const duration = Date.now() - startTime;
            logger.database('SELECT', 'asignaciones', duration);
            
            return {
                data: paginatedAssignments,
                total: assignments.length,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(assignments.length / limit)
            };
            
        } catch (error) {
            logger.error('Error obteniendo asignaciones', error);
            throw error;
        }
    }

    /**
     * Obtiene una asignación por ID
     */
    async getAssignmentById(id) {
        try {
            const assignment = await this.assignmentRepository.findAssignmentById(id);
            
            if (!assignment) {
                throw new NotFoundError('Asignación', id);
            }
            
            return assignment;
            
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            logger.error(`Error obteniendo asignación ${id}`, error);
            throw error;
        }
    }

    /**
     * Crea una nueva asignación manual
     */
    async createManualAssignment(assignmentData) {
        try {
            // Validar que el paciente existe y está disponible
            const patient = await this.patientRepository.findPatientById(assignmentData.pacienteId);
            if (!patient) {
                throw new NotFoundError('Paciente', assignmentData.pacienteId);
            }
            
            // Verificar que el paciente no tenga asignaciones activas
            const hasActiveAssignment = await this.assignmentRepository.hasActiveAssignment(assignmentData.pacienteId);
            if (hasActiveAssignment) {
                throw new ConflictError('El paciente ya tiene una asignación activa');
            }
            
            // Validar que el estudiante existe y está disponible
            const student = await this.studentRepository.findStudentById(assignmentData.estudianteId);
            if (!student) {
                throw new NotFoundError('Estudiante', assignmentData.estudianteId);
            }
            
            if (!student.isAvailable()) {
                throw new ConflictError('El estudiante no está disponible para nuevos casos');
            }
            
            // Verificar conflictos de horario si se especifican
            if (assignmentData.fechaCita && assignmentData.horaInicio && assignmentData.horaFin) {
                await this.checkTimeConflicts(
                    assignmentData.estudianteId,
                    assignmentData.fechaCita,
                    assignmentData.horaInicio,
                    assignmentData.horaFin
                );
            }
            
            // Crear entidad Assignment
            const assignment = new Assignment({
                ...assignmentData,
                observacionesSistema: `MANUAL - ${assignmentData.observacionesSistema || 'Asignación manual por administrador'}`,
                algoritmoVersion: '2.0-manual'
            });
            
            // Validar entidad
            if (!assignment.isValid()) {
                throw new BusinessLogicError('Datos de asignación incompletos');
            }
            
            // Iniciar transacción
            await this.assignmentRepository.beginTransaction();
            
            try {
                // Crear asignación
                const createdAssignment = await this.assignmentRepository.createAssignment(assignment);
                
                // Actualizar estado del paciente
                await this.patientRepository.updateStatus(assignmentData.pacienteId, 'asignado');
                
                // Incrementar casos activos del estudiante
                await this.studentRepository.incrementActiveCases(assignmentData.estudianteId);
                
                await this.assignmentRepository.commit();
                
                logger.info(`Asignación manual creada: Paciente ${assignmentData.pacienteId} -> Estudiante ${assignmentData.estudianteId}`);
                
                return createdAssignment;
                
            } catch (error) {
                await this.assignmentRepository.rollback();
                throw error;
            }
            
        } catch (error) {
            logger.error('Error creando asignación manual', { assignmentData, error });
            throw error;
        }
    }

    /**
     * Actualiza una asignación existente
     */
    async updateAssignment(id, updateData) {
        try {
            // Verificar que la asignación existe
            const existingAssignment = await this.getAssignmentById(id);
            
            // Validar transiciones de estado
            this.validateStateTransition(existingAssignment.estado, updateData.estado);
            
            // Verificar conflictos de horario si se actualizan
            if (updateData.fechaCita || updateData.horaInicio || updateData.horaFin) {
                await this.checkTimeConflicts(
                    existingAssignment.estudianteId,
                    updateData.fechaCita || existingAssignment.fechaCita,
                    updateData.horaInicio || existingAssignment.horaInicio,
                    updateData.horaFin || existingAssignment.horaFin,
                    id // Excluir la asignación actual
                );
            }
            
            // Actualizar propiedades
            Object.assign(existingAssignment, updateData);
            
            // Validar entidad actualizada
            if (!existingAssignment.isValid()) {
                throw new BusinessLogicError('Datos de asignación incompletos después de la actualización');
            }
            
            // Manejar cambios de estado especiales
            await this.handleStateChange(existingAssignment, updateData.estado);
            
            // Persistir cambios
            const updated = await this.assignmentRepository.updateAssignment(existingAssignment);
            
            if (!updated) {
                throw new NotFoundError('Asignación', id);
            }
            
            logger.info(`Asignación actualizada: ID ${id}, Estado: ${existingAssignment.estado}`);
            
            return existingAssignment;
            
        } catch (error) {
            logger.error(`Error actualizando asignación ${id}`, { updateData, error });
            throw error;
        }
    }

    /**
     * Cancela una asignación
     */
    async cancelAssignment(id, reason = null) {
        try {
            const assignment = await this.getAssignmentById(id);
            
            // Verificar que se puede cancelar
            if (!assignment.isActive()) {
                throw new BusinessLogicError('Solo se pueden cancelar asignaciones activas');
            }
            
            // Iniciar transacción
            await this.assignmentRepository.beginTransaction();
            
            try {
                // Actualizar estado de la asignación
                assignment.estado = 'cancelado';
                assignment.observacionesSistema += ` | CANCELADO: ${reason || 'Sin motivo especificado'}`;
                
                await this.assignmentRepository.updateAssignment(assignment);
                
                // Actualizar estado del paciente a pendiente
                await this.patientRepository.updateStatus(assignment.pacienteId, 'pendiente');
                
                // Decrementar casos activos del estudiante
                await this.studentRepository.decrementActiveCases(assignment.estudianteId);
                
                await this.assignmentRepository.commit();
                
                logger.info(`Asignación cancelada: ID ${id}, Motivo: ${reason}`);
                
                return assignment;
                
            } catch (error) {
                await this.assignmentRepository.rollback();
                throw error;
            }
            
        } catch (error) {
            logger.error(`Error cancelando asignación ${id}`, { reason, error });
            throw error;
        }
    }

    /**
     * Completa una asignación
     */
    async completeAssignment(id, observaciones = null) {
        try {
            const assignment = await this.getAssignmentById(id);
            
            // Verificar que está en tratamiento
            if (assignment.estado !== 'en_tratamiento') {
                throw new BusinessLogicError('Solo se pueden completar asignaciones en tratamiento');
            }
            
            // Iniciar transacción
            await this.assignmentRepository.beginTransaction();
            
            try {
                // Actualizar estado de la asignación
                assignment.estado = 'completado';
                if (observaciones) {
                    assignment.observacionesEstudiante = observaciones;
                }
                
                await this.assignmentRepository.updateAssignment(assignment);
                
                // Actualizar estado del paciente
                await this.patientRepository.updateStatus(assignment.pacienteId, 'completado');
                
                // Incrementar casos completados del estudiante
                await this.studentRepository.incrementCompletedCases(assignment.estudianteId);
                
                await this.assignmentRepository.commit();
                
                logger.info(`Asignación completada: ID ${id}`);
                
                return assignment;
                
            } catch (error) {
                await this.assignmentRepository.rollback();
                throw error;
            }
            
        } catch (error) {
            logger.error(`Error completando asignación ${id}`, { observaciones, error });
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de asignaciones
     */
    async getAssignmentStatistics() {
        try {
            const stats = await this.assignmentRepository.getStatistics();
            
            // Calcular métricas adicionales
            stats.completionRate = stats.total > 0 ? 
                (stats.completadas / stats.total * 100).toFixed(2) : 0;
            
            stats.cancellationRate = stats.total > 0 ? 
                (stats.canceladas / stats.total * 100).toFixed(2) : 0;
            
            stats.activeRate = stats.total > 0 ? 
                (stats.activas / stats.total * 100).toFixed(2) : 0;
            
            return stats;
            
        } catch (error) {
            logger.error('Error obteniendo estadísticas de asignaciones', error);
            throw error;
        }
    }

    /**
     * Obtiene historial de un paciente
     */
    async getPatientHistory(pacienteId) {
        try {
            const history = await this.assignmentRepository.getPatientHistory(pacienteId);
            
            return history.map(item => ({
                assignment: item.assignment,
                estudiante: item.estudiante,
                duration: item.assignment.getDurationMinutes(),
                isActive: item.assignment.isActive(),
                isCompleted: item.assignment.isCompleted()
            }));
            
        } catch (error) {
            logger.error(`Error obteniendo historial del paciente ${pacienteId}`, error);
            throw error;
        }
    }

    /**
     * Obtiene carga de trabajo de un estudiante
     */
    async getStudentWorkload(estudianteId) {
        try {
            const workload = await this.assignmentRepository.getStudentWorkload(estudianteId);
            
            // Calcular métricas adicionales
            workload.completionRate = workload.total_asignaciones > 0 ? 
                (workload.completadas / workload.total_asignaciones * 100).toFixed(2) : 0;
            
            workload.cancellationRate = workload.total_asignaciones > 0 ? 
                (workload.canceladas / workload.total_asignaciones * 100).toFixed(2) : 0;
            
            return workload;
            
        } catch (error) {
            logger.error(`Error obteniendo carga de trabajo del estudiante ${estudianteId}`, error);
            throw error;
        }
    }

    // --- MÉTODOS PRIVADOS ---

    /**
     * Verifica conflictos de horarios
     */
    async checkTimeConflicts(estudianteId, fecha, horaInicio, horaFin, excludeAssignmentId = null) {
        const conflicts = await this.assignmentRepository.findTimeConflicts(
            estudianteId, 
            fecha, 
            horaInicio, 
            horaFin
        );
        
        // Filtrar la asignación actual si se está actualizando
        const relevantConflicts = conflicts.filter(conflict => conflict.id !== excludeAssignmentId);
        
        if (relevantConflicts.length > 0) {
            throw new ConflictError(
                `Conflicto de horarios: el estudiante ya tiene una cita el ${fecha} de ${horaInicio} a ${horaFin}`,
                { conflictingAssignments: relevantConflicts.map(c => c.id) }
            );
        }
    }

    /**
     * Valida transiciones de estado
     */
    validateStateTransition(currentState, newState) {
        if (!newState || currentState === newState) return;
        
        const validTransitions = {
            'asignado': ['notificado', 'contactado', 'cancelado'],
            'notificado': ['contactado', 'cancelado'],
            'contactado': ['confirmado', 'cancelado'],
            'confirmado': ['en_tratamiento', 'cancelado'],
            'en_tratamiento': ['completado', 'cancelado'],
            'completado': [], // Estado final
            'cancelado': []   // Estado final
        };
        
        const allowedStates = validTransitions[currentState] || [];
        
        if (!allowedStates.includes(newState)) {
            throw new BusinessLogicError(
                `Transición de estado no válida: ${currentState} -> ${newState}`
            );
        }
    }

    /**
     * Maneja cambios de estado especiales
     */
    async handleStateChange(assignment, newState) {
        if (!newState || assignment.estado === newState) return;
        
        switch (newState) {
            case 'notificado':
                assignment.markAsNotified();
                break;
            case 'en_tratamiento':
                // Verificar que está confirmado
                if (assignment.estado !== 'confirmado') {
                    throw new BusinessLogicError('Solo se puede iniciar tratamiento desde estado confirmado');
                }
                break;
        }
    }

    /**
     * Ordena asignaciones según criterio
     */
    sortAssignments(assignments, sortBy, sortOrder = 'desc') {
        return assignments.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'fechaAsignacion':
                    valueA = new Date(a.fechaAsignacion);
                    valueB = new Date(b.fechaAsignacion);
                    break;
                case 'fechaCita':
                    valueA = new Date(a.fechaCita || a.fechaAsignacion);
                    valueB = new Date(b.fechaCita || b.fechaAsignacion);
                    break;
                case 'scoreCompatibilidad':
                    valueA = a.scoreCompatibilidad || 0;
                    valueB = b.scoreCompatibilidad || 0;
                    break;
                case 'estado':
                    const stateOrder = { 
                        'asignado': 1, 'notificado': 2, 'contactado': 3, 
                        'confirmado': 4, 'en_tratamiento': 5, 'completado': 6, 'cancelado': 7 
                    };
                    valueA = stateOrder[a.estado] || 0;
                    valueB = stateOrder[b.estado] || 0;
                    break;
                default:
                    return 0;
            }
            
            if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
}

module.exports = AssignmentService;