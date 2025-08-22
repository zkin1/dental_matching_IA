const cron = require('node-cron');
const syncService = require('../services/syncService');

class SyncScheduler {
    constructor() {
        this.isRunning = false;
        this.syncJobs = new Map();
        this.lastSyncResult = null;
        this.syncStats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            lastRun: null,
            nextRun: null
        };
    }

    // Iniciar todos los trabajos programados
    start() {
        console.log('🚀 Iniciando sincronización automática...');
        
        // Sincronización cada 5 minutos (puedes ajustar según necesites)
        this.scheduleSync('main-sync', '*/5 * * * *', 'Sincronización principal cada 5 minutos');
        
        // Limpieza de datos cada hora
        this.scheduleCleanup('cleanup', '0 * * * *', 'Limpieza de datos cada hora');
        
        // Estadísticas cada 30 minutos
        this.scheduleStats('stats-update', '*/30 * * * *', 'Actualización de estadísticas cada 30 minutos');
        
        // Sincronización nocturna más completa (2 AM)
        this.scheduleFullSync('full-sync', '0 2 * * *', 'Sincronización completa nocturna');
        
        this.isRunning = true;
        console.log('✅ Sincronización automática iniciada');
        console.log(`📊 ${this.syncJobs.size} trabajos programados`);
        
        // Log de trabajos programados
        this.syncJobs.forEach((job, name) => {
            console.log(`   - ${name}: ${job.description}`);
        });
    }

    // Detener todos los trabajos
    stop() {
        console.log('⏹️ Deteniendo sincronización automática...');
        
        this.syncJobs.forEach((job, name) => {
            job.task.stop();
            console.log(`   - Detenido: ${name}`);
        });
        
        this.syncJobs.clear();
        this.isRunning = false;
        console.log('✅ Sincronización automática detenida');
    }

    // Programar sincronización principal
    scheduleSync(name, cronExpression, description) {
        const task = cron.schedule(cronExpression, async () => {
            await this.executeSyncJob(name, async () => {
                console.log('🔄 Ejecutando sincronización automática...');
                const result = await syncService.syncPacientes();
                
                if (result.success) {
                    console.log(`✅ Sincronización exitosa: ${result.processed} procesados, ${result.errors || 0} errores`);
                } else {
                    console.error(`❌ Error en sincronización: ${result.error}`);
                    throw new Error(result.error);
                }
                
                return result;
            });
        }, {
            scheduled: true,
            timezone: "America/Santiago"
        });

        this.syncJobs.set(name, { task, description, cronExpression });
        console.log(`📅 Programado: ${description} (${cronExpression})`);
    }

    // Programar limpieza de datos
    scheduleCleanup(name, cronExpression, description) {
        const task = cron.schedule(cronExpression, async () => {
            await this.executeSyncJob(name, async () => {
                console.log('🧹 Ejecutando limpieza automática de datos...');
                const result = await syncService.cleanupData();
                
                console.log(`✅ Limpieza completada: ${result.deleted} eliminados, ${result.updated} actualizados`);
                return result;
            });
        }, {
            scheduled: true,
            timezone: "America/Santiago"
        });

        this.syncJobs.set(name, { task, description, cronExpression });
        console.log(`📅 Programado: ${description} (${cronExpression})`);
    }

    // Programar actualización de estadísticas
    scheduleStats(name, cronExpression, description) {
        const task = cron.schedule(cronExpression, async () => {
            await this.executeSyncJob(name, async () => {
                console.log('📊 Actualizando estadísticas...');
                const stats = await syncService.getStats();
                
                console.log(`✅ Estadísticas actualizadas - Pacientes: ${stats.pacientes.total}, Estudiantes: ${stats.estudiantes.total}`);
                return stats;
            });
        }, {
            scheduled: true,
            timezone: "America/Santiago"
        });

        this.syncJobs.set(name, { task, description, cronExpression });
        console.log(`📅 Programado: ${description} (${cronExpression})`);
    }

    // Programar sincronización completa nocturna
    scheduleFullSync(name, cronExpression, description) {
        const task = cron.schedule(cronExpression, async () => {
            await this.executeSyncJob(name, async () => {
                console.log('🌙 Ejecutando sincronización completa nocturna...');
                
                // Primero sincronizar
                const syncResult = await syncService.syncPacientes();
                
                // Luego limpiar datos
                const cleanupResult = await syncService.cleanupData();
                
                // Finalmente obtener estadísticas
                const stats = await syncService.getStats();
                
                console.log(`✅ Sincronización nocturna completada:`);
                console.log(`   - Procesados: ${syncResult.processed}, Errores: ${syncResult.errors || 0}`);
                console.log(`   - Limpiados: ${cleanupResult.deleted}, Actualizados: ${cleanupResult.updated}`);
                console.log(`   - Total pacientes: ${stats.pacientes.total}, Estudiantes: ${stats.estudiantes.total}`);
                
                return {
                    sync: syncResult,
                    cleanup: cleanupResult,
                    stats: stats
                };
            });
        }, {
            scheduled: true,
            timezone: "America/Santiago"
        });

        this.syncJobs.set(name, { task, description, cronExpression });
        console.log(`📅 Programado: ${description} (${cronExpression})`);
    }

    // Ejecutar trabajo con manejo de errores y estadísticas
    async executeSyncJob(jobName, jobFunction) {
        const startTime = Date.now();
        this.syncStats.totalRuns++;
        this.syncStats.lastRun = new Date().toISOString();

        try {
            const result = await jobFunction();
            
            this.syncStats.successfulRuns++;
            this.lastSyncResult = {
                success: true,
                jobName,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                result
            };

            // Log exitoso más detallado solo para sincronización principal
            if (jobName === 'main-sync') {
                console.log(`✅ ${jobName} completado en ${Date.now() - startTime}ms`);
            }

        } catch (error) {
            this.syncStats.failedRuns++;
            this.lastSyncResult = {
                success: false,
                jobName,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                error: error.message
            };

            console.error(`❌ Error en ${jobName}:`, error.message);
            
            // Aquí podrías agregar notificaciones por email/Slack en caso de errores críticos
            if (jobName === 'main-sync') {
                console.error('⚠️ Error en sincronización principal - revisar configuración');
            }
        }
    }

    // Ejecutar sincronización manual (para mantener compatibilidad)
    async runManualSync() {
        console.log('🔄 Ejecutando sincronización manual...');
        
        return await this.executeSyncJob('manual-sync', async () => {
            const result = await syncService.syncPacientes();
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            return result;
        });
    }

    // Obtener estado del scheduler
    getStatus() {
        return {
            isRunning: this.isRunning,
            jobsCount: this.syncJobs.size,
            stats: this.syncStats,
            lastResult: this.lastSyncResult,
            jobs: Array.from(this.syncJobs.entries()).map(([name, job]) => ({
                name,
                description: job.description,
                cronExpression: job.cronExpression,
                isRunning: job.task.running
            }))
        };
    }

    // Obtener próximas ejecuciones (aproximadas)
    getNextRuns() {
        const nextRuns = [];
        const now = new Date();
        
        this.syncJobs.forEach((job, name) => {
            // Esto es una aproximación, node-cron no expone directamente el próximo run
            let nextRun = new Date(now);
            
            // Aproximación basada en el patrón cron
            if (job.cronExpression === '*/5 * * * *') {
                nextRun.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
                nextRun.setSeconds(0);
            } else if (job.cronExpression === '0 * * * *') {
                nextRun.setHours(now.getHours() + 1);
                nextRun.setMinutes(0);
                nextRun.setSeconds(0);
            } else if (job.cronExpression === '*/30 * * * *') {
                nextRun.setMinutes(Math.ceil(now.getMinutes() / 30) * 30);
                nextRun.setSeconds(0);
            } else if (job.cronExpression === '0 2 * * *') {
                nextRun.setDate(now.getDate() + 1);
                nextRun.setHours(2);
                nextRun.setMinutes(0);
                nextRun.setSeconds(0);
            }
            
            nextRuns.push({
                job: name,
                nextRun: nextRun.toISOString()
            });
        });
        
        return nextRuns.sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun));
    }
}

module.exports = new SyncScheduler();