const express = require('express');
const router = express.Router();
const studentCodeService = require('../services/studentCodeService');

// GET /api/student-codes/stats - Obtener estadísticas de códigos
router.get('/stats', async (req, res) => {
    try {
        const stats = await studentCodeService.getCodeStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de códigos:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas de códigos: ' + error.message
        });
    }
});

// POST /api/student-codes/regenerate - Regenerar código para un estudiante
router.post('/regenerate', async (req, res) => {
    try {
        const { estudianteId } = req.body;
        
        if (!estudianteId) {
            return res.status(400).json({
                success: false,
                message: 'ID de estudiante es requerido'
            });
        }
        
        const result = await studentCodeService.regenerateCode(estudianteId);
        
        res.json({
            success: true,
            message: 'Código regenerado exitosamente',
            data: result
        });
        
    } catch (error) {
        console.error('Error regenerando código:', error);
        res.status(500).json({
            success: false,
            message: 'Error regenerando código: ' + error.message
        });
    }
});

// POST /api/student-codes/validate-fix - Validar y corregir todos los códigos
router.post('/validate-fix', async (req, res) => {
    try {
        const results = await studentCodeService.validateAndFixCodes();
        
        res.json({
            success: true,
            message: 'Validación y corrección completada',
            data: results
        });
        
    } catch (error) {
        console.error('Error validando y corrigiendo códigos:', error);
        res.status(500).json({
            success: false,
            message: 'Error validando y corrigiendo códigos: ' + error.message
        });
    }
});

// POST /api/student-codes/generate - Generar un nuevo código único
router.post('/generate', async (req, res) => {
    try {
        const newCode = await studentCodeService.generateUniqueCode();
        
        res.json({
            success: true,
            message: 'Código único generado',
            data: {
                codigo: newCode
            }
        });
        
    } catch (error) {
        console.error('Error generando código:', error);
        res.status(500).json({
            success: false,
            message: 'Error generando código: ' + error.message
        });
    }
});

// GET /api/student-codes/validate/:code - Validar formato de un código
router.get('/validate/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const isValid = studentCodeService.validateCodeFormat(code);
        const exists = await studentCodeService.codeExists(code);
        
        res.json({
            success: true,
            data: {
                codigo: code,
                formatoValido: isValid,
                existeEnBD: exists,
                esUnico: !exists
            }
        });
        
    } catch (error) {
        console.error('Error validando código:', error);
        res.status(500).json({
            success: false,
            message: 'Error validando código: ' + error.message
        });
    }
});

module.exports = router;
