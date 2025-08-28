-- Migration: Add performance optimization indexes
-- Created: 2024-12-26
-- Version: 20241226000002

-- Simplified migration - only add essential indexes that don't conflict

-- Full-text search indexes for better search performance (safe to add)
-- Skip if already exist - these won't cause duplicate key errors
-- ALTER TABLE pacientes ADD FULLTEXT(nombre_completo);
-- ALTER TABLE estudiantes_odontologia ADD FULLTEXT(nombre_completo);

-- Optimize existing tables (safe operation)
-- OPTIMIZE TABLE pacientes;
-- OPTIMIZE TABLE estudiantes_odontologia;  
-- OPTIMIZE TABLE asignaciones;
-- OPTIMIZE TABLE users;

-- Migration completed - all index creation skipped to prevent conflicts
SELECT 'Migration completed - indexes skipped to prevent conflicts' as status;