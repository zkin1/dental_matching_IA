const express = require('express');
const patientRoutes = require('./patientRoutes');
const studentRoutes = require('./studentRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const matchingRoutes = require('./matchingRoutes');
const authRoutes = require('./authRoutes');

const router = express.Router();

/**
 * Configuración central de todas las rutas de la API
 */

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        // Import database connection
        const { getConnection } = require('../../../config/database');
        
        let dbConnected = false;
        let stats = { pacientes: 0, estudiantes: 0, asignaciones: 0, dbRecords: 0 };
        
        try {
            const pool = await getConnection();
            // Test connection with a simple query instead of ping
            await pool.query('SELECT 1');
            dbConnected = true;
            
            // Get database stats
            const [patientsCount] = await pool.query('SELECT COUNT(*) as count FROM pacientes WHERE activo = 1');
            const [studentsCount] = await pool.query('SELECT COUNT(*) as count FROM estudiantes_odontologia WHERE estado = "activo"');
            const [assignmentsCount] = await pool.query('SELECT COUNT(*) as count FROM asignaciones');
            
            stats = {
                pacientes: patientsCount.count,
                estudiantes: studentsCount.count,
                asignaciones: assignmentsCount.count,
                dbRecords: patientsCount.count + studentsCount.count + assignmentsCount.count
            };
        } catch (dbError) {
            console.warn('Database connection failed in health check:', dbError.message);
        }
        
        res.json({
            success: true,
            message: 'API Dental Matching funcionando correctamente',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: dbConnected,
                ai: true, // Simulated for now
                matching: true // Simulated for now
            },
            stats,
            uptime: `${Math.floor(process.uptime() / 60)} minutos`
        });
    } catch (error) {
        res.json({
            success: false,
            message: 'API Dental Matching con errores',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: false,
                ai: false,
                matching: false
            },
            stats: { pacientes: 0, estudiantes: 0, asignaciones: 0, dbRecords: 0 },
            uptime: `${Math.floor(process.uptime() / 60)} minutos`,
            error: error.message
        });
    }
});

// API Info endpoint
router.get('/info', (req, res) => {
    res.json({
        success: true,
        api: {
            name: 'Dental Matching API',
            version: '2.0.0',
            description: 'Sistema automatizado de asignación de pacientes a estudiantes de odontología',
            author: 'Sistema Dental Matching',
            documentation: '/api/docs',
            endpoints: {
                patients: '/api/patients',
                students: '/api/students',
                assignments: '/api/assignments'
            }
        },
        features: [
            'Gestión de pacientes',
            'Gestión de estudiantes',
            'Sistema de asignaciones automático y manual',
            'Validación robusta de datos',
            'Sistema de logging avanzado',
            'Manejo centralizado de errores',
            'Documentación automática con Swagger'
        ],
        architecture: {
            pattern: 'Clean Architecture',
            layers: [
                'Presentation Layer (Controllers & Routes)',
                'Application Layer (Services & DTOs)',
                'Domain Layer (Entities)',
                'Infrastructure Layer (Repositories)'
            ]
        }
    });
});

// Registrar rutas de módulos
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/students', studentRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/matching', matchingRoutes);

// Endpoint para listar todas las rutas disponibles
router.get('/routes', (req, res) => {
    const routes = [];
    
    // Función recursiva para extraer rutas
    function extractRoutes(stack, basePath = '') {
        stack.forEach(layer => {
            if (layer.route) {
                // Ruta directa
                const methods = Object.keys(layer.route.methods);
                routes.push({
                    path: basePath + layer.route.path,
                    methods: methods.map(m => m.toUpperCase()),
                    handler: layer.route.stack[0].name || 'anonymous'
                });
            } else if (layer.name === 'router' && layer.handle.stack) {
                // Router anidado
                const routerPath = layer.regexp.source
                    .replace('\\', '')
                    .replace('/(?=', '')
                    .replace('$', '')
                    .replace('^\\', '')
                    .replace('/?$', '')
                    .replace('(?:/(?=$))?', '');
                
                extractRoutes(layer.handle.stack, basePath + routerPath);
            }
        });
    }
    
    extractRoutes(router.stack, '/api');
    
    res.json({
        success: true,
        total: routes.length,
        routes: routes.sort((a, b) => a.path.localeCompare(b.path))
    });
});

module.exports = router;