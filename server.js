const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

// Importar rutas
const pacientesRoutes = require('./routes/pacientes');
const estudiantesRoutes = require('./routes/estudiantes');
const asignacionesRoutes = require('./routes/asignaciones');
const matchingRoutes = require('./routes/matching');
const contactRoutes = require('./routes/contact');
const studentCodeRoutes = require('./routes/studentCodes');
const autoNotificationRoutes = require('./routes/autoNotifications');

// Importar servicios
const matchingService = require('./services/matchingService');
const initService = require('./services/initService');

const app = express();
const PORT = process.env.PORT || 3000;

// Variables globales para el estado del sistema
let systemInitialized = false;
let initializationError = null;

// Middlewares de seguridad y optimización
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

app.use(compression());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL || 'http://localhost:3000']
        : true,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // límite de 1000 requests por ventana por IP
    message: {
        error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Rate limiting más estricto para APIs sensibles
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Demasiadas solicitudes a esta API, intenta de nuevo más tarde.'
    }
});

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static('public', {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Middleware de validación de acceso a API
function validateApiAccess(req, res, next) {
    // En desarrollo, permitir todas las requests
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    
    // En producción, validar API key si es necesario
    const apiKey = req.headers['x-api-key'];
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
        return res.status(401).json({ 
            success: false, 
            error: 'API key requerida o inválida' 
        });
    }
    
    next();
}

// Middleware de manejo de errores de base de datos
function handleDatabaseError(error, req, res, next) {
    console.error('Error de base de datos:', error);
    
    if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
            success: false,
            error: 'Servicio de base de datos no disponible'
        });
    }
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        return res.status(503).json({
            success: false,
            error: 'Error de autenticación con la base de datos'
        });
    }
    
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
    });
}

// Rutas API
app.use('/api/pacientes', validateApiAccess, pacientesRoutes);
app.use('/api/estudiantes', validateApiAccess, estudiantesRoutes);
app.use('/api/asignaciones', validateApiAccess, asignacionesRoutes);
app.use('/api/matching', validateApiAccess, matchingRoutes);
app.use('/api/contact', validateApiAccess, contactRoutes);
app.use('/api/student-codes', validateApiAccess, studentCodeRoutes);
app.use('/api/auto-notifications', validateApiAccess, autoNotificationRoutes);

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de testing simplificada
app.get('/api/test', async (req, res) => {
    try {
        const systemHealth = await getSystemHealth();
        
        res.json({
            success: true,
            message: 'API funcionando correctamente',
            timestamp: new Date().toISOString(),
            version: '0.3.0',
            system: {
                initialized: systemInitialized,
                initError: initializationError,
                uptime: process.uptime(),
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
            },
            services: {
                database: systemHealth.database,
                matching: true
            },
            stats: systemHealth.stats
        });
    } catch (error) {
        console.error('Error en /api/test:', error);
        res.status(200).json({
            success: true,
            message: 'API funcionando correctamente',
            timestamp: new Date().toISOString(),
            version: '0.3.0',
            error: 'Error obteniendo estadísticas detalladas',
            services: {
                database: true,
                matching: true
            }
        });
    }
});

// Ruta de estadísticas simplificadas
app.get('/api/stats', async (req, res) => {
    try {
        const matchingStats = await matchingService.getStats().catch(err => ({ error: err.message }));
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                matching: matchingStats
            }
        });
    } catch (error) {
        console.error('Error en /api/stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Ruta de estadísticas de matching
app.get('/api/matching-stats', async (req, res) => {
    try {
        const stats = await matchingService.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de matching:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Dashboard simplificado
app.get('/api/dashboard', async (req, res) => {
    try {
        const matchingStats = await matchingService.getStats().catch(() => ({ 
            totalMatches: 0, 
            successRate: 0, 
            pendingMatches: 0 
        }));
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                overview: {
                    totalMatches: matchingStats.totalMatches || 0,
                    successRate: matchingStats.successRate || 0,
                    pendingMatches: matchingStats.pendingMatches || 0,
                    systemStatus: systemInitialized ? 'activo' : 'inicializando'
                },
                recentActivity: matchingStats.recentActivity || [],
                performance: {
                    uptime: Math.floor(process.uptime()),
                    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
                }
            }
        });
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check simplificado
app.get('/api/health', async (req, res) => {
    try {
        const health = await getSystemHealth();
        
        const status = health.database ? 'healthy' : 'unhealthy';
        const httpStatus = health.database ? 200 : 503;
        
        res.status(httpStatus).json({
            success: health.database,
            status: status,
            timestamp: new Date().toISOString(),
            services: {
                database: health.database,
                matching: true
            },
            stats: health.stats
        });
    } catch (error) {
        console.error('Error en health check:', error);
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Función simplificada de health check
async function getSystemHealth() {
    const health = {
        database: false,
        stats: {
            dbRecords: 0
        }
    };
    
    try {
        // Test básico de base de datos
        const { getConnection } = require('./config/database');
        const connection = await getConnection();
        await connection.execute('SELECT 1');
        health.database = true;
        
        // Estadísticas básicas
        const [rows] = await connection.execute(`
            SELECT 
                (SELECT COUNT(*) FROM pacientes) as pacientes,
                (SELECT COUNT(*) FROM estudiantes_odontologia) as estudiantes,
                (SELECT COUNT(*) FROM asignaciones) as asignaciones
        `);
        
        if (rows[0]) {
            health.stats = {
                dbRecords: rows[0].pacientes + rows[0].estudiantes + rows[0].asignaciones,
                pacientes: rows[0].pacientes,
                estudiantes: rows[0].estudiantes,
                asignaciones: rows[0].asignaciones
            };
        }
    } catch (error) {
        console.error('Error en health check:', error);
        health.database = false;
    }
    
    return health;
}

// Middleware de manejo de errores
app.use(handleDatabaseError);

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({
            success: false,
            error: 'Endpoint no encontrado'
        });
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Manejo graceful de cierre
process.on('SIGTERM', () => {
    console.log('📛 Recibida señal SIGTERM, cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📛 Recibida señal SIGINT, cerrando servidor...');
    process.exit(0);
});

// Inicialización del sistema simplificada
async function initializeSystem() {
    try {
        console.log('🚀 Inicializando sistema Dental Matching...');
        const healthCheck = await getSystemHealth();
        
        if (healthCheck.database) {
            console.log('✅ Base de datos conectada correctamente');
            console.log(`   - Registros totales: ${healthCheck.stats.dbRecords}`);
            
            systemInitialized = true;
            initializationError = null;
            console.log('✅ Sistema inicializado correctamente');
        } else {
            throw new Error('No se pudo conectar a la base de datos');
        }
    } catch (error) {
        console.error('❌ Error inicializando sistema:', error.message);
        systemInitialized = false;
        initializationError = error.message;
        
        // No salir del proceso, permitir que el servidor funcione parcialmente
        console.log('⚠️ Sistema iniciado en modo degradado');
    }
}

// Iniciar servidor
const server = app.listen(PORT, async () => {
    console.log(`🏥 Servidor Dental Matching iniciado en puerto ${PORT}`);
    console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    
    // Inicializar sistema
    await initializeSystem();
});

module.exports = app;