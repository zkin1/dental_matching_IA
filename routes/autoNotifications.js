const express = require('express');
const router = express.Router();
const autoNotificationService = require('../services/autoNotificationService');

/**
 * GET /api/auto-notifications/logs
 * Obtiene los logs de notificaciones automáticas
 */
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = autoNotificationService.getNotificationLogs(limit);
        
        res.json({
            success: true,
            data: logs,
            count: logs.length
        });
    } catch (error) {
        console.error('Error obteniendo logs de notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener logs de notificaciones',
            error: error.message
        });
    }
});

/**
 * GET /api/auto-notifications/stats
 * Obtiene estadísticas de notificaciones automáticas
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = autoNotificationService.getNotificationStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas de notificaciones',
            error: error.message
        });
    }
});

/**
 * POST /api/auto-notifications/clear-logs
 * Limpia logs antiguos de notificaciones
 */
router.post('/clear-logs', async (req, res) => {
    try {
        const daysOld = parseInt(req.body.daysOld) || 30;
        const result = autoNotificationService.clearOldLogs(daysOld);
        
        res.json({
            success: true,
            message: 'Logs limpiados exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error limpiando logs de notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al limpiar logs de notificaciones',
            error: error.message
        });
    }
});

/**
 * POST /api/auto-notifications/test
 * Envía una notificación de prueba
 */
router.post('/test', async (req, res) => {
    try {
        const { paciente_id, estudiante_id } = req.body;
        
        if (!paciente_id || !estudiante_id) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren paciente_id y estudiante_id'
            });
        }

        const testData = {
            paciente_id,
            estudiante_id,
            fecha_asignacion: new Date()
        };

        const result = await autoNotificationService.sendAssignmentNotifications(testData);
        
        res.json({
            success: true,
            message: 'Notificación de prueba enviada',
            data: result
        });
    } catch (error) {
        console.error('Error enviando notificación de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar notificación de prueba',
            error: error.message
        });
    }
});

/**
 * GET /api/auto-notifications/health
 * Verifica el estado del servicio de notificaciones
 */
router.get('/health', async (req, res) => {
    try {
        const stats = autoNotificationService.getNotificationStats();
        const isHealthy = stats.total > 0 || stats.success > 0;
        
        res.json({
            success: true,
            healthy: isHealthy,
            service: 'AutoNotificationService',
            timestamp: new Date().toISOString(),
            stats: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            healthy: false,
            service: 'AutoNotificationService',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

module.exports = router;
