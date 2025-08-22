const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar rutas
const pacientesRoutes = require('./routes/pacientes');
const estudiantesRoutes = require('./routes/estudiantes');
const asignacionesRoutes = require('./routes/asignaciones');
const syncRoutes = require('./routes/sync');

// Importar el scheduler automático
const syncScheduler = require('./schedulers/syncScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/estudiantes', estudiantesRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/sync', syncRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API funcionando correctamente', 
    timestamp: new Date().toISOString(),
    version: '0.2.0',
    autoSync: syncScheduler.getStatus().isRunning
  });
});

// Nueva ruta para obtener estado del scheduler
app.get('/api/scheduler/status', (req, res) => {
  try {
    const status = syncScheduler.getStatus();
    const nextRuns = syncScheduler.getNextRuns();
    
    res.json({
      success: true,
      data: {
        ...status,
        nextRuns
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Nueva ruta para controlar el scheduler
app.post('/api/scheduler/:action', (req, res) => {
  try {
    const { action } = req.params;
    
    switch (action) {
      case 'start':
        if (!syncScheduler.getStatus().isRunning) {
          syncScheduler.start();
          res.json({ success: true, message: 'Scheduler iniciado' });
        } else {
          res.json({ success: false, message: 'Scheduler ya está ejecutándose' });
        }
        break;
        
      case 'stop':
        if (syncScheduler.getStatus().isRunning) {
          syncScheduler.stop();
          res.json({ success: true, message: 'Scheduler detenido' });
        } else {
          res.json({ success: false, message: 'Scheduler ya está detenido' });
        }
        break;
        
      case 'restart':
        syncScheduler.stop();
        setTimeout(() => {
          syncScheduler.start();
        }, 1000);
        res.json({ success: true, message: 'Scheduler reiniciado' });
        break;
        
      default:
        res.status(400).json({ success: false, message: 'Acción no válida' });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Manejo graceful del cierre del servidor
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  syncScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  syncScheduler.stop();
  process.exit(0);
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Panel de control: http://localhost:${PORT}`);
  console.log(`🔗 API Test: http://localhost:${PORT}/api/test`);
  
  // Iniciar sincronización automática después de que el servidor esté listo
  setTimeout(() => {
    try {
      syncScheduler.start();
      console.log('✅ Sistema de sincronización automática iniciado');
    } catch (error) {
      console.error('❌ Error iniciando sincronización automática:', error.message);
    }
  }, 2000); // Esperar 2 segundos para asegurar que todo esté listo
});