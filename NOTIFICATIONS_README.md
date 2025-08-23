# Sistema de Notificaciones Automáticas - Dental Matching

## 📧 Descripción General

El sistema de notificaciones automáticas envía correos electrónicos tanto al estudiante como al paciente inmediatamente después de que se realice una asignación en el sistema. Este sistema funciona de forma completamente automática y asíncrona.

## 🚀 Características Principales

### ✅ **Notificaciones Automáticas**
- **Envío automático** al crear una asignación
- **Doble notificación**: Estudiante + Paciente
- **Proceso asíncrono** que no bloquea la respuesta de la API
- **Reintentos automáticos** en caso de fallo

### 📊 **Sistema de Logs y Auditoría**
- Registro completo de todas las notificaciones
- Estadísticas de éxito/error
- Limpieza automática de logs antiguos
- Endpoints para monitoreo y debugging

### 🎨 **Plantillas de Correo Profesionales**
- **HTML responsive** con estilos modernos
- **Versión texto plano** para compatibilidad
- **Personalización** por tipo de destinatario
- **Información completa** del caso

## 🔧 Configuración Requerida


### Dependencias
```json
{
  "nodemailer": "^6.10.1"
}
```

## 📋 Flujo de Funcionamiento

### 1. **Creación de Asignación**
```
POST /api/asignaciones
{
  "paciente_id": 123,
  "estudiante_id": 456,
  "observaciones_sistema": "Asignación automática"
}
```

### 2. **Proceso de Notificaciones**
1. Se crea la asignación en la base de datos
2. Se actualiza el estado del paciente
3. Se inicia el envío de notificaciones (asíncrono)
4. Se retorna respuesta inmediata al usuario

### 3. **Envío de Correos**
- **Al Estudiante**: Información del paciente asignado
- **Al Paciente**: Confirmación de asignación y datos del estudiante

## 📧 Contenido de los Correos

### **Para el Estudiante**
- ✅ Confirmación de nueva asignación
- 📋 Datos completos del paciente
- 🔑 Código de estudiante
- 📱 Instrucciones de contacto
- ⏰ Recordatorio de plazo (24-48 horas)

### **Para el Paciente**
- ✅ Confirmación de asignación
- 👨‍⚕️ Información del estudiante
- 📅 Tiempo estimado de contacto
- 📋 Proceso a seguir
- 📞 Instrucciones de comunicación

## 🛠️ Endpoints de la API

### **Notificaciones Automáticas**
```
GET    /api/auto-notifications/logs          # Ver logs de notificaciones
GET    /api/auto-notifications/stats         # Estadísticas del sistema
POST   /api/auto-notifications/clear-logs    # Limpiar logs antiguos
POST   /api/auto-notifications/test          # Probar sistema
GET    /api/auto-notifications/health        # Estado del servicio
```

### **Asignaciones (Modificado)**
```
POST   /api/asignaciones                     # Crear con notificaciones automáticas
PUT    /api/asignaciones/:id                 # Actualizar asignación
DELETE /api/asignaciones/:id                 # Eliminar asignación
```

## 🎯 Funcionalidades del Frontend

### **Dashboard de Notificaciones**
- 📊 Estadísticas en tiempo real
- 📧 Visualización de logs
- 🧹 Limpieza de logs antiguos
- 🧪 Sistema de pruebas

### **Indicadores Visuales**
- ✅ Badges de estado de envío
- 📈 Contadores de notificaciones
- ⚠️ Alertas de errores
- 🔄 Botones de reenvío

## 🔍 Monitoreo y Debugging

### **Logs del Sistema**
```javascript
// Ejemplo de log de notificación
{
  timestamp: "2024-01-15T10:30:00.000Z",
  type: "success",
  message: "Correo enviado a estudiante: 123456789",
  data: {
    paciente_id: 123,
    estudiante_id: 456,
    fecha_asignacion: "2024-01-15T10:30:00.000Z"
  }
}
```

### **Estadísticas Disponibles**
- Total de notificaciones enviadas
- Tasa de éxito (%)
- Número de errores
- Número de advertencias
- Logs por período

## 🚨 Manejo de Errores

### **Estrategias de Recuperación**
1. **Reintentos automáticos** (3 intentos por defecto)
2. **Logging detallado** de todos los errores
3. **Continuidad del servicio** aunque fallen las notificaciones
4. **Alertas visuales** en el dashboard

### **Tipos de Errores Manejados**
- ❌ Fallo de conexión SMTP
- ⚠️ Credenciales inválidas
- 🔄 Timeout de envío
- 📧 Dirección de email inválida

## 📱 Interfaz de Usuario

### **Sección de Notificaciones Automáticas**
```
┌─────────────────────────────────────┐
│ 📧 Notificaciones Automáticas       │
├─────────────────────────────────────┤
│ [Ver Logs] [Estadísticas]          │
│ [Limpiar Logs] [Prueba]            │
└─────────────────────────────────────┘
```

### **Botones Disponibles**
- **Ver Logs**: Muestra últimos 50 logs
- **Estadísticas**: Estadísticas del sistema
- **Limpiar Logs**: Elimina logs antiguos
- **Prueba**: Envía notificación de prueba

## 🔒 Seguridad y Privacidad

### **Protección de Datos**
- ✅ Encriptación de credenciales
- 🔐 Variables de entorno seguras
- 📊 Logs sin información sensible
- 🚫 No almacenamiento de contenido de correos

### **Control de Acceso**
- 🔑 Validación de API endpoints
- 📝 Logs de auditoría completos
- 🛡️ Rate limiting configurable
- 🔍 Monitoreo de actividad

## 📈 Métricas y KPIs

### **Indicadores de Rendimiento**
- **Tasa de entrega**: % de correos enviados exitosamente
- **Tiempo de respuesta**: Latencia del sistema
- **Disponibilidad**: Uptime del servicio
- **Eficiencia**: Notificaciones por minuto

### **Alertas Automáticas**
- ⚠️ Tasa de error > 5%
- 🔴 Servicio no disponible
- 📧 Fallo en envío masivo
- 💾 Espacio de logs bajo

## 🚀 Implementación y Despliegue

### **Requisitos del Sistema**
- Node.js 14+
- MySQL 5.7+
- Nodemailer 6.10+
- Configuración SMTP válida

### **Pasos de Instalación**
1. Instalar dependencias: `npm install`
2. Configurar variables de entorno
3. Verificar conexión SMTP
4. Probar sistema con endpoint de prueba
5. Monitorear logs iniciales

### **Verificación Post-Despliegue**
- ✅ Endpoint de salud responde
- 📧 Correo de prueba se envía
- 📊 Estadísticas se generan
- 🔍 Logs se registran correctamente

## 🆘 Solución de Problemas

### **Problemas Comunes**

#### **Correos no se envían**
- Verificar credenciales SMTP
- Revisar logs de error
- Comprobar configuración de firewall
- Validar formato de emails

#### **Errores de base de datos**
- Verificar conexión a MySQL
- Comprobar permisos de usuario
- Revisar estructura de tablas
- Validar queries SQL

#### **Problemas de rendimiento**
- Revisar configuración de reintentos
- Optimizar consultas de base de datos
- Configurar rate limiting
- Monitorear uso de memoria

### **Comandos de Debugging**
```bash
# Ver logs del sistema
curl /api/auto-notifications/logs

# Verificar estado del servicio
curl /api/auto-notifications/health

# Probar notificación
curl -X POST /api/auto-notifications/test \
  -H "Content-Type: application/json" \
  -d '{"paciente_id": 1, "estudiante_id": 1}'
```

## 📚 Recursos Adicionales

### **Documentación Técnica**
- [API Reference](./API_REFERENCE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Email Templates](./EMAIL_TEMPLATES.md)

### **Contacto y Soporte**
- 🐛 Reportar bugs: [Issues](../../issues)
- 💡 Sugerencias: [Discussions](../../discussions)
- 📧 Soporte técnico: [Contact](../../wiki/contact)

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2024  
**Mantenido por**: Equipo de Desarrollo Dental Matching
