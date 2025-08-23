const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar rutas
const pacientesRoutes = require('./routes/pacientes');
const estudiantesRoutes = require('./routes/estudiantes');
const asignacionesRoutes = require('./routes/asignaciones');
const syncRoutes = require('./routes/sync');
const matchingRoutes = require('./routes/matching');
const contactRoutes = require('./routes/contact');
const studentCodeRoutes = require('./routes/studentCodes');
const autoNotificationRoutes = require('./routes/autoNotifications');

// Importar servicios
const syncScheduler = require('./schedulers/syncScheduler');
const matchingService = require('./services/matchingService');
const syncService = require('./services/syncService');
const initService = require('./services/initService');

const app = express();
const PORT = process.env.PORT || 3000;

// Variables globales para el estado del sistema
let systemInitialized = false;
let initializationError = null;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para logging de requests (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Middleware de validación para rutas API sensibles
const validateApiAccess = (req, res, next) => {
    // Aquí puedes agregar validación adicional si es necesario
    next();
};

// Rutas API
app.use('/api/pacientes', validateApiAccess, pacientesRoutes);
app.use('/api/estudiantes', validateApiAccess, estudiantesRoutes);
app.use('/api/asignaciones', validateApiAccess, asignacionesRoutes);
app.use('/api/sync', validateApiAccess, syncRoutes);
app.use('/api/matching', validateApiAccess, matchingRoutes);
app.use('/api/contact', validateApiAccess, contactRoutes);
app.use('/api/student-codes', validateApiAccess, studentCodeRoutes);
app.use('/api/auto-notifications', validateApiAccess, autoNotificationRoutes);

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de testing con información consolidada
app.get('/api/test', async (req, res) => {
    try {
        const schedulerStatus = syncScheduler.getStatus();
        const systemHealth = await getSystemHealth();
        
        res.json({
            success: true,
            message: 'API funcionando correctamente',
            timestamp: new Date().toISOString(),
            version: '0.2.0',
            system: {
                initialized: systemInitialized,
                initError: initializationError,
                uptime: process.uptime(),
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
            },
            services: {
                autoSync: schedulerStatus.isRunning,
                syncJobs: schedulerStatus.jobsCount,
                lastSync: schedulerStatus.lastSyncResult?.timestamp || null,
                lastMatching: schedulerStatus.lastMatchingResult?.timestamp || null,
                database: systemHealth.database,
                googleSheets: systemHealth.googleSheets
            },
            stats: systemHealth.stats
        });
    } catch (error) {
        console.error('Error en /api/test:', error);
        res.status(200).json({
            success: true,
            message: 'API funcionando correctamente',
            timestamp: new Date().toISOString(),
            version: '0.2.0',
            error: 'Error obteniendo estadísticas detalladas',
            services: {
                autoSync: syncScheduler.getStatus().isRunning
            }
        });
    }
});

// Ruta de estadísticas consolidadas del sistema
app.get('/api/stats', async (req, res) => {
    try {
        const [syncStats, matchingStats] = await Promise.all([
            syncService.getStats().catch(err => ({ error: err.message })),
            matchingService.getMatchingStats().catch(err => ({ error: err.message }))
        ]);
        
        const schedulerStatus = syncScheduler.getStatus();
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                sync: syncStats,
                matching: matchingStats,
                scheduler: {
                    isRunning: schedulerStatus.isRunning,
                    totalJobs: schedulerStatus.jobsCount,
                    syncStats: schedulerStatus.stats,
                    matchingStats: schedulerStatus.matchingStats,
                    lastResults: {
                        sync: schedulerStatus.lastSyncResult,
                        matching: schedulerStatus.lastMatchingResult
                    }
                },
                system: {
                    uptime: Math.floor(process.uptime()),
                    nodeVersion: process.version,
                    platform: process.platform,
                    memory: process.memoryUsage(),
                    environment: process.env.NODE_ENV || 'development'
                }
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas consolidadas:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Ruta específica para estadísticas de matching (compatible con frontend)
app.get('/api/matching-stats', async (req, res) => {
    try {
        const [matchingStats] = await Promise.all([
            matchingService.getMatchingStats()
        ]);
        
        const schedulerStatus = syncScheduler.getStatus();
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                matching: matchingStats,
                scheduler: {
                    isRunning: schedulerStatus.isRunning,
                    lastMatchingRun: schedulerStatus.lastMatchingResult?.timestamp,
                    totalRuns: schedulerStatus.matchingStats.totalRuns,
                    successfulRuns: schedulerStatus.matchingStats.successfulRuns,
                    failedRuns: schedulerStatus.matchingStats.failedRuns,
                    totalMatches: schedulerStatus.matchingStats.totalMatches,
                    lastRun: schedulerStatus.matchingStats.lastRun
                }
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de matching:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Ruta para obtener estado del scheduler
app.get('/api/scheduler/status', (req, res) => {
    try {
        const status = syncScheduler.getStatus();
        const nextRuns = syncScheduler.getNextRuns();
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                ...status,
                nextRuns,
                capabilities: {
                    autoSync: true,
                    autoMatching: true,
                    cleanup: true,
                    fullNightlyProcess: true
                }
            }
        });
    } catch (error) {
        console.error('Error obteniendo estado del scheduler:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Ruta para controlar el scheduler
app.post('/api/scheduler/:action', (req, res) => {
    try {
        const { action } = req.params;
        let result;
        
        switch (action) {
            case 'start':
                if (!syncScheduler.getStatus().isRunning) {
                    syncScheduler.start();
                    result = { message: 'Sistema automático iniciado (Sync + Matching)' };
                } else {
                    result = { message: 'Sistema automático ya está ejecutándose' };
                }
                break;
                
            case 'stop':
                if (syncScheduler.getStatus().isRunning) {
                    syncScheduler.stop();
                    result = { message: 'Sistema automático detenido' };
                } else {
                    result = { message: 'Sistema automático ya está detenido' };
                }
                break;
                
            case 'restart':
                syncScheduler.stop();
                setTimeout(() => {
                    syncScheduler.start();
                }, 1000);
                result = { message: 'Sistema automático reiniciado' };
                break;
                
            default:
                return res.status(400).json({ 
                    success: false, 
                    message: 'Acción no válida. Use: start, stop, restart',
                    timestamp: new Date().toISOString()
                });
        }
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...result
        });
        
    } catch (error) {
        console.error('Error controlando scheduler:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Dashboard en tiempo real
app.get('/api/dashboard', async (req, res) => {
    try {
        // Obtener datos básicos en paralelo
        const [syncStats, matchingStats] = await Promise.all([
            syncService.getStats().catch(() => ({ pacientes: { total: 0 }, estudiantes: { total: 0 } })),
            matchingService.getMatchingStats().catch(() => ({ total_asignaciones: 0, hoy: 0 }))
        ]);
        
        const schedulerStatus = syncScheduler.getStatus();
        
        // Obtener datos más detallados solo si los básicos funcionan
        let pendientes = [];
        let disponibles = [];
        
        try {
            [pendientes, disponibles] = await Promise.all([
                matchingService.getPacientesPendientes(),
                matchingService.getEstudiantesDisponibles()
            ]);
        } catch (error) {
            console.warn('No se pudieron obtener datos detallados para dashboard:', error.message);
        }
        
        const successRate = schedulerStatus.matchingStats.totalRuns > 0 
            ? ((schedulerStatus.matchingStats.successfulRuns / schedulerStatus.matchingStats.totalRuns) * 100).toFixed(1) + '%'
            : 'N/A';
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                overview: {
                    totalPatients: syncStats.pacientes?.total || 0,
                    pendingPatients: pendientes.length,
                    totalStudents: syncStats.estudiantes?.total || 0,
                    availableStudents: disponibles.length,
                    totalMatches: matchingStats.total_asignaciones || 0,
                    todayMatches: matchingStats.hoy || 0,
                    systemStatus: schedulerStatus.isRunning ? 'Automático' : 'Manual'
                },
                matching: {
                    algorithm: 'v2.0 - Especialidad + Experiencia + Prioridad + Disponibilidad',
                    averageScore: matchingStats.score_promedio || 0,
                    automaticMatches: matchingStats.automaticas || 0,
                    manualMatches: matchingStats.manuales || 0,
                    successRate
                },
                scheduler: {
                    isActive: schedulerStatus.isRunning,
                    totalJobs: schedulerStatus.jobsCount,
                    lastSync: schedulerStatus.lastSyncResult?.timestamp,
                    lastMatching: schedulerStatus.lastMatchingResult?.timestamp,
                    nextRuns: syncScheduler.getNextRuns().slice(0, 3)
                },
                performance: {
                    uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
                    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                    nodeVersion: process.version,
                    initialized: systemInitialized
                }
            }
        });
    } catch (error) {
        console.error('Error generando dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check completo
app.get('/api/health', async (req, res) => {
    try {
        const schedulerStatus = syncScheduler.getStatus();
        const systemHealth = await getSystemHealth();
        
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                api: true,
                database: systemHealth.database,
                googleSheets: systemHealth.googleSheets,
                scheduler: schedulerStatus.isRunning,
                matching: schedulerStatus.matchingStats.totalRuns >= 0
            },
            uptime: Math.floor(process.uptime()),
            version: '0.2.0',
            initialized: systemInitialized
        };
        
        // Determinar estado general
        const criticalServices = ['api', 'database'];
        const criticalHealthy = criticalServices.every(service => health.services[service] === true);
        
        if (!criticalHealthy) {
            health.status = 'unhealthy';
        } else if (!health.services.googleSheets || !health.services.scheduler) {
            health.status = 'degraded';
        }
        
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json({
            success: true,
            data: health
        });
        
    } catch (error) {
        console.error('Error en health check:', error);
        res.status(500).json({
            success: false,
            data: {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
                uptime: Math.floor(process.uptime()),
                version: '0.2.0'
            }
        });
    }
});

// Función helper para obtener el estado del sistema
async function getSystemHealth() {
    const health = {
        database: false,
        googleSheets: false,
        stats: null
    };
    
    try {
        const connectionTest = await syncService.testConnection();
        health.database = connectionTest.database ? true : false;
        health.googleSheets = connectionTest.googleSheets ? true : false;
        health.stats = {
            totalPatients: connectionTest.database?.pacientesCount || 0,
            totalStudents: connectionTest.database?.estudiantesCount || 0,
            sheetsRecords: connectionTest.googleSheets?.pacientesCount || 0
        };
    } catch (error) {
        console.warn('Error en health check:', error.message);
    }
    
    return health;
}

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err);
    
    // No exponer stack traces en producción
    const error = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor'
        : err.message;
    
    res.status(500).json({
        success: false,
        error,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Ruta no encontrada: ${req.method} ${req.path}`,
        timestamp: new Date().toISOString(),
        availableRoutes: [
            'GET /',
            'GET /api/test',
            'GET /api/health',
            'GET /api/stats',
            'GET /api/dashboard',
            'GET /api/matching-stats',
            'POST /api/scheduler/{action}',
            '/api/pacientes/*',
            '/api/estudiantes/*',
            '/api/asignaciones/*',
            '/api/sync/*',
            '/api/matching/*'
        ]
    });
});

// Manejo graceful del cierre del servidor
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} recibido, cerrando servidor gracefully...`);
    
    // Detener el scheduler primero
    if (syncScheduler.getStatus().isRunning) {
        console.log('Deteniendo sistema automático...');
        syncScheduler.stop();
    }
    
    // Dar tiempo para que las operaciones terminen
    setTimeout(() => {
        console.log('Servidor cerrado exitosamente');
        process.exit(0);
    }, 3000); // Aumentado a 3 segundos para operaciones complejas
};

// Listeners para señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // No cerrar el proceso automáticamente, solo logear
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Inicialización del sistema
async function initializeSystem() {
    try {
        console.log('Verificando conexiones del sistema...');
        const healthCheck = await syncService.testConnection();
        
        if (healthCheck.success) {
            console.log('Conexiones verificadas exitosamente');
            console.log(`   - Base de datos: ${healthCheck.database.pacientesCount} pacientes, ${healthCheck.database.estudiantesCount} estudiantes`);
            console.log(`   - Google Sheets: ${healthCheck.googleSheets.pacientesCount} registros encontrados`);
            
            // Inicializar sistema y validar códigos de estudiante
            console.log('Inicializando sistema y validando códigos...');
            await initService.initializeSystem();
            console.log('✅ Sistema inicializado y códigos validados');
            
            // Iniciar sistema automático
            syncScheduler.start();
            console.log('Sistema automático iniciado (Sync + Matching + Cleanup)');
            
            // Mostrar próximas ejecuciones
            const nextRuns = syncScheduler.getNextRuns().slice(0, 3);
            if (nextRuns.length > 0) {
                console.log('Próximas ejecuciones automáticas:');
                nextRuns.forEach(run => {
                    const timeStr = new Date(run.nextRun).toLocaleTimeString();
                    console.log(`   - ${run.job} (${run.type}): ${timeStr}`);
                });
            }
            
            systemInitialized = true;
            initializationError = null;
        } else {
            console.warn('Advertencia: Algunas conexiones fallaron');
            console.warn(`   Error: ${healthCheck.error}`);
            console.log('Sistema iniciado en modo manual - revise la configuración');
            
            systemInitialized = false;
            initializationError = healthCheck.error;
        }
        
    } catch (error) {
        console.error('Error durante inicialización:', error.message);
        console.log('Sistema iniciado en modo básico - algunas funciones pueden no estar disponibles');
        
        systemInitialized = false;
        initializationError = error.message;
    }
}

// Iniciar servidor
const server = app.listen(PORT, async () => {
    console.log('=====================================');
    console.log(`Dental Matching System v0.2`);
    console.log(`Servidor: http://localhost:${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}`);
    console.log(`API Test: http://localhost:${PORT}/api/test`);
    console.log(`Stats: http://localhost:${PORT}/api/stats`);
    console.log(`Matching: http://localhost:${PORT}/api/matching`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log('=====================================');
    
    // Inicializar sistema después de que el servidor esté listo
    setTimeout(initializeSystem, 2000);
});

// Timeout para requests
server.timeout = 30000; // 30 segundos

console.log('Iniciando Dental Matching System...');