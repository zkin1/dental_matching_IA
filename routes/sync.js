const express = require('express');
const router = express.Router();
const syncService = require('../services/syncService');

// Sincronizar pacientes desde Google Sheets
router.post('/pacientes', async (req, res) => {
    try {
        console.log('🔄 Sincronización manual iniciada por usuario');
        const result = await syncService.syncPacientes();
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    processed: result.processed,
                    errors: result.errors || 0
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
        
        res.json({
            success: true,
            data: {
                totalPacientes: pacientes.length,
                pacientesPendientes: pacientes.filter(p => p.estado === 'pendiente').length,
                pacientesAsignados: pacientes.filter(p => p.estado === 'asignado').length,
                totalEstudiantes: estudiantes.length,
                ultimaActualizacion: new Date().toISOString()
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

// Ruta de testing para debug
router.get('/test', async (req, res) => {
    try {
        console.log('🧪 Iniciando test de conexión...');
        const result = await syncService.testConnection();
        
        res.json({
            success: result.success,
            message: result.success ? 'Test exitoso' : 'Test falló',
            data: result.success ? {
                headers: result.headers,
                pacientesCount: result.pacientesCount,
                sample: result.sample
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

module.exports = router;