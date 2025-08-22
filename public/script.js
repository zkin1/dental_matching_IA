// ====================================
//   SCRIPT.JS - Dashboard Principal
//   Dental 1ing System V0.2
// ====================================

// Estado de la aplicación
let currentTab = 'pacientes';
let data = {
    pacientes: [],
    estudiantes: [],
    asignaciones: []
};

let filters = {
    pacientes: '',
    estudiantes: '',
    asignaciones: ''
};

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Dental Matching System V0.2');
    
    // Verificar estado del sistema
    checkApiStatus();
    checkGoogleSheetsStatus();
    
    // Cargar todos los datos
    loadAllData();
    
    // Actualizar datos cada 5 minutos
    setInterval(refreshAllData, 5 * 60 * 1000);
});

// ====================================
//   FUNCIONES DE VERIFICACIÓN DE ESTADO
// ====================================

// Verificar estado de la API
async function checkApiStatus() {
    const statusDiv = document.getElementById('api-status');
    if (!statusDiv) return;
    
    statusDiv.textContent = 'Verificando...';
    statusDiv.className = 'status-indicator status-loading';
    
    try {
        const response = await fetch('/api/test');
        const result = await response.json();
        
        if (response.ok) {
            statusDiv.textContent = `✅ API OK - ${result.version}`;
            statusDiv.className = 'status-indicator status-ok';
        } else {
            throw new Error('API Error');
        }
    } catch (error) {
        statusDiv.textContent = '❌ Error de conexión';
        statusDiv.className = 'status-indicator status-error';
        console.error('Error verificando API:', error);
    }
}

// Verificar estado de Google Sheets
async function checkGoogleSheetsStatus() {
    const statusDiv = document.getElementById('google-sheets-status');
    const sheetsStatusIndicator = document.getElementById('sheets-status');
    const lastSyncSpan = document.getElementById('last-sync');
    
    if (statusDiv) {
        statusDiv.textContent = 'Verificando...';
        statusDiv.className = 'status-indicator status-loading';
    }
    
    try {
        const response = await fetch('/api/sync/test-connection');
        const result = await response.json();
        
        if (result.success && result.connection.connected) {
            // Actualizar indicador principal
            if (statusDiv) {
                statusDiv.textContent = '✅ Conectado';
                statusDiv.className = 'status-indicator status-ok';
            }
            
            // Actualizar indicador en header
            if (sheetsStatusIndicator) {
                sheetsStatusIndicator.innerHTML = `
                    <span class="connection-icon">✅</span>
                    <span class="connection-text">Google Sheets conectado</span>
                `;
                sheetsStatusIndicator.className = 'connection-indicator status-ok';
            }
            
            // Cargar estadísticas de sincronización
            await loadSyncStats();
            
        } else {
            throw new Error(result.connection?.error || 'Error de conexión');
        }
    } catch (error) {
        if (statusDiv) {
            statusDiv.textContent = '❌ Error';
            statusDiv.className = 'status-indicator status-error';
        }
        
        if (sheetsStatusIndicator) {
            sheetsStatusIndicator.innerHTML = `
                <span class="connection-icon">❌</span>
                <span class="connection-text">Error de conexión: ${error.message}</span>
            `;
            sheetsStatusIndicator.className = 'connection-indicator status-error';
        }
        
        if (lastSyncSpan) {
            lastSyncSpan.textContent = 'Error de conexión';
        }
        
        console.error('Error verificando Google Sheets:', error);
    }
}

// Verificar estado de la base de datos
async function checkDatabaseStatus() {
    const statusDiv = document.getElementById('db-status');
    if (!statusDiv) return;
    
    statusDiv.textContent = 'Verificando...';
    statusDiv.className = 'status-indicator status-loading';
    
    try {
        // Hacer una consulta simple para verificar la BD
        const response = await fetch('/api/pacientes?limit=1');
        const result = await response.json();
        
        if (response.ok && result.success) {
            statusDiv.textContent = '✅ Conectado';
            statusDiv.className = 'status-indicator status-ok';
        } else {
            throw new Error('Database Error');
        }
    } catch (error) {
        statusDiv.textContent = '❌ Error';
        statusDiv.className = 'status-indicator status-error';
        console.error('Error verificando base de datos:', error);
    }
}

// ====================================
//   FUNCIONES DE CARGA DE DATOS
// ====================================

// Cargar todos los datos
async function loadAllData() {
    console.log('🔄 Cargando todos los datos...');
    
    await Promise.all([
        loadPacientes(),
        loadEstudiantes(),
        loadAsignaciones()
    ]);
    
    updateStats();
    checkDatabaseStatus();
}

// Refrescar todos los datos
async function refreshAllData() {
    console.log('🔄 Refrescando todos los datos...');
    showToast('Actualizando datos...', 'info');
    
    try {
        await loadAllData();
        showToast('Datos actualizados correctamente', 'success');
    } catch (error) {
        console.error('Error refrescando datos:', error);
        showToast('Error al actualizar los datos', 'error');
    }
}

// Cargar pacientes
async function loadPacientes() {
    const loading = document.getElementById('loading-pacientes');
    const table = document.getElementById('tabla-pacientes');
    const info = document.getElementById('pacientes-info');
    
    try {
        if (loading) loading.style.display = 'block';
        if (table) table.style.display = 'none';
        if (info) info.style.display = 'none';
        
        const response = await fetch('/api/pacientes');
        const result = await response.json();
        
        if (result.success) {
            data.pacientes = result.data || [];
            renderPacientes();
            
            if (loading) loading.style.display = 'none';
            if (table) table.style.display = 'table';
            if (info) info.style.display = 'block';
        } else {
            throw new Error(result.error || 'Error cargando pacientes');
        }
    } catch (error) {
        console.error('Error cargando pacientes:', error);
        if (loading) {
            loading.textContent = '❌ Error cargando datos: ' + error.message;
        }
        showToast('Error cargando pacientes: ' + error.message, 'error');
    }
}

// Cargar estudiantes
async function loadEstudiantes() {
    const loading = document.getElementById('loading-estudiantes');
    const table = document.getElementById('tabla-estudiantes');
    const info = document.getElementById('estudiantes-info');
    
    try {
        if (loading) loading.style.display = 'block';
        if (table) table.style.display = 'none';
        if (info) info.style.display = 'none';
        
        const response = await fetch('/api/estudiantes');
        const result = await response.json();
        
        if (result.success) {
            data.estudiantes = result.data || [];
            renderEstudiantes();
            
            if (loading) loading.style.display = 'none';
            if (table) table.style.display = 'table';
            if (info) info.style.display = 'block';
        } else {
            throw new Error(result.error || 'Error cargando estudiantes');
        }
    } catch (error) {
        console.error('Error cargando estudiantes:', error);
        if (loading) {
            loading.textContent = '❌ Error cargando datos: ' + error.message;
        }
        showToast('Error cargando estudiantes: ' + error.message, 'error');
    }
}

// Cargar asignaciones
async function loadAsignaciones() {
    const loading = document.getElementById('loading-asignaciones');
    const table = document.getElementById('tabla-asignaciones');
    const info = document.getElementById('asignaciones-info');
    
    try {
        if (loading) loading.style.display = 'block';
        if (table) table.style.display = 'none';
        if (info) info.style.display = 'none';
        
        const response = await fetch('/api/asignaciones');
        const result = await response.json();
        
        if (result.success) {
            data.asignaciones = result.data || [];
            renderAsignaciones();
            
            if (loading) loading.style.display = 'none';
            if (table) table.style.display = 'table';
            if (info) info.style.display = 'block';
        } else {
            throw new Error(result.error || 'Error cargando asignaciones');
        }
    } catch (error) {
        console.error('Error cargando asignaciones:', error);
        if (loading) {
            loading.textContent = '❌ Error cargando datos: ' + error.message;
        }
        showToast('Error cargando asignaciones: ' + error.message, 'error');
    }
}

// ====================================
//   FUNCIONES DE RENDERIZADO
// ====================================

// Renderizar tabla de pacientes
function renderPacientes() {
    const tbody = document.getElementById('tbody-pacientes');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    let filteredData = data.pacientes;
    const filter = filters.pacientes;
    
    if (filter) {
        filteredData = data.pacientes.filter(paciente => 
            paciente.prioridad && paciente.prioridad.toLowerCase().includes(filter.toLowerCase())
        );
    }
    
    filteredData.forEach(paciente => {
        const row = document.createElement('tr');
        const fechaRegistro = paciente.fecha_registro ? 
            new Date(paciente.fecha_registro).toLocaleDateString() : '-';
        
        row.innerHTML = `
            <td>${paciente.id}</td>
            <td><strong>${paciente.nombre_completo || '-'}</strong></td>
            <td>${paciente.edad || '-'}</td>
            <td>${paciente.telefono || '-'}</td>
            <td>${paciente.ciudad || '-'}</td>
            <td>${paciente.tipo_tratamiento_inferido || '-'}</td>
            <td><span class="status-badge">${paciente.nivel_dolor || 0}/10</span></td>
            <td><span class="status-badge status-${(paciente.prioridad || 'baja').toLowerCase().replace(' ', '-')}">${paciente.prioridad || 'N/A'}</span></td>
            <td>${fechaRegistro}</td>
        `;
        tbody.appendChild(row);
    });
    
    updateTableInfo('pacientes', filteredData.length, data.pacientes.length);
}

// Renderizar tabla de estudiantes
function renderEstudiantes() {
    const tbody = document.getElementById('tbody-estudiantes');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    let filteredData = data.estudiantes;
    const filter = filters.estudiantes;
    
    if (filter) {
        filteredData = data.estudiantes.filter(estudiante => 
            estudiante.estado && estudiante.estado.toLowerCase().includes(filter.toLowerCase())
        );
    }
    
    filteredData.forEach(estudiante => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${estudiante.codigo_estudiante || '-'}</strong></td>
            <td>${estudiante.nombre_completo || '-'}</td>
            <td>${estudiante.año_carrera || '-'}</td>
            <td>${estudiante.universidad || '-'}</td>
            <td>${estudiante.ciudad || '-'}</td>
            <td><span class="status-badge">${estudiante.casos_activos || 0}</span></td>
            <td><span class="status-badge">${estudiante.casos_completados || 0}</span></td>
            <td><span class="status-badge status-${(estudiante.estado || 'activo').toLowerCase()}">${estudiante.estado || 'activo'}</span></td>
        `;
        tbody.appendChild(row);
    });
    
    updateTableInfo('estudiantes', filteredData.length, data.estudiantes.length);
}

// Renderizar tabla de asignaciones
function renderAsignaciones() {
    const tbody = document.getElementById('tbody-asignaciones');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    let filteredData = data.asignaciones;
    const filter = filters.asignaciones;
    
    if (filter) {
        filteredData = data.asignaciones.filter(asignacion => 
            asignacion.estado && asignacion.estado.toLowerCase().includes(filter.toLowerCase())
        );
    }
    
    filteredData.forEach(asignacion => {
        const row = document.createElement('tr');
        const fecha = asignacion.fecha_asignacion ? 
            new Date(asignacion.fecha_asignacion).toLocaleDateString() : '-';
        const score = asignacion.score_compatibilidad ? 
            (asignacion.score_compatibilidad * 100).toFixed(0) + '%' : 'N/A';
        
        row.innerHTML = `
            <td>${asignacion.id}</td>
            <td>${asignacion.paciente_nombre || '-'}</td>
            <td>${asignacion.estudiante_nombre || '-'} ${asignacion.codigo_estudiante ? '(' + asignacion.codigo_estudiante + ')' : ''}</td>
            <td>${asignacion.tipo_tratamiento_inferido || '-'}</td>
            <td><span class="status-badge">${score}</span></td>
            <td><span class="status-badge status-${(asignacion.estado || 'activo').toLowerCase()}">${asignacion.estado || 'activo'}</span></td>
            <td>${fecha}</td>
        `;
        tbody.appendChild(row);
    });
    
    updateTableInfo('asignaciones', filteredData.length, data.asignaciones.length);
}

// ====================================
//   FUNCIONES DE FILTRADO
// ====================================

// Filtrar pacientes
function filterPacientes() {
    const select = document.getElementById('pacientes-filter');
    if (!select) return;
    
    filters.pacientes = select.value;
    renderPacientes();
}

// Filtrar estudiantes
function filterEstudiantes() {
    const select = document.getElementById('estudiantes-filter');
    if (!select) return;
    
    filters.estudiantes = select.value;
    renderEstudiantes();
}

// Filtrar asignaciones
function filterAsignaciones() {
    const select = document.getElementById('asignaciones-filter');
    if (!select) return;
    
    filters.asignaciones = select.value;
    renderAsignaciones();
}

// ====================================
//   FUNCIONES DE ESTADÍSTICAS
// ====================================

// Actualizar estadísticas principales
function updateStats() {
    const elements = {
        totalPacientes: document.getElementById('total-pacientes'),
        totalEstudiantes: document.getElementById('total-estudiantes'),
        totalAsignaciones: document.getElementById('total-asignaciones'),
        totalSyncs: document.getElementById('total-syncs')
    };
    
    if (elements.totalPacientes) {
        elements.totalPacientes.textContent = data.pacientes.length;
    }
    
    if (elements.totalEstudiantes) {
        elements.totalEstudiantes.textContent = data.estudiantes.length;
    }
    
    if (elements.totalAsignaciones) {
        elements.totalAsignaciones.textContent = data.asignaciones.length;
    }
    
    // Calcular pacientes de hoy para el contador de syncs
    const hoy = new Date().toDateString();
    const pacientesHoy = data.pacientes.filter(p => 
        p.fecha_registro && new Date(p.fecha_registro).toDateString() === hoy
    ).length;
    
    if (elements.totalSyncs) {
        elements.totalSyncs.textContent = pacientesHoy;
    }
    
    // Actualizar cambios
    updateStatChanges();
}

// Actualizar indicadores de cambio en estadísticas
function updateStatChanges() {
    const pacientesChange = document.getElementById('pacientes-change');
    const estudiantesChange = document.getElementById('estudiantes-change');
    const asignacionesChange = document.getElementById('asignaciones-change');
    
    if (pacientesChange) {
        const nuevosHoy = data.pacientes.filter(p => 
            p.fecha_registro && isToday(new Date(p.fecha_registro))
        ).length;
        pacientesChange.textContent = `+${nuevosHoy} nuevos hoy`;
        pacientesChange.className = nuevosHoy > 0 ? 'stat-change positive' : 'stat-change';
    }
    
    if (estudiantesChange) {
        const activos = data.estudiantes.filter(e => e.estado === 'activo').length;
        estudiantesChange.textContent = `${activos} activos`;
    }
    
    if (asignacionesChange) {
        const activas = data.asignaciones.filter(a => a.estado === 'activo').length;
        asignacionesChange.textContent = `${activas} activas`;
    }
}

// Cargar estadísticas de sincronización
async function loadSyncStats() {
    try {
        const response = await fetch('/api/sync/stats');
        const result = await response.json();
        
        if (result.success && result.data) {
            updateSyncStatsDisplay(result.data);
        }
    } catch (error) {
        console.error('Error cargando estadísticas de sync:', error);
    }
}

// Actualizar display de estadísticas de sincronización
function updateSyncStatsDisplay(data) {
    const lastSyncSpan = document.getElementById('last-sync');
    
    if (lastSyncSpan && data.sync && data.sync.lastSync) {
        const lastSyncDate = new Date(data.sync.lastSync);
        lastSyncSpan.textContent = `Última sincronización: ${lastSyncDate.toLocaleString()}`;
    } else if (lastSyncSpan) {
        lastSyncSpan.textContent = 'Última sincronización: Nunca';
    }
    
    // Actualizar otras estadísticas si están disponibles
    if (data.sync) {
        const totalSyncs = document.getElementById('total-syncs');
        if (totalSyncs && data.sync.newPatients !== undefined) {
            totalSyncs.textContent = data.sync.newPatients;
        }
    }
}

// ====================================
//   FUNCIONES DE NAVEGACIÓN POR TABS
// ====================================

// Mostrar tab específico
function showTab(tabName, buttonElement) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Desactivar todos los botones
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Mostrar tab seleccionado
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Activar botón seleccionado
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
    
    currentTab = tabName;
}

// ====================================
//   FUNCIONES DEL LOG DE SINCRONIZACIÓN
// ====================================

// Refrescar log de sincronización
function refreshSyncLog() {
    const logContent = document.getElementById('sync-log-content');
    if (logContent) {
        // Agregar entrada de actualización
        const timestamp = new Date().toLocaleTimeString();
        const newEntry = document.createElement('div');
        newEntry.className = 'log-entry log-info';
        newEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">Log actualizado manualmente</span>
        `;
        logContent.insertBefore(newEntry, logContent.firstChild);
    }
    
    // Recargar estadísticas
    loadSyncStats();
    showToast('Log de sincronización actualizado', 'info');
}

// Limpiar log de sincronización
function clearSyncLog() {
    const logContent = document.getElementById('sync-log-content');
    if (logContent) {
        logContent.innerHTML = `
            <div class="log-entry log-info">
                <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
                <span class="log-message">Log limpiado</span>
            </div>
        `;
    }
    showToast('Log de sincronización limpiado', 'success');
}

// ====================================
//   FUNCIONES DE UTILIDAD
// ====================================

// Verificar si una fecha es hoy
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

// Actualizar información de tabla
function updateTableInfo(type, showing, total) {
    const showingElement = document.getElementById(`${type}-showing`);
    const totalElement = document.getElementById(`${type}-total`);
    
    if (showingElement) {
        showingElement.textContent = showing;
    }
    
    if (totalElement) {
        totalElement.textContent = total;
    }
}

// Mostrar notificación toast
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">${type.toUpperCase()}</div>
        <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

// Formatear fecha
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleString();
    } catch {
        return '-';
    }
}

// Formatear números
function formatNumber(num) {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString();
}

// Función para obtener estado del scheduler automático
async function loadSchedulerStatus() {
    try {
        const response = await fetch('/api/sync/scheduler');
        const result = await response.json();
        
        if (result.success) {
            updateSchedulerDisplay(result.data);
        }
    } catch (error) {
        console.error('Error cargando estado del scheduler:', error);
    }
}

// Actualizar display del scheduler
function updateSchedulerDisplay(data) {
    const indicator = document.getElementById('auto-sync-indicator');
    if (indicator) {
        const isRunning = data.scheduler.isRunning;
        indicator.innerHTML = `
            <span class="status-icon">${isRunning ? '🔄' : '⏸️'}</span>
            <span class="status-text">Sincronización ${isRunning ? 'Automática Activa' : 'Manual'}</span>
        `;
        indicator.className = `status-indicator ${isRunning ? 'status-ok' : 'status-warning'}`;
    }
    
    // Actualizar estadísticas de sync automático si existen
    const autoSyncStats = document.getElementById('auto-sync-stats');
    if (autoSyncStats && data.scheduler) {
        autoSyncStats.innerHTML = `
            <p><strong>Ejecuciones totales:</strong> ${data.scheduler.stats.totalRuns}</p>
            <p><strong>Exitosas:</strong> ${data.scheduler.stats.successfulRuns}</p>
            <p><strong>Fallidas:</strong> ${data.scheduler.stats.failedRuns}</p>
            <p><strong>Última ejecución:</strong> ${data.scheduler.stats.lastRun ? new Date(data.scheduler.stats.lastRun).toLocaleString() : 'Nunca'}</p>
        `;
    }
}

// Cargar estado del scheduler al iniciar
document.addEventListener('DOMContentLoaded', function() {
    // ... código existente ...
    
    // Cargar estado del scheduler
    loadSchedulerStatus();
    
    // Actualizar cada 30 segundos
    setInterval(loadSchedulerStatus, 30000);
});

// ====================================
//   FUNCIONES GLOBALES PARA HTML
// ====================================

// Exponer funciones necesarias globalmente
window.showTab = showTab;
window.loadPacientes = loadPacientes;
window.loadEstudiantes = loadEstudiantes;
window.loadAsignaciones = loadAsignaciones;
window.filterPacientes = filterPacientes;
window.filterEstudiantes = filterEstudiantes;
window.filterAsignaciones = filterAsignaciones;
window.refreshAllData = refreshAllData;
window.refreshSyncLog = refreshSyncLog;
window.clearSyncLog = clearSyncLog;

console.log('✅ Dashboard completamente inicializado');