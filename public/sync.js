// ====================================
//   SYNC.JS - Sistema de Sincronización
//   Dental Matching System V0.2
// ====================================

// Estado global de la aplicación
let syncState = {
    isConnected: false,
    isSyncing: false,
    lastSync: null,
    stats: {
        totalProcessed: 0,
        newPatients: 0, 
        updatedPatients: 0,
        errors: 0,
        lastSync: null
    },
    activityLog: []
};

// Referencias a elementos DOM
const elements = {
    connectionIndicator: null,
    connectionDetails: null,
    syncBtn: null,
    testConnectionBtn: null,
    previewDataBtn: null,
    syncProgress: null,
    progressFill: null,
    syncStatus: null,
    activityLog: null,
    previewSection: null,
    previewContent: null,
    confirmModal: null,
    modalOverlay: null,
    modalTitle: null,
    modalMessage: null,
    modalConfirm: null
};

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando sistema de sincronización...');
    
    initializeElements();
    initializeEventListeners();
    checkConnectionStatus();
    loadSyncStats();
    addLogEntry('Sistema de sincronización iniciado', 'info');
});

// Inicializar referencias a elementos DOM
function initializeElements() {
    elements.connectionIndicator = document.getElementById('connection-indicator');
    elements.connectionDetails = document.getElementById('connection-details');
    elements.syncBtn = document.getElementById('sync-btn');
    elements.testConnectionBtn = document.getElementById('test-connection-btn');
    elements.previewDataBtn = document.getElementById('preview-data-btn');
    elements.syncProgress = document.getElementById('sync-progress');
    elements.progressFill = document.getElementById('progress-fill');
    elements.syncStatus = document.getElementById('sync-status');
    elements.activityLog = document.getElementById('activity-log');
    elements.previewSection = document.getElementById('preview-section');
    elements.previewContent = document.getElementById('preview-content');
    elements.confirmModal = document.getElementById('confirm-modal');
    elements.modalOverlay = document.getElementById('modal-overlay');
    elements.modalTitle = document.getElementById('modal-title');
    elements.modalMessage = document.getElementById('modal-message');
    elements.modalConfirm = document.getElementById('modal-confirm');
}

// Configurar event listeners
function initializeEventListeners() {
    // Botones principales
    elements.testConnectionBtn?.addEventListener('click', handleTestConnection);
    elements.previewDataBtn?.addEventListener('click', handlePreviewData);
    elements.syncBtn?.addEventListener('click', handleSyncData);
    
    // Controles de log
    document.getElementById('clear-log-btn')?.addEventListener('click', clearActivityLog);
    document.getElementById('refresh-log-btn')?.addEventListener('click', refreshActivityLog);
    
    // Preview y modal
    document.getElementById('close-preview')?.addEventListener('click', closePreview);
    elements.modalOverlay?.addEventListener('click', closeModal);
    
    // Teclas de escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePreview();
            closeModal();
        }
    });
}

// ====================================
//   FUNCIONES DE CONEXIÓN
// ====================================

// Verificar estado de conexión
async function checkConnectionStatus() {
    updateConnectionStatus('loading', 'Verificando conexión...', '🔍');
    
    try {
        const response = await fetch('/api/sync/test');
        const result = await response.json();
        
        if (result.success && result.data) {
            syncState.isConnected = true;
            updateConnectionStatus(
                'ok', 
                `Conexión exitosa con Google Sheets`, 
                '✅'
            );
            updateConnectionDetails({
                connected: true,
                sheetInfo: result.data.googleSheets
            });
            addLogEntry('Conexión a Google Sheets verificada exitosamente', 'success');
        } else {
            throw new Error(result.error || 'Error de conexión');
        }
    } catch (error) {
        syncState.isConnected = false;
        updateConnectionStatus(
            'error', 
            `Error de conexión: ${error.message}`, 
            '❌'
        );
        updateConnectionDetails({ connected: false, error: error.message });
        addLogEntry(`Error de conexión: ${error.message}`, 'error');
        console.error('❌ Error verificando conexión:', error);
    }
}

// Actualizar indicador visual de conexión
function updateConnectionStatus(status, message, icon) {
    if (!elements.connectionIndicator) return;
    
    // Limpiar clases de estado
    elements.connectionIndicator.className = `status-indicator status-${status}`;
    
    // Actualizar contenido
    const iconSpan = elements.connectionIndicator.querySelector('.status-icon');
    const textSpan = elements.connectionIndicator.querySelector('.status-text');
    
    if (iconSpan) iconSpan.textContent = icon;
    if (textSpan) textSpan.textContent = message;
}

// Actualizar detalles de conexión
function updateConnectionDetails(connection) {
    if (!elements.connectionDetails) return;
    
    const apiStatus = document.getElementById('api-status');
    const lastCheck = document.getElementById('last-check');
    
    if (apiStatus) {
        apiStatus.textContent = connection.connected ? 'Conectado' : 'Desconectado';
        apiStatus.style.color = connection.connected ? '#28a745' : '#dc3545';
    }
    
    if (lastCheck) {
        lastCheck.textContent = new Date().toLocaleString();
    }
    
    // Actualizar información adicional si está disponible
    if (connection.sheetInfo && connection.sheetInfo.headers) {
        const details = elements.connectionDetails;
        const existingInfo = details.querySelector('.sheet-info');
        
        if (!existingInfo && connection.connected) {
            const sheetInfo = document.createElement('div');
            sheetInfo.className = 'sheet-info';
            sheetInfo.innerHTML = `
                <p><strong>Pacientes encontrados:</strong> ${connection.sheetInfo.pacientesCount || 0}</p>
                <p><strong>Columnas detectadas:</strong> ${connection.sheetInfo.headers ? connection.sheetInfo.headers.length : 0}</p>
            `;
            details.appendChild(sheetInfo);
        }
    }
}

// ====================================
//   FUNCIONES DE EVENTO
// ====================================

// Manejar test de conexión
async function handleTestConnection() {
    if (elements.testConnectionBtn) {
        elements.testConnectionBtn.disabled = true;
        elements.testConnectionBtn.innerHTML = '<span class="btn-icon">⏳</span>Verificando...';
    }
    
    addLogEntry('Iniciando test de conexión...', 'info');
    
    try {
        await checkConnectionStatus();
    } finally {
        if (elements.testConnectionBtn) {
            elements.testConnectionBtn.disabled = false;
            elements.testConnectionBtn.innerHTML = '<span class="btn-icon">🔌</span>Probar Conexión';
        }
    }
}

// Manejar vista previa de datos
async function handlePreviewData() {
    if (!syncState.isConnected) {
        showMessage('error', 'No hay conexión con Google Sheets. Verifica la conexión primero.');
        return;
    }
    
    addLogEntry('Cargando vista previa de Google Sheets...', 'info');
    showPreview();
    
    if (elements.previewDataBtn) {
        elements.previewDataBtn.disabled = true;
        elements.previewDataBtn.innerHTML = '<span class="btn-icon">⏳</span>Cargando...';
    }
    
    try {
        const response = await fetch('/api/sync/test');
        const result = await response.json();
        
        if (result.success && result.data && result.data.googleSheets) {
            const previewData = result.data.googleSheets;
            displayPreviewData(previewData);
            addLogEntry(`Vista previa cargada: ${previewData.pacientesCount} registros encontrados`, 'success');
        } else {
            throw new Error(result.error || 'Error obteniendo vista previa');
        }
    } catch (error) {
        elements.previewContent.innerHTML = `
            <div class="message message-error">
                <strong>Error:</strong> ${error.message}
            </div>
        `;
        addLogEntry(`Error en vista previa: ${error.message}`, 'error');
    } finally {
        if (elements.previewDataBtn) {
            elements.previewDataBtn.disabled = false;
            elements.previewDataBtn.innerHTML = '<span class="btn-icon">👀</span>Vista Previa';
        }
    }
}

// Manejar sincronización de datos
function handleSyncData() {
    if (!syncState.isConnected) {
        showMessage('error', 'No hay conexión con Google Sheets. Verifica la conexión primero.');
        return;
    }
    
    if (syncState.isSyncing) {
        showMessage('warning', 'Ya hay una sincronización en progreso.');
        return;
    }
    
    // Mostrar modal de confirmación
    showConfirmModal(
        'Confirmar Sincronización',
        '¿Estás seguro de que quieres iniciar la sincronización? Esto procesará todos los registros de Google Sheets.',
        executeSyncData
    );
}

// Ejecutar sincronización (después de confirmación)
async function executeSyncData() {
    closeModal();
    syncState.isSyncing = true;
    
    // Mostrar progress bar
    showSyncProgress(true);
    updateSyncProgress(0, 'Iniciando sincronización...');
    
    // Deshabilitar botones
    if (elements.syncBtn) {
        elements.syncBtn.disabled = true;
        elements.syncBtn.innerHTML = '<span class="btn-icon">⏳</span>Sincronizando...';
    }
    
    addLogEntry('🔄 Iniciando sincronización manual...', 'info');
    
    try {
        updateSyncProgress(25, 'Conectando con Google Sheets...');
        await new Promise(resolve => setTimeout(resolve, 500)); // UX delay
        
        updateSyncProgress(50, 'Procesando datos...');
        
        const response = await fetch('/api/sync/pacientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        updateSyncProgress(75, 'Guardando en base de datos...');
        const result = await response.json();
        
        updateSyncProgress(100, 'Sincronización completada!');
        
        if (result.success) {
            syncState.stats = {
                totalProcessed: result.data.processed + result.data.errors,
                newPatients: result.data.processed,
                updatedPatients: 0,
                errors: result.data.errors,
                lastSync: new Date().toISOString()
            };
            updateStatsDisplay(syncState.stats);
            
            const message = `Sincronización exitosa: ${result.data.processed} procesados, ${result.data.errors} errores`;
            addLogEntry(`✅ ${message}`, 'success');
            
            setTimeout(() => {
                showSyncProgress(false);
                showMessage('success', message);
            }, 1000);
        } else {
            throw new Error(result.message || 'Error en sincronización');
        }
        
    } catch (error) {
        const errorMsg = `Error en sincronización: ${error.message}`;
        addLogEntry(`❌ ${errorMsg}`, 'error');
        showMessage('error', errorMsg);
        
        setTimeout(() => {
            showSyncProgress(false);
        }, 1000);
    } finally {
        syncState.isSyncing = false;
        
        // Rehabilitar botones
        if (elements.syncBtn) {
            elements.syncBtn.disabled = false;
            elements.syncBtn.innerHTML = '<span class="btn-icon">🔄</span>Sincronizar Ahora';
        }
    }
}

// ====================================
//   FUNCIONES DE UI
// ====================================

// Mostrar/ocultar progress bar de sincronización
function showSyncProgress(show) {
    if (elements.syncProgress) {
        elements.syncProgress.style.display = show ? 'block' : 'none';
    }
}

// Actualizar progress bar
function updateSyncProgress(percentage, status) {
    if (elements.progressFill) {
        elements.progressFill.style.width = `${percentage}%`;
    }
    if (elements.syncStatus) {
        elements.syncStatus.textContent = status;
    }
}

// Mostrar vista previa
function showPreview() {
    if (elements.previewSection) {
        elements.previewSection.style.display = 'flex';
        elements.previewSection.classList.add('fade-in');
    }
    
    // Loading state
    if (elements.previewContent) {
        elements.previewContent.innerHTML = '<div class="loading">Cargando vista previa...</div>';
    }
}

// Cerrar vista previa
function closePreview() {
    if (elements.previewSection) {
        elements.previewSection.style.display = 'none';
        elements.previewSection.classList.remove('fade-in');
    }
}

// Mostrar datos en la vista previa
function displayPreviewData(data) {
    if (!elements.previewContent || !data) return;
    
    const html = `
        <div class="preview-summary">
            <p><strong>Headers encontrados:</strong> ${data.headers ? data.headers.length : 0}</p>
            <p><strong>Pacientes detectados:</strong> ${data.pacientesCount || 0}</p>
            ${data.sample ? '<p><strong>Ejemplo de datos:</strong></p>' : ''}
        </div>
        
        ${data.headers ? `
        <div class="headers-list">
            <h4>Columnas detectadas:</h4>
            <ul>
                ${data.headers.map(header => `<li>${header}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${data.sample ? `
        <div class="sample-data">
            <h4>Ejemplo de paciente:</h4>
            <pre>${JSON.stringify(data.sample, null, 2)}</pre>
        </div>
        ` : ''}
    `;
    
    elements.previewContent.innerHTML = html;
}

// Mostrar modal de confirmación
function showConfirmModal(title, message, onConfirm) {
    if (elements.modalTitle) elements.modalTitle.textContent = title;
    if (elements.modalMessage) elements.modalMessage.textContent = message;
    
    if (elements.modalConfirm) {
        elements.modalConfirm.onclick = onConfirm;
    }
    
    if (elements.confirmModal) elements.confirmModal.style.display = 'flex';
    if (elements.modalOverlay) elements.modalOverlay.style.display = 'block';
}

// Cerrar modal
function closeModal() {
    if (elements.confirmModal) elements.confirmModal.style.display = 'none';
    if (elements.modalOverlay) elements.modalOverlay.style.display = 'none';
}

// Mostrar mensaje de estado
function showMessage(type, message) {
    // Crear elemento de mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type} slide-in`;
    messageDiv.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message}`;
    
    // Insertar después del header
    const header = document.querySelector('header');
    if (header && header.nextElementSibling) {
        header.parentNode.insertBefore(messageDiv, header.nextElementSibling);
    }
    
    // Remover después de 5 segundos
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// ====================================
//   FUNCIONES DE ESTADÍSTICAS
// ====================================

// Cargar estadísticas de sincronización
async function loadSyncStats() {
    try {
        const response = await fetch('/api/sync/status');
        const result = await response.json();
        
        if (result.success && result.data) {
            const stats = {
                totalProcessed: result.data.totalPacientes || 0,
                newPatients: result.data.pacientesPendientes || 0,
                updatedPatients: result.data.pacientesAsignados || 0,
                errors: 0,
                lastSync: result.data.ultimaActualizacion
            };
            updateStatsDisplay(stats);
            addLogEntry('Estadísticas de sincronización cargadas', 'info');
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        addLogEntry(`Error cargando estadísticas: ${error.message}`, 'error');
    }
}

// Actualizar visualización de estadísticas
function updateStatsDisplay(stats) {
    const elements = {
        lastSyncTime: document.getElementById('last-sync-time'),
        totalProcessed: document.getElementById('total-processed'),
        newPatients: document.getElementById('new-patients'),
        updatedPatients: document.getElementById('updated-patients'),
        syncErrors: document.getElementById('sync-errors')
    };
    
    if (elements.lastSyncTime) {
        elements.lastSyncTime.textContent = stats.lastSync 
            ? new Date(stats.lastSync).toLocaleString()
            : 'Nunca';
    }
    
    if (elements.totalProcessed) {
        elements.totalProcessed.textContent = stats.totalProcessed || '0';
    }
    
    if (elements.newPatients) {
        elements.newPatients.textContent = stats.newPatients || '0';
    }
    
    if (elements.updatedPatients) {
        elements.updatedPatients.textContent = stats.updatedPatients || '0';
    }
    
    if (elements.syncErrors) {
        elements.syncErrors.textContent = stats.errors || '0';
    }
}

// ====================================
//   FUNCIONES DE LOG DE ACTIVIDAD
// ====================================

// Agregar entrada al log de actividad
function addLogEntry(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
        timestamp,
        message,
        type
    };
    
    syncState.activityLog.unshift(entry);
    
    // Mantener solo los últimos 50 entries
    if (syncState.activityLog.length > 50) {
        syncState.activityLog = syncState.activityLog.slice(0, 50);
    }
    
    updateActivityLogDisplay();
}

// Actualizar visualización del log
function updateActivityLogDisplay() {
    if (!elements.activityLog) return;
    
    const html = syncState.activityLog.map(entry => `
        <div class="log-entry">
            <span class="log-time">[${entry.timestamp}]</span>
            <span class="log-message log-${entry.type}">${entry.message}</span>
        </div>
    `).join('');
    
    elements.activityLog.innerHTML = html || '<div class="log-entry"><span class="log-message">No hay actividad registrada</span></div>';
    
    // Auto-scroll al último entry
    elements.activityLog.scrollTop = 0;
}

// Limpiar log de actividad
function clearActivityLog() {
    syncState.activityLog = [];
    updateActivityLogDisplay();
    addLogEntry('Log de actividad limpiado', 'info');
}

// Refrescar log de actividad
function refreshActivityLog() {
    addLogEntry('Log de actividad actualizado', 'info');
    updateActivityLogDisplay();
}

// ====================================
//   FUNCIONES DE UTILIDAD
// ====================================

// Formatear fecha para mostrar
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}

// Formatear números con separadores de miles
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Validar respuesta de API
function validateApiResponse(response, data) {
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (!data.success) {
        throw new Error(data.error || data.message || 'Error desconocido');
    }
    
    return true;
}

// ====================================
//   FUNCIONES GLOBALES PARA HTML
// ====================================

// Exponer funciones necesarias para el HTML
window.closeModal = closeModal;
window.closePreview = closePreview;

// Auto-refresh de estado cada 5 minutos
setInterval(() => {
    if (!syncState.isSyncing) {
        checkConnectionStatus();
        loadSyncStats();
    }
}, 5 * 60 * 1000);

console.log('🔄 Sistema de sincronización completamente cargado');