const nodemailer = require('nodemailer');
const { getConnection } = require('../config/database');
const EmailTemplateService = require('./emailTemplateService');

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
        
        // Inicializar el servicio de templates profesionales
        this.emailTemplateService = new EmailTemplateService();
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
                paciente: paciente.nombre_completo,
                estudiante: estudiante.nombre_completo
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
     * Envía correo al estudiante con templates profesionales mejorados
     */
    async sendStudentNotification(paciente, estudiante, fechaAsignacion) {
        // Crear objeto de detalles de matching para el template
        const matchingDetails = {
            fecha_asignacion: fechaAsignacion,
            dia_semana: this.getDayName(new Date(fechaAsignacion)),
            hora_inicio: '08:00', // Default, puede ser mejorado con datos reales
            hora_fin: '13:00',
            clinica: paciente.edad < 18 ? 'Clínica para el Niño y Adolescente' : 'Clínica Integral Adulto y Gerontología',
            especialidad: 'Odontología General', // Default
            tratamiento: paciente.tipo_tratamiento_inferido || paciente.tratamiento || 'Consulta General',
            score: 0.85 // Default score
        };

        const mailOptions = {
            from: {
                name: 'Clínica Dental Universitaria',
                address: process.env.EMAIL_USER
            },
            to: estudiante.email,
            subject: `🦷 Nueva Asignación de Paciente - ${paciente.nombre_completo || paciente.nombre}`,
            html: this.emailTemplateService.getStudentNotificationTemplate(estudiante, paciente, matchingDetails)
        };

        return await this.sendEmailWithRetry(mailOptions, 'estudiante');
    }

    /**
     * Envía correo al paciente con templates profesionales mejorados
     */
    async sendPatientNotification(paciente, estudiante, fechaAsignacion) {
        // Crear objeto de detalles de matching para el template
        const matchingDetails = {
            fecha_asignacion: fechaAsignacion,
            dia_semana: this.getDayName(new Date(fechaAsignacion)),
            hora_inicio: '08:00', // Default, puede ser mejorado con datos reales
            hora_fin: '13:00',
            clinica: paciente.edad < 18 ? 'Clínica para el Niño y Adolescente' : 'Clínica Integral Adulto y Gerontología',
            especialidad: 'Odontología General', // Default
            tratamiento: paciente.tipo_tratamiento_inferido || paciente.tratamiento || 'Consulta General',
            score: 0.85 // Default score
        };

        const mailOptions = {
            from: {
                name: 'Clínica Dental Universitaria',
                address: process.env.EMAIL_USER
            },
            to: paciente.email,
            subject: '✅ Su Caso Ha Sido Asignado - Clínica Dental Universitaria',
            html: this.emailTemplateService.getPatientNotificationTemplate(paciente, estudiante, matchingDetails)
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
                'SELECT id, nombre_completo, edad, prioridad, estado, email, tipo_tratamiento_inferido FROM pacientes WHERE id = ?',
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
                'SELECT id, nombre_completo, email, codigo_estudiante, especialidades FROM estudiantes_odontologia WHERE id = ?',
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

    /**
     * Envía notificación administrativa sobre ejecución de matching
     */
    async sendAdminMatchingReport(matchingResults, summary) {
        if (!this.transporter) {
            console.warn('⚠️ No se puede enviar reporte admin: transporter no configurado');
            return;
        }

        try {
            // Obtener email de administrador desde variables de entorno o usar default
            const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
            
            if (!adminEmail) {
                console.warn('⚠️ No se configuró email de administrador');
                return;
            }

            const mailOptions = {
                from: {
                    name: 'Dental Matching Pro - Sistema',
                    address: process.env.EMAIL_USER
                },
                to: adminEmail,
                subject: `🤖 Reporte de Matching IA - ${summary.matched}/${summary.processed} asignaciones (${summary.successRate}%)`,
                html: this.emailTemplateService.getAdminReportTemplate(matchingResults, summary),
                text: this.createAdminPlainText(matchingResults, summary)
            };

            const result = await this.transporter.sendMail(mailOptions);
            this.logNotification('success', `Reporte admin enviado: ${result.messageId}`, {
                adminEmail,
                summary
            });
            
            console.log(`📧 Reporte de matching enviado al administrador: ${adminEmail}`);
            
        } catch (error) {
            this.logNotification('error', `Error enviando reporte admin: ${error.message}`, {
                summary,
                error: error.message
            });
            console.error(`❌ Error enviando reporte administrativo:`, error);
        }
    }

    /**
     * Crea contenido de texto plano para reporte administrativo
     */
    createAdminPlainText(matchingResults, summary) {
        const successRate = summary.successRate || 0;
        const totalProcessed = summary.processed || 0;
        const totalMatched = summary.matched || 0;

        let content = `\nDENTAL MATCHING PRO - REPORTE DE MATCHING IA\n\nAdministrador del Sistema,\n\nSe ha completado una ejecución del algoritmo de matching inteligente.\n\nRESUMEN DE EJECUCIÓN:\n- Pacientes Procesados: ${totalProcessed}\n- Asignaciones Exitosas: ${totalMatched}\n- Tasa de Éxito: ${successRate}%\n- Tiempo de Ejecución: ${summary.duration || 'N/A'}\n- Fecha y Hora: ${new Date().toLocaleString('es-ES')}\n\n`;

        if (successRate >= 80) {
            content += `ESTADO: EXCELENTE RENDIMIENTO\nEl sistema ha alcanzado una tasa de éxito superior al 80%.\n\n`;
        } else if (successRate >= 60) {
            content += `ESTADO: RENDIMIENTO MODERADO\nLa tasa de éxito del ${successRate}% sugiere posibles ajustes.\n\n`;
        } else {
            content += `ESTADO: RENDIMIENTO BAJO - ATENCIÓN REQUERIDA\nLa tasa de éxito del ${successRate}% indica problemas que requieren atención.\n\n`;
        }

        if (matchingResults && matchingResults.length > 0) {
            content += `ASIGNACIONES REALIZADAS:\n`;
            matchingResults.slice(0, 10).forEach((result, index) => {
                content += `${index + 1}. ${result.estudiante?.nombre_completo || 'Estudiante'} → ${result.tratamiento || 'Tratamiento'} (Score: ${(result.score * 100).toFixed(1)}%)\n`;
            });
            
            if (matchingResults.length > 10) {
                content += `... y ${matchingResults.length - 10} asignaciones adicionales\n`;
            }
        }

        content += `\nSistema de Matching Dental - Panel Administrativo\nAlgoritmo IA v2.1\nGenerado automáticamente el ${new Date().toLocaleString('es-ES')}\n\nEste es un correo automático del sistema de administración.`;

        return content.trim();
    }

    /**
     * Obtiene el nombre del día en español
     */
    getDayName(date) {
        const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        return days[date.getDay()];
    }

    /**
     * Envía notificación de matching mejorada con detalles específicos
     */
    async sendEnhancedMatchingNotification(paciente, estudiante, matchingDetails) {
        try {
            // Notificación al estudiante con templates profesionales
            const studentMailOptions = {
                from: {
                    name: 'Clínica Dental Universitaria',
                    address: process.env.EMAIL_USER
                },
                to: estudiante.email,
                subject: `🦷 Nueva Asignación - ${paciente.nombre_completo || paciente.nombre} (${matchingDetails.dia_semana} ${matchingDetails.hora_inicio}-${matchingDetails.hora_fin})`,
                html: this.emailTemplateService.getStudentNotificationTemplate(estudiante, paciente, matchingDetails)
            };

            // Notificación al paciente con templates profesionales
            const patientMailOptions = {
                from: {
                    name: 'Clínica Dental Universitaria',
                    address: process.env.EMAIL_USER
                },
                to: paciente.email,
                subject: `✅ Su Caso Asignado - Estudiante ${estudiante.nombre_completo || estudiante.nombre}`,
                html: this.emailTemplateService.getPatientNotificationTemplate(paciente, estudiante, matchingDetails)
            };

            // Enviar ambos correos
            const [studentResult, patientResult] = await Promise.allSettled([
                this.sendEmailWithRetry(studentMailOptions, 'estudiante'),
                this.sendEmailWithRetry(patientMailOptions, 'paciente')
            ]);

            let success = true;
            let message = 'Notificaciones enviadas exitosamente';
            
            if (studentResult.status === 'rejected') {
                success = false;
                message += ` (Error estudiante: ${studentResult.reason})`;
            }
            
            if (patientResult.status === 'rejected') {
                success = false;
                message += ` (Error paciente: ${patientResult.reason})`;
            }

            return {
                success,
                message,
                studentNotification: studentResult.status === 'fulfilled' ? studentResult.value : null,
                patientNotification: patientResult.status === 'fulfilled' ? patientResult.value : null
            };

        } catch (error) {
            this.logNotification('error', `Error en notificación mejorada: ${error.message}`, {
                paciente: paciente.id,
                estudiante: estudiante.id,
                error: error.message
            });
            
            return {
                success: false,
                message: `Error enviando notificaciones: ${error.message}`
            };
        }
    }
}

module.exports = new AutoNotificationService();
