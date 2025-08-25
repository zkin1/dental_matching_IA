const nodemailer = require('nodemailer');
const { getConnection } = require('../config/database');
const studentCodeService = require('./studentCodeService');

class AutoNotificationService {
    constructor() {
        // Configuración del transporter con validaciones
        const emailService = process.env.EMAIL_SERVICE || 'gmail';
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;
        
        if (!emailUser || !emailPass) {
            console.warn('⚠️ Configuración de email incompleta. Las notificaciones no funcionarán.');
            this.transporter = null;
        } else {
            this.transporter = nodemailer.createTransport({
                service: emailService,
                auth: {
                    user: emailUser,
                    pass: emailPass
                },
                // Configuraciones adicionales de seguridad
                secure: true,
                tls: {
                    rejectUnauthorized: false
                },
                // Timeouts
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000
            });
            
            // Verificar configuración del transporter
            this.verifyTransporter();
        }
        
        this.logs = [];
        this.maxRetries = parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS) || 3;
        this.retryDelay = parseInt(process.env.NOTIFICATION_RETRY_DELAY_MS) || 5000;
    }

    /**
     * Verifica la configuración del transporter
     */
    async verifyTransporter() {
        if (!this.transporter) return false;
        
        try {
            await this.transporter.verify();
            console.log('✅ Transporter de email verificado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error verificando transporter:', error.message);
            return false;
        }
    }

    /**
     * Envía notificaciones automáticas al crear una asignación
     */
    async sendAssignmentNotifications(asignacionData) {
        const { paciente_id, estudiante_id, fecha_asignacion } = asignacionData;
        
        // Verificar que el transporter esté configurado
        if (!this.transporter) {
            console.warn('⚠️ Transporter no configurado, saltando notificaciones');
            return {
                success: false,
                message: 'Transporter de email no configurado',
                error: 'Configuración de email incompleta'
            };
        }
        
        try {
            // Obtener datos completos del paciente y estudiante
            const [paciente, estudiante] = await Promise.all([
                this.getPacienteData(paciente_id),
                this.getEstudianteData(estudiante_id)
            ]);

            if (!paciente || !estudiante) {
                throw new Error('No se pudieron obtener los datos del paciente o estudiante');
            }

            // Validar que ambos tengan email
            if (!paciente.email || !estudiante.email) {
                throw new Error('Paciente o estudiante no tienen email válido');
            }

            // Enviar correos de forma asíncrona para no bloquear la respuesta
            const notificationPromises = [
                this.sendStudentNotification(paciente, estudiante, fecha_asignacion),
                this.sendPatientNotification(paciente, estudiante, fecha_asignacion)
            ];

            // Ejecutar en paralelo pero no esperar la respuesta
            Promise.allSettled(notificationPromises).then(results => {
                results.forEach((result, index) => {
                    const type = index === 0 ? 'estudiante' : 'paciente';
                    if (result.status === 'fulfilled') {
                        this.logNotification('success', `${type}: ${result.value}`, asignacionData);
                        // Marcar como notificado en la base de datos
                        this.markAsNotified(paciente_id, estudiante_id);
                    } else {
                        this.logNotification('error', `${type}: ${result.reason}`, asignacionData);
                    }
                });
            });

            return {
                success: true,
                message: 'Notificaciones enviadas correctamente',
                paciente: paciente.nombre || paciente.nombre_completo,
                estudiante: estudiante.nombre || estudiante.nombre_completo
            };

        } catch (error) {
            this.logNotification('error', `Error general: ${error.message}`, asignacionData);
            return {
                success: false,
                message: 'Error al enviar notificaciones',
                error: error.message
            };
        }
    }

    /**
     * Envía correo al estudiante
     */
    async sendStudentNotification(paciente, estudiante, fechaAsignacion) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: estudiante.email,
            subject: `Nueva Asignación de Paciente - ${paciente.nombre}`,
            html: this.createStudentEmailContent(paciente, estudiante, fechaAsignacion),
            text: this.createStudentPlainTextContent(paciente, estudiante, fechaAsignacion)
        };

        return await this.sendEmailWithRetry(mailOptions, 'estudiante');
    }

    /**
     * Envía correo al paciente
     */
    async sendPatientNotification(paciente, estudiante, fechaAsignacion) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: paciente.email,
            subject: 'Su Caso Ha Sido Asignado a un Estudiante',
            html: this.createPatientEmailContent(paciente, estudiante, fechaAsignacion),
            text: this.createPatientPlainTextContent(paciente, estudiante, fechaAsignacion)
        };

        return await this.sendEmailWithRetry(mailOptions, 'paciente');
    }

    /**
     * Envía correo con reintentos automáticos
     */
    async sendEmailWithRetry(mailOptions, recipientType, retryCount = 0) {
        try {
            const result = await this.transporter.sendMail(mailOptions);
            this.logNotification('success', `Correo enviado a ${recipientType}: ${result.messageId}`, {
                recipientType,
                messageId: result.messageId
            });
            return `Correo enviado exitosamente a ${recipientType}`;
        } catch (error) {
            if (retryCount < this.maxRetries) {
                this.logNotification('warning', `Reintento ${retryCount + 1} para ${recipientType}: ${error.message}`, {
                    recipientType,
                    retryCount: retryCount + 1
                });
                
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.sendEmailWithRetry(mailOptions, recipientType, retryCount + 1);
            } else {
                this.logNotification('error', `Falló envío a ${recipientType} después de ${this.maxRetries} intentos: ${error.message}`, {
                    recipientType,
                    retryCount,
                    error: error.message
                });
                throw new Error(`No se pudo enviar correo a ${recipientType}: ${error.message}`);
            }
        }
    }

    /**
     * Crea contenido HTML del correo para el estudiante
     */
    createStudentEmailContent(paciente, estudiante, fechaAsignacion) {
        const prioridadColor = this.getPriorityColor(paciente.prioridad);
        const fechaFormateada = new Date(fechaAsignacion).toLocaleDateString('es-ES');
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .patient-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .priority-badge { display: inline-block; padding: 5px 10px; border-radius: 15px; color: white; font-weight: bold; }
                .student-code { background-color: #28a745; color: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 18px; }
                .footer { background-color: #6c757d; color: white; padding: 15px; text-align: center; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🦷 Nueva Asignación de Paciente</h1>
            </div>
            
            <div class="content">
                <h2>Estimado/a ${estudiante.nombre},</h2>
                
                <p>Se le ha asignado un nuevo paciente. Por favor, revise la información a continuación:</p>
                
                <div class="patient-info">
                    <h3>📋 Información del Paciente</h3>
                    <p><strong>Nombre:</strong> ${paciente.nombre}</p>
                    <p><strong>Edad:</strong> ${paciente.edad} años</p>
                    <p><strong>Prioridad:</strong> <span class="priority-badge" style="background-color: ${prioridadColor}">${paciente.prioridad}</span></p>
                    <p><strong>Estado:</strong> ${paciente.estado}</p>
                    <p><strong>Fecha de Asignación:</strong> ${fechaFormateada}</p>
                </div>
                
                <div class="student-code">
                    <strong>Su Código de Estudiante:</strong> ${estudiante.codigo_estudiante}
                </div>
                
                <h3>📱 Próximos Pasos</h3>
                <ol>
                    <li>Contacte al paciente en las próximas 24-48 horas</li>
                    <li>Use su código de estudiante para acceder a la información completa del paciente</li>
                    <li>Programe la primera consulta</li>
                    <li>Actualice el estado del caso según corresponda</li>
                </ol>
                
                <p><strong>Importante:</strong> El paciente ya ha sido notificado de esta asignación y espera su contacto.</p>
            </div>
            
            <div class="footer">
                <p>Sistema de Asignación Dental - Notificación Automática</p>
                <p>Fecha: ${fechaFormateada}</p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Crea contenido HTML del correo para el paciente
     */
    createPatientEmailContent(paciente, estudiante, fechaAsignacion) {
        const fechaFormateada = new Date(fechaAsignacion).toLocaleDateString('es-ES');
        const especialidades = Array.isArray(estudiante.especialidades) 
            ? estudiante.especialidades.join(', ') 
            : estudiante.especialidades || 'Odontología General';
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .student-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .contact-time { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .footer { background-color: #6c757d; color: white; padding: 15px; text-align: center; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>✅ Su Caso Ha Sido Asignado</h1>
            </div>
            
            <div class="content">
                <h2>Estimado/a ${paciente.nombre},</h2>
                
                <p>Nos complace informarle que su caso ha sido asignado a un estudiante de odontología. Su solicitud está siendo procesada.</p>
                
                <div class="student-info">
                    <h3>👨‍⚕️ Información del Estudiante</h3>
                    <p><strong>Nombre:</strong> ${estudiante.nombre}</p>
                    <p><strong>Especialidades:</strong> ${especialidades}</p>
                    <p><strong>Institución:</strong> Universidad de Odontología</p>
                </div>
                
                <div class="contact-time">
                    <h3>⏰ Tiempo de Contacto</h3>
                    <p><strong>El estudiante se pondrá en contacto con usted en las próximas 24-48 horas</strong></p>
                    <p>Por favor, mantenga su teléfono disponible y verifique su correo electrónico regularmente.</p>
                </div>
                
                <h3>📋 Proceso a Seguir</h3>
                <ol>
                    <li>El estudiante se contactará con usted para coordinar la primera consulta</li>
                    <li>Se programará una cita en el horario que mejor le convenga</li>
                    <li>Durante la consulta, se evaluará su caso y se establecerá un plan de tratamiento</li>
                    <li>Se le informará sobre los próximos pasos y seguimientos necesarios</li>
                </ol>
                
                <p><strong>Nota:</strong> Si no recibe contacto en 48 horas, por favor comuníquese con nosotros.</p>
            </div>
            
            <div class="footer">
                <p>Sistema de Asignación Dental - Notificación Automática</p>
                <p>Fecha de Asignación: ${fechaFormateada}</p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Crea contenido de texto plano para el estudiante
     */
    createStudentPlainTextContent(paciente, estudiante, fechaAsignacion) {
        const fechaFormateada = new Date(fechaAsignacion).toLocaleDateString('es-ES');
        
        return `
NUEVA ASIGNACIÓN DE PACIENTE

Estimado/a ${estudiante.nombre},

Se le ha asignado un nuevo paciente. Por favor, revise la información a continuación:

INFORMACIÓN DEL PACIENTE:
- Nombre: ${paciente.nombre}
- Edad: ${paciente.edad} años
- Prioridad: ${paciente.prioridad}
- Estado: ${paciente.estado}
- Fecha de Asignación: ${fechaFormateada}

SU CÓDIGO DE ESTUDIANTE: ${estudiante.codigo_estudiante}

PRÓXIMOS PASOS:
1. Contacte al paciente en las próximas 24-48 horas
2. Use su código de estudiante para acceder a la información completa del paciente
3. Programe la primera consulta
4. Actualice el estado del caso según corresponda

IMPORTANTE: El paciente ya ha sido notificado de esta asignación y espera su contacto.

Sistema de Asignación Dental - Notificación Automática
Fecha: ${fechaFormateada}
        `;
    }

    /**
     * Crea contenido de texto plano para el paciente
     */
    createPatientPlainTextContent(paciente, estudiante, fechaAsignacion) {
        const fechaFormateada = new Date(fechaAsignacion).toLocaleDateString('es-ES');
        const especialidades = Array.isArray(estudiante.especialidades) 
            ? estudiante.especialidades.join(', ') 
            : estudiante.especialidades || 'Odontología General';
        
        return `
SU CASO HA SIDO ASIGNADO

Estimado/a ${paciente.nombre},

Nos complace informarle que su caso ha sido asignado a un estudiante de odontología. Su solicitud está siendo procesada.

INFORMACIÓN DEL ESTUDIANTE:
- Nombre: ${estudiante.nombre}
- Especialidades: ${especialidades}
- Institución: Universidad de Odontología

TIEMPO DE CONTACTO:
El estudiante se pondrá en contacto con usted en las próximas 24-48 horas.

PROCESO A SEGUIR:
1. El estudiante se contactará con usted para coordinar la primera consulta
2. Se programará una cita en el horario que mejor le convenga
3. Durante la consulta, se evaluará su caso y se establecerá un plan de tratamiento
4. Se le informará sobre los próximos pasos y seguimientos necesarios

NOTA: Si no recibe contacto en 48 horas, por favor comuníquese con nosotros.

Sistema de Asignación Dental - Notificación Automática
Fecha de Asignación: ${fechaFormateada}
        `;
    }

    /**
     * Obtiene datos del paciente
     */
    async getPacienteData(pacienteId) {
        const pool = await getConnection();
        try {
            const [rows] = await pool.execute(
                'SELECT id, nombre_completo as nombre, edad, prioridad, estado, email FROM pacientes WHERE id = ?',
                [pacienteId]
            );
            return rows[0];
        } catch (error) {
            console.error(`❌ Error obteniendo datos del paciente ${pacienteId}:`, error.message);
            return null;
        }
    }

    /**
     * Obtiene datos del estudiante
     */
    async getEstudianteData(estudianteId) {
        const pool = await getConnection();
        try {
            const [rows] = await pool.execute(
                'SELECT id, nombre_completo as nombre, email, codigo_estudiante, especialidades FROM estudiantes_odontologia WHERE id = ?',
                [estudianteId]
            );
            return rows[0];
        } catch (error) {
            console.error(`❌ Error obteniendo datos del estudiante ${estudianteId}:`, error.message);
            return null;
        }
    }

    /**
     * Obtiene color para la prioridad
     */
    getPriorityColor(prioridad) {
        const colors = {
            'Alta': '#dc3545',
            'Media': '#ffc107',
            'Baja': '#fd7e14'
        };
        return colors[prioridad] || '#6c757d';
    }

    /**
     * Registra notificaciones para auditoría
     */
    logNotification(type, message, data) {
        const log = {
            timestamp: new Date(),
            type,
            message,
            data,
            id: Date.now() + Math.random()
        };
        
        this.logs.push(log);
        
        // Mantener solo los últimos 1000 logs
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }
        
        // Log en consola para debugging
        console.log(`[${log.timestamp.toISOString()}] ${type.toUpperCase()}: ${message}`);
    }

    /**
     * Obtiene logs de notificaciones
     */
    getNotificationLogs(limit = 100) {
        return this.logs.slice(-limit);
    }

    /**
     * Obtiene estadísticas de notificaciones
     */
    getNotificationStats() {
        const stats = {
            total: this.logs.length,
            success: this.logs.filter(log => log.type === 'success').length,
            error: this.logs.filter(log => log.type === 'error').length,
            warning: this.logs.filter(log => log.type === 'warning').length
        };
        
        stats.successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(2) : 0;
        
        return stats;
    }

    /**
     * Limpia logs antiguos
     */
    clearOldLogs(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const initialCount = this.logs.length;
        this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
        
        return {
            removed: initialCount - this.logs.length,
            remaining: this.logs.length
        };
    }

    /**
     * Marca la asignación como notificada en la base de datos
     */
    async markAsNotified(paciente_id, estudiante_id) {
        try {
            const pool = await getConnection();
            const fechaNotificacion = new Date();
            
            // Actualizar el estado de la asignación
            await pool.execute(`
                UPDATE asignaciones 
                SET notificado_por_email = 1, 
                    fecha_notificacion = ?,
                    estado = 'notificado'
                WHERE id_paciente = ? AND id_estudiante = ?
            `, [fechaNotificacion, paciente_id, estudiante_id]);
            
            console.log(`✅ Asignación marcada como notificada: Paciente ${paciente_id} ↔ Estudiante ${estudiante_id}`);
            
        } catch (error) {
            console.error(`❌ Error marcando como notificada: ${error.message}`);
        }
    }
}

module.exports = new AutoNotificationService();
