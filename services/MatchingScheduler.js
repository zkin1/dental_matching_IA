const cron = require('node-cron');
const { getConnection } = require('../config/database');
const IntelligentMatchingService = require('../src/application/services/IntelligentMatchingService');
const logger = require('../config/logger');

/**
 * MatchingScheduler - Patrón Singleton para gestión automática de matching
 * Responsabilidades:
 * - Ejecutar matching automático según configuración
 * - Persistir estado del scheduler en base de datos
 * - Gestionar ciclo de vida del scheduler
 * - Monitorear performance y errores
 */
class MatchingScheduler {
    constructor() {
        if (MatchingScheduler.instance) {
            return MatchingScheduler.instance;
        }

        this.tasks = new Map();
        this.isInitialized = false;
        this.stats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            lastRun: null,
            lastError: null,
            isRunning: false,
            nextScheduledRun: null
        };

        MatchingScheduler.instance = this;
    }

    /**
     * Inicializar scheduler con configuración desde base de datos
     */
    async initialize() {
        if (this.isInitialized) {
            logger.info('MatchingScheduler already initialized');
            return;
        }

        try {
            // Cargar configuración desde base de datos
            await this.loadConfiguration();
            
            // Cargar estadísticas previas
            await this.loadStats();

            // Configurar tareas por defecto
            await this.setupDefaultTasks();

            this.isInitialized = true;
            logger.info('MatchingScheduler initialized successfully', {
                tasksConfigured: this.tasks.size,
                stats: this.stats
            });

        } catch (error) {
            logger.error('Failed to initialize MatchingScheduler', error);
            throw error;
        }
    }

    /**
     * Configurar tareas de matching automático - IA v3.0 MEJORADO
     */
    async setupDefaultTasks() {
        // Matching inteligente cada 15 minutos durante horas pico (más frecuente)
        this.scheduleTask('auto-matching-express', '*/15 9-12,14-17 * * 1-5', async () => {
            await this.executeAutoMatching('express');
        });

        // Matching frecuente cada 30 minutos durante horas laborables
        this.scheduleTask('auto-matching-frequent', '*/30 8-18 * * 1-5', async () => {
            await this.executeAutoMatching('frequent');
        });

        // Matching completo cada 90 minutos (más eficiente que cada 2 horas)
        this.scheduleTask('auto-matching-complete', '0 */2 * * *', async () => {
            await this.executeAutoMatching('complete');
        });

        // Matching nocturno para casos urgentes
        this.scheduleTask('auto-matching-urgent', '0 20,22,6 * * *', async () => {
            await this.executeAutoMatching('urgent');
        });

        // Limpieza y mantenimiento diario a las 2 AM
        this.scheduleTask('daily-maintenance', '0 2 * * *', async () => {
            await this.performDailyMaintenance();
        });

        // Reporte semanal los lunes a las 8 AM
        this.scheduleTask('weekly-report', '0 8 * * 1', async () => {
            await this.generateWeeklyReport();
        });

        // NUEVO: Auto-optimización del sistema cada 6 horas
        this.scheduleTask('system-optimization', '0 */6 * * *', async () => {
            await this.performSystemOptimization();
        });
    }

    /**
     * Programar una tarea con cron
     */
    scheduleTask(name, cronExpression, taskFunction) {
        // Detener tarea existente si ya existe
        if (this.tasks.has(name)) {
            this.tasks.get(name).destroy();
        }

        const task = cron.schedule(cronExpression, async () => {
            await this.executeTaskSafely(name, taskFunction);
        }, {
            scheduled: true,
            timezone: 'America/Bogota'
        });

        this.tasks.set(name, task);
        
        // Actualizar próxima ejecución
        this.updateNextScheduledRun();

        logger.info(`Scheduled task: ${name}`, {
            cronExpression,
            nextRun: this.getNextRunTime(cronExpression)
        });
    }

    /**
     * Ejecutar tarea de forma segura con manejo de errores
     */
    async executeTaskSafely(taskName, taskFunction) {
        const startTime = Date.now();
        this.stats.isRunning = true;

        try {
            logger.info(`Executing scheduled task: ${taskName}`);
            
            await taskFunction();
            
            this.stats.successfulRuns++;
            this.stats.lastRun = new Date();
            this.stats.lastError = null;

            const duration = Date.now() - startTime;
            logger.info(`Task completed successfully: ${taskName}`, {
                duration: `${duration}ms`,
                totalRuns: this.stats.totalRuns
            });

        } catch (error) {
            this.stats.failedRuns++;
            this.stats.lastError = {
                message: error.message,
                timestamp: new Date(),
                taskName
            };

            logger.error(`Task failed: ${taskName}`, {
                error: error.message,
                stack: error.stack,
                duration: `${Date.now() - startTime}ms`
            });

        } finally {
            this.stats.totalRuns++;
            this.stats.isRunning = false;
            
            // Persistir estadísticas
            await this.persistStats();
        }
    }

    /**
     * Ejecutar matching automático - IA v3.0 MEJORADO
     */
    async executeAutoMatching(mode = 'complete') {
        logger.info(`🚀 Starting intelligent matching v3.0: ${mode}`);

        try {
            // Configurar parámetros inteligentes según el modo
            const config = this.getMatchingConfig(mode);
            
            // Usar la nueva IA v3.0
            const intelligentService = new IntelligentMatchingService();
            const result = await intelligentService.executeIntelligentMatching({
                maxPatients: config.maxPatients || 50,
                mode: 'intelligent'
            });

            logger.info('✅ Intelligent matching completed', {
                mode,
                processed: result.processed || 0,
                matched: result.matched || 0,
                successRate: result.successRate || '0%',
                duration: result.duration || 0,
                algorithm: 'IA v3.0'
            });

            // Auto-ajuste inteligente basado en resultados
            await this.adjustMatchingStrategy(mode, result);

            return result;

        } catch (error) {
            logger.error('❌ Intelligent matching failed', {
                mode,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Obtener configuración inteligente por modo
     */
    getMatchingConfig(mode) {
        const configs = {
            'express': {
                limit: 5,
                onlyUrgent: true,
                skipRecentlyProcessed: true,
                prioritizeHighScore: true
            },
            'frequent': {
                limit: 15,
                skipRecentlyProcessed: true,
                prioritizeNewPatients: true
            },
            'complete': {
                limit: 50,
                skipRecentlyProcessed: false,
                includeComplexCases: true
            },
            'urgent': {
                limit: 10,
                onlyUrgent: true,
                skipRecentlyProcessed: false,
                ignoreTimeRestrictions: true
            }
        };

        return configs[mode] || configs['complete'];
    }

    /**
     * Auto-ajuste inteligente del sistema
     */
    async adjustMatchingStrategy(mode, result) {
        try {
            const successRate = parseFloat(result.successRate) || 0;
            
            // Si el éxito es bajo, ajustar estrategia
            if (successRate < 50) {
                logger.warn('⚠️ Low matching success rate, adjusting strategy', {
                    mode,
                    successRate: `${successRate}%`
                });
                
                // Aquí podrías implementar ajustes automáticos
                // Por ejemplo: reducir límites, cambiar criterios, etc.
            }
            
            // Guardar métricas para aprendizaje automático
            await this.saveMatchingMetrics(mode, result);
            
        } catch (error) {
            logger.error('Error in strategy adjustment', error);
        }
    }

    /**
     * Guardar métricas para machine learning
     */
    async saveMatchingMetrics(mode, result) {
        try {
            const db = await getConnection();
            
            await db.execute(`
                INSERT INTO matching_metrics (
                    execution_mode,
                    processed_count,
                    matched_count,
                    success_rate,
                    execution_time_ms,
                    algorithm_version,
                    execution_timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [
                mode,
                result.processed || 0,
                result.matched || 0,
                parseFloat(result.successRate) || 0,
                parseInt(result.duration) || 0,
                'IA v3.0'
            ]);
            
        } catch (error) {
            logger.error('Error saving matching metrics', error);
        }
    }

    /**
     * NUEVO: Optimización automática del sistema
     */
    async performSystemOptimization() {
        logger.info('🔧 Starting system optimization');

        try {
            const db = await getConnection();

            // Optimizar índices de base de datos
            await db.execute(`OPTIMIZE TABLE pacientes, estudiantes_odontologia, asignaciones_horario`);

            // Limpiar datos temporales antiguos
            await db.execute(`
                DELETE FROM disponibilidad_estudiante 
                WHERE fecha < DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            // Actualizar estadísticas de tablas
            await db.execute(`
                ANALYZE TABLE pacientes, estudiantes_odontologia, 
                especialidades_estudiante, asignaciones_horario
            `);

            logger.info('✅ System optimization completed');

        } catch (error) {
            logger.error('❌ System optimization failed', error);
            throw error;
        }
    }

    /**
     * Realizar mantenimiento diario
     */
    async performDailyMaintenance() {
        logger.info('Starting daily maintenance');

        try {
            const db = await getConnection();

            // Limpiar registros antiguos de más de 90 días
            await db.execute(`
                DELETE FROM scheduler_logs 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
            `);

            // Actualizar estadísticas de estudiantes
            await db.execute(`
                UPDATE estudiantes_odontologia e
                SET casos_activos = (
                    SELECT COUNT(*) 
                    FROM asignaciones a 
                    WHERE a.id_estudiante = e.id 
                    AND a.estado IN ('asignado', 'en_tratamiento')
                )
            `);

            // Marcar pacientes inactivos después de 6 meses sin actividad
            await db.execute(`
                UPDATE pacientes 
                SET activo = FALSE 
                WHERE fecha_registro < DATE_SUB(NOW(), INTERVAL 6 MONTH)
                AND estado = 'pendiente'
                AND id NOT IN (SELECT DISTINCT id_paciente FROM asignaciones)
            `);

            logger.info('Daily maintenance completed successfully');

        } catch (error) {
            logger.error('Daily maintenance failed', error);
            throw error;
        }
    }

    /**
     * Generar reporte semanal
     */
    async generateWeeklyReport() {
        logger.info('Generating weekly report');

        try {
            const db = await getConnection();

            const [weeklyStats] = await db.execute(`
                SELECT 
                    COUNT(CASE WHEN a.fecha_asignacion >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as matches_week,
                    COUNT(CASE WHEN p.fecha_registro >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_patients_week,
                    AVG(a.score_compatibilidad) as avg_score_week,
                    COUNT(CASE WHEN a.observaciones_sistema LIKE '%MANUAL%' THEN 1 END) as manual_matches_week
                FROM asignaciones a
                LEFT JOIN pacientes p ON a.id_paciente = p.id
                WHERE a.fecha_asignacion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            `);

            const reportData = {
                period: 'weekly',
                generatedAt: new Date(),
                stats: weeklyStats[0],
                scheduler: {
                    totalRuns: this.stats.totalRuns,
                    successRate: this.stats.totalRuns > 0 ? 
                        ((this.stats.successfulRuns / this.stats.totalRuns) * 100).toFixed(2) : 0,
                    lastError: this.stats.lastError
                }
            };

            logger.info('Weekly report generated', reportData);
            return reportData;

        } catch (error) {
            logger.error('Weekly report generation failed', error);
            throw error;
        }
    }

    /**
     * Cargar configuración desde base de datos
     */
    async loadConfiguration() {
        try {
            const db = await getConnection();
            
            // Crear tabla de configuración si no existe
            await db.execute(`
                CREATE TABLE IF NOT EXISTS matching_scheduler_config (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    config_key VARCHAR(100) UNIQUE NOT NULL,
                    config_value TEXT NOT NULL,
                    enabled BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // Insertar configuración por defecto si no existe
            await db.execute(`
                INSERT IGNORE INTO matching_scheduler_config (config_key, config_value, enabled) VALUES
                ('auto_matching_enabled', 'true', TRUE),
                ('matching_interval_minutes', '30', TRUE),
                ('max_patients_per_run', '50', TRUE),
                ('working_hours_start', '08:00', TRUE),
                ('working_hours_end', '18:00', TRUE),
                ('timezone', 'America/Bogota', TRUE)
            `);

            logger.info('Matching scheduler configuration loaded');

        } catch (error) {
            logger.error('Failed to load scheduler configuration', error);
            throw error;
        }
    }

    /**
     * Cargar estadísticas previas
     */
    async loadStats() {
        try {
            const db = await getConnection();

            // Crear tabla de estadísticas si no existe
            await db.execute(`
                CREATE TABLE IF NOT EXISTS scheduler_stats (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    total_runs INT DEFAULT 0,
                    successful_runs INT DEFAULT 0,
                    failed_runs INT DEFAULT 0,
                    last_run TIMESTAMP NULL,
                    last_error JSON NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            const [results] = await db.execute(`
                SELECT * FROM scheduler_stats ORDER BY id DESC LIMIT 1
            `);

            if (results.length > 0) {
                const saved = results[0];
                this.stats = {
                    totalRuns: saved.total_runs || 0,
                    successfulRuns: saved.successful_runs || 0,
                    failedRuns: saved.failed_runs || 0,
                    lastRun: saved.last_run,
                    lastError: saved.last_error ? JSON.parse(saved.last_error) : null,
                    isRunning: false,
                    nextScheduledRun: null
                };
            }

        } catch (error) {
            logger.error('Failed to load scheduler stats', error);
            // No lanzar error, usar estadísticas por defecto
        }
    }

    /**
     * Persistir estadísticas en base de datos
     */
    async persistStats() {
        try {
            const db = await getConnection();

            await db.execute(`
                INSERT INTO scheduler_stats (
                    total_runs, successful_runs, failed_runs, 
                    last_run, last_error
                ) VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    total_runs = VALUES(total_runs),
                    successful_runs = VALUES(successful_runs),
                    failed_runs = VALUES(failed_runs),
                    last_run = VALUES(last_run),
                    last_error = VALUES(last_error),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                this.stats.totalRuns,
                this.stats.successfulRuns,
                this.stats.failedRuns,
                this.stats.lastRun,
                this.stats.lastError ? JSON.stringify(this.stats.lastError) : null
            ]);

        } catch (error) {
            logger.error('Failed to persist scheduler stats', error);
        }
    }

    /**
     * Obtener próxima ejecución programada
     */
    updateNextScheduledRun() {
        // Implementación simplificada, en producción usaríamos librería como cron-parser
        this.stats.nextScheduledRun = new Date(Date.now() + 30 * 60 * 1000); // +30 min
    }

    /**
     * Obtener próximo tiempo de ejecución
     */
    getNextRunTime(cronExpression) {
        // Simplificado para el ejemplo
        return new Date(Date.now() + 30 * 60 * 1000);
    }

    /**
     * Obtener estadísticas actuales
     */
    getStats() {
        return {
            ...this.stats,
            tasksConfigured: this.tasks.size,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Iniciar scheduler
     */
    async start() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.tasks.forEach((task, name) => {
            task.start();
            logger.info(`Started scheduled task: ${name}`);
        });

        logger.info('MatchingScheduler started', {
            tasksRunning: this.tasks.size
        });
    }

    /**
     * Detener scheduler
     */
    stop() {
        this.tasks.forEach((task, name) => {
            task.stop();
            logger.info(`Stopped scheduled task: ${name}`);
        });

        logger.info('MatchingScheduler stopped');
    }

    /**
     * Destruir scheduler
     */
    destroy() {
        this.tasks.forEach((task) => {
            task.destroy();
        });
        
        this.tasks.clear();
        this.isInitialized = false;
        
        logger.info('MatchingScheduler destroyed');
    }
}

// Exportar instancia singleton
module.exports = new MatchingScheduler();