/**
 * Entidad Paciente - Representa un paciente en el dominio
 */
class Patient {
    constructor({
        id,
        nombreCompleto,
        edad,
        telefono,
        email,
        ciudad,
        sintomas,
        tipoTratamiento,
        nivelDolor,
        prioridad,
        fechaRegistro,
        estado = 'pendiente'
    }) {
        this.id = id;
        this.nombreCompleto = nombreCompleto;
        this.edad = edad;
        this.telefono = telefono;
        this.email = email;
        this.ciudad = ciudad;
        this.sintomas = sintomas || [];
        this.tipoTratamiento = tipoTratamiento;
        this.nivelDolor = nivelDolor || 0;
        this.prioridad = prioridad || 'moderada';
        this.fechaRegistro = fechaRegistro || new Date();
        this.estado = estado;
    }

    /**
     * Valida si el paciente tiene datos mínimos requeridos
     */
    isValid() {
        return !!(this.nombreCompleto && this.edad && this.telefono);
    }

    /**
     * Determina si es un paciente pediátrico
     */
    isPediatric() {
        return this.edad < 18;
    }

    /**
     * Calcula el nivel de urgencia basado en dolor y prioridad
     */
    getUrgencyLevel() {
        const prioridadScore = {
            'muy_alta': 4,
            'alta': 3,
            'moderada': 2,
            'baja': 1
        };

        const dolorScore = this.nivelDolor / 10;
        const priorityScore = prioridadScore[this.prioridad.toLowerCase()] || 2;
        
        return (dolorScore + priorityScore) / 2;
    }

    /**
     * Convierte a objeto plano para persistencia
     */
    toPlainObject() {
        return {
            id: this.id,
            nombreCompleto: this.nombreCompleto,
            edad: this.edad,
            telefono: this.telefono,
            email: this.email,
            ciudad: this.ciudad,
            sintomas: this.sintomas,
            tipoTratamiento: this.tipoTratamiento,
            nivelDolor: this.nivelDolor,
            prioridad: this.prioridad,
            fechaRegistro: this.fechaRegistro,
            estado: this.estado
        };
    }

    /**
     * Crea una instancia desde datos de base de datos
     */
    static fromDatabase(data) {
        return new Patient({
            id: data.id,
            nombreCompleto: data.nombre_completo,
            edad: data.edad,
            telefono: data.telefono,
            email: data.email,
            ciudad: data.ciudad,
            sintomas: data.sintomas_seleccionados ? 
                (typeof data.sintomas_seleccionados === 'string' ? 
                    JSON.parse(data.sintomas_seleccionados) : 
                    data.sintomas_seleccionados) : [],
            tipoTratamiento: data.tipo_tratamiento_inferido,
            nivelDolor: data.nivel_dolor,
            prioridad: data.prioridad,
            fechaRegistro: data.fecha_registro,
            estado: data.estado
        });
    }
}

module.exports = Patient;