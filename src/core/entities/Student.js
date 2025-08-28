/**
 * Entidad Estudiante - Representa un estudiante en el dominio
 */
class Student {
    constructor({
        id,
        nombreCompleto,
        codigoEstudiante,
        anoCarrera,
        telefono,
        email,
        especialidades = [],
        casosActivos = 0,
        casosNecesarios = 10,
        casosCompletados = 0,
        estado = 'activo',
        disponibilidadHorarios = []
    }) {
        this.id = id;
        this.nombreCompleto = nombreCompleto;
        this.codigoEstudiante = codigoEstudiante;
        this.anoCarrera = anoCarrera;
        this.telefono = telefono;
        this.email = email;
        this.especialidades = Array.isArray(especialidades) ? 
            especialidades : 
            (typeof especialidades === 'string' ? 
                especialidades.split(',').map(e => e.trim()) : []);
        this.casosActivos = casosActivos;
        this.casosNecesarios = casosNecesarios;
        this.casosCompletados = casosCompletados;
        this.estado = estado;
        this.disponibilidadHorarios = disponibilidadHorarios;
    }

    /**
     * Valida si el estudiante tiene datos mínimos requeridos
     */
    isValid() {
        return !!(this.nombreCompleto && this.codigoEstudiante && this.anoCarrera);
    }

    /**
     * Verifica si el estudiante está disponible para nuevos casos
     */
    isAvailable() {
        return this.estado === 'activo' && this.casosActivos < this.casosNecesarios;
    }

    /**
     * Verifica si tiene una especialidad específica
     */
    hasSpecialty(especialidad) {
        return this.especialidades.some(e => 
            e.toLowerCase().includes(especialidad.toLowerCase())
        );
    }

    /**
     * Calcula el porcentaje de carga de trabajo
     */
    getWorkloadPercentage() {
        return this.casosNecesarios > 0 ? 
            (this.casosActivos / this.casosNecesarios) * 100 : 0;
    }

    /**
     * Determina si es estudiante avanzado (4to o 5to año)
     */
    isAdvancedStudent() {
        const year = this.anoCarrera.toString().toLowerCase();
        return year.includes('4') || year.includes('5') || 
               year.includes('cuarto') || year.includes('quinto');
    }

    /**
     * Obtiene capacidad restante
     */
    getRemainingCapacity() {
        return Math.max(0, this.casosNecesarios - this.casosActivos);
    }

    /**
     * Convierte a objeto plano para persistencia
     */
    toPlainObject() {
        return {
            id: this.id,
            nombreCompleto: this.nombreCompleto,
            codigoEstudiante: this.codigoEstudiante,
            anoCarrera: this.anoCarrera,
            telefono: this.telefono,
            email: this.email,
            especialidades: this.especialidades,
            casosActivos: this.casosActivos,
            casosNecesarios: this.casosNecesarios,
            casosCompletados: this.casosCompletados,
            estado: this.estado,
            disponibilidadHorarios: this.disponibilidadHorarios
        };
    }

    /**
     * Crea una instancia desde datos de base de datos
     */
    static fromDatabase(data) {
        return new Student({
            id: data.id,
            nombreCompleto: data.nombre_completo,
            codigoEstudiante: data.codigo_estudiante,
            anoCarrera: data.año_carrera,
            telefono: data.telefono,
            email: data.email,
            especialidades: data.especialidades,
            casosActivos: data.casos_activos,
            casosNecesarios: data.casos_necesarios,
            casosCompletados: data.casos_completados,
            estado: data.estado,
            disponibilidadHorarios: data.disponibilidad_horarios || []
        });
    }
}

module.exports = Student;