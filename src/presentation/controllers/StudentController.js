const StudentService = require('../../application/services/StudentService');
const { CreateStudentDTO, UpdateStudentDTO, StudentResponseDTO, StudentSearchDTO } = require('../../application/dtos/StudentDTO');
const { asyncHandler } = require('../../shared/middleware/errorHandler');
const logger = require('../../shared/utils/logger');

/**
 * Controlador para endpoints de Estudiantes
 * Responsabilidad: Manejar HTTP, validaciones de entrada, formateo de respuestas
 */
class StudentController {
    constructor() {
        this.studentService = new StudentService();
    }

    /**
     * GET /api/students
     * Obtiene todos los estudiantes con filtros y paginación
     */
    getAll = asyncHandler(async (req, res) => {
        // Los filtros ya fueron validados por el middleware
        const filters = req.validated?.query || req.query;
        
        const result = await this.studentService.getAllStudents(filters);
        
        res.json({
            success: true,
            data: StudentResponseDTO.fromStudentList(result.data),
            pagination: {
                page: result.page,
                limit: filters.limit || 20,
                total: result.total,
                totalPages: result.totalPages
            }
        });
    });

    /**
     * GET /api/students/:id
     * Obtiene un estudiante específico por ID
     */
    getById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        const student = await this.studentService.getStudentById(id);
        
        res.json({
            success: true,
            data: StudentResponseDTO.fromStudent(student, true)
        });
    });

    /**
     * POST /api/students
     * Crea un nuevo estudiante
     */
    create = asyncHandler(async (req, res) => {
        const validatedData = req.validated?.body || req.body;
        
        const student = await this.studentService.createStudent(validatedData);
        
        res.status(201).json({
            success: true,
            message: 'Estudiante creado exitosamente',
            data: StudentResponseDTO.fromStudent(student)
        });
    });

    /**
     * PUT /api/students/:id
     * Actualiza un estudiante existente
     */
    update = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const validatedData = req.validated?.body || req.body;
        
        const student = await this.studentService.updateStudent(id, validatedData);
        
        res.json({
            success: true,
            message: 'Estudiante actualizado exitosamente',
            data: StudentResponseDTO.fromStudent(student)
        });
    });

    /**
     * GET /api/students/available
     * Obtiene estudiantes disponibles para asignación
     */
    getAvailable = asyncHandler(async (req, res) => {
        const { especialidad, clinica } = req.query;
        
        const students = await this.studentService.getAvailableStudents(especialidad, clinica);
        
        res.json({
            success: true,
            data: students,
            filters: {
                especialidad: especialidad || 'todas',
                clinica: clinica || 'todas'
            },
            count: students.length
        });
    });

    /**
     * GET /api/students/by-specialty/:specialty
     * Obtiene estudiantes por especialidad
     */
    getBySpecialty = asyncHandler(async (req, res) => {
        const { specialty } = req.params;
        
        const result = await this.studentService.getAllStudents({ 
            especialidad: specialty, 
            limit: req.query.limit || 100 
        });
        
        res.json({
            success: true,
            data: StudentResponseDTO.fromStudentList(result.data),
            specialty: specialty,
            count: result.total
        });
    });

    /**
     * GET /api/students/by-year/:year
     * Obtiene estudiantes por año de carrera
     */
    getByYear = asyncHandler(async (req, res) => {
        const { year } = req.params;
        
        const result = await this.studentService.getAllStudents({ 
            anoCarrera: year, 
            limit: req.query.limit || 100 
        });
        
        res.json({
            success: true,
            data: StudentResponseDTO.fromStudentList(result.data),
            year: year,
            count: result.total
        });
    });

    /**
     * PATCH /api/students/:id/workload
     * Actualiza la carga de trabajo de un estudiante
     */
    updateWorkload = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { action } = req.body;
        
        const validActions = ['increment_active', 'decrement_active', 'increment_completed'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                error: `Acción inválida. Acciones válidas: ${validActions.join(', ')}`
            });
        }
        
        const student = await this.studentService.updateWorkload(id, action);
        
        res.json({
            success: true,
            message: `Carga de trabajo actualizada: ${action}`,
            data: StudentResponseDTO.fromStudent(student, true)
        });
    });

    /**
     * GET /api/students/statistics
     * Obtiene estadísticas de estudiantes
     */
    getStatistics = asyncHandler(async (req, res) => {
        const stats = await this.studentService.getStudentStatistics();
        
        res.json({
            success: true,
            data: stats
        });
    });

    /**
     * GET /api/students/performance-ranking
     * Obtiene ranking de rendimiento de estudiantes
     */
    getPerformanceRanking = asyncHandler(async (req, res) => {
        const { limit = 10 } = req.query;
        
        const ranking = await this.studentService.getPerformanceRanking(parseInt(limit));
        
        res.json({
            success: true,
            data: ranking,
            count: ranking.length
        });
    });

    /**
     * GET /api/students/low-workload
     * Obtiene estudiantes con poca carga de trabajo
     */
    getLowWorkload = asyncHandler(async (req, res) => {
        const { percentage = 50 } = req.query;
        
        const result = await this.studentService.getAllStudents({ 
            cargaMaxima: parseInt(percentage), 
            limit: req.query.limit || 100 
        });
        
        res.json({
            success: true,
            data: StudentResponseDTO.fromStudentList(result.data),
            maxWorkloadPercentage: percentage,
            count: result.total
        });
    });

    /**
     * GET /api/students/advanced
     * Obtiene estudiantes avanzados (4to y 5to año)
     */
    getAdvanced = asyncHandler(async (req, res) => {
        const result = await this.studentService.getAllStudents({ 
            limit: req.query.limit || 100 
        });
        
        // Filtrar estudiantes avanzados
        const advancedStudents = result.data.filter(student => student.isAdvanced);
        
        res.json({
            success: true,
            data: StudentResponseDTO.fromStudentList(advancedStudents),
            count: advancedStudents.length
        });
    });

    /**
     * GET /api/students/search
     * Busca estudiantes por nombre o código
     */
    search = asyncHandler(async (req, res) => {
        const { query: searchText } = req.query;
        
        if (!searchText || searchText.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'El término de búsqueda debe tener al menos 2 caracteres'
            });
        }
        
        const result = await this.studentService.getAllStudents({ 
            nombre: searchText.includes(' ') ? searchText : undefined,
            codigo: !searchText.includes(' ') ? searchText : undefined,
            limit: 50 
        });
        
        res.json({
            success: true,
            data: StudentResponseDTO.fromStudentList(result.data),
            searchTerm: searchText,
            count: result.total
        });
    });

    /**
     * POST /api/students/:id/specialties
     * Agrega especialidades a un estudiante
     */
    addSpecialties = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { especialidades } = req.body;
        
        if (!Array.isArray(especialidades) || especialidades.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de especialidades'
            });
        }
        
        const student = await this.studentService.getStudentById(id);
        
        // Agregar nuevas especialidades sin duplicar
        const currentSpecialties = student.especialidades;
        const newSpecialties = [...new Set([...currentSpecialties, ...especialidades])];
        
        const updatedStudent = await this.studentService.updateStudent(id, { 
            especialidades: newSpecialties 
        });
        
        res.json({
            success: true,
            message: 'Especialidades agregadas exitosamente',
            data: StudentResponseDTO.fromStudent(updatedStudent),
            addedSpecialties: especialidades.filter(esp => !currentSpecialties.includes(esp))
        });
    });

    /**
     * DELETE /api/students/:id/specialties
     * Remueve especialidades de un estudiante
     */
    removeSpecialties = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { especialidades } = req.body;
        
        if (!Array.isArray(especialidades) || especialidades.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de especialidades a remover'
            });
        }
        
        const student = await this.studentService.getStudentById(id);
        
        // Remover especialidades especificadas
        const updatedSpecialties = student.especialidades.filter(esp => 
            !especialidades.includes(esp)
        );
        
        if (updatedSpecialties.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No se puede remover todas las especialidades'
            });
        }
        
        const updatedStudent = await this.studentService.updateStudent(id, { 
            especialidades: updatedSpecialties 
        });
        
        res.json({
            success: true,
            message: 'Especialidades removidas exitosamente',
            data: StudentResponseDTO.fromStudent(updatedStudent),
            removedSpecialties: especialidades.filter(esp => student.especialidades.includes(esp))
        });
    });

    /**
     * GET /api/students/:id/workload-details
     * Obtiene detalles detallados de la carga de trabajo
     */
    getWorkloadDetails = asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        const student = await this.studentService.getStudentById(id);
        
        const workloadDetails = {
            student: StudentResponseDTO.fromStudent(student, true),
            workload: {
                current: student.casosActivos,
                required: student.casosNecesarios,
                completed: student.casosCompletados,
                remaining: student.getRemainingCapacity(),
                percentage: student.getWorkloadPercentage(),
                isAvailable: student.isAvailable(),
                status: student.getWorkloadPercentage() >= 90 ? 'completo' : 
                       student.getWorkloadPercentage() >= 70 ? 'alto' : 
                       student.getWorkloadPercentage() >= 40 ? 'moderado' : 'bajo'
            },
            performance: {
                completionRate: student.casosActivos + student.casosCompletados > 0 ? 
                    (student.casosCompletados / (student.casosActivos + student.casosCompletados) * 100).toFixed(2) : 0,
                efficiency: student.casosNecesarios > 0 ? 
                    (student.casosCompletados / student.casosNecesarios * 100).toFixed(2) : 0
            }
        };
        
        res.json({
            success: true,
            data: workloadDetails
        });
    });
}

module.exports = StudentController;