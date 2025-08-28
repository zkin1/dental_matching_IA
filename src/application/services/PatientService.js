const PatientRepository = require('../../infrastructure/repositories/PatientRepository');
const Patient = require('../../core/entities/Patient');
const { NotFoundError, ConflictError, BusinessLogicError } = require('../../shared/errors/AppError');
const logger = require('../../shared/utils/logger');

/**
 * Servicio de aplicación para Pacientes
 * Contiene la lógica de negocio y orchestración
 */
class PatientService {
    constructor() {
        this.patientRepository = new PatientRepository();
    }

    /**
     * Obtiene todos los pacientes con filtros y paginación
     */
    async getAllPatients(filters = {}) {
        try {
            const startTime = Date.now();
            
            // Aplicar filtros específicos según los parámetros
            let patients;
            
            if (filters.ciudad) {
                patients = await this.patientRepository.findByCity(filters.ciudad);
            } else if (filters.prioridad) {
                patients = await this.patientRepository.findByPriority(filters.prioridad);
            } else if (filters.isPediatric !== undefined) {
                patients = filters.isPediatric ? 
                    await this.patientRepository.findPediatric() : 
                    await this.patientRepository.findAdult();
            } else if (filters.estado === 'pendiente') {
                patients = await this.patientRepository.findPending(filters.limit);
            } else {
                patients = await this.patientRepository.findAllActive(filters.limit);
            }
            
            // Aplicar filtros adicionales en memoria si es necesario
            if (filters.edadMin || filters.edadMax) {
                patients = patients.filter(patient => {
                    if (filters.edadMin && patient.edad < filters.edadMin) return false;
                    if (filters.edadMax && patient.edad > filters.edadMax) return false;
                    return true;
                });
            }
            
            // Ordenamiento
            if (filters.sortBy) {
                patients = this.sortPatients(patients, filters.sortBy, filters.sortOrder);
            }
            
            // Paginación en memoria (para filtros complejos)
            const offset = filters.offset || 0;
            const limit = filters.limit || 20;
            const paginatedPatients = patients.slice(offset, offset + limit);
            
            const duration = Date.now() - startTime;
            logger.database('SELECT', 'pacientes', duration);
            
            return {
                data: paginatedPatients,
                total: patients.length,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(patients.length / limit)
            };
            
        } catch (error) {
            logger.error('Error obteniendo pacientes', error);
            throw error;
        }
    }

    /**
     * Obtiene un paciente por ID
     */
    async getPatientById(id) {
        try {
            const patient = await this.patientRepository.findPatientById(id);
            
            if (!patient) {
                throw new NotFoundError('Paciente', id);
            }
            
            return patient;
            
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            logger.error(`Error obteniendo paciente ${id}`, error);
            throw error;
        }
    }

    /**
     * Crea un nuevo paciente
     */
    async createPatient(patientData) {
        try {
            // Crear entidad Patient
            const patient = new Patient(patientData);
            
            // Validar entidad
            if (!patient.isValid()) {
                throw new BusinessLogicError('Datos del paciente incompletos');
            }
            
            // Verificar duplicados
            await this.checkForDuplicates(patient.telefono, patient.email);
            
            // Inferir tipo de tratamiento si no se especifica
            if (!patient.tipoTratamiento) {
                patient.tipoTratamiento = this.inferTreatmentType(patient);
            }
            
            // Asignar clínica según edad
            patient.clinicaAsignada = patient.isPediatric() ? 
                'Clínica para el Niño y Adolescente' : 
                'Clínica Integral Adulto y Gerontología';
            
            // Persistir en base de datos
            const createdPatient = await this.patientRepository.createPatient(patient);
            
            logger.info(`Paciente creado: ${createdPatient.nombreCompleto} (ID: ${createdPatient.id})`);
            
            return createdPatient;
            
        } catch (error) {
            logger.error('Error creando paciente', { patientData, error });
            throw error;
        }
    }

    /**
     * Actualiza un paciente existente
     */
    async updatePatient(id, updateData) {
        try {
            // Verificar que el paciente existe
            const existingPatient = await this.getPatientById(id);
            
            // Actualizar propiedades
            Object.assign(existingPatient, updateData);
            
            // Validar entidad actualizada
            if (!existingPatient.isValid()) {
                throw new BusinessLogicError('Datos del paciente incompletos después de la actualización');
            }
            
            // Verificar duplicados si se cambió teléfono o email
            if (updateData.telefono || updateData.email) {
                await this.checkForDuplicates(
                    existingPatient.telefono, 
                    existingPatient.email, 
                    id
                );
            }
            
            // Persistir cambios
            const updated = await this.patientRepository.updatePatient(existingPatient);
            
            if (!updated) {
                throw new NotFoundError('Paciente', id);
            }
            
            logger.info(`Paciente actualizado: ${existingPatient.nombreCompleto} (ID: ${id})`);
            
            return existingPatient;
            
        } catch (error) {
            logger.error(`Error actualizando paciente ${id}`, { updateData, error });
            throw error;
        }
    }

    /**
     * Elimina un paciente (soft delete)
     */
    async deletePatient(id) {
        try {
            // Verificar que el paciente existe
            await this.getPatientById(id);
            
            // Verificar que no tenga asignaciones activas
            const hasActiveAssignments = await this.patientRepository.customQuery(
                'SELECT COUNT(*) as count FROM asignaciones WHERE id_paciente = ? AND estado IN ("asignado", "en_tratamiento")',
                [id]
            );
            
            if (hasActiveAssignments[0].count > 0) {
                throw new ConflictError('No se puede eliminar un paciente con asignaciones activas');
            }
            
            // Soft delete
            const deleted = await this.patientRepository.deactivate(id);
            
            if (!deleted) {
                throw new NotFoundError('Paciente', id);
            }
            
            logger.info(`Paciente eliminado: ID ${id}`);
            
            return { id, deleted: true };
            
        } catch (error) {
            logger.error(`Error eliminando paciente ${id}`, error);
            throw error;
        }
    }

    /**
     * Busca pacientes por síntomas
     */
    async searchPatientsBySymptoms(searchText) {
        try {
            if (!searchText || searchText.length < 3) {
                throw new BusinessLogicError('El texto de búsqueda debe tener al menos 3 caracteres');
            }
            
            const patients = await this.patientRepository.findBySymptomsText(searchText);
            
            return patients;
            
        } catch (error) {
            logger.error('Error buscando pacientes por síntomas', { searchText, error });
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de pacientes
     */
    async getPatientStatistics() {
        try {
            const stats = await this.patientRepository.getStatistics();
            
            // Calcular métricas adicionales
            stats.conversionRate = stats.total > 0 ? 
                (stats.asignados / stats.total * 100).toFixed(2) : 0;
            
            stats.pediatricPercentage = stats.total > 0 ? 
                (stats.pediatricos / stats.total * 100).toFixed(2) : 0;
            
            return stats;
            
        } catch (error) {
            logger.error('Error obteniendo estadísticas de pacientes', error);
            throw error;
        }
    }

    /**
     * Obtiene pacientes pendientes de asignación
     */
    async getPendingPatients(limit = 50) {
        try {
            const patients = await this.patientRepository.findPending(limit);
            
            // Enriquecer con información adicional
            const enrichedPatients = patients.map(patient => ({
                ...patient.toPlainObject(),
                urgencyLevel: patient.getUrgencyLevel(),
                isPediatric: patient.isPediatric(),
                clinicaSugerida: patient.isPediatric() ? 
                    'Clínica para el Niño y Adolescente' : 
                    'Clínica Integral Adulto y Gerontología'
            }));
            
            return enrichedPatients;
            
        } catch (error) {
            logger.error('Error obteniendo pacientes pendientes', error);
            throw error;
        }
    }

    // --- MÉTODOS PRIVADOS ---

    /**
     * Verifica duplicados por teléfono o email
     */
    async checkForDuplicates(telefono, email, excludeId = null) {
        if (!telefono && !email) return;
        
        const duplicates = await this.patientRepository.findDuplicates(telefono, email);
        
        // Filtrar el paciente actual si se está actualizando
        const relevantDuplicates = duplicates.filter(dup => dup.id !== excludeId);
        
        if (relevantDuplicates.length > 0) {
            const duplicate = relevantDuplicates[0];
            const field = duplicate.telefono === telefono ? 'teléfono' : 'email';
            throw new ConflictError(
                `Ya existe un paciente con ese ${field}`,
                { existingPatientId: duplicate.id }
            );
        }
    }

    /**
     * Infiere el tipo de tratamiento basado en síntomas
     */
    inferTreatmentType(patient) {
        if (!patient.sintomas || patient.sintomas.length === 0) {
            return patient.isPediatric() ? 'Resina Simple' : 'Destartraje y Pulido Coronario';
        }
        
        const sintomasText = patient.sintomas.join(' ').toLowerCase();
        
        // Reglas simples de inferencia
        if (sintomasText.includes('dolor') || sintomasText.includes('duele')) {
            return 'Endodoncia';
        }
        
        if (sintomasText.includes('limpieza') || sintomasText.includes('sarro')) {
            return 'Destartraje y Pulido Coronario';
        }
        
        if (sintomasText.includes('caries') || sintomasText.includes('hoyo')) {
            return 'Resina Simple';
        }
        
        if (sintomasText.includes('extraer') || sintomasText.includes('sacar')) {
            return 'Exodoncia Simple';
        }
        
        // Default
        return patient.isPediatric() ? 'Resina Simple' : 'Destartraje y Pulido Coronario';
    }

    /**
     * Ordena pacientes según criterio
     */
    sortPatients(patients, sortBy, sortOrder = 'asc') {
        return patients.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'nombreCompleto':
                    valueA = a.nombreCompleto.toLowerCase();
                    valueB = b.nombreCompleto.toLowerCase();
                    break;
                case 'edad':
                    valueA = a.edad;
                    valueB = b.edad;
                    break;
                case 'fechaRegistro':
                    valueA = new Date(a.fechaRegistro);
                    valueB = new Date(b.fechaRegistro);
                    break;
                case 'prioridad':
                    const prioridadOrder = { 'muy_alta': 4, 'alta': 3, 'moderada': 2, 'baja': 1 };
                    valueA = prioridadOrder[a.prioridad.toLowerCase()] || 2;
                    valueB = prioridadOrder[b.prioridad.toLowerCase()] || 2;
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

module.exports = PatientService;