const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar rutas
const pacientesRoutes = require('./routes/pacientes');
const estudiantesRoutes = require('./routes/estudiantes');
const asignacionesRoutes = require('./routes/asignaciones');
const syncRoutes = require('./routes/sync');

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
    version: '0.1.0'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Panel de control: http://localhost:${PORT}`);
  console.log(`🔗 API Test: http://localhost:${PORT}/api/test`);
});