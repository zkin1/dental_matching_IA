/**
 * EMAIL TEMPLATE SERVICE - SISTEMA DENTAL MATCHING
 * Servicio profesional de plantillas de email para notificaciones del sistema
 * Diseño responsivo y profesional para comunicaciones médicas
 */

class EmailTemplateService {
  constructor() {
    this.institutionName = 'Clínica Dental Universitaria';
    this.institutionEmail = 'contacto@clinicadental.edu';
    this.supportEmail = 'soporte@clinicadental.edu';
    
    // Colores profesionales para sector salud
    this.colors = {
      primary: '#2563eb',
      secondary: '#059669', 
      accent: '#f59e0b',
      text: '#1f2937',
      textLight: '#6b7280',
      background: '#f8fafc',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    };
  }

  /**
   * Estilos CSS base para todos los emails
   * Diseño responsive y compatible con clientes de email
   */
  getBaseStyles() {
    return `
      <style>
        /* Reset y base */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          line-height: 1.6;
          color: ${this.colors.text};
          background-color: #f5f7fa;
        }
        
        /* Contenedor principal */
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          overflow: hidden;
        }
        
        /* Header profesional */
        .email-header {
          background: linear-gradient(135deg, ${this.colors.primary}, #1d4ed8);
          color: white;
          padding: 30px 40px;
          text-align: center;
        }
        
        .institution-logo {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .institution-subtitle {
          font-size: 14px;
          opacity: 0.9;
          font-weight: 400;
        }
        
        /* Contenido principal */
        .email-body {
          padding: 40px;
        }
        
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: ${this.colors.text};
        }
        
        .content-section {
          margin-bottom: 30px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 15px;
          color: ${this.colors.primary};
          border-left: 4px solid ${this.colors.primary};
          padding-left: 12px;
        }
        
        /* Tarjetas de información */
        .info-card {
          background: ${this.colors.background};
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .info-card h4 {
          color: ${this.colors.primary};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-card p {
          margin-bottom: 6px;
          font-size: 15px;
        }
        
        .info-card .highlight {
          background: #fef3c7;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          color: #92400e;
        }
        
        /* Lista de pasos */
        .steps-list {
          list-style: none;
          padding: 0;
        }
        
        .steps-list li {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px 20px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .step-number {
          background: ${this.colors.primary};
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }
        
        /* Botones de acción */
        .btn-primary {
          display: inline-block;
          background: ${this.colors.primary};
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 15px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
          transition: all 0.2s ease;
        }
        
        .btn-secondary {
          display: inline-block;
          background: ${this.colors.secondary};
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 14px;
          text-align: center;
        }
        
        /* Alertas y badges */
        .alert {
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .alert-success {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }
        
        .alert-info {
          background: #eff6ff;
          border: 1px solid #93c5fd;
          color: #1e3a8a;
        }
        
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .badge-success {
          background: ${this.colors.success};
          color: white;
        }
        
        .badge-warning {
          background: ${this.colors.warning};
          color: white;
        }
        
        .badge-primary {
          background: ${this.colors.primary};
          color: white;
        }
        
        /* Footer */
        .email-footer {
          background: #f8fafc;
          padding: 30px 40px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        
        .footer-text {
          font-size: 13px;
          color: ${this.colors.textLight};
          margin-bottom: 15px;
        }
        
        .contact-info {
          font-size: 12px;
          color: ${this.colors.textLight};
        }
        
        /* Responsive */
        @media only screen and (max-width: 600px) {
          .email-container { margin: 0 10px; }
          .email-header, .email-body, .email-footer { padding: 20px; }
          .institution-logo { font-size: 24px; }
          .greeting { font-size: 16px; }
          .btn-primary { display: block; margin: 10px 0; }
        }
        
        /* Compatibilidad con clientes de email */
        @media screen and (max-width: 525px) {
          .email-container { width: 100% !important; }
          .email-body { padding: 20px !important; }
        }
      </style>
    `;
  }

  /**
   * Template base para todos los emails
   */
  getBaseTemplate(title, body) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        ${this.getBaseStyles()}
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <div class="institution-logo">
              🦷 ${this.institutionName}
            </div>
            <div class="institution-subtitle">
              Sistema de Asignación de Pacientes
            </div>
          </div>
          
          ${body}
          
          <div class="email-footer">
            <div class="footer-text">
              Este es un mensaje automático del sistema de asignación de pacientes.<br>
              Si tienes preguntas, no dudes en contactarnos.
            </div>
            <div class="contact-info">
              📧 ${this.institutionEmail} | 📞 (555) 123-4567<br>
              🏥 ${this.institutionName} - Cuidando tu sonrisa con excelencia
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * EMAIL PARA ESTUDIANTE - Nueva asignación de paciente
   */
  getStudentNotificationTemplate(studentData, patientData, assignmentData) {
    const body = `
      <div class="email-body">
        <div class="greeting">
          ¡Hola ${studentData.nombre_completo}! 👋
        </div>
        
        <div class="alert alert-success">
          <strong>🎉 ¡Nuevo paciente asignado!</strong><br>
          Se te ha asignado un nuevo caso para tu práctica clínica.
        </div>
        
        <div class="content-section">
          <div class="section-title">📋 Información del Paciente</div>
          <div class="info-card">
            <h4>👤 Datos del Paciente</h4>
            <p><strong>Nombre:</strong> ${patientData.nombre_completo}</p>
            <p><strong>Edad:</strong> ${patientData.edad} años</p>
            <p><strong>Tratamiento:</strong> <span class="highlight">${patientData.tipo_tratamiento_inferido}</span></p>
            <p><strong>Prioridad:</strong> <span class="badge badge-${this.getPriorityClass(patientData.prioridad)}">${patientData.prioridad}</span></p>
            <p><strong>Código de paciente:</strong> <strong>#${patientData.id}</strong></p>
          </div>
        </div>

        <div class="content-section">
          <div class="section-title">🎓 Tu Código de Estudiante</div>
          <div class="info-card">
            <h4>📝 Para el contacto</h4>
            <p>Usa este código al contactar al paciente:</p>
            <p style="font-size: 18px; font-weight: 700; color: ${this.colors.primary}; text-align: center; padding: 10px; background: #eff6ff; border-radius: 6px;">
              ${studentData.codigo_estudiante}
            </p>
          </div>
        </div>

        <div class="content-section">
          <div class="section-title">📝 Próximos Pasos</div>
          <ol class="steps-list">
            <li>
              <span class="step-number">1</span>
              <div>
                <strong>Contacta al paciente</strong><br>
                <span style="color: ${this.colors.textLight};">Llama dentro de las próximas 24-48 horas</span>
              </div>
            </li>
            <li>
              <span class="step-number">2</span>
              <div>
                <strong>Agenda la cita inicial</strong><br>
                <span style="color: ${this.colors.textLight};">Coordina horarios y confirma disponibilidad</span>
              </div>
            </li>
            <li>
              <span class="step-number">3</span>
              <div>
                <strong>Revisa el caso clínico</strong><br>
                <span style="color: ${this.colors.textLight};">Prepara el plan de tratamiento</span>
              </div>
            </li>
            <li>
              <span class="step-number">4</span>
              <div>
                <strong>Reporta en el sistema</strong><br>
                <span style="color: ${this.colors.textLight};">Actualiza el progreso regularmente</span>
              </div>
            </li>
          </ol>
        </div>

        <div class="content-section" style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="btn-primary">
            📊 Acceder al Dashboard
          </a>
        </div>

        <div class="alert alert-info">
          <strong>💡 Recuerda:</strong> El éxito de tu práctica depende de la comunicación efectiva con el paciente. 
          Mantén siempre un trato profesional y empático.
        </div>
      </div>
    `;

    return this.getBaseTemplate('Nueva Asignación de Paciente', body);
  }

  /**
   * EMAIL PARA PACIENTE - Confirmación de asignación
   */
  getPatientNotificationTemplate(patientData, studentData, assignmentData) {
    const body = `
      <div class="email-body">
        <div class="greeting">
          Estimado/a ${patientData.nombre_completo} 👋
        </div>
        
        <div class="alert alert-success">
          <strong>✅ ¡Asignación confirmada!</strong><br>
          Te hemos asignado un estudiante para tu tratamiento dental.
        </div>
        
        <div class="content-section">
          <div class="section-title">👨‍⚕️ Tu Estudiante Asignado</div>
          <div class="info-card">
            <h4>🎓 Información del Estudiante</h4>
            <p><strong>Nombre:</strong> ${studentData.nombre_completo}</p>
            <p><strong>Año:</strong> ${studentData.año_carrera} año de carrera</p>
            <p><strong>Especialización:</strong> ${this.formatSpecialties(studentData.especialidades)}</p>
            <p><strong>Experiencia:</strong> ${studentData.casos_completados || 0} casos completados</p>
            <p><strong>Código de estudiante:</strong> <strong>${studentData.codigo_estudiante}</strong></p>
          </div>
        </div>

        <div class="content-section">
          <div class="section-title">🏥 Detalles de tu Tratamiento</div>
          <div class="info-card">
            <h4>📋 Plan de Tratamiento</h4>
            <p><strong>Tratamiento:</strong> <span class="highlight">${patientData.tipo_tratamiento_inferido}</span></p>
            <p><strong>Prioridad:</strong> <span class="badge badge-${this.getPriorityClass(patientData.prioridad)}">${patientData.prioridad}</span></p>
            <p><strong>Fecha de asignación:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>

        <div class="content-section">
          <div class="section-title">📞 Qué Esperar</div>
          <ol class="steps-list">
            <li>
              <span class="step-number">1</span>
              <div>
                <strong>Contacto inicial</strong><br>
                <span style="color: ${this.colors.textLight};">El estudiante te contactará en 24-48 horas</span>
              </div>
            </li>
            <li>
              <span class="step-number">2</span>
              <div>
                <strong>Programación de cita</strong><br>
                <span style="color: ${this.colors.textLight};">Coordinarán el mejor horario para ti</span>
              </div>
            </li>
            <li>
              <span class="step-number">3</span>
              <div>
                <strong>Evaluación inicial</strong><br>
                <span style="color: ${this.colors.textLight};">Revisión completa de tu caso</span>
              </div>
            </li>
            <li>
              <span class="step-number">4</span>
              <div>
                <strong>Inicio del tratamiento</strong><br>
                <span style="color: ${this.colors.textLight};">Bajo supervisión profesional</span>
              </div>
            </li>
          </ol>
        </div>

        <div class="alert alert-info">
          <strong>🏥 Información importante:</strong><br>
          • Todos los tratamientos son supervisados por profesionales<br>
          • El estudiante está capacitado para tu tipo de caso<br>
          • Puedes contactar a la clínica en cualquier momento<br>
          • Tu código de paciente es: <strong>#${patientData.id}</strong>
        </div>

        <div class="content-section" style="text-align: center;">
          <a href="tel:+555-123-4567" class="btn-primary">
            📞 Contactar Clínica
          </a>
        </div>
      </div>
    `;

    return this.getBaseTemplate('Asignación de Estudiante Confirmada', body);
  }

  /**
   * EMAIL PARA ADMINISTRADOR - Reporte de matching
   */
  getAdminReportTemplate(matchingResults, statistics) {
    const successRate = statistics.successRate || 0;
    const totalMatches = statistics.totalMatches || 0;
    const avgScore = statistics.avgScore || 0;

    const body = `
      <div class="email-body">
        <div class="greeting">
          📊 Reporte de Matching Automatizado
        </div>
        
        <div class="alert ${successRate > 80 ? 'alert-success' : 'alert-info'}">
          <strong>${successRate > 80 ? '✅' : '📊'} Ejecución completada</strong><br>
          Proceso de matching finalizado exitosamente
        </div>
        
        <div class="content-section">
          <div class="section-title">📈 Métricas del Sistema</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
            <div class="info-card" style="text-align: center;">
              <h4>Matches Creados</h4>
              <p style="font-size: 24px; font-weight: 700; color: ${this.colors.primary};">${totalMatches}</p>
            </div>
            <div class="info-card" style="text-align: center;">
              <h4>Tasa de Éxito</h4>
              <p style="font-size: 24px; font-weight: 700; color: ${successRate > 80 ? this.colors.success : this.colors.warning};">${successRate}%</p>
            </div>
            <div class="info-card" style="text-align: center;">
              <h4>Score Promedio</h4>
              <p style="font-size: 24px; font-weight: 700; color: ${this.colors.secondary};">${avgScore}/10</p>
            </div>
          </div>
        </div>

        <div class="content-section">
          <div class="section-title">📋 Resumen de Asignaciones</div>
          ${this.generateMatchingTable(matchingResults)}
        </div>

        <div class="content-section">
          <div class="section-title">🎯 Recomendaciones del Sistema</div>
          ${this.generateSystemRecommendations(statistics)}
        </div>

        <div class="content-section">
          <div class="section-title">📊 Próximos Pasos</div>
          <ol class="steps-list">
            <li>
              <span class="step-number">1</span>
              <div>
                <strong>Revisar matches de baja puntuación</strong><br>
                <span style="color: ${this.colors.textLight};">Scores < 7.0 requieren atención</span>
              </div>
            </li>
            <li>
              <span class="step-number">2</span>
              <div>
                <strong>Monitorear comunicación</strong><br>
                <span style="color: ${this.colors.textLight};">Verificar contacto estudiante-paciente</span>
              </div>
            </li>
            <li>
              <span class="step-number">3</span>
              <div>
                <strong>Actualizar métricas</strong><br>
                <span style="color: ${this.colors.textLight};">Revisar dashboard de performance</span>
              </div>
            </li>
          </ol>
        </div>

        <div class="content-section" style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin" class="btn-primary">
            🔧 Panel Administrativo
          </a>
        </div>
      </div>
    `;

    return this.getBaseTemplate('Reporte de Matching - Sistema Dental', body);
  }

  // Métodos auxiliares
  getPriorityClass(priority) {
    const map = {
      'alta': 'warning',
      'media': 'primary', 
      'baja': 'success',
      'urgente': 'warning'
    };
    return map[priority?.toLowerCase()] || 'primary';
  }

  formatSpecialties(specialties) {
    if (!specialties) return 'General';
    if (Array.isArray(specialties)) {
      return specialties.join(', ');
    }
    return specialties;
  }

  generateMatchingTable(results) {
    if (!results || results.length === 0) {
      return '<p style="color: ' + this.colors.textLight + ';">No hay asignaciones recientes.</p>';
    }

    let tableRows = '';
    results.forEach(result => {
      const scoreColor = result.score > 8 ? this.colors.success : 
                        result.score > 6 ? this.colors.warning : this.colors.error;
      
      tableRows += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-size: 14px;">${result.patient}</td>
          <td style="padding: 10px; font-size: 14px;">${result.student}</td>
          <td style="padding: 10px; text-align: center;">
            <span style="color: ${scoreColor}; font-weight: 600;">${result.score}/10</span>
          </td>
          <td style="padding: 10px; text-align: center;">
            <span class="badge badge-${result.status === 'success' ? 'success' : 'warning'}">${result.status}</span>
          </td>
        </tr>
      `;
    });

    return `
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background: ${this.colors.background};">
            <th style="padding: 15px 10px; text-align: left; font-weight: 600; color: ${this.colors.text};">Paciente</th>
            <th style="padding: 15px 10px; text-align: left; font-weight: 600; color: ${this.colors.text};">Estudiante</th>
            <th style="padding: 15px 10px; text-align: center; font-weight: 600; color: ${this.colors.text};">Score</th>
            <th style="padding: 15px 10px; text-align: center; font-weight: 600; color: ${this.colors.text};">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  }

  generateSystemRecommendations(statistics) {
    const recommendations = [];
    
    if (statistics.successRate < 80) {
      recommendations.push({
        type: 'warning',
        text: 'La tasa de éxito está por debajo del 80%. Revisar criterios de matching.',
        action: 'Ajustar parámetros del algoritmo'
      });
    }
    
    if (statistics.avgScore < 7) {
      recommendations.push({
        type: 'warning', 
        text: 'Score promedio bajo. Considerar optimización de factores.',
        action: 'Revisar pesos de scoring'
      });
    }
    
    if (statistics.unmatchedPatients > 5) {
      recommendations.push({
        type: 'error',
        text: `${statistics.unmatchedPatients} pacientes sin asignar.`,
        action: 'Revisar disponibilidad de estudiantes'
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        text: 'Sistema funcionando óptimamente. Todas las métricas en rango esperado.',
        action: 'Continuar monitoreo regular'
      });
    }

    return recommendations.map(rec => `
      <div class="alert alert-${rec.type === 'error' ? 'info' : rec.type === 'warning' ? 'info' : 'success'}">
        <strong>${rec.type === 'error' ? '⚠️' : rec.type === 'warning' ? '💡' : '✅'} ${rec.text}</strong><br>
        <em>Acción recomendada: ${rec.action}</em>
      </div>
    `).join('');
  }
}

module.exports = EmailTemplateService;