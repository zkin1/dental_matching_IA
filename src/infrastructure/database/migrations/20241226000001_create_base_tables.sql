-- Migration: Create base tables for dental matching system
-- Created: 2024-12-26
-- Version: 20241226000001

-- Create pacientes table
CREATE TABLE IF NOT EXISTS pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    edad INT,
    tipo_tratamiento VARCHAR(100),
    descripcion_caso TEXT,
    urgencia ENUM('baja', 'media', 'alta') DEFAULT 'media',
    historial_medico JSON,
    status ENUM('pendiente', 'asignado', 'en_tratamiento', 'completado', 'cancelado') DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_tipo_tratamiento (tipo_tratamiento),
    INDEX idx_status (status),
    INDEX idx_urgencia (urgencia),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Create estudiantes table
CREATE TABLE IF NOT EXISTS estudiantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    semestre INT NOT NULL,
    especialidades JSON,
    experiencia_previa JSON,
    disponibilidad JSON,
    calificacion_promedio DECIMAL(3,2) DEFAULT 0.00,
    casos_completados INT DEFAULT 0,
    status ENUM('activo', 'inactivo', 'graduado') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_semestre (semestre),
    INDEX idx_status (status),
    INDEX idx_calificacion (calificacion_promedio),
    INDEX idx_casos_completados (casos_completados)
) ENGINE=InnoDB;

-- Create asignaciones table
CREATE TABLE IF NOT EXISTS asignaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    supervisor_id INT NULL,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_inicio TIMESTAMP NULL,
    fecha_fin TIMESTAMP NULL,
    status ENUM('pendiente', 'aceptada', 'en_progreso', 'completada', 'cancelada') DEFAULT 'pendiente',
    notas TEXT,
    evaluacion_final JSON,
    calificacion INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_paciente_id (paciente_id),
    INDEX idx_estudiante_id (estudiante_id),
    INDEX idx_supervisor_id (supervisor_id),
    INDEX idx_status (status),
    INDEX idx_fecha_asignacion (fecha_asignacion),
    
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create ai_matching_results table
CREATE TABLE IF NOT EXISTS ai_matching_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    score DECIMAL(5,4) NOT NULL,
    algoritmo VARCHAR(50) NOT NULL,
    factores_matching JSON,
    confianza DECIMAL(3,2),
    recomendacion TEXT,
    procesado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usado_en_asignacion BOOLEAN DEFAULT FALSE,
    
    INDEX idx_paciente_id (paciente_id),
    INDEX idx_estudiante_id (estudiante_id),
    INDEX idx_score (score),
    INDEX idx_algoritmo (algoritmo),
    INDEX idx_procesado_en (procesado_en),
    INDEX idx_usado (usado_en_asignacion),
    
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_matching (paciente_id, estudiante_id, algoritmo)
) ENGINE=InnoDB;

-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('debug', 'info', 'warn', 'error', 'fatal') NOT NULL,
    message TEXT NOT NULL,
    context JSON,
    user_id INT NULL,
    request_id VARCHAR(36) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_level (level),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id),
    INDEX idx_request_id (request_id),
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB;

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    role ENUM('admin', 'supervisor', 'coordinator') DEFAULT 'coordinator',
    permissions JSON,
    last_login TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_last_login (last_login)
) ENGINE=InnoDB;

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP NULL,
    revoked BOOLEAN DEFAULT FALSE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_revoked (revoked),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(20),
    tags JSON,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_metric_name (metric_name),
    INDEX idx_recorded_at (recorded_at),
    INDEX idx_metric_value (metric_value)
) ENGINE=InnoDB;

-- Insert default admin user (password should be changed immediately)
INSERT IGNORE INTO users (email, password, nombre_completo, role, permissions, status, email_verified) 
VALUES (
    'admin@dentalmatching.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeQ0+4XjV4HJVH.8e', -- 'admin123' - CHANGE THIS!
    'Administrador Sistema',
    'admin',
    '["read", "write", "delete", "manage_users", "manage_system"]',
    'active',
    TRUE
);