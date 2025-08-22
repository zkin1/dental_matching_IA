const express = require('express');
const router = express.Router();
const syncService = require('../services/syncService');
const syncScheduler = require('../schedulers/syncScheduler');

// Sincronizar pacientes desde Google Sheets (MANUAL)
router.post('/pacientes', async (req, res) => {
    try {
        console.log('🔄 Sincronización manual iniciada por usuario');
        const result = await syncScheduler.runManualSync();
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message || 'Sincronización manual exitosa',
                data: {
                    processed: result.processed || 0,
                    created: result.created || 0,
                    updated: result.updated || 0,
                    skipped: result.skipped || 0,
                    errors: result.errors || 0,
                    duration: result.duration || 0
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error
            });
        }
    } catch (error) {
        console.error('❌ Error en endpoint de sincronización:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Obtener estado de sincronización
router.get('/status', async (req, res) => {
    try {
        const pacientes = await syncService.getPacientesFromDB();
        const estudiantes = await syncService.getEstudiantesFromDB();
        const schedulerStatus = syncScheduler.getStatus();
        
        res.json({
            success: true,
            data: {
                totalPacientes: pacientes.length,
                pacientesPendientes: pacientes.filter(p => p.estado === 'pendiente').length,
                pacientesAsignados: pacientes.filter(p => p.estado === 'asignado').length,
                totalEstudiantes: estudiantes.length,
                ultimaActualizacion: new Date().toISOString(),
                // Información del scheduler automático
                autoSync: {
                    isRunning: schedulerStatus.isRunning,
                    totalRuns: schedulerStatus.stats.totalRuns,
                    successfulRuns: schedulerStatus.stats.successfulRuns,
                    failedRuns: schedulerStatus.stats.failedRuns,
                    lastSync: schedulerStatus.stats.lastRun,
                    lastResult: schedulerStatus.lastResult
                }
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo estado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Obtener estadísticas detalladas del scheduler
router.get('/scheduler', async (req, res) => {
    try {
        const status = syncScheduler.getStatus();
        const nextRuns = syncScheduler.getNextRuns();
        
        res.json({
            success: true,
            data: {
                scheduler: status,
                nextRuns: nextRuns
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo estado del scheduler:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Control del scheduler
router.post('/scheduler/:action', async (req, res) => {
    try {
        const { action } = req.params;
        let result;
        
        switch (action) {
            case 'start':
                if (!syncScheduler.getStatus().isRunning) {
                    syncScheduler.start();
                    result = { message: 'Scheduler automático iniciado' };
                } else {
                    result = { message: 'Scheduler ya está ejecutándose' };
                }
                break;
                
            case 'stop':
                if (syncScheduler.getStatus().isRunning) {
                    syncScheduler.stop();
                    result = { message: 'Scheduler automático detenido' };
                } else {
                    result = { message: 'Scheduler ya está detenido' };
                }
                break;
                
            case 'restart':
                syncScheduler.stop();
                setTimeout(() => {
                    syncScheduler.start();
                }, 1000);
                result = { message: 'Scheduler automático reiniciado' };
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Acción no válida. Use: start, stop, restart'
                });
        }
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        console.error('❌ Error controlando scheduler:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Ruta de testing para debug
router.get('/test', async (req, res) => {
    try {
        console.log('🧪 Iniciando test de conexión...');
        const result = await syncService.testConnection();
        
        res.json({
            success: result.success,
            message: result.success ? 'Test exitoso' : 'Test falló',
            data: result.success ? {
                googleSheets: result.googleSheets,
                database: result.database
            } : {
                error: result.error
            }
        });
    } catch (error) {
        console.error('❌ Error en test:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Ruta para test de conexión (compatible con HTML anterior)
router.get('/test-connection', async (req, res) => {
    try {
        console.log('🧪 Test de conexión solicitado...');
        const result = await syncService.testConnection();
        
        res.json({
            success: result.success,
            connection: {
                connected: result.success,
                error: result.success ? null : result.error,
                sheetInfo: result.success ? result.googleSheets : null
            }
        });
    } catch (error) {
        console.error('❌ Error en test de conexión:', error);
        res.status(500).json({
            success: false,
            connection: {
                connected: false,
                error: error.message
            }
        });
    }
});

// Nueva ruta para obtener estadísticas detalladas
router.get('/stats', async (req, res) => {
    try {
        const stats = await syncService.getStats();
        const schedulerStatus = syncScheduler.getStatus();
        
        res.json({
            success: true,
            data: {
                ...stats,
                sync: {
                    lastSync: schedulerStatus.stats.lastRun,
                    totalRuns: schedulerStatus.stats.totalRuns,
                    successRate: schedulerStatus.stats.totalRuns > 0 
                        ? ((schedulerStatus.stats.successfulRuns / schedulerStatus.stats.totalRuns) * 100).toFixed(2) + '%'
                        : '0%',
                    isAutomatic: schedulerStatus.isRunning,
                    newPatients: schedulerStatus.lastResult?.result?.processed || 0
                }
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;