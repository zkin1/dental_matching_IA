-- MySQL dump 10.13  Distrib 9.2.0, for Win64 (x86_64)
--
-- Host: localhost    Database: dental_matching
-- ------------------------------------------------------
-- Server version	9.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ai_matching_results`
--

DROP TABLE IF EXISTS `ai_matching_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_matching_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `estudiante_id` int NOT NULL,
  `score` decimal(5,4) NOT NULL,
  `algoritmo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `factores_matching` json DEFAULT NULL,
  `confianza` decimal(3,2) DEFAULT NULL,
  `recomendacion` text COLLATE utf8mb4_unicode_ci,
  `procesado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `usado_en_asignacion` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_matching` (`paciente_id`,`estudiante_id`,`algoritmo`),
  KEY `idx_paciente_id` (`paciente_id`),
  KEY `idx_estudiante_id` (`estudiante_id`),
  KEY `idx_score` (`score`),
  CONSTRAINT `ai_matching_results_estudiante_fk` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_matching_results_paciente_fk` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_matching_results`
--

LOCK TABLES `ai_matching_results` WRITE;
/*!40000 ALTER TABLE `ai_matching_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_matching_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asignaciones`
--

DROP TABLE IF EXISTS `asignaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asignaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `id_estudiante` int NOT NULL,
  `codigo_acceso` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_asignacion` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `score_compatibilidad` decimal(3,2) DEFAULT NULL,
  `algoritmo_version` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '1.0',
  `estado` enum('asignado','notificado','contactado','en_tratamiento','atendido','abandono','completado','cancelado') COLLATE utf8mb4_unicode_ci DEFAULT 'asignado',
  `fecha_primer_contacto` datetime(3) DEFAULT NULL,
  `fecha_inicio_tratamiento` datetime(3) DEFAULT NULL,
  `fecha_finalizacion` datetime(3) DEFAULT NULL,
  `fecha_actualizacion` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `observaciones_estudiante` text COLLATE utf8mb4_unicode_ci,
  `observaciones_sistema` text COLLATE utf8mb4_unicode_ci,
  `justificacion_asignacion` text COLLATE utf8mb4_unicode_ci,
  `motivo_cancelacion` text COLLATE utf8mb4_unicode_ci,
  `notificado_por_email` tinyint(1) DEFAULT '0',
  `fecha_notificacion` datetime(3) DEFAULT NULL,
  `recordatorios_enviados` int DEFAULT '0',
  `especialidad_asignada` varchar(100) DEFAULT NULL,
  `dia_semana_asignado` varchar(20) DEFAULT NULL,
  `hora_inicio_asignada` time DEFAULT NULL,
  `hora_fin_asignada` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_asignacion` (`fecha_asignacion`),
  KEY `idx_id_paciente` (`id_paciente`),
  KEY `idx_id_estudiante` (`id_estudiante`),
  KEY `idx_codigo_acceso` (`codigo_acceso`),
  KEY `idx_score_compatibilidad` (`score_compatibilidad`),
  CONSTRAINT `asignaciones_codigo_acceso_fkey` FOREIGN KEY (`codigo_acceso`) REFERENCES `codigos_acceso` (`codigo_acceso`) ON DELETE RESTRICT,
  CONSTRAINT `asignaciones_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asignaciones_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asignaciones`
--

LOCK TABLES `asignaciones` WRITE;
/*!40000 ALTER TABLE `asignaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `asignaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `codigos_acceso`
--

DROP TABLE IF EXISTS `codigos_acceso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `codigos_acceso` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_estudiante` int NOT NULL,
  `codigo_acceso` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_generacion` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `fecha_expiracion` datetime(3) NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `usado` tinyint(1) DEFAULT '0',
  `intentos_fallidos` int DEFAULT '0',
  `ultimo_intento` datetime(3) DEFAULT NULL,
  `ip_generacion` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_ultimo_uso` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_acceso` (`codigo_acceso`),
  KEY `idx_codigo_acceso` (`codigo_acceso`),
  KEY `idx_id_estudiante` (`id_estudiante`),
  KEY `idx_fecha_expiracion` (`fecha_expiracion`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `codigos_acceso_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `codigos_acceso`
--

LOCK TABLES `codigos_acceso` WRITE;
/*!40000 ALTER TABLE `codigos_acceso` DISABLE KEYS */;
/*!40000 ALTER TABLE `codigos_acceso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_sistema`
--

DROP TABLE IF EXISTS `configuracion_sistema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_sistema` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text COLLATE utf8mb4_unicode_ci,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo_dato` enum('string','int','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  `fecha_actualizacion` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_sistema`
--

LOCK TABLES `configuracion_sistema` WRITE;
/*!40000 ALTER TABLE `configuracion_sistema` DISABLE KEYS */;
INSERT INTO `configuracion_sistema` VALUES (1,'matching_algorithm_version','3.0','Versión del algoritmo de matching','string','2025-08-30 16:34:19.494'),(2,'max_casos_por_estudiante','15','Máximo casos activos por estudiante','int','2025-08-30 16:34:19.494'),(3,'email_notifications_enabled','true','Activar notificaciones por email','boolean','2025-08-30 16:34:19.494'),(4,'system_maintenance_mode','false','Modo mantenimiento del sistema','boolean','2025-08-30 16:34:19.494'),(5,'default_session_duration','60','Duración por defecto de sesión en minutos','int','2025-08-30 16:34:19.494');
/*!40000 ALTER TABLE `configuracion_sistema` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `especialidades_estudiante`
--

DROP TABLE IF EXISTS `especialidades_estudiante`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `especialidades_estudiante` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_estudiante` int NOT NULL,
  `especialidad` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clinica` enum('Clínica para el Niño y Adolescente','Clínica Integral Adulto y Gerontología') COLLATE utf8mb4_unicode_ci NOT NULL,
  `dia_semana` enum('lunes','martes','miercoles','jueves','viernes','sabado') COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `especialidades_estudiante`
--

LOCK TABLES `especialidades_estudiante` WRITE;
/*!40000 ALTER TABLE `especialidades_estudiante` DISABLE KEYS */;
INSERT INTO `especialidades_estudiante` VALUES (1,1,'Operatoria Dental','Clínica Integral Adulto y Gerontología','lunes','08:00:00','12:00:00',1,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(2,1,'Operatoria Dental','Clínica Integral Adulto y Gerontología','miercoles','14:00:00','18:00:00',1,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(3,2,'Endodoncia','Clínica Integral Adulto y Gerontología','martes','08:00:00','12:00:00',1,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(4,2,'Operatoria Dental','Clínica Integral Adulto y Gerontología','jueves','14:00:00','18:00:00',1,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(5,3,'Odontopediatría','Clínica para el Niño y Adolescente','lunes','14:00:00','18:00:00',2,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(6,3,'Odontopediatría','Clínica para el Niño y Adolescente','viernes','08:00:00','12:00:00',2,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(7,4,'Cirugía Oral','Clínica Integral Adulto y Gerontología','martes','14:00:00','18:00:00',1,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(8,4,'Implantología','Clínica Integral Adulto y Gerontología','sabado','08:00:00','12:00:00',1,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(9,5,'Periodoncia','Clínica Integral Adulto y Gerontología','miercoles','08:00:00','12:00:00',1,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(10,5,'Periodoncia','Clínica Integral Adulto y Gerontología','viernes','14:00:00','18:00:00',1,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(11,6,'Preventiva','Clínica para el Niño y Adolescente','lunes','08:00:00','12:00:00',3,1,'2025-08-30 20:30:21','2025-08-30 20:30:21'),(12,6,'Destartraje y Pulido Coronario','Clínica Integral Adulto y Gerontología','jueves','08:00:00','12:00:00',2,1,'2025-08-30 20:30:21','2025-08-30 20:30:21');
/*!40000 ALTER TABLE `especialidades_estudiante` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estudiantes_odontologia`
--

DROP TABLE IF EXISTS `estudiantes_odontologia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estudiantes_odontologia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo_estudiante` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre_completo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `año_carrera` enum('4to','5to') COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `universidad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Universidad Dental',
  `ciudad` enum('Metropolitana','Valparaíso','Concepción') COLLATE utf8mb4_unicode_ci NOT NULL,
  `especialidades` json DEFAULT NULL,
  `dias_disponibles` json DEFAULT NULL,
  `horarios_disponibles` json DEFAULT NULL,
  `casos_completados` int DEFAULT '0',
  `casos_necesarios` int DEFAULT '10',
  `casos_activos` int DEFAULT '0',
  `estado` enum('activo','completo','inactivo','suspendido') COLLATE utf8mb4_unicode_ci DEFAULT 'activo',
  `fecha_registro` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `fecha_actualizacion` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `ultimo_acceso` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `codigo_estudiante` (`codigo_estudiante`),
  KEY `idx_estado` (`estado`),
  KEY `idx_año_carrera` (`año_carrera`),
  KEY `idx_ciudad` (`ciudad`),
  KEY `idx_casos_activos` (`casos_activos`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estudiantes_odontologia`
--

LOCK TABLES `estudiantes_odontologia` WRITE;
/*!40000 ALTER TABLE `estudiantes_odontologia` DISABLE KEYS */;
INSERT INTO `estudiantes_odontologia` VALUES (1,'EST-001','María José García López','4to','300-123-4567','maria.garcia@universidad.edu','Universidad Dental','Metropolitana',NULL,NULL,NULL,3,10,2,'activo','2025-08-30 16:29:58.751','2025-08-30 16:29:58.751',NULL),(2,'EST-002','Carlos Eduardo Martínez Silva','5to','301-234-5678','carlos.martinez@universidad.edu','Universidad Dental','Valparaíso',NULL,NULL,NULL,5,8,1,'activo','2025-08-30 16:29:58.751','2025-08-30 16:29:58.751',NULL),(3,'EST-003','Ana Sofía Rodríguez Torres','4to','302-345-6789','ana.rodriguez@universidad.edu','Universidad Dental','Metropolitana',NULL,NULL,NULL,2,12,3,'activo','2025-08-30 16:29:58.751','2025-08-30 16:29:58.751',NULL),(4,'EST-004','Luis Fernando Herrera Vega','5to','303-456-7890','luis.herrera@universidad.edu','Universidad Dental','Concepción',NULL,NULL,NULL,8,6,0,'activo','2025-08-30 16:29:58.751','2025-08-30 16:29:58.751',NULL),(5,'EST-005','Isabella Torres Moreno','4to','304-567-8901','isabella.torres@universidad.edu','Universidad Dental','Metropolitana',NULL,NULL,NULL,4,10,2,'activo','2025-08-30 16:29:58.751','2025-08-30 16:29:58.751',NULL),(6,'EST-006','David Alejandro Ruiz Castro','5to','305-678-9012','david.ruiz@universidad.edu','Universidad Dental','Valparaíso',NULL,NULL,NULL,7,15,1,'activo','2025-08-30 16:29:58.751','2025-08-30 16:29:58.751',NULL);
/*!40000 ALTER TABLE `estudiantes_odontologia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logs_sistema`
--

DROP TABLE IF EXISTS `logs_sistema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs_sistema` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fecha` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `nivel` enum('INFO','WARNING','ERROR','DEBUG') COLLATE utf8mb4_unicode_ci NOT NULL,
  `modulo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci,
  `datos_adicionales` json DEFAULT NULL,
  `ip_origen` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_nivel` (`nivel`),
  KEY `idx_modulo` (`modulo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logs_sistema`
--

LOCK TABLES `logs_sistema` WRITE;
/*!40000 ALTER TABLE `logs_sistema` DISABLE KEYS */;
/*!40000 ALTER TABLE `logs_sistema` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones_email`
--

DROP TABLE IF EXISTS `notificaciones_email`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones_email` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_estudiante` int DEFAULT NULL,
  `id_paciente` int DEFAULT NULL,
  `email_destino` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_notificacion` enum('nuevo_paciente','codigo_acceso','recordatorio_cita','seguimiento_pendiente','caso_completado','sistema','asignacion_confirmada') COLLATE utf8mb4_unicode_ci NOT NULL,
  `asunto` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje_html` text COLLATE utf8mb4_unicode_ci,
  `enviado` tinyint(1) DEFAULT '0',
  `fecha_envio` datetime(3) DEFAULT NULL,
  `fecha_creacion` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `intentos_envio` int DEFAULT '0',
  `error_envio` text COLLATE utf8mb4_unicode_ci,
  `id_referencia` int DEFAULT NULL,
  `tipo_referencia` enum('asignacion','cita','tratamiento','codigo') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_id_estudiante` (`id_estudiante`),
  KEY `idx_id_paciente` (`id_paciente`),
  KEY `idx_enviado` (`enviado`),
  KEY `idx_tipo_notificacion` (`tipo_notificacion`),
  CONSTRAINT `notificaciones_email_id_estudiante_fkey` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE SET NULL,
  CONSTRAINT `notificaciones_email_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones_email`
--

LOCK TABLES `notificaciones_email` WRITE;
/*!40000 ALTER TABLE `notificaciones_email` DISABLE KEYS */;
/*!40000 ALTER TABLE `notificaciones_email` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pacientes`
--

DROP TABLE IF EXISTS `pacientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pacientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `nombre_completo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `edad` int DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciudad` enum('Metropolitana','Valparaíso','Concepción') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sintomas_seleccionados` json DEFAULT NULL,
  `diagnostico_previo` text COLLATE utf8mb4_unicode_ci,
  `tiempo_problema` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nivel_dolor` int DEFAULT '0',
  `dias_disponibles` text COLLATE utf8mb4_unicode_ci,
  `horario_preferencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disponibilidad_cita` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_tratamiento_inferido` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complejidad` enum('Básico','Intermedio','Avanzado') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prioridad` enum('Baja','Moderada','Alta','Muy Alta') COLLATE utf8mb4_unicode_ci DEFAULT 'Moderada',
  `fecha_registro` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `fecha_actualizacion` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `activo` tinyint(1) DEFAULT '1',
  `estudiante_asignado` int DEFAULT NULL,
  `estado` enum('pendiente','asignado','completado','cancelado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `fecha_asignacion` timestamp NULL DEFAULT NULL,
  `sheet_row_index` int DEFAULT NULL,
  `preferencias_horario` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_ciudad` (`ciudad`),
  KEY `idx_prioridad` (`prioridad`),
  KEY `idx_nivel_dolor` (`nivel_dolor`),
  KEY `idx_tipo_tratamiento` (`tipo_tratamiento_inferido`),
  KEY `idx_estado` (`estado`),
  KEY `fk_pacientes_estudiante` (`estudiante_asignado`),
  CONSTRAINT `fk_pacientes_estudiante` FOREIGN KEY (`estudiante_asignado`) REFERENCES `estudiantes_odontologia` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pacientes`
--

LOCK TABLES `pacientes` WRITE;
/*!40000 ALTER TABLE `pacientes` DISABLE KEYS */;
INSERT INTO `pacientes` VALUES (1,'2025-08-30 16:31:03.902','Juan Carlos Pérez González',35,'310-123-4567','juan.perez@email.com','Metropolitana',NULL,NULL,NULL,5,NULL,NULL,NULL,'Operatoria Dental','Intermedio','Moderada','2025-08-30 16:31:03.902','2025-08-30 16:31:03.902',1,NULL,'pendiente',NULL,NULL,NULL),(2,'2025-08-30 16:31:03.902','María Elena González Ruiz',28,'311-234-5678','maria.gonzalez@email.com','Valparaíso',NULL,NULL,NULL,8,NULL,NULL,NULL,'Endodoncia','Avanzado','Alta','2025-08-30 16:31:03.902','2025-08-30 16:31:03.902',1,NULL,'pendiente',NULL,NULL,NULL),(3,'2025-08-30 16:31:03.902','Pedro Antonio Silva López',42,'312-345-6789','pedro.silva@email.com','Concepción',NULL,NULL,NULL,2,NULL,NULL,NULL,'Periodoncia','Básico','Baja','2025-08-30 16:31:03.902','2025-08-30 16:31:03.902',1,NULL,'pendiente',NULL,NULL,NULL),(4,'2025-08-30 16:31:03.902','Ana Isabel Ramírez Torres',31,'313-456-7890','ana.ramirez@email.com','Metropolitana',NULL,NULL,NULL,1,NULL,NULL,NULL,'Preventiva','Básico','Baja','2025-08-30 16:31:03.902','2025-08-30 16:31:03.902',1,NULL,'pendiente',NULL,NULL,NULL),(5,'2025-08-30 16:31:03.902','Roberto Andrés López Martín',26,'314-567-8901','roberto.lopez@email.com','Valparaíso',NULL,NULL,NULL,3,NULL,NULL,NULL,'Destartraje y Pulido Coronario','Básico','Moderada','2025-08-30 16:31:03.902','2025-08-30 16:31:03.902',1,NULL,'pendiente',NULL,NULL,NULL),(6,'2025-08-30 16:31:03.902','Carmen Lucía Fernández Vega',38,'315-678-9012','carmen.fernandez@email.com','Metropolitana',NULL,NULL,NULL,7,NULL,NULL,NULL,'Cirugía Oral','Avanzado','Alta','2025-08-30 16:31:03.902','2025-08-30 16:31:03.902',1,NULL,'pendiente',NULL,NULL,NULL),(7,'2025-08-30 16:31:03.902','Diego Sebastián Morales Cruz',22,'316-789-0123','diego.morales@email.com','Concepción',NULL,NULL,NULL,4,NULL,NULL,NULL,'Operatoria Dental','Básico','Moderada','2025-08-30 16:31:03.902','2025-08-30 16:31:03.902',1,NULL,'pendiente',NULL,NULL,NULL),(8,'2025-08-30 16:31:03.902','Valentina Sofía Herrera Gil',8,'317-890-1234','valentina.herrera@email.com','Metropolitana',NULL,NULL,NULL,2,NULL,NULL,NULL,'Odontopediatría','Básico','Baja','2025-08-30 16:31:03.902','2025-08-30 16:31:03.902',1,NULL,'pendiente',NULL,NULL,NULL);
/*!40000 ALTER TABLE `pacientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_completo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','supervisor','coordinator') COLLATE utf8mb4_unicode_ci DEFAULT 'coordinator',
  `permissions` json DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `login_attempts` int DEFAULT '0',
  `locked_until` timestamp NULL DEFAULT NULL,
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `email_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@dentalmatching.com','$2b$10$dummy.hash.placeholder','Administrador Sistema','admin',NULL,NULL,0,NULL,'active',1,'2025-08-30 20:34:19','2025-08-30 20:34:19');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
--
-- Table structure for table `requerimientos_paciente`
--

DROP TABLE IF EXISTS `requerimientos_paciente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `requerimientos_paciente` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `especialidad_requerida` varchar(100) DEFAULT NULL,
  `clinica_preferida` varchar(100) DEFAULT NULL,
  `urgencia` varchar(20) DEFAULT NULL,
  `dias_disponibles` json DEFAULT NULL,
  `horarios_preferidos` json DEFAULT NULL,
  `notas_adicionales` text,
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_id_paciente` (`id_paciente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `requerimientos_paciente`
--

LOCK TABLES `requerimientos_paciente` WRITE;
/*!40000 ALTER TABLE `requerimientos_paciente` DISABLE KEYS */;
/*!40000 ALTER TABLE `requerimientos_paciente` ENABLE KEYS */;
UNLOCK TABLES;

/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-03 19:46:00
