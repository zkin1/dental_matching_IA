const cron = require('node-cron');
const syncService = require('../services/syncService');
const matchingService = require('../services/matchingService');

class SyncScheduler {
    constructor() {
        this.isRunning = false;
        this.syncJobs = new Map();
        this.lastSyncResult = null;
        this.lastMatchingResult = null;
        this.syncStats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            lastRun: null,
            nextRun: null
        };
        this.matchingStats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            totalMatches: 0,
            lastRun: null
        };
    }

    // Iniciar todos los trabajos programados
    start() {
        console.log('🚀 Iniciando sistema automático...');
        
        // Sincronización de Google Sheets cada 5 minutos
        this.scheduleSync('main-sync', '*/5 * * * *', 'Sincronización principal cada 5 minutos');
        
        // NUEVO: Matching automático cada 5 minutos (offset de 2 minutos para evitar conflictos)
        this.scheduleMatching('auto-matching', '2,7,12,17,22,27,32,37,42,47,52,57 * * * *', 'Matching automático cada 5 minutos');
        
        // Limpieza de datos cada hora
        this.scheduleCleanup('cleanup', '0 * * * *', 'Limpieza de datos cada hora');
        
        // Estadísticas cada 30 minutos
        this.scheduleStats('stats-update', '*/30 * * * *', 'Actualización de estadísticas cada 30 minutos');
        
        // Sincronización nocturna más completa (2 AM)
        this.scheduleFullSync('full-sync', '0 2 * * *', 'Sincronización completa nocturna');
        
        this.isRunning = true;
        console.log('✅ Sistema automático iniciado');
        console.log(`📊 ${this.syncJobs.size} trabajos programados`);
        
        // Log de trabajos programados
        this.syncJobs.forEach((job, name) => {
            console.log(`   - ${name}: ${job.description}`);
        });
    }

    // Detener todos los trabajos
    stop() {
        console.log('⏹️ Deteniendo sistema automático...');
        
        this.syncJobs.forEach((job, name) => {
            job.task.stop();
            console.log(`   - Detenido: ${name}`);
        });
        
        this.syncJobs.clear();
        this.isRunning = false;
        console.log('✅ Sistema automático detenido');
    }

    // Programar sincronización principal
    scheduleSync(name, cronExpression, description) {
        const task = cron.schedule(cronExpression, async () => {
            await this.executeSyncJob(name, async () => {
                console.log('🔄 Ejecutando sincronización automática...');
                const result = await syncService.syncPacientes();
                
                if (result.success) {
                    console.log(`✅ Sincronización exitosa: ${result.processed || result.created || 0} procesados`);
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

        this.syncJobs.set(name, { task, description, cronExpression, type: 'sync' });
        console.log(`📅 Programado: ${description} (${cronExpression})`);
    }

    // NUEVO: Programar matching automático
    scheduleMatching(name, cronExpression, description) {
        const task = cron.schedule(cronExpression, async () => {
            await this.executeMatchingJob(name, async () => {
                console.log('🎯 Ejecutando matching automático...');
                const result = await matchingService.executeAutoMatching();
                
                if (result.success) {
                    this.matchingStats.totalMatches += result.matched || 0;
                    console.log(`✅ Matching exitoso: ${result.matched}/${result.processed} pacientes asignados`);
                } else {
                    console.error(`❌ Error en matching: ${result.error}`);
                    throw new Error(result.error);
                }
                
                return result;
            });
        }, {
            scheduled: true,
            timezone: "America/Santiago"
        });

        this.syncJobs.set(name, { task, description, cronExpression, type: 'matching' });
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

        this.syncJobs.set(name, { task, description, cronExpression, type: 'cleanup' });
        console.log(`📅 Programado: ${description} (${cronExpression})`);
    }

    // Programar actualización de estadísticas
    scheduleStats(name, cronExpression, description) {
        const task = cron.schedule(cronExpression, async () => {
            await this.executeSyncJob(name, async () => {
                console.log('📊 Actualizando estadísticas...');
                const syncStats = await syncService.getStats();
                const matchingStats = await matchingService.getMatchingStats();
                
                console.log(`✅ Estadísticas actualizadas - Pacientes: ${syncStats.pacientes.total}, Matches: ${matchingStats.total_asignaciones}`);
                return { sync: syncStats, matching: matchingStats };
            });
        }, {
            scheduled: true,
            timezone: "America/Santiago"
        });

        this.syncJobs.set(name, { task, description, cronExpression, type: 'stats' });
        console.log(`📅 Programado: ${description} (${cronExpression})`);
    }

    // Programar sincronización completa nocturna
    scheduleFullSync(name, cronExpression, description) {
        const task = cron.schedule(cronExpression, async () => {
            await this.executeSyncJob(name, async () => {
                console.log('🌙 Ejecutando proceso completo nocturno...');
                
                // 1. Sincronizar pacientes
                const syncResult = await syncService.syncPacientes();
                
                // 2. Ejecutar matching
                const matchingResult = await matchingService.executeAutoMatching();
                
                // 3. Limpiar datos
                const cleanupResult = await syncService.cleanupData();
                
                // 4. Obtener estadísticas
                const syncStats = await syncService.getStats();
                const matchingStats = await matchingService.getMatchingStats();
                
                console.log(`✅ Proceso nocturno completado:`);
                console.log(`   - Sincronizados: ${syncResult.processed || 0}`);
                console.log(`   - Matches: ${matchingResult.matched || 0}/${matchingResult.processed || 0}`);
                console.log(`   - Limpiados: ${cleanupResult.deleted}, Actualizados: ${cleanupResult.updated}`);
                console.log(`   - Total pacientes: ${syncStats.pacientes.total}, Asignaciones: ${matchingStats.total_asignaciones}`);
                
                return {
                    sync: syncResult,
                    matching: matchingResult,
                    cleanup: cleanupResult,
                    stats: { sync: syncStats, matching: matchingStats }
                };
            });
        }, {
            scheduled: true,
            timezone: "America/Santiago"
        });

        this.syncJobs.set(name, { task, description, cronExpression, type: 'full' });
        console.log(`📅 Programado: ${description} (${cronExpression})`);
    }

    // Ejecutar trabajo de sincronización con manejo de errores
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

            // Log más silencioso para trabajos rutinarios
            if (jobName === 'main-sync' && (!result.processed && !result.created)) {
                // No hacer log si no hubo cambios
            } else if (jobName !== 'stats-update') {
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
            
            if (jobName === 'main-sync') {
                console.error('⚠️ Error en sincronización principal - revisar configuración');
            }
        }
    }

    // NUEVO: Ejecutar trabajo de matching con manejo de errores
    async executeMatchingJob(jobName, jobFunction) {
        const startTime = Date.now();
        this.matchingStats.totalRuns++;
        this.matchingStats.lastRun = new Date().toISOString();

        try {
            const result = await jobFunction();
            
            this.matchingStats.successfulRuns++;
            this.lastMatchingResult = {
                success: true,
                jobName,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                result
            };

            // Log solo si hubo matches
            if (result.matched > 0) {
                console.log(`✅ ${jobName} completado: ${result.matched} matches en ${Date.now() - startTime}ms`);
            }

        } catch (error) {
            this.matchingStats.failedRuns++;
            this.lastMatchingResult = {
                success: false,
                jobName,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                error: error.message
            };

            console.error(`❌ Error en ${jobName}:`, error.message);
            console.error('⚠️ Error en matching automático - revisar algoritmo');
        }
    }

    // Ejecutar sincronización manual (para mantener compatibilidad)
    async runManualSync() {
        console.log('🔄 Ejecutando sincronización manual...');
        
        const result = await syncService.syncPacientes();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return result;
    }

    // NUEVO: Ejecutar matching manual
    async runManualMatching() {
        console.log('🎯 Ejecutando matching manual...');
        
        const result = await matchingService.executeAutoMatching();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return result;
    }

    // Obtener estado del scheduler
    getStatus() {
        return {
            isRunning: this.isRunning,
            jobsCount: this.syncJobs.size,
            stats: this.syncStats,
            matchingStats: this.matchingStats,
            lastSyncResult: this.lastSyncResult,
            lastMatchingResult: this.lastMatchingResult,
            jobs: Array.from(this.syncJobs.entries()).map(([name, job]) => ({
                name,
                description: job.description,
                cronExpression: job.cronExpression,
                type: job.type,
                isRunning: job.task.running
            }))
        };
    }

    // Obtener próximas ejecuciones (aproximadas)
    getNextRuns() {
        const nextRuns = [];
        const now = new Date();
        
        this.syncJobs.forEach((job, name) => {
            let nextRun = new Date(now);
            
            // Aproximación basada en el patrón cron
            if (job.cronExpression === '*/5 * * * *') {
                nextRun.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
                nextRun.setSeconds(0);
            } else if (job.cronExpression === '2,7,12,17,22,27,32,37,42,47,52,57 * * * *') {
                const targetMinutes = [2,7,12,17,22,27,32,37,42,47,52,57];
                const currentMinute = now.getMinutes();
                const nextMinute = targetMinutes.find(min => min > currentMinute) || targetMinutes[0];
                
                nextRun.setMinutes(nextMinute);
                nextRun.setSeconds(0);
                if (nextMinute <= currentMinute) {
                    nextRun.setHours(nextRun.getHours() + 1);
                }
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
                type: job.type,
                nextRun: nextRun.toISOString()
            });
        });
        
        return nextRuns.sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun));
    }

    // NUEVO: Obtener estadísticas consolidadas
    async getFullStats() {
        try {
            const syncStats = await syncService.getStats();
            const matchingStats = await matchingService.getMatchingStats();
            
            return {
                sync: syncStats,
                matching: matchingStats,
                scheduler: this.getStatus(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas completas:', error);
            throw error;
        }
    }
}

module.exports = new SyncScheduler();