const StudentRepository = require('../../infrastructure/repositories/StudentRepository');
const Student = require('../../core/entities/Student');
const { NotFoundError, ConflictError, BusinessLogicError } = require('../../shared/errors/AppError');
const logger = require('../../shared/utils/logger');

/**
 * Servicio de aplicación para Estudiantes
 * Contiene la lógica de negocio y orchestración
 */
class StudentService {
    constructor() {
        this.studentRepository = new StudentRepository();
    }

    /**
     * Obtiene todos los estudiantes con filtros y paginación
     */
    async getAllStudents(filters = {}) {
        try {
            const startTime = Date.now();
            
            // Aplicar filtros específicos
            let students;
            
            if (filters.disponible === true) {
                students = await this.studentRepository.findAvailable(filters.especialidad, filters.limit);
            } else if (filters.especialidad) {
                students = await this.studentRepository.findBySpecialty(filters.especialidad);
            } else if (filters.anoCarrera) {
                students = await this.studentRepository.findByYear(filters.anoCarrera);
            } else if (filters.cargaMaxima) {
                students = await this.studentRepository.findWithLowWorkload(filters.cargaMaxima);
            } else {
                students = await this.studentRepository.findAllActive(filters.limit);
            }
            
            // Aplicar filtros adicionales
            if (filters.nombre) {
                const nombreLower = filters.nombre.toLowerCase();
                students = students.filter(student => 
                    student.nombreCompleto.toLowerCase().includes(nombreLower)
                );
            }
            
            if (filters.codigo) {
                students = students.filter(student => 
                    student.codigoEstudiante.includes(filters.codigo)
                );
            }
            
            // Ordenamiento
            if (filters.sortBy) {
                students = this.sortStudents(students, filters.sortBy, filters.sortOrder);
            }
            
            // Paginación
            const offset = filters.offset || 0;
            const limit = filters.limit || 20;
            const paginatedStudents = students.slice(offset, offset + limit);
            
            const duration = Date.now() - startTime;
            logger.database('SELECT', 'estudiantes_odontologia', duration);
            
            return {
                data: paginatedStudents,
                total: students.length,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(students.length / limit)
            };
            
        } catch (error) {
            logger.error('Error obteniendo estudiantes', error);
            throw error;
        }
    }

    /**
     * Obtiene un estudiante por ID
     */
    async getStudentById(id) {
        try {
            const student = await this.studentRepository.findStudentById(id);
            
            if (!student) {
                throw new NotFoundError('Estudiante', id);
            }
            
            return student;
            
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            logger.error(`Error obteniendo estudiante ${id}`, error);
            throw error;
        }
    }

    /**
     * Crea un nuevo estudiante
     */
    async createStudent(studentData) {
        try {
            // Crear entidad Student
            const student = new Student(studentData);
            
            // Validar entidad
            if (!student.isValid()) {
                throw new BusinessLogicError('Datos del estudiante incompletos');
            }
            
            // Verificar duplicados
            await this.checkForDuplicates(student.codigoEstudiante, student.email);
            
            // Validar especialidades
            this.validateSpecialties(student.especialidades);
            
            // Persistir en base de datos
            const createdStudent = await this.studentRepository.createStudent(student);
            
            logger.info(`Estudiante creado: ${createdStudent.nombreCompleto} (${createdStudent.codigoEstudiante})`);
            
            return createdStudent;
            
        } catch (error) {
            logger.error('Error creando estudiante', { studentData, error });
            throw error;
        }
    }

    /**
     * Actualiza un estudiante existente
     */
    async updateStudent(id, updateData) {
        try {
            // Verificar que el estudiante existe
            const existingStudent = await this.getStudentById(id);
            
            // Actualizar propiedades
            Object.assign(existingStudent, updateData);
            
            // Validar entidad actualizada
            if (!existingStudent.isValid()) {
                throw new BusinessLogicError('Datos del estudiante incompletos después de la actualización');
            }
            
            // Verificar duplicados si se cambió código o email
            if (updateData.codigoEstudiante || updateData.email) {
                await this.checkForDuplicates(
                    existingStudent.codigoEstudiante, 
                    existingStudent.email, 
                    id
                );
            }
            
            // Validar especialidades si se actualizaron
            if (updateData.especialidades) {
                this.validateSpecialties(existingStudent.especialidades);
            }
            
            // Validar lógica de casos
            this.validateCaseLogic(existingStudent);
            
            // Persistir cambios
            const updated = await this.studentRepository.updateStudent(existingStudent);
            
            if (!updated) {
                throw new NotFoundError('Estudiante', id);
            }
            
            logger.info(`Estudiante actualizado: ${existingStudent.nombreCompleto} (ID: ${id})`);
            
            return existingStudent;
            
        } catch (error) {
            logger.error(`Error actualizando estudiante ${id}`, { updateData, error });
            throw error;
        }
    }

    /**
     * Obtiene estudiantes disponibles para una especialidad
     */
    async getAvailableStudents(especialidad = null, clinica = null) {
        try {
            let students = await this.studentRepository.findAvailable(especialidad);
            
            // Filtrar por clínica si se especifica
            if (clinica) {
                students = students.filter(student => {
                    // Lógica para determinar si el estudiante puede atender en esa clínica
                    if (clinica.includes('Niño')) {
                        return student.especialidades.some(esp => 
                            ['Odontopediatría', 'Resina Simple', 'Destartraje y Pulido Coronario'].includes(esp)
                        );
                    }
                    return true; // Para clínica de adultos, todos pueden atender
                });
            }
            
            // Enriquecer con información de disponibilidad
            const enrichedStudents = students.map(student => ({
                ...student.toPlainObject(),
                availabilityScore: this.calculateAvailabilityScore(student),
                recommendedFor: this.getRecommendedTreatments(student),
                workloadStatus: this.getWorkloadStatus(student)
            }));
            
            // Ordenar por score de disponibilidad
            enrichedStudents.sort((a, b) => b.availabilityScore - a.availabilityScore);
            
            return enrichedStudents;
            
        } catch (error) {
            logger.error('Error obteniendo estudiantes disponibles', { especialidad, clinica, error });
            throw error;
        }
    }

    /**
     * Actualiza la carga de trabajo de un estudiante
     */
    async updateWorkload(id, action) {
        try {
            const student = await this.getStudentById(id);
            
            let updated = false;
            
            switch (action) {
                case 'increment_active':
                    if (student.casosActivos >= student.casosNecesarios) {
                        throw new BusinessLogicError('El estudiante ya ha alcanzado su capacidad máxima');
                    }
                    updated = await this.studentRepository.incrementActiveCases(id);
                    break;
                
                case 'decrement_active':
                    updated = await this.studentRepository.decrementActiveCases(id);
                    break;
                
                case 'increment_completed':
                    updated = await this.studentRepository.incrementCompletedCases(id);
                    // También decrementar activos
                    await this.studentRepository.decrementActiveCases(id);
                    break;
                
                default:
                    throw new BusinessLogicError('Acción no válida para actualizar carga de trabajo');
            }
            
            if (!updated) {
                throw new NotFoundError('Estudiante', id);
            }
            
            logger.info(`Carga de trabajo actualizada para estudiante ${id}: ${action}`);
            
            return await this.getStudentById(id);
            
        } catch (error) {
            logger.error(`Error actualizando carga de trabajo del estudiante ${id}`, { action, error });
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de estudiantes
     */
    async getStudentStatistics() {
        try {
            const stats = await this.studentRepository.getStatistics();
            
            // Calcular métricas adicionales
            if (stats.cargaTrabajo && stats.cargaTrabajo.length > 0) {
                const workload = stats.cargaTrabajo[0];
                stats.workloadAnalysis = {
                    average: parseFloat(workload.promedio_carga || 0).toFixed(2),
                    min: parseFloat(workload.min_carga || 0).toFixed(2),
                    max: parseFloat(workload.max_carga || 0).toFixed(2),
                    studentsAtCapacity: stats.completos,
                    utilizationRate: stats.total > 0 ? 
                        ((stats.total - stats.disponibles) / stats.total * 100).toFixed(2) : 0
                };
            }
            
            return stats;
            
        } catch (error) {
            logger.error('Error obteniendo estadísticas de estudiantes', error);
            throw error;
        }
    }

    /**
     * Obtiene ranking de rendimiento de estudiantes
     */
    async getPerformanceRanking(limit = 10) {
        try {
            const ranking = await this.studentRepository.getPerformanceRanking(limit);
            
            // Enriquecer con métricas adicionales
            const enrichedRanking = ranking.map(student => ({
                ...student.toPlainObject(),
                performance: {
                    completionRate: student.casosCompletados + student.casosActivos > 0 ? 
                        (student.casosCompletados / (student.casosCompletados + student.casosActivos) * 100).toFixed(2) : 0,
                    efficiency: student.casosNecesarios > 0 ? 
                        (student.casosCompletados / student.casosNecesarios * 100).toFixed(2) : 0,
                    currentLoad: student.getWorkloadPercentage().toFixed(2)
                }
            }));
            
            return enrichedRanking;
            
        } catch (error) {
            logger.error('Error obteniendo ranking de rendimiento', error);
            throw error;
        }
    }

    // --- MÉTODOS PRIVADOS ---

    /**
     * Verifica duplicados por código de estudiante o email
     */
    async checkForDuplicates(codigoEstudiante, email, excludeId = null) {
        const duplicates = await this.studentRepository.findDuplicates(codigoEstudiante, email);
        
        // Filtrar el estudiante actual si se está actualizando
        const relevantDuplicates = duplicates.filter(dup => dup.id !== excludeId);
        
        if (relevantDuplicates.length > 0) {
            const duplicate = relevantDuplicates[0];
            const field = duplicate.codigoEstudiante === codigoEstudiante ? 'código de estudiante' : 'email';
            throw new ConflictError(
                `Ya existe un estudiante con ese ${field}`,
                { existingStudentId: duplicate.id }
            );
        }
    }

    /**
     * Valida las especialidades del estudiante
     */
    validateSpecialties(especialidades) {
        const validSpecialties = [
            'Endodoncia',
            'Destartraje y Pulido Coronario',
            'Pulido Radicular',
            'Exodoncia Simple',
            'Resina Simple',
            'Resina Compuesta',
            'Corona',
            'Incrustación',
            'Protesis Parcial Removible',
            'Protesis Total Removible',
            'Odontopediatría',
            'Ortodoncia',
            'Cirugía Oral',
            'Periodoncia',
            'Operatoria Dental',
            'Prótesis Fija',
            'Prótesis Removible'
        ];
        
        const studentSpecs = Array.isArray(especialidades) ? especialidades : [];
        
        for (const specialty of studentSpecs) {
            if (!validSpecialties.includes(specialty)) {
                throw new BusinessLogicError(`Especialidad no válida: ${specialty}`);
            }
        }
    }

    /**
     * Valida la lógica de casos del estudiante
     */
    validateCaseLogic(student) {
        if (student.casosActivos < 0) {
            throw new BusinessLogicError('Los casos activos no pueden ser negativos');
        }
        
        if (student.casosCompletados < 0) {
            throw new BusinessLogicError('Los casos completados no pueden ser negativos');
        }
        
        if (student.casosNecesarios <= 0) {
            throw new BusinessLogicError('Los casos necesarios deben ser mayor a cero');
        }
        
        if (student.casosActivos > student.casosNecesarios) {
            throw new BusinessLogicError('Los casos activos no pueden exceder los casos necesarios');
        }
    }

    /**
     * Calcula el score de disponibilidad
     */
    calculateAvailabilityScore(student) {
        if (!student.isAvailable()) return 0;
        
        const workloadScore = 1 - (student.casosActivos / student.casosNecesarios);
        const experienceScore = Math.min(student.casosCompletados / 20, 1); // Max score at 20 completed cases
        const yearScore = student.isAdvancedStudent() ? 1 : 0.7;
        
        return (workloadScore * 0.5 + experienceScore * 0.3 + yearScore * 0.2);
    }

    /**
     * Obtiene tratamientos recomendados para el estudiante
     */
    getRecommendedTreatments(student) {
        const treatments = [];
        
        if (student.especialidades.includes('Endodoncia') && student.isAdvancedStudent()) {
            treatments.push('Endodoncia');
        }
        
        if (student.especialidades.includes('Operatoria Dental')) {
            treatments.push('Resina Simple', 'Resina Compuesta');
        }
        
        if (student.especialidades.includes('Cirugía Oral') && student.isAdvancedStudent()) {
            treatments.push('Exodoncia Simple');
        }
        
        // Tratamientos básicos para todos
        treatments.push('Destartraje y Pulido Coronario');
        
        return [...new Set(treatments)]; // Remove duplicates
    }

    /**
     * Obtiene el estado de carga de trabajo
     */
    getWorkloadStatus(student) {
        const percentage = student.getWorkloadPercentage();
        
        if (percentage >= 90) return 'completo';
        if (percentage >= 70) return 'alto';
        if (percentage >= 40) return 'moderado';
        return 'bajo';
    }

    /**
     * Ordena estudiantes según criterio
     */
    sortStudents(students, sortBy, sortOrder = 'asc') {
        return students.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'nombreCompleto':
                    valueA = a.nombreCompleto.toLowerCase();
                    valueB = b.nombreCompleto.toLowerCase();
                    break;
                case 'codigoEstudiante':
                    valueA = a.codigoEstudiante;
                    valueB = b.codigoEstudiante;
                    break;
                case 'anoCarrera':
                    valueA = a.anoCarrera;
                    valueB = b.anoCarrera;
                    break;
                case 'casosActivos':
                    valueA = a.casosActivos;
                    valueB = b.casosActivos;
                    break;
                case 'casosCompletados':
                    valueA = a.casosCompletados;
                    valueB = b.casosCompletados;
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

module.exports = StudentService;