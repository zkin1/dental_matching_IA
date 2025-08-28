/**
 * Entidad Asignación - Representa la asignación de un paciente a un estudiante
 */
class Assignment {
    constructor({
        id,
        pacienteId,
        estudianteId,
        especialidad,
        clinica,
        diaSemana,
        horaInicio,
        horaFin,
        fechaAsignacion,
        fechaCita,
        estado = 'asignado',
        scoreCompatibilidad,
        observacionesSistema,
        observacionesEstudiante,
        algoritmoVersion = '2.0'
    }) {
        this.id = id;
        this.pacienteId = pacienteId;
        this.estudianteId = estudianteId;
        this.especialidad = especialidad;
        this.clinica = clinica;
        this.diaSemana = diaSemana;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
        this.fechaAsignacion = fechaAsignacion || new Date();
        this.fechaCita = fechaCita;
        this.estado = estado;
        this.scoreCompatibilidad = scoreCompatibilidad || 0;
        this.observacionesSistema = observacionesSistema;
        this.observacionesEstudiante = observacionesEstudiante;
        this.algoritmoVersion = algoritmoVersion;
    }

    /**
     * Valida si la asignación tiene datos mínimos requeridos
     */
    isValid() {
        return !!(this.pacienteId && this.estudianteId && this.especialidad);
    }

    /**
     * Verifica si la asignación está activa
     */
    isActive() {
        const estadosActivos = ['asignado', 'contactado', 'en_tratamiento'];
        return estadosActivos.includes(this.estado);
    }

    /**
     * Verifica si la asignación está completada
     */
    isCompleted() {
        return this.estado === 'completado';
    }

    /**
     * Calcula la duración de la cita en minutos
     */
    getDurationMinutes() {
        if (!this.horaInicio || !this.horaFin) return 0;
        
        const [startH, startM] = this.horaInicio.split(':').map(Number);
        const [endH, endM] = this.horaFin.split(':').map(Number);
        
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        
        return endMinutes - startMinutes;
    }

    /**
     * Verifica si hay conflicto de horario con otra asignación
     */
    hasTimeConflictWith(otherAssignment) {
        if (this.diaSemana !== otherAssignment.diaSemana ||
            this.fechaCita !== otherAssignment.fechaCita) {
            return false;
        }

        const thisStart = this.horaInicio;
        const thisEnd = this.horaFin;
        const otherStart = otherAssignment.horaInicio;
        const otherEnd = otherAssignment.horaFin;

        return (thisStart < otherEnd && thisEnd > otherStart);
    }

    /**
     * Marca como notificado
     */
    markAsNotified() {
        if (this.estado === 'asignado') {
            this.estado = 'notificado';
        }
    }

    /**
     * Convierte a objeto plano para persistencia
     */
    toPlainObject() {
        return {
            id: this.id,
            pacienteId: this.pacienteId,
            estudianteId: this.estudianteId,
            especialidad: this.especialidad,
            clinica: this.clinica,
            diaSemana: this.diaSemana,
            horaInicio: this.horaInicio,
            horaFin: this.horaFin,
            fechaAsignacion: this.fechaAsignacion,
            fechaCita: this.fechaCita,
            estado: this.estado,
            scoreCompatibilidad: this.scoreCompatibilidad,
            observacionesSistema: this.observacionesSistema,
            observacionesEstudiante: this.observacionesEstudiante,
            algoritmoVersion: this.algoritmoVersion
        };
    }

    /**
     * Crea una instancia desde datos de base de datos
     */
    static fromDatabase(data) {
        return new Assignment({
            id: data.id,
            pacienteId: data.id_paciente,
            estudianteId: data.id_estudiante,
            especialidad: data.especialidad,
            clinica: data.clinica,
            diaSemana: data.dia_semana,
            horaInicio: data.hora_inicio,
            horaFin: data.hora_fin,
            fechaAsignacion: data.fecha_asignacion,
            fechaCita: data.fecha_cita || data.fecha_asignacion,
            estado: data.estado,
            scoreCompatibilidad: data.score_compatibilidad,
            observacionesSistema: data.observaciones_sistema,
            observacionesEstudiante: data.observaciones_estudiante,
            algoritmoVersion: data.algoritmo_version
        });
    }
}

module.exports = Assignment;