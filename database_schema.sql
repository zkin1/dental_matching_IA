-- ===============================================
-- BASE DE DATOS COMPLETA - SISTEMA DENTAL MATCHING
-- Generado automáticamente: 2025-08-25T07:13:47.062Z
-- Estado: Esquema actualizado desde base de datos real
-- ===============================================

CREATE DATABASE IF NOT EXISTS dental_matching 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE dental_matching;

-- ===============================================
-- CONFIGURACIÓN DE VARIABLES
-- ===============================================
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- ===============================================
-- TABLAS PRINCIPALES
-- ===============================================

-- ===============================================
-- TABLA: ASIGNACIONES
-- ===============================================
CREATE TABLE `asignaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `id_estudiante` int NOT NULL,
  `codigo_acceso` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_asignacion` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `score_compatibilidad` decimal(3,2) DEFAULT NULL,
  `algoritmo_version` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1.0',
  `estado` enum('asignado','notificado','contactado','en_tratamiento','atendido','abandono','completado','cancelado') COLLATE utf8mb4_unicode_ci DEFAULT 'asignado',
  `fecha_primer_contacto` datetime(3) DEFAULT NULL,
  `fecha_inicio_tratamiento` datetime(3) DEFAULT NULL,
  `fecha_finalizacion` datetime(3) DEFAULT NULL,
  `fecha_actualizacion` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `observaciones_estudiante` text COLLATE utf8mb4_unicode_ci,
  `observaciones_sistema` text COLLATE utf8mb4_unicode_ci,
  `motivo_cancelacion` text COLLATE utf8mb4_unicode_ci,
  `notificado_por_email` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_notificacion` datetime(3) DEFAULT NULL,
  `recordatorios_enviados` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `asignaciones_estado_idx` (`estado`),
  KEY `asignaciones_fecha_asignacion_idx` (`fecha_asignacion`),
  KEY `asignaciones_id_paciente_idx` (`id_paciente`),
  KEY `asignaciones_id_estudiante_idx` (`id_estudiante`),
  KEY `asignaciones_codigo_acceso_idx` (`codigo_acceso`),
  KEY `asignaciones_score_compatibilidad_idx` (`score_compatibilidad`),
  KEY `asignaciones_notificado_por_email_idx` (`notificado_por_email`),
  KEY `idx_asignacion_estado_fecha` (`estado`,`fecha_asignacion`),
  CONSTRAINT `asignaciones_codigo_acceso_fkey` FOREIGN KEY (`codigo_acceso`) REFERENCES `codigos_acceso` (`codigo_acceso`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `asignaciones_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `asignaciones_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- TABLA: ASIGNACIONES_HORARIO
-- ===============================================
CREATE TABLE `asignaciones_horario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_estudiante` int NOT NULL,
  `id_paciente` int NOT NULL,
  `id_especialidad_estudiante` int NOT NULL,
  `id_requerimiento_paciente` int NOT NULL,
  `especialidad` varchar(100) NOT NULL,
  `clinica` enum('Clínica para el Niño y Adolescente','Clínica Integral Adulto y Gerontología') NOT NULL,
  `dia_semana` enum('lunes','martes','miercoles','jueves','viernes','sabado') NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `fecha_asignacion` date NOT NULL,
  `estado` enum('programada','confirmada','en_progreso','completada','cancelada','reprogramada') DEFAULT 'programada',
  `notas` text,
  `score_matching` decimal(5,2) DEFAULT '0.00',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_estudiante_horario_fecha` (`id_estudiante`,`dia_semana`,`hora_inicio`,`fecha_asignacion`),
  KEY `id_especialidad_estudiante` (`id_especialidad_estudiante`),
  KEY `id_requerimiento_paciente` (`id_requerimiento_paciente`),
  KEY `idx_estudiante_fecha` (`id_estudiante`,`fecha_asignacion`),
  KEY `idx_paciente_fecha` (`id_paciente`,`fecha_asignacion`),
  KEY `idx_especialidad_fecha` (`especialidad`,`fecha_asignacion`),
  KEY `idx_estado` (`estado`),
  KEY `idx_clinica_fecha` (`clinica`,`fecha_asignacion`),
  KEY `idx_dia_semana` (`dia_semana`),
  KEY `idx_score` (`score_matching`),
  CONSTRAINT `asignaciones_horario_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asignaciones_horario_ibfk_2` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asignaciones_horario_ibfk_3` FOREIGN KEY (`id_especialidad_estudiante`) REFERENCES `especialidades_estudiante` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asignaciones_horario_ibfk_4` FOREIGN KEY (`id_requerimiento_paciente`) REFERENCES `requerimientos_paciente` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================================
-- TABLA: CITAS
-- ===============================================
CREATE TABLE `citas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_asignacion` int NOT NULL,
  `fecha_programada` date NOT NULL,
  `hora_programada` time NOT NULL,
  `duracion_estimada` int NOT NULL DEFAULT '60',
  `tipo_cita` enum('primera_consulta','seguimiento','tratamiento','control_post_tratamiento','urgencia') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_cita` enum('programada','confirmada','recordatorio_enviado','asistio','no_asistio','llego_tarde','cancelada','reprogramada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'programada',
  `observaciones_cita` text COLLATE utf8mb4_unicode_ci,
  `motivo_cancelacion` text COLLATE utf8mb4_unicode_ci,
  `tiempo_real_sesion` int DEFAULT NULL,
  `fecha_creacion` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `fecha_modificacion` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `creado_por_estudiante` tinyint(1) NOT NULL DEFAULT '1',
  `recordatorio_24h_enviado` tinyint(1) NOT NULL DEFAULT '0',
  `recordatorio_2h_enviado` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `citas_fecha_programada_idx` (`fecha_programada`),
  KEY `citas_estado_cita_idx` (`estado_cita`),
  KEY `citas_tipo_cita_idx` (`tipo_cita`),
  KEY `citas_id_asignacion_idx` (`id_asignacion`),
  KEY `citas_fecha_programada_hora_programada_idx` (`fecha_programada`,`hora_programada`),
  CONSTRAINT `citas_id_asignacion_fkey` FOREIGN KEY (`id_asignacion`) REFERENCES `asignaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- TABLA: CODIGOS_ACCESO
-- ===============================================
CREATE TABLE `codigos_acceso` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_estudiante` int NOT NULL,
  `codigo_acceso` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_generacion` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `fecha_expiracion` datetime(3) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `usado` tinyint(1) NOT NULL DEFAULT '0',
  `intentos_fallidos` int NOT NULL DEFAULT '0',
  `ultimo_intento` datetime(3) DEFAULT NULL,
  `ip_generacion` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_ultimo_uso` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigos_acceso_codigo_acceso_key` (`codigo_acceso`),
  KEY `codigos_acceso_codigo_acceso_idx` (`codigo_acceso`),
  KEY `codigos_acceso_id_estudiante_idx` (`id_estudiante`),
  KEY `codigos_acceso_activo_idx` (`activo`),
  KEY `codigos_acceso_fecha_expiracion_idx` (`fecha_expiracion`),
  CONSTRAINT `codigos_acceso_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- TABLA: CONFIGURACION_SISTEMA
-- ===============================================
CREATE TABLE `configuracion_sistema` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text COLLATE utf8mb4_unicode_ci,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo_dato` enum('string','int','boolean','json') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string',
  `fecha_actualizacion` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `configuracion_sistema_clave_key` (`clave`),
  KEY `configuracion_sistema_clave_idx` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- TABLA: DISPONIBILIDAD_ESTUDIANTE
-- ===============================================
CREATE TABLE `disponibilidad_estudiante` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_estudiante` int NOT NULL,
  `fecha` date NOT NULL,
  `dia_semana` enum('lunes','martes','miercoles','jueves','viernes','sabado') NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `especialidad` varchar(100) NOT NULL,
  `clinica` enum('Clínica para el Niño y Adolescente','Clínica Integral Adulto y Gerontología') NOT NULL,
  `capacidad_total` int DEFAULT '1',
  `pacientes_asignados` int DEFAULT '0',
  `disponible` tinyint(1) GENERATED ALWAYS AS ((`pacientes_asignados` < `capacidad_total`)) STORED,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_disponibilidad` (`id_estudiante`,`fecha`,`hora_inicio`,`especialidad`),
  KEY `idx_estudiante_fecha` (`id_estudiante`,`fecha`),
  KEY `idx_disponible` (`disponible`),
  KEY `idx_especialidad_fecha` (`especialidad`,`fecha`),
  KEY `idx_clinica_fecha` (`clinica`,`fecha`),
  CONSTRAINT `disponibilidad_estudiante_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================================
-- TABLA: ESPECIALIDADES_ESTUDIANTE
-- ===============================================
CREATE TABLE `especialidades_estudiante` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_estudiante` int NOT NULL,
  `especialidad` varchar(100) NOT NULL,
  `clinica` enum('Clínica para el Niño y Adolescente','Clínica Integral Adulto y Gerontología') NOT NULL,
  `dia_semana` enum('lunes','martes','miercoles','jueves','viernes','sabado') NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `capacidad_pacientes` int DEFAULT '1',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_estudiante_horario` (`id_estudiante`,`dia_semana`,`hora_inicio`,`hora_fin`),
  KEY `idx_estudiante_especialidad` (`id_estudiante`,`especialidad`),
  KEY `idx_dia_hora` (`dia_semana`,`hora_inicio`,`hora_fin`),
  KEY `idx_clinica` (`clinica`),
  KEY `idx_especialidad` (`especialidad`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `especialidades_estudiante_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================================
-- TABLA: ESTUDIANTES_ODONTOLOGIA
-- ===============================================
CREATE TABLE `estudiantes_odontologia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo_estudiante` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre_completo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `año_carrera` enum('4to','5to') COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `universidad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciudad` enum('Metropolitana','Valparaíso','Concepción') COLLATE utf8mb4_unicode_ci NOT NULL,
  `especialidades` json DEFAULT NULL,
  `dias_disponibles` json DEFAULT NULL,
  `horarios_disponibles` json DEFAULT NULL,
  `casos_completados` int DEFAULT NULL,
  `casos_necesarios` int DEFAULT NULL,
  `casos_activos` int DEFAULT NULL,
  `estado` enum('activo','completo','inactivo','suspendido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `fecha_registro` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `fecha_actualizacion` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ultimo_acceso` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `estudiantes_odontologia_email_key` (`email`),
  UNIQUE KEY `codigo_estudiante` (`codigo_estudiante`),
  KEY `estudiantes_odontologia_estado_idx` (`estado`),
  KEY `estudiantes_odontologia_año_carrera_idx` (`año_carrera`),
  KEY `estudiantes_odontologia_ciudad_idx` (`ciudad`),
  KEY `estudiantes_odontologia_codigo_estudiante_idx` (`codigo_estudiante`),
  KEY `estudiantes_odontologia_casos_activos_idx` (`casos_activos`),
  KEY `estudiantes_odontologia_ultimo_acceso_idx` (`ultimo_acceso`),
  KEY `idx_estudiante_disponibilidad` (`estado`,`casos_activos`,`año_carrera`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- TABLA: LOGS_SISTEMA
-- ===============================================
CREATE TABLE `logs_sistema` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fecha` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `nivel` enum('INFO','WARNING','ERROR','DEBUG') COLLATE utf8mb4_unicode_ci NOT NULL,
  `modulo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci,
  `datos_adicionales` json DEFAULT NULL,
  `ip_origen` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `logs_sistema_fecha_idx` (`fecha`),
  KEY `logs_sistema_nivel_idx` (`nivel`),
  KEY `logs_sistema_modulo_idx` (`modulo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- TABLA: NOTIFICACIONES_EMAIL
-- ===============================================
CREATE TABLE `notificaciones_email` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_estudiante` int DEFAULT NULL,
  `id_paciente` int DEFAULT NULL,
  `email_destino` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_notificacion` enum('nuevo_paciente','codigo_acceso','recordatorio_cita','seguimiento_pendiente','caso_completado','sistema') COLLATE utf8mb4_unicode_ci NOT NULL,
  `asunto` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje_html` text COLLATE utf8mb4_unicode_ci,
  `enviado` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_envio` datetime(3) DEFAULT NULL,
  `fecha_creacion` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `intentos_envio` int NOT NULL DEFAULT '0',
  `error_envio` text COLLATE utf8mb4_unicode_ci,
  `id_referencia` int DEFAULT NULL,
  `tipo_referencia` enum('asignacion','cita','tratamiento','codigo') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notificaciones_email_enviado_idx` (`enviado`),
  KEY `notificaciones_email_tipo_notificacion_idx` (`tipo_notificacion`),
  KEY `notificaciones_email_id_estudiante_idx` (`id_estudiante`),
  KEY `notificaciones_email_fecha_creacion_idx` (`fecha_creacion`),
  KEY `notificaciones_email_email_destino_idx` (`email_destino`),
  KEY `notificaciones_email_id_paciente_fkey` (`id_paciente`),
  CONSTRAINT `notificaciones_email_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `notificaciones_email_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- TABLA: PACIENTES
-- ===============================================
CREATE TABLE `pacientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` datetime(3) NOT NULL,
  `nombre_completo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `edad` int DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciudad` enum('Metropolitana','Valparaíso','Concepción') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sintomas_seleccionados` json DEFAULT NULL,
  `diagnostico_previo` text COLLATE utf8mb4_unicode_ci,
  `tiempo_problema` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nivel_dolor` int NOT NULL DEFAULT '0',
  `dias_disponibles` text COLLATE utf8mb4_unicode_ci,
  `horario_preferencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disponibilidad_cita` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_tratamiento_inferido` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complejidad` enum('Básico','Intermedio','Avanzado') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prioridad` enum('Baja','Moderada','Alta','Muy Alta') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Moderada',
  `fecha_registro` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `fecha_actualizacion` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `estudiante_asignado` int DEFAULT NULL,
  `estado` enum('pendiente','asignado','completado','cancelado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `fecha_asignacion` timestamp NULL DEFAULT NULL,
  `sheet_row_index` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pacientes_ciudad_idx` (`ciudad`),
  KEY `pacientes_prioridad_idx` (`prioridad`),
  KEY `pacientes_nivel_dolor_idx` (`nivel_dolor`),
  KEY `pacientes_fecha_registro_idx` (`fecha_registro`),
  KEY `pacientes_telefono_idx` (`telefono`),
  KEY `pacientes_tipo_tratamiento_inferido_idx` (`tipo_tratamiento_inferido`),
  KEY `idx_sheet_row` (`sheet_row_index`),
  KEY `fk_pacientes_estudiante` (`estudiante_asignado`),
  KEY `idx_paciente_estado_prioridad` (`activo`,`prioridad`,`fecha_registro`),
  CONSTRAINT `fk_pacientes_estudiante` FOREIGN KEY (`estudiante_asignado`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- TABLA: REQUERIMIENTOS_PACIENTE
-- ===============================================
CREATE TABLE `requerimientos_paciente` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `especialidad_requerida` varchar(100) NOT NULL,
  `clinica_preferida` enum('Clínica para el Niño y Adolescente','Clínica Integral Adulto y Gerontología') DEFAULT NULL,
  `urgencia` enum('baja','moderada','alta','urgente') DEFAULT 'moderada',
  `dias_disponibles` json DEFAULT NULL,
  `horarios_preferidos` json DEFAULT NULL,
  `notas_adicionales` text,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_paciente_especialidad` (`id_paciente`,`especialidad_requerida`),
  KEY `idx_urgencia` (`urgencia`),
  KEY `idx_clinica_preferida` (`clinica_preferida`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `requerimientos_paciente_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================================
-- TABLA: SEGUIMIENTO_TRATAMIENTO
-- ===============================================
CREATE TABLE `seguimiento_tratamiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_asignacion` int NOT NULL,
  `id_cita` int DEFAULT NULL,
  `fecha_seguimiento` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `progreso_tratamiento` enum('evaluacion_inicial','plan_tratamiento','iniciado','en_progreso_25','en_progreso_50','en_progreso_75','finalizado','pausado','abandonado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `procedimientos_realizados` text COLLATE utf8mb4_unicode_ci,
  `materiales_utilizados` text COLLATE utf8mb4_unicode_ci,
  `tiempo_sesion` int DEFAULT NULL,
  `dolor_reportado` int DEFAULT NULL,
  `observaciones_tratamiento` text COLLATE utf8mb4_unicode_ci,
  `observaciones_paciente` text COLLATE utf8mb4_unicode_ci,
  `complicaciones` text COLLATE utf8mb4_unicode_ci,
  `proxima_cita` date DEFAULT NULL,
  `notas_proxima_cita` text COLLATE utf8mb4_unicode_ci,
  `creado_por_estudiante` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_actualizacion` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `seguimiento_tratamiento_id_asignacion_idx` (`id_asignacion`),
  KEY `seguimiento_tratamiento_fecha_seguimiento_idx` (`fecha_seguimiento`),
  KEY `seguimiento_tratamiento_progreso_tratamiento_idx` (`progreso_tratamiento`),
  KEY `seguimiento_tratamiento_proxima_cita_idx` (`proxima_cita`),
  KEY `seguimiento_tratamiento_id_cita_fkey` (`id_cita`),
  CONSTRAINT `seguimiento_tratamiento_id_asignacion_fkey` FOREIGN KEY (`id_asignacion`) REFERENCES `asignaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `seguimiento_tratamiento_id_cita_fkey` FOREIGN KEY (`id_cita`) REFERENCES `citas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- DATOS INICIALES DE CONFIGURACIÓN
-- ===============================================

-- Configuración del sistema
INSERT IGNORE INTO configuracion_sistema (clave, valor, descripcion, tipo) VALUES
('max_asignaciones_por_estudiante', '5', 'Máximo número de asignaciones simultáneas por estudiante', 'numero'),
('tiempo_expiracion_asignacion', '7', 'Días antes de que expire una asignación sin actividad', 'numero'),
('notificaciones_email_activas', 'true', 'Activar/desactivar notificaciones por email', 'booleano'),
('matching_automatico_activo', 'true', 'Activar/desactivar el matching automático', 'booleano'),
('horarios_atencion_inicio', '08:00', 'Hora de inicio de atención', 'tiempo'),
('horarios_atencion_fin', '18:00', 'Hora de fin de atención', 'tiempo');

-- ===============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ===============================================

ALTER TABLE pacientes COMMENT = 'Tabla principal de pacientes del sistema';
ALTER TABLE estudiantes_odontologia COMMENT = 'Estudiantes de odontología registrados en el sistema';
ALTER TABLE codigos_acceso COMMENT = 'Códigos únicos para acceso de estudiantes al portal';
ALTER TABLE asignaciones COMMENT = 'Asignaciones de pacientes a estudiantes (LEGACY)';
ALTER TABLE citas COMMENT = 'Citas programadas entre pacientes y estudiantes';
ALTER TABLE seguimiento_tratamiento COMMENT = 'Seguimiento detallado de tratamientos';
ALTER TABLE notificaciones_email COMMENT = 'Cola de notificaciones por email';
ALTER TABLE configuracion_sistema COMMENT = 'Configuración global del sistema';
ALTER TABLE logs_sistema COMMENT = 'Logs de eventos del sistema';
ALTER TABLE especialidades_estudiante COMMENT = 'Especialidades y horarios específicos de cada estudiante';
ALTER TABLE requerimientos_paciente COMMENT = 'Requerimientos específicos de tratamiento de cada paciente';
ALTER TABLE asignaciones_horario COMMENT = 'Asignaciones específicas por horario y especialidad';
ALTER TABLE disponibilidad_estudiante COMMENT = 'Tracking en tiempo real de disponibilidad de estudiantes';

-- ===============================================
-- FINALIZACIÓN
-- ===============================================
SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- ===============================================
-- INFORMACIÓN DEL SCHEMA
-- ===============================================
-- Total de tablas: 13
-- Tablas principales: pacientes, estudiantes_odontologia, asignaciones
-- Tablas de matching avanzado: especialidades_estudiante, requerimientos_paciente, asignaciones_horario, disponibilidad_estudiante
-- Tablas de configuración: configuracion_sistema, codigos_acceso
-- Tablas de seguimiento: citas, seguimiento_tratamiento, notificaciones_email, logs_sistema
-- ===============================================
