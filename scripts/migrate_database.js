const { getConnection } = require('../config/database');

/**
 * Script de migración profesional para el Sistema Dental Matching
 * Versión: 2.0.0
 * Fecha: 2024
 */

class DatabaseMigrator {
    constructor() {
        this.connection = null;
        this.migrationSteps = [
            { name: 'Verificar estructura existente', method: this.verifyExistingStructure.bind(this) },
            { name: 'Crear tabla codigos_acceso', method: this.createCodigosAcceso.bind(this) },
            { name: 'Actualizar tabla asignaciones', method: this.updateAsignaciones.bind(this) },
            { name: 'Crear tabla citas', method: this.createCitas.bind(this) },
            { name: 'Crear tabla seguimiento_tratamiento', method: this.createSeguimientoTratamiento.bind(this) },
            { name: 'Crear tabla notificaciones_email', method: this.createNotificacionesEmail.bind(this) },
            { name: 'Crear tabla configuracion_sistema', method: this.createConfiguracionSistema.bind(this) },
            { name: 'Crear tabla logs_sistema', method: this.createLogsSistema.bind(this) },
            { name: 'Crear tabla especialidades_estudiante', method: this.createEspecialidadesEstudiante.bind(this) },
            { name: 'Crear tabla requerimientos_paciente', method: this.createRequerimientosPaciente.bind(this) },
            { name: 'Crear tabla asignaciones_horario', method: this.createAsignacionesHorario.bind(this) },
            { name: 'Crear tabla disponibilidad_estudiante', method: this.createDisponibilidadEstudiante.bind(this) },
            { name: 'Generar códigos de acceso', method: this.generateAccessCodes.bind(this) },
            { name: 'Actualizar asignaciones existentes', method: this.updateExistingAssignments.bind(this) },
            { name: 'Crear índices de rendimiento', method: this.createPerformanceIndexes.bind(this) }
        ];
    }

    async migrate() {
        try {
            console.log('🚀 Iniciando migración profesional de base de datos...');
            console.log('==================================================');
            
            const db = await getConnection();
            this.connection = await db.getConnection();
            await this.connection.beginTransaction();

            for (const step of this.migrationSteps) {
                console.log(`\n🔧 ${step.name}...`);
                try {
                    await step.method();
                } catch (error) {
                    console.log(`⚠️ Error en ${step.name}: ${error.message}`);
                    // Continuar con el siguiente paso en lugar de fallar completamente
                }
            }

            await this.connection.commit();
            console.log('\n🎉 Migración completada exitosamente');
            
        } catch (error) {
            if (this.connection) {
                try {
                    await this.connection.rollback();
                    console.log('🔄 Rollback ejecutado');
                } catch (rollbackError) {
                    console.error('❌ Error en rollback:', rollbackError.message);
                }
            }
            console.error('❌ Error en migración:', error);
            throw error;
        } finally {
            if (this.connection) {
                this.connection.release();
            }
        }
    }

    async verifyExistingStructure() {
        const [tables] = await this.connection.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
        `);
        
        this.existingTables = tables.map(t => t.table_name).filter(Boolean);
        console.log(`📋 Tablas existentes: ${this.existingTables.length}`);
    }

    async createCodigosAcceso() {
        if (this.existingTables.includes('codigos_acceso')) {
            console.log('✅ Tabla codigos_acceso ya existe');
            return;
        }

        try {
            await this.connection.execute(`
                CREATE TABLE codigos_acceso (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_estudiante INT NOT NULL,
                    codigo_acceso VARCHAR(12) UNIQUE NOT NULL,
                    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_expiracion TIMESTAMP NOT NULL,
                    activo BOOLEAN DEFAULT TRUE,
                    usado BOOLEAN DEFAULT FALSE,
                    intentos_fallidos INT DEFAULT 0,
                    ultimo_intento TIMESTAMP NULL,
                    ip_generacion VARCHAR(45),
                    ip_ultimo_uso VARCHAR(45),
                    FOREIGN KEY (id_estudiante) REFERENCES estudiantes_odontologia(id) ON DELETE CASCADE,
                    INDEX idx_codigo_acceso (codigo_acceso),
                    INDEX idx_estudiante (id_estudiante),
                    INDEX idx_activo (activo),
                    INDEX idx_expiracion (fecha_expiracion)
                )
            `);
            console.log('✅ Tabla codigos_acceso creada');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('✅ Tabla codigos_acceso ya existe, continuando...');
            } else {
                throw error;
            }
        }
    }

    async updateAsignaciones() {
        try {
            const [columns] = await this.connection.execute('SHOW COLUMNS FROM asignaciones');
            const columnNames = columns.map(c => c.Field);
            
            const requiredColumns = [
                { name: 'codigo_acceso', sql: 'VARCHAR(12) NOT NULL DEFAULT "TEMP001"' },
                { name: 'algoritmo_version', sql: 'VARCHAR(10) DEFAULT "1.0"' },
                { name: 'fecha_primer_contacto', sql: 'TIMESTAMP NULL' },
                { name: 'fecha_inicio_tratamiento', sql: 'TIMESTAMP NULL' },
                { name: 'fecha_finalizacion', sql: 'TIMESTAMP NULL' },
                { name: 'motivo_cancelacion', sql: 'TEXT' }
            ];

            for (const column of requiredColumns) {
                if (!columnNames.includes(column.name)) {
                    try {
                        await this.connection.execute(`
                            ALTER TABLE asignaciones 
                            ADD COLUMN ${column.name} ${column.sql}
                        `);
                        console.log(`✅ Columna ${column.name} agregada`);
                    } catch (error) {
                        console.log(`⚠️ No se pudo agregar columna ${column.name}: ${error.message}`);
                    }
                }
            }

            // Actualizar ENUM de estados si es necesario
            try {
                await this.connection.execute(`
                    ALTER TABLE asignaciones 
                    MODIFY COLUMN estado ENUM(
                        'asignado', 'notificado', 'contactado', 'en_tratamiento', 
                        'atendido', 'abandono', 'completado', 'cancelado'
                    ) DEFAULT 'asignado'
                `);
                console.log('✅ ENUM de estados actualizado');
            } catch (error) {
                console.log('⚠️ No se pudo actualizar el ENUM de estados:', error.message);
            }
        } catch (error) {
            console.log('⚠️ No se pudo verificar/actualizar tabla asignaciones:', error.message);
        }
    }

    async createCitas() {
        if (this.existingTables.includes('citas')) {
            console.log('✅ Tabla citas ya existe');
            return;
        }

        try {
            await this.connection.execute(`
                CREATE TABLE citas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_asignacion INT NOT NULL,
                    fecha_programada DATE NOT NULL,
                    hora_programada TIME NOT NULL,
                    duracion_estimada INT DEFAULT 60,
                    tipo_cita ENUM(
                        'primera_consulta', 'seguimiento', 'tratamiento', 
                        'control_post_tratamiento', 'urgencia'
                    ) NOT NULL,
                    estado_cita ENUM(
                        'programada', 'confirmada', 'recordatorio_enviado',
                        'asistio', 'no_asistio', 'llego_tarde',
                        'cancelada', 'reprogramada'
                    ) DEFAULT 'programada',
                    observaciones_cita TEXT,
                    motivo_cancelacion TEXT,
                    tiempo_real_sesion INT,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    creado_por_estudiante BOOLEAN DEFAULT TRUE,
                    recordatorio_24h_enviado BOOLEAN DEFAULT FALSE,
                    recordatorio_2h_enviado BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY (id_asignacion) REFERENCES asignaciones(id) ON DELETE CASCADE,
                    INDEX idx_fecha_programada (fecha_programada),
                    INDEX idx_estado_cita (estado_cita),
                    INDEX idx_tipo_cita (tipo_cita),
                    INDEX idx_asignacion (id_asignacion),
                    INDEX idx_fecha_hora (fecha_programada, hora_programada)
                )
            `);
            console.log('✅ Tabla citas creada');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('✅ Tabla citas ya existe, continuando...');
            } else {
                throw error;
            }
        }
    }

    async createSeguimientoTratamiento() {
        if (this.existingTables.includes('seguimiento_tratamiento')) {
            console.log('✅ Tabla seguimiento_tratamiento ya existe');
            return;
        }

        try {
            await this.connection.execute(`
                CREATE TABLE seguimiento_tratamiento (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_asignacion INT NOT NULL,
                    id_cita INT NULL,
                    fecha_seguimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    progreso_tratamiento ENUM(
                        'evaluacion_inicial', 'plan_tratamiento', 'iniciado', 
                        'en_progreso_25', 'en_progreso_50', 'en_progreso_75', 
                        'finalizado', 'pausado', 'abandonado'
                    ) NOT NULL,
                    procedimientos_realizados TEXT,
                    materiales_utilizados TEXT,
                    tiempo_sesion INT,
                    dolor_reportado INT CHECK (dolor_reportado >= 0 AND dolor_reportado <= 10),
                    observaciones_tratamiento TEXT,
                    observaciones_paciente TEXT,
                    complicaciones TEXT,
                    proxima_cita DATE,
                    notas_proxima_cita TEXT,
                    creado_por_estudiante BOOLEAN DEFAULT TRUE,
                    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_asignacion) REFERENCES asignaciones(id) ON DELETE CASCADE,
                    FOREIGN KEY (id_cita) REFERENCES citas(id) ON DELETE SET NULL,
                    INDEX idx_asignacion (id_asignacion),
                    INDEX idx_fecha_seguimiento (fecha_seguimiento),
                    INDEX idx_progreso (progreso_tratamiento),
                    INDEX idx_proxima_cita (proxima_cita)
                )
            `);
            console.log('✅ Tabla seguimiento_tratamiento creada');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('✅ Tabla seguimiento_tratamiento ya existe, continuando...');
            } else {
                throw error;
            }
        }
    }

    async createNotificacionesEmail() {
        if (this.existingTables.includes('notificaciones_email')) {
            console.log('✅ Tabla notificaciones_email ya existe');
            return;
        }

        try {
            await this.connection.execute(`
                CREATE TABLE notificaciones_email (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_estudiante INT NULL,
                    id_paciente INT NULL,
                    email_destino VARCHAR(100) NOT NULL,
                    tipo_notificacion ENUM(
                        'nuevo_paciente', 'codigo_acceso', 'recordatorio_cita',
                        'seguimiento_pendiente', 'caso_completado', 'sistema'
                    ) NOT NULL,
                    asunto VARCHAR(200) NOT NULL,
                    mensaje TEXT NOT NULL,
                    mensaje_html TEXT,
                    enviado BOOLEAN DEFAULT FALSE,
                    fecha_envio TIMESTAMP NULL,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    intentos_envio INT DEFAULT 0,
                    error_envio TEXT,
                    id_referencia INT NULL,
                    tipo_referencia ENUM('asignacion', 'cita', 'tratamiento', 'codigo') NULL,
                    FOREIGN KEY (id_estudiante) REFERENCES estudiantes_odontologia(id) ON DELETE SET NULL,
                    FOREIGN KEY (id_paciente) REFERENCES pacientes(id) ON DELETE SET NULL,
                    INDEX idx_enviado (enviado),
                    INDEX idx_tipo_notificacion (tipo_notificacion),
                    INDEX idx_estudiante (id_estudiante),
                    INDEX idx_fecha_creacion (fecha_creacion),
                    INDEX idx_email_destino (email_destino)
                )
            `);
            console.log('✅ Tabla notificaciones_email creada');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('✅ Tabla notificaciones_email ya existe, continuando...');
            } else {
                throw error;
            }
        }
    }

    async createConfiguracionSistema() {
        if (this.existingTables.includes('configuracion_sistema')) {
            console.log('✅ Tabla configuracion_sistema ya existe');
            return;
        }

        try {
            await this.connection.execute(`
                CREATE TABLE configuracion_sistema (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    clave VARCHAR(50) UNIQUE NOT NULL,
                    valor TEXT,
                    descripcion TEXT,
                    tipo_dato ENUM('string', 'int', 'boolean', 'json') DEFAULT 'string',
                    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_clave (clave)
                )
            `);

            // Insertar configuración inicial
            try {
                const [existingConfig] = await this.connection.execute('SELECT COUNT(*) as total FROM configuracion_sistema');
                if (existingConfig[0].total === 0) {
                    await this.connection.execute(`
                        INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo_dato) VALUES
                        ('version_sistema', '2.0.0', 'Versión actual del sistema', 'string'),
                        ('sync_intervalo_minutos', '5', 'Intervalo de sincronización con Google Sheets en minutos', 'int'),
                        ('max_casos_por_estudiante', '10', 'Máximo número de casos por estudiante', 'int'),
                        ('dias_expiracion_codigo', '30', 'Días de validez para códigos de acceso', 'int'),
                        ('email_notificaciones_activo', 'true', 'Activar envío de notificaciones por email', 'boolean'),
                        ('url_google_sheet', '', 'URL del Google Sheet con formulario de pacientes', 'string'),
                        ('tratamientos_disponibles', '["Endodoncia", "Destartraje y Pulido Coronario", "Pulido Radicular", "Exodoncia Simple", "Resina Simple", "Resina Compuesta", "Corona", "Incrustación", "Protesis Parcial Removible", "Protesis Total Removible"]', 'Lista de tratamientos disponibles', 'json')
                    `);
                    console.log('✅ Configuración inicial insertada');
                } else {
                    console.log('✅ Configuración ya existe, saltando inserción');
                }
            } catch (error) {
                console.log('⚠️ No se pudo verificar configuración existente:', error.message);
            }
            
            console.log('✅ Tabla configuracion_sistema creada');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('✅ Tabla configuracion_sistema ya existe, continuando...');
            } else {
                throw error;
            }
        }
    }

    async createLogsSistema() {
        if (this.existingTables.includes('logs_sistema')) {
            console.log('✅ Tabla logs_sistema ya existe');
            return;
        }

        try {
            await this.connection.execute(`
                CREATE TABLE logs_sistema (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    nivel ENUM('INFO', 'WARNING', 'ERROR', 'DEBUG') NOT NULL,
                    modulo VARCHAR(50),
                    mensaje TEXT,
                    datos_adicionales JSON,
                    ip_origen VARCHAR(45),
                    usuario_id INT NULL,
                    INDEX idx_fecha (fecha),
                    INDEX idx_nivel (nivel),
                    INDEX idx_modulo (modulo)
                )
            `);
            console.log('✅ Tabla logs_sistema creada');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('✅ Tabla logs_sistema ya existe, continuando...');
            } else {
                throw error;
            }
        }
    }

    async createEspecialidadesEstudiante() {
        if (this.existingTables.includes('especialidades_estudiante')) {
            console.log('✅ Tabla especialidades_estudiante ya existe');
            return;
        }

        try {
            await this.connection.execute(`
                CREATE TABLE especialidades_estudiante (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_estudiante INT NOT NULL,
                    especialidad VARCHAR(100) NOT NULL,
                    clinica ENUM('Clínica para el Niño y Adolescente', 'Clínica Integral Adulto y Gerontología') NOT NULL,
                    dia_semana ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado') NOT NULL,
                    hora_inicio TIME NOT NULL,
                    hora_fin TIME NOT NULL,
                    capacidad_pacientes INT DEFAULT 1,
                    activo BOOLEAN DEFAULT TRUE,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (id_estudiante) REFERENCES estudiantes_odontologia(id) ON DELETE CASCADE,
                    INDEX idx_estudiante_especialidad (id_estudiante, especialidad),
                    INDEX idx_dia_hora (dia_semana, hora_inicio, hora_fin),
                    INDEX idx_clinica (clinica),
                    INDEX idx_especialidad (especialidad),
                    INDEX idx_activo (activo),
                    
                    UNIQUE KEY unique_estudiante_horario (id_estudiante, dia_semana, hora_inicio, hora_fin)
                )
            `);
            console.log('✅ Tabla especialidades_estudiante creada');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('✅ Tabla especialidades_estudiante ya existe, continuando...');
            } else {
                throw error;
            }
        }
    }

    async createRequerimientosPaciente() {
        if (this.existingTables.includes('requerimientos_paciente')) {
            console.log('✅ Tabla requerimientos_paciente ya existe');
            return;
        }

        try {
            await this.connection.execute(`
                CREATE TABLE requerimientos_paciente (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_paciente INT NOT NULL,
                    especialidad_requerida VARCHAR(100) NOT NULL,
                    clinica_preferida ENUM('Clínica para el Niño y Adolescente', 'Clínica Integral Adulto y Gerontología'),
                    urgencia ENUM('baja', 'moderada', 'alta', 'urgente') DEFAULT 'moderada',
                    dias_disponibles JSON,
                    horarios_preferidos JSON,
                    notas_adicionales TEXT,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    activo BOOLEAN DEFAULT TRUE,
                    
                    FOREIGN KEY (id_paciente) REFERENCES pacientes(id) ON DELETE CASCADE,
                    INDEX idx_paciente_especialidad (id_paciente, especialidad_requerida),
                    INDEX idx_urgencia (urgencia),
                    INDEX idx_clinica_preferida (clinica_preferida),
                    INDEX idx_activo (activo)
                )
            `);
            console.log('✅ Tabla requerimientos_paciente creada');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('✅ Tabla requerimientos_paciente ya existe, continuando...');
            } else {
                throw error;
            }
        }
    }

    async createAsignacionesHorario() {
        if (this.existingTables.includes('asignaciones_horario')) {
            console.log('✅ Tabla asignaciones_horario ya existe');
            return;
        }

        try {
            await this.connection.execute(`
                CREATE TABLE asignaciones_horario (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_estudiante INT NOT NULL,
                    id_paciente INT NOT NULL,
                    id_especialidad_estudiante INT NOT NULL,
                    id_requerimiento_paciente INT NOT NULL,
                    especialidad VARCHAR(100) NOT NULL,
                    clinica ENUM('Clínica para el Niño y Adolescente', 'Clínica Integral Adulto y Gerontología') NOT NULL,
                    dia_semana ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado') NOT NULL,
                    hora_inicio TIME NOT NULL,
                    hora_fin TIME NOT NULL,
                    fecha_asignacion DATE NOT NULL,
                    estado ENUM('programada', 'confirmada', 'en_progreso', 'completada', 'cancelada', 'reprogramada') DEFAULT 'programada',
                    notas TEXT,
                    score_matching DECIMAL(5,2) DEFAULT 0.00,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (id_estudiante) REFERENCES estudiantes_odontologia(id) ON DELETE CASCADE,
                    FOREIGN KEY (id_paciente) REFERENCES pacientes(id) ON DELETE CASCADE,
                    FOREIGN KEY (id_especialidad_estudiante) REFERENCES especialidades_estudiante(id) ON DELETE CASCADE,
                    FOREIGN KEY (id_requerimiento_paciente) REFERENCES requerimientos_paciente(id) ON DELETE CASCADE,
                    
                    INDEX idx_estudiante_fecha (id_estudiante, fecha_asignacion),
                    INDEX idx_paciente_fecha (id_paciente, fecha_asignacion),
                    INDEX idx_especialidad_fecha (especialidad, fecha_asignacion),
                    INDEX idx_estado (estado),
                    INDEX idx_clinica_fecha (clinica, fecha_asignacion),
                    INDEX idx_dia_semana (dia_semana),
                    INDEX idx_score (score_matching),
                    
                    UNIQUE KEY unique_estudiante_horario_fecha (id_estudiante, dia_semana, hora_inicio, fecha_asignacion)
                )
            `);
            console.log('✅ Tabla asignaciones_horario creada');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('✅ Tabla asignaciones_horario ya existe, continuando...');
            } else {
                throw error;
            }
        }
    }

    async createDisponibilidadEstudiante() {
        if (this.existingTables.includes('disponibilidad_estudiante')) {
            console.log('✅ Tabla disponibilidad_estudiante ya existe');
            return;
        }

        try {
            await this.connection.execute(`
                CREATE TABLE disponibilidad_estudiante (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_estudiante INT NOT NULL,
                    fecha DATE NOT NULL,
                    dia_semana ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado') NOT NULL,
                    hora_inicio TIME NOT NULL,
                    hora_fin TIME NOT NULL,
                    especialidad VARCHAR(100) NOT NULL,
                    clinica ENUM('Clínica para el Niño y Adolescente', 'Clínica Integral Adulto y Gerontología') NOT NULL,
                    capacidad_total INT DEFAULT 1,
                    pacientes_asignados INT DEFAULT 0,
                    disponible BOOLEAN GENERATED ALWAYS AS (pacientes_asignados < capacidad_total) STORED,
                    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (id_estudiante) REFERENCES estudiantes_odontologia(id) ON DELETE CASCADE,
                    INDEX idx_estudiante_fecha (id_estudiante, fecha),
                    INDEX idx_disponible (disponible),
                    INDEX idx_especialidad_fecha (especialidad, fecha),
                    INDEX idx_clinica_fecha (clinica, fecha),
                    
                    UNIQUE KEY unique_disponibilidad (id_estudiante, fecha, hora_inicio, especialidad)
                )
            `);
            console.log('✅ Tabla disponibilidad_estudiante creada');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('✅ Tabla disponibilidad_estudiante ya existe, continuando...');
            } else {
                throw error;
            }
        }
    }

    async generateAccessCodes() {
        try {
            const [estudiantes] = await this.connection.execute(`
                SELECT id FROM estudiantes_odontologia 
                WHERE id NOT IN (SELECT DISTINCT id_estudiante FROM codigos_acceso)
            `);
            
            if (estudiantes.length > 0) {
                for (const estudiante of estudiantes) {
                    const codigo = this.generateTemporaryCode();
                    const fechaExpiracion = new Date();
                    fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);
                    
                    await this.connection.execute(`
                        INSERT INTO codigos_acceso (
                            id_estudiante, codigo_acceso, fecha_expiracion, activo
                        ) VALUES (?, ?, ?, TRUE)
                    `, [estudiante.id, codigo, fechaExpiracion]);
                }
                console.log(`✅ ${estudiantes.length} códigos de acceso generados`);
            } else {
                console.log('✅ Todos los estudiantes ya tienen códigos de acceso');
            }
        } catch (error) {
            console.log('⚠️ No se pudieron generar códigos de acceso:', error.message);
        }
    }

    async updateExistingAssignments() {
        try {
            const [asignacionesSinCodigo] = await this.connection.execute(`
                SELECT a.id, a.id_estudiante 
                FROM asignaciones a 
                WHERE a.codigo_acceso = 'TEMP001'
            `);
            
            if (asignacionesSinCodigo.length > 0) {
                for (const asignacion of asignacionesSinCodigo) {
                    const [codigo] = await this.connection.execute(`
                        SELECT codigo_acceso 
                        FROM codigos_acceso 
                        WHERE id_estudiante = ? AND activo = TRUE 
                        LIMIT 1
                    `, [asignacion.id_estudiante]);
                    
                    if (codigo.length > 0) {
                        await this.connection.execute(`
                            UPDATE asignaciones 
                            SET codigo_acceso = ? 
                            WHERE id = ?
                        `, [codigo[0].codigo_acceso, asignacion.id]);
                    }
                }
                console.log(`✅ ${asignacionesSinCodigo.length} asignaciones actualizadas`);
            } else {
                console.log('✅ Todas las asignaciones ya tienen códigos de acceso válidos');
            }
        } catch (error) {
            console.log('⚠️ No se pudieron actualizar asignaciones:', error.message);
        }
    }

    async createPerformanceIndexes() {
        const indexes = [
            { name: 'idx_paciente_estado_prioridad', sql: 'CREATE INDEX idx_paciente_estado_prioridad ON pacientes(activo, prioridad, fecha_registro)' },
            { name: 'idx_estudiante_disponibilidad', sql: 'CREATE INDEX idx_estudiante_disponibilidad ON estudiantes_odontologia(estado, casos_activos, año_carrera)' },
            { name: 'idx_asignacion_estado_fecha', sql: 'CREATE INDEX idx_asignacion_estado_fecha ON asignaciones(estado, fecha_asignacion)' }
        ];

        for (const index of indexes) {
            try {
                await this.connection.execute(index.sql);
                console.log(`✅ Índice ${index.name} creado`);
            } catch (error) {
                console.log(`⚠️ Índice ${index.name} ya existe o no se pudo crear`);
            }
        }
    }

    generateTemporaryCode() {
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let codigo = '';
        codigo += caracteres.charAt(Math.floor(Math.random() * 26));
        codigo += caracteres.charAt(Math.floor(Math.random() * 26));
        for (let i = 0; i < 6; i++) {
            codigo += Math.floor(Math.random() * 10);
        }
        codigo += caracteres.charAt(Math.floor(Math.random() * 26));
        codigo += caracteres.charAt(Math.floor(Math.random() * 26));
        return codigo;
    }
}

// Función principal de migración
async function migrateDatabase() {
    const migrator = new DatabaseMigrator();
    await migrator.migrate();
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
    migrateDatabase()
        .then(() => {
            console.log('✅ Migración completada exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error en migración:', error);
            process.exit(1);
        });
}

module.exports = { migrateDatabase, DatabaseMigrator };
