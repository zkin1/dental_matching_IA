const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const emailTemplateService = require('../services/emailTemplateService');

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes cambiar a otro servicio
    auth: {
        user: process.env.EMAIL_USER || 'tu-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'tu-password-app'
    }
});

// POST /api/contact/send-email - Enviar correo de contacto
router.post('/send-email', async (req, res) => {
    try {
        const { estudianteId, estudianteEmail, estudianteCodigo, pacientesAsignados } = req.body;
        
        if (!estudianteEmail || !estudianteCodigo || !pacientesAsignados || pacientesAsignados.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Datos incompletos para enviar el correo'
            });
        }
        
        // Crear el contenido del correo
        const emailContent = createEmailContent(estudianteCodigo, pacientesAsignados);
        
        // Configurar opciones del correo
        const mailOptions = {
            from: process.env.EMAIL_USER || 'sistema@dentalmatching.com',
            to: estudianteEmail,
            subject: `📋 Asignación de Pacientes - Código: ${estudianteCodigo}`,
            html: emailContent,
            text: createPlainTextContent(estudianteCodigo, pacientesAsignados)
        };
        
        // Enviar el correo
        const info = await transporter.sendMail(mailOptions);
        
        console.log('📧 Correo enviado exitosamente:', {
            messageId: info.messageId,
            estudiante: estudianteCodigo,
            pacientes: pacientesAsignados.length,
            timestamp: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: 'Correo enviado exitosamente',
            data: {
                messageId: info.messageId,
                pacientesEnviados: pacientesAsignados.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
        res.status(500).json({
            success: false,
            message: 'Error enviando correo: ' + error.message
        });
    }
});

// Función para crear contenido HTML del correo
function createEmailContent(estudianteCodigo, pacientesAsignados) {
    const pacientesList = pacientesAsignados.map(p => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; text-align: left;">
                <strong>${p.nombre}</strong><br>
                <small style="color: #6b7280;">ID: ${p.id}</small>
            </td>
            <td style="padding: 12px; text-align: left;">
                ${p.tratamiento || 'No especificado'}
            </td>
            <td style="padding: 12px; text-align: center;">
                <span style="
                    background-color: ${getPriorityColor(p.prioridad)};
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                ">${p.prioridad || 'Moderada'}</span>
            </td>
            <td style="padding: 12px; text-align: left;">
                ${p.telefono || 'No disponible'}<br>
                ${p.email || 'No disponible'}
            </td>
        </tr>
    `).join('');
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Asignación de Pacientes</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 20px; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🦷 Sistema de Matching Dental</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Asignación de Pacientes</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <h2 style="color: #1f2937; margin-top: 0;">Hola,</h2>
                    
                    <p>Se te han asignado <strong>${pacientesAsignados.length} paciente(s)</strong> en el Sistema de Matching Dental.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Tu código de estudiante:</strong> <span style="color: #059669; font-family: monospace; font-size: 16px;">${estudianteCodigo}</span></p>
                        <p style="margin: 5px 0 0 0;"><small>Usa este código para acceder a los datos de tus pacientes en la plataforma.</small></p>
                    </div>
                    
                    <h3 style="color: #1f2937;">📋 Pacientes Asignados:</h3>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                        <thead>
                            <tr style="background-color: #f9fafb;">
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Paciente</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Tratamiento</th>
                                <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Prioridad</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Contacto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pacientesList}
                        </tbody>
                    </table>
                    
                    <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 6px; padding: 15px; margin: 20px 0;">
                        <h4 style="margin: 0 0 10px 0; color: #1e40af;">🔑 Acceso a la Plataforma</h4>
                        <p style="margin: 0; color: #1e40af;">
                            Para ver los detalles completos de tus pacientes y gestionar las asignaciones, 
                            accede a la plataforma usando tu código de estudiante: <strong>${estudianteCodigo}</strong>
                        </p>
                    </div>
                    
                    <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px;">
                        Este es un correo automático del Sistema de Matching Dental. 
                        Por favor, no respondas a este mensaje.
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">
                        © ${new Date().getFullYear()} Sistema de Matching Dental. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Función para crear contenido de texto plano
function createPlainTextContent(estudianteCodigo, pacientesAsignados) {
    const pacientesList = pacientesAsignados.map(p => 
        `- ${p.nombre} (ID: ${p.id})
  Tratamiento: ${p.tratamiento || 'No especificado'}
  Prioridad: ${p.prioridad || 'Moderada'}
  Contacto: ${p.telefono || 'No disponible'} / ${p.email || 'No disponible'}`
    ).join('\n\n');
    
    return `
SISTEMA DE MATCHING DENTAL - ASIGNACIÓN DE PACIENTES

Hola,

Se te han asignado ${pacientesAsignados.length} paciente(s) en el Sistema de Matching Dental.

TU CÓDIGO DE ESTUDIANTE: ${estudianteCodigo}

PACIENTES ASIGNADOS:

${pacientesList}

ACCESO A LA PLATAFORMA:
Para ver los detalles completos de tus pacientes y gestionar las asignaciones, 
accede a la plataforma usando tu código de estudiante: ${estudianteCodigo}

Este es un correo automático del Sistema de Matching Dental. 
Por favor, no respondas a este mensaje.

© ${new Date().getFullYear()} Sistema de Matching Dental. Todos los derechos reservados.
    `.trim();
}

// Función para obtener color de prioridad
function getPriorityColor(prioridad) {
    const colors = {
        'Muy Alta': '#dc2626',
        'Alta': '#ea580c',
        'Moderada': '#d97706',
        'Baja': '#059669'
    };
    return colors[prioridad] || '#d97706';
}

module.exports = router;
