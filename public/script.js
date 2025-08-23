// ====================================
//   SCRIPT.JS - Dashboard Administrativo
//   Dental Matching System V0.2 - CORREGIDO
// ====================================

// Estado global de la aplicación
let currentSection = 'dashboard';
let data = {
    pacientes: [],
    estudiantes: [],
    asignaciones: []
};

let systemStats = {
    totalPacientes: 0,
    totalEstudiantes: 0,
    totalAsignaciones: 0,
    totalSyncs: 0
};

let schedulerStatus = {
    isRunning: false,
    lastSync: null,
    nextRun: null
};

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Dashboard Administrativo V0.2');
    
    initializeEventListeners();
    checkSystemStatus();
    loadDashboardData();
    startAutoRefresh();
    
    // Mostrar dashboard por defecto
    showSection('dashboard');
});

// ====================================
//   INICIALIZACIÓN
// ====================================

function initializeEventListeners() {
    // Navigation listeners
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Mobile sidebar toggle
    const mobileToggle = document.querySelector('.mobile-sidebar-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleMobileSidebar);
    }

    // Sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Filter listeners
    document.addEventListener('change', handleFilterChange);

    // Action buttons
    document.addEventListener('click', handleActionClicks);

    // Modal listeners
    document.addEventListener('click', handleModalClicks);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Botones específicos del dashboard
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshAllData);
    }

    const quickSyncBtn = document.getElementById('quickSync');
    if (quickSyncBtn) {
        quickSyncBtn.addEventListener('click', runManualSync);
    }

    const quickMatchBtn = document.getElementById('quickMatch');
    if (quickMatchBtn) {
        quickMatchBtn.addEventListener('click', runManualMatching);
    }

    // Botones de acciones rápidas
    const runMatchingBtn = document.getElementById('runMatching');
    if (runMatchingBtn) {
        runMatchingBtn.addEventListener('click', runManualMatching);
    }

    const syncNowBtn = document.getElementById('syncNow');
    if (syncNowBtn) {
        syncNowBtn.addEventListener('click', runManualSync);
    }

    const viewPendingBtn = document.getElementById('viewPending');
    if (viewPendingBtn) {
        viewPendingBtn.addEventListener('click', () => showSection('patients'));
    }

    const systemHealthBtn = document.getElementById('systemHealth');
    if (systemHealthBtn) {
        systemHealthBtn.addEventListener('click', () => showSection('settings'));
    }

 initializeMatchingEventListeners();
}

function handleNavigation(e) {
    e.preventDefault();
    const target = e.currentTarget;
    const sectionName = target.getAttribute('data-section') || 
                       target.getAttribute('href')?.replace('#', '') ||
                       target.closest('.nav-item').id?.replace('nav-', '');
    
    if (sectionName) {
        showSection(sectionName);
        updateActiveNavigation(target);
        
        // Close mobile sidebar if open
        closeMobileSidebar();
    }
}

function updateActiveNavigation(activeLink) {
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active to current item
    const navItem = activeLink.closest('.nav-item');
    if (navItem) {
        navItem.classList.add('active');
    }
}

// ====================================
//   NAVEGACIÓN Y SECCIONES
// ====================================

function showSection(sectionName) {
    console.log(`📍 Navegando a: ${sectionName}`);
    
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
        
        // Actualizar título
        updatePageTitle(sectionName);
        
        // Cargar datos específicos de la sección
        loadSectionData(sectionName);
    }
}

function updatePageTitle(sectionName) {
    const pageTitle = document.getElementById('pageTitle');
    if (!pageTitle) return;
    
    const titles = {
        dashboard: 'Dashboard Principal',
        patients: 'Gestión de Pacientes',
        students: 'Gestión de Estudiantes', 
        assignments: 'Asignaciones y Matches',
        matching: 'Sistema de Matching',
        sync: 'Sincronización de Datos',
        analytics: 'Análisis y Reportes',
        settings: 'Configuración del Sistema'
    };
    
    pageTitle.textContent = titles[sectionName] || 'Dashboard';
}

function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'patients':
            loadPacientes();
            break;
        case 'students':
            loadEstudiantes();
            break;
        case 'assignments':
            loadAsignaciones();
            break;
        case 'matching':
            loadMatchingData();
            break;
        case 'sync':
            loadSyncData();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// ====================================
//   SIDEBAR CONTROLS
// ====================================

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('sidebar-collapsed');
    }
}

function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
}

// ====================================
//   CARGA DE DATOS
// ====================================

async function loadDashboardData() {
    try {
        showLoadingState('dashboard-loading');
        
        // Usar el endpoint /api/dashboard que ya existe
        const dashboardResponse = await fetch('/api/dashboard');
        
        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            if (dashboardData.success && dashboardData.data) {
                updateKPICards({
                    pacientes: {
                        total: dashboardData.data.overview.totalPatients || 0,
                        pendientes: dashboardData.data.overview.pendingPatients || 0,
                        hoy: dashboardData.data.overview.todayMatches || 0
                    },
                    estudiantes: {
                        total: dashboardData.data.overview.totalStudents || 0,
                        activos: dashboardData.data.overview.availableStudents || 0
                    },
                    matching: {
                        total_asignaciones: dashboardData.data.overview.totalMatches || 0,
                        score_promedio: dashboardData.data.matching.averageScore || 0,
                        hoy: dashboardData.data.overview.todayMatches || 0,
                        automaticas: dashboardData.data.matching.automaticMatches || 0,
                        manuales: dashboardData.data.matching.manualMatches || 0
                    },
                    system: {
                        uptime: dashboardData.data.performance.uptime
                    }
                });
                
                updateSystemStatus({
                    services: {
                        scheduler: dashboardData.data.scheduler.isActive,
                        database: true,
                        googleSheets: true
                    }
                });
            }
        } else {
            throw new Error('Error al cargar el dashboard');
        }
        
        await loadRecentActivity();
        hideLoadingState('dashboard-loading');
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        // Usar valores por defecto si falla
        updateKPICards({
            pacientes: { total: 0, pendientes: 0, hoy: 0 },
            estudiantes: { total: 0, activos: 0 },
            matching: { total_asignaciones: 0, score_promedio: 0, hoy: 0 }
        });
        hideLoadingState('dashboard-loading');
    }
}
async function loadPacientes() {
    try {
        const patientsLoading = document.getElementById('patientsLoading');
        const patientsTable = document.getElementById('patientsTable');
        
        if (patientsLoading) patientsLoading.style.display = 'flex';
        if (patientsTable) patientsTable.style.display = 'none';
        
        const response = await fetch('/api/pacientes');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📥 Respuesta de /api/pacientes:', result);
        
        if (result.success) {
            const pacientesData = result.data || [];
            
            if (pacientesData.length === 0) {
                console.log('No se encontraron pacientes');
                const tbody = document.getElementById('patientsTableBody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem;">No hay pacientes registrados</td></tr>';
                }
                return;
            }
            
            // Procesar cada paciente para asegurar que tiene los campos necesarios
            data.pacientes = pacientesData.map(paciente => ({
                id: paciente.id,
                nombre_completo: paciente.nombre_completo || paciente.nombre || '',
                edad: paciente.edad || 0,
                telefono: paciente.telefono || '',
                email: paciente.email || '',
                ciudad: paciente.ciudad || '',
                tipo_tratamiento_inferido: paciente.tipo_tratamiento_inferido || 'No especificado',
                nivel_dolor: paciente.nivel_dolor || 0,
                prioridad: paciente.prioridad || 'Moderada',
                estado: paciente.estado || 'pendiente',
                fecha_registro: paciente.fecha_registro || paciente.timestamp || new Date().toISOString(),
                estudiante_asignado: paciente.estudiante_asignado || null,
                activo: paciente.activo !== undefined ? paciente.activo : true
            }));
            
            renderPacientesTable();
            
            // Contar pendientes correctamente
            const pendientes = data.pacientes.filter(p => 
                !p.estudiante_asignado && (p.estado === 'pendiente' || !p.estado)
            ).length;
            
            const asignados = data.pacientes.filter(p => 
                p.estudiante_asignado || p.estado === 'asignado'
            ).length;
            
            updateBadge('pendingPatientsBadge', pendientes);
            
            console.log(`✅ ${data.pacientes.length} pacientes cargados:`);
            console.log(`   - Pendientes: ${pendientes}`);
            console.log(`   - Asignados: ${asignados}`);
            
        } else {
            throw new Error(result.error || 'Error desconocido cargando pacientes');
        }
        
        if (patientsLoading) patientsLoading.style.display = 'none';
        if (patientsTable) patientsTable.style.display = 'table';
        
    } catch (error) {
        console.error('Error cargando pacientes:', error);
        showErrorMessage('Error cargando pacientes: ' + error.message);
        
        // Ocultar loading y mostrar error
        const patientsLoading = document.getElementById('patientsLoading');
        if (patientsLoading) {
            patientsLoading.innerHTML = `
                <div class="loading-state error">
                    <i class="fas fa-exclamation-triangle" style="color: #dc2626;"></i>
                    <span style="color: #dc2626;">Error cargando pacientes: ${error.message}</span>
                </div>
            `;
        }
    }
}

async function loadEstudiantes() {
    try {
        const studentsLoading = document.getElementById('studentsLoading');
        const studentsTable = document.getElementById('studentsTable');
        
        if (studentsLoading) studentsLoading.style.display = 'flex';
        if (studentsTable) studentsTable.style.display = 'none';
        
        const response = await fetch('/api/estudiantes');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            data.estudiantes = result.data;
            renderEstudiantesTable();
            
            // Contar activos correctamente
            const activos = data.estudiantes.filter(e => e.estado === 'activo').length;
            updateBadge('availableStudentsBadge', activos);
            
            console.log(`✅ ${data.estudiantes.length} estudiantes cargados (${activos} activos)`);
        } else {
            throw new Error(result.error || 'Error desconocido cargando estudiantes');
        }
        
        if (studentsLoading) studentsLoading.style.display = 'none';
        if (studentsTable) studentsTable.style.display = 'table';
        
    } catch (error) {
        console.error('Error cargando estudiantes:', error);
        showErrorMessage('Error cargando estudiantes: ' + error.message);
        
        // Ocultar loading y mostrar error
        const studentsLoading = document.getElementById('studentsLoading');
        if (studentsLoading) {
            studentsLoading.innerHTML = `
                <div class="loading-state error">
                    <i class="fas fa-exclamation-triangle" style="color: #dc2626;"></i>
                    <span style="color: #dc2626;">Error cargando estudiantes</span>
                </div>
            `;
        }
    }
}

async function loadAsignaciones() {
    try {
        const assignmentsLoading = document.getElementById('assignmentsLoading');
        const assignmentsTable = document.getElementById('assignmentsTable');
        
        if (assignmentsLoading) assignmentsLoading.style.display = 'flex';
        if (assignmentsTable) assignmentsTable.style.display = 'none';
        
        const response = await fetch('/api/asignaciones');
        const result = await response.json();
        
        if (result.success) {
            data.asignaciones = result.data || [];
            renderAsignacionesTable();
        } else {
            throw new Error(result.error || 'Error cargando asignaciones');
        }
        
        if (assignmentsLoading) assignmentsLoading.style.display = 'none';
        if (assignmentsTable) assignmentsTable.style.display = 'table';
        
    } catch (error) {
        console.error('Error cargando asignaciones:', error);
        showErrorMessage('Error cargando asignaciones: ' + error.message);
    }
}

async function loadMatchingData() {
    try {
        const [statsResponse, pendingResponse] = await Promise.all([
            fetch('/api/matching/stats').catch(() => ({ ok: false })),
            fetch('/api/matching/pending').catch(() => ({ ok: false }))
        ]);
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.success) {
                updateMatchingStats(statsData.data);
            }
        }
        
        if (pendingResponse.ok) {
            const pendingData = await pendingResponse.json();
            if (pendingData.success) {
                updatePendingPatients(pendingData.data);
            }
        }
        
    } catch (error) {
        console.error('Error cargando datos de matching:', error);
    }
}

async function loadSyncData() {
    try {
        const response = await fetch('/api/sync/status');
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateSyncStatus(result.data);
            }
        }
        
    } catch (error) {
        console.error('Error cargando datos de sync:', error);
    }
}

async function loadAnalytics() {
    try {
        const response = await fetch('/api/stats');
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateAnalyticsCharts(result.data);
            }
        }
        
    } catch (error) {
        console.error('Error cargando analytics:', error);
    }
}

async function loadSettings() {
    try {
        const [healthResponse, schedulerResponse] = await Promise.all([
            fetch('/api/health').catch(() => ({ ok: false })),
            fetch('/api/scheduler/status').catch(() => ({ ok: false }))
        ]);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            if (healthData.success) {
                updateSystemHealth(healthData.data);
            }
        }
        
        if (schedulerResponse.ok) {
            const schedulerData = await schedulerResponse.json();
            if (schedulerData.success) {
                updateSchedulerStatus(schedulerData.data);
            }
        }
        
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

// ====================================
//   FUNCIONES DE ACTUALIZACIÓN DE UI
// ====================================

function updateKPICards(data) {
    // Valores seguros con fallbacks
    const totalPacientes = data.pacientes?.total || 0;
    const totalEstudiantes = data.estudiantes?.total || 0;
    const totalAsignaciones = data.matching?.total_asignaciones || 0;
    const scorePromedio = data.matching?.score_promedio || 0;
    
    // Actualizar valores principales
    updateKPIValue('totalPatients', totalPacientes);
    updateKPIValue('totalStudents', totalEstudiantes);
    updateKPIValue('totalMatches', totalAsignaciones);
    updateKPIValue('successRate', scorePromedio ? Math.round(scorePromedio * 100) + '%' : '0%');
    
    // Actualizar cambios y badges
    updateKPIChange('patientsChange', data.pacientes?.hoy || 0, 'nuevos hoy');
    updateKPIChange('studentsAvailable', data.estudiantes?.activos || 0, 'disponibles');
    updateKPIChange('matchesToday', data.matching?.hoy || 0, 'hoy');
    updateKPIChange('avgScore', scorePromedio ? Math.round(scorePromedio * 100) + '%' : '0%', 'promedio');
    
    // Actualizar badges en sidebar
    updateBadge('pendingPatientsBadge', data.pacientes?.pendientes || 0);
    updateBadge('availableStudentsBadge', data.estudiantes?.activos || 0);
    updateBadge('todayMatchesBadge', data.matching?.hoy || 0);
}

function updateKPIValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function updateKPIChange(elementId, value, suffix = '') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = `${value} ${suffix}`;
        element.className = value > 0 ? 'kpi-change positive' : 'kpi-change';
    }
}

function updateBadge(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        element.style.display = value > 0 ? 'inline-block' : 'none';
    }
}

function updateSystemStatus(statusData) {
    const schedulerIndicator = document.getElementById('schedulerStatus');
    if (schedulerIndicator && statusData) {
        const isRunning = statusData.services?.scheduler || false;
        const statusText = schedulerIndicator.querySelector('span');
        if (statusText) {
            statusText.textContent = `Sistema ${isRunning ? 'Automático' : 'Manual'}`;
        }
        schedulerIndicator.className = `scheduler-indicator ${isRunning ? 'status-ok' : 'status-warning'}`;
    }

    // Actualizar estado de servicios
    updateServiceStatus('dbStatus', statusData.services?.database);
    updateServiceStatus('sheetsStatus', statusData.services?.googleSheets);
    updateServiceStatus('autoStatus', statusData.services?.scheduler);
    updateServiceStatus('matchingStatus', true); // Siempre disponible
}

function updateServiceStatus(elementId, isOnline) {
    const element = document.getElementById(elementId);
    if (element) {
        if (isOnline) {
            element.textContent = '✅ Conectado';
            element.className = 'service-status status-ok';
        } else {
            element.textContent = '❌ Desconectado';
            element.className = 'service-status status-error';
        }
    }
}

function updateMatchingStats(stats) {
    updateElement('pendingPatientsCount', stats.pacientes_pendientes || 0);
    updateElement('availableStudentsCount', stats.estudiantes_disponibles || 0);
    updateElement('todayMatchesCount', stats.hoy || 0);
    
    // Mostrar resultados si hay datos
    const resultsSection = document.getElementById('matchingResults');
    if (resultsSection && stats.total_asignaciones > 0) {
        resultsSection.style.display = 'block';
        const content = document.getElementById('matchingResultsContent');
        if (content) {
            content.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <h4>Total Asignaciones</h4>
                        <div class="stat-value">${stats.total_asignaciones || 0}</div>
                    </div>
                    <div class="stat-card">
                        <h4>Score Promedio</h4>
                        <div class="stat-value">${stats.score_promedio ? (stats.score_promedio * 100).toFixed(1) + '%' : '0%'}</div>
                    </div>
                    <div class="stat-card">
                        <h4>Matches Automáticos</h4>
                        <div class="stat-value">${stats.automaticas || 0}</div>
                    </div>
                    <div class="stat-card">
                        <h4>Matches Manuales</h4>
                        <div class="stat-value">${stats.manuales || 0}</div>
                    </div>
                </div>
            `;
        }
    }
}

function updatePendingPatients(patients) {
    // Actualizar lista de pacientes pendientes si existe
    const pendingList = document.getElementById('pendingPatientsList');
    if (pendingList) {
        pendingList.innerHTML = patients.map(patient => `
            <div class="patient-item">
                <strong>${patient.nombre_completo}</strong>
                <span class="treatment">${patient.tipo_tratamiento_inferido}</span>
                <span class="priority ${getPriorityClass(patient.prioridad)}">${patient.prioridad}</span>
            </div>
        `).join('');
    }
}

function updateSyncStatus(syncData) {
    updateElement('lastSyncTime', syncData.autoSync?.lastSync ? 
        new Date(syncData.autoSync.lastSync).toLocaleString() : 'Nunca');
    updateElement('processedCount', syncData.autoSync?.totalRuns || 0);
    updateElement('syncSuccessRate', syncData.autoSync?.totalRuns > 0 ? 
        ((syncData.autoSync.successfulRuns / syncData.autoSync.totalRuns) * 100).toFixed(1) + '%' : '100%');
    updateElement('autoSyncStatus', syncData.autoSync?.isRunning ? 'Activo' : 'Manual');
}

function updateAnalyticsCharts(data) {
    // Actualizar gráficos básicos con datos disponibles
    const treatmentChart = document.getElementById('treatmentChart');
    if (treatmentChart) {
        treatmentChart.innerHTML = `
            <div class="chart-placeholder">
                <h4>Tratamientos Comunes</h4>
                <div class="chart-data">
                    ${data.tratamientos ? data.tratamientos.map(t => `
                        <div class="chart-item">
                            <span class="chart-label">${t.tratamiento}</span>
                            <span class="chart-value">${t.cantidad}</span>
                        </div>
                    `).join('') : '<p>No hay datos disponibles</p>'}
                </div>
            </div>
        `;
    }

    // Actualizar estadísticas generales
    updateElement('avgMatchingScore', data.matching?.score_promedio ? 
        (data.matching.score_promedio * 100).toFixed(1) + '%' : 'N/A');
    updateElement('avgAssignmentTime', '< 5 min'); // Valor aproximado
    updateElement('monthlyCompletions', data.matching?.total_asignaciones || 0);
    updateElement('systemUptime', formatUptime(data.system?.uptime || 0));
}

function updateSchedulerStatus(schedulerData) {
    if (schedulerData) {
        updateElement('autoMatchingConfig', schedulerData.isRunning ? 'Activo' : 'Inactivo');
        
        // Actualizar estado de trabajos
        const jobsList = document.getElementById('scheduledJobsList');
        if (jobsList && schedulerData.jobs) {
            jobsList.innerHTML = schedulerData.jobs.map(job => `
                <div class="job-item">
                    <strong>${job.description}</strong>
                    <span class="job-status ${job.isRunning ? 'running' : 'stopped'}">${job.isRunning ? 'Ejecutándose' : 'Detenido'}</span>
                </div>
            `).join('');
        }
    }
}

function updateSystemHealth(healthData) {
    if (healthData) {
        updateServiceStatus('apiHealth', healthData.services?.api);
        updateServiceStatus('databaseHealth', healthData.services?.database);
        updateServiceStatus('googleSheetsHealth', healthData.services?.googleSheets);
        updateServiceStatus('schedulerHealth', healthData.services?.scheduler);
        
        // Actualizar información del sistema
        updateElement('systemVersion', 'v0.2.0');
        updateElement('uptimeDisplay', formatUptime(healthData.uptime || 0));
        updateElement('memoryUsage', 'N/A');
        updateElement('lastSystemUpdate', new Date().toLocaleString());
    }
}

function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// ====================================
//   RENDERIZADO DE TABLAS
// ====================================

function renderPacientesTable() {
    const tbody = document.getElementById('patientsTableBody');
    if (!tbody) {
        console.error('Element patientsTableBody not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!data.pacientes || !Array.isArray(data.pacientes)) {
        console.warn('No hay datos de pacientes válidos para mostrar');
        tbody.innerHTML = '<tr><td colspan="10">No hay pacientes para mostrar</td></tr>';
        return;
    }
    
    console.log(`Renderizando ${data.pacientes.length} pacientes`);
    
    data.pacientes.forEach(paciente => {
        const row = document.createElement('tr');
        
        // Función helper para valores seguros
        const safeValue = (value, defaultValue = '-') => {
            if (value === null || value === undefined || value === '') {
                return defaultValue;
            }
            return value.toString();
        };
        
        // Fecha de registro segura
        const fechaRegistro = (paciente.fecha_registro || paciente.timestamp) ? 
            new Date(paciente.fecha_registro || paciente.timestamp).toLocaleDateString() : '-';
        
        // Estado real del paciente con lógica mejorada
        let estadoReal = 'pendiente';
        if (paciente.estudiante_asignado && paciente.estudiante_asignado !== null) {
            estadoReal = 'asignado';
        } else if (paciente.estado && paciente.estado !== '' && paciente.estado !== null) {
            estadoReal = paciente.estado;
        }
        
        // Nivel de dolor seguro
        const nivelDolor = paciente.nivel_dolor || paciente.intensidadMolestia || 0;
        
        // Nombre seguro
        const nombreCompleto = safeValue(
            paciente.nombre_completo || paciente.nombre || paciente.nombreCompleto, 
            'Sin nombre'
        );
        
        // Teléfono seguro
        const telefono = safeValue(paciente.telefono || paciente.phone);
        
        // Tratamiento seguro
        const tratamiento = safeValue(
            paciente.tipo_tratamiento_inferido || paciente.tratamiento || paciente.type_tratamiento,
            'No especificado'
        );
        
        // Prioridad segura
        const prioridad = safeValue(paciente.prioridad, 'Moderada');
        
        // Edad segura
        const edad = paciente.edad && paciente.edad > 0 ? paciente.edad : '-';
        
        let estadoClass = `status-${estadoReal.toLowerCase().replace(' ', '-')}`;
        
        row.innerHTML = `
            <td>${safeValue(paciente.id)}</td>
            <td><strong>${nombreCompleto}</strong></td>
            <td>${edad}</td>
            <td>${telefono}</td>
            <td>${tratamiento}</td>
            <td><span class="status-badge">${nivelDolor}/10</span></td>
            <td><span class="priority-badge ${getPriorityClass(prioridad)}">${prioridad}</span></td>
            <td><span class="status-badge ${estadoClass}">${estadoReal.toUpperCase()}</span></td>
            <td>${fechaRegistro}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="verPaciente(${paciente.id})" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                ${estadoReal === 'pendiente' ? `
                    <button class="btn btn-sm btn-success" onclick="asignarPaciente(${paciente.id})" title="Asignar estudiante">
                        <i class="fas fa-user-plus"></i>
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderEstudiantesTable() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!data.estudiantes || !Array.isArray(data.estudiantes)) {
        tbody.innerHTML = '<tr><td colspan="9">No hay estudiantes para mostrar</td></tr>';
        return;
    }
    
    data.estudiantes.forEach(estudiante => {
        const row = document.createElement('tr');
        
        // Procesar especialidades correctamente
        let especialidadesTexto = '-';
        if (estudiante.especialidades) {
            if (Array.isArray(estudiante.especialidades)) {
                especialidadesTexto = estudiante.especialidades.join(', ');
            } else if (typeof estudiante.especialidades === 'string') {
                especialidadesTexto = estudiante.especialidades.split(',').map(e => e.trim()).join(', ');
            }
        }
        
        row.innerHTML = `
            <td><strong>${estudiante.codigo_estudiante || 'N/A'}</strong></td>
            <td>${estudiante.nombre_completo || 'Sin nombre'}</td>
            <td>${estudiante.año_carrera || 'N/A'}</td>
            <td>${estudiante.universidad || 'N/A'}</td>
            <td>${especialidadesTexto}</td>
            <td><span class="status-badge">${estudiante.casos_activos || 0}</span></td>
            <td><span class="status-badge">${estudiante.casos_completados || 0}</span></td>
            <td><span class="status-badge status-${(estudiante.estado || 'activo').toLowerCase()}">${estudiante.estado || 'activo'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="verEstudiante(${estudiante.id})">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderAsignacionesTable() {
    const tbody = document.getElementById('assignmentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.asignaciones.forEach(asignacion => {
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
            <td><span class="status-badge status-${(asignacion.estado || 'asignado').toLowerCase()}">${asignacion.estado || 'asignado'}</span></td>
            <td>${fecha}</td>
            <td><span class="badge ${asignacion.observaciones_sistema && asignacion.observaciones_sistema.includes('MANUAL') ? 'manual' : 'auto'}">${asignacion.observaciones_sistema && asignacion.observaciones_sistema.includes('MANUAL') ? 'Manual' : 'Auto'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="verAsignacion(${asignacion.id})">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ====================================
//   UTILIDADES
// ====================================

function getPriorityClass(prioridad) {
    const classes = {
        'Muy Alta': 'muy-alta',
        'Alta': 'alta',
        'Moderada': 'moderada',
        'Baja': 'baja'
    };
    return classes[prioridad] || 'moderada';
}

function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

function showLoadingState(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'flex';
    }
}

function hideLoadingState(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

function showErrorState(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 2rem; color: #dc2626;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p><strong>Error cargando datos</strong></p>
                <p style="font-size: 0.9rem; opacity: 0.8;">${message}</p>
                <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">
                    <i class="fas fa-refresh"></i> Recargar página
                </button>
            </div>
        `;
    }
}

function showErrorMessage(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">${type.toUpperCase()}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ====================================
//   ACCIONES Y EVENTOS
// ====================================


// Función para asignar paciente manualmente
async function asignarPaciente(pacienteId) {
    try {
        const paciente = data.pacientes.find(p => p.id === pacienteId);
        if (!paciente) {
            showToast('Paciente no encontrado', 'error');
            return;
        }
        
        showToast(`Iniciando asignación automática para ${paciente.nombre_completo}...`, 'info');
        
        const response = await fetch('/api/matching/auto', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showToast(`Asignación completada: ${result.data?.matched || 0} pacientes asignados`, 'success');
            await loadPacientes(); // Recargar datos
            await loadDashboardData(); // Actualizar dashboard
        } else {
            throw new Error(result.message || 'Error en asignación');
        }
    } catch (error) {
        console.error('Error asignando paciente:', error);
        showToast(`Error en asignación: ${error.message}`, 'error');
    }
}

// Función helper mejorada para validar datos
function validatePatientData(paciente) {
    const errors = [];
    
    if (!paciente.nombre_completo && !paciente.nombre) {
        errors.push('Nombre requerido');
    }
    
    if (!paciente.telefono && !paciente.email) {
        errors.push('Teléfono o email requerido');
    }
    
    if (paciente.edad && (paciente.edad < 1 || paciente.edad > 120)) {
        errors.push('Edad inválida');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Función para debug - mostrar estructura de datos
function debugPatientData() {
    console.log('🔍 DEBUGGING - Estructura de datos de pacientes:');
    if (data.pacientes && data.pacientes.length > 0) {
        console.log('Primer paciente:', data.pacientes[0]);
        console.log('Campos disponibles:', Object.keys(data.pacientes[0]));
        
        // Verificar estados
        const estados = [...new Set(data.pacientes.map(p => p.estado))];
        console.log('Estados encontrados:', estados);
        
        // Verificar estudiantes asignados
        const conEstudiante = data.pacientes.filter(p => p.estudiante_asignado).length;
        console.log(`Pacientes con estudiante asignado: ${conEstudiante}/${data.pacientes.length}`);
    } else {
        console.log('No hay datos de pacientes');
    }
}

// Agregar debugPatientData a window para poder ejecutarlo desde consola
window.debugPatientData = debugPatientData;


function handleFilterChange(e) {
    const target = e.target;
    if (!target.classList.contains('filter-select')) return;
    
    const value = target.value;
    console.log('Filtro aplicado:', value);
    
    // Aplicar filtros según el valor seleccionado
    if (target.id === 'patientsFilter') {
        filterPacientes(value);
    } else if (target.id === 'studentsFilter') {
        filterEstudiantes(value);
    } else if (target.id === 'assignmentsFilter') {
        filterAsignaciones(value);
    }
}

function handleActionClicks(e) {
    const target = e.target.closest('button');
    if (!target) return;
    
    const action = target.dataset.action || target.id;
    
    // Prevenir múltiples clics
    if (target.disabled) return;
    
    switch (action) {
        case 'refresh-all':
        case 'refreshData':
            refreshAllData();
            break;
        case 'run-matching':
        case 'runMatching':
        case 'executeMatching':
            runManualMatching();
            break;
        case 'sync-now':
        case 'syncNow':
        case 'executeSync':
            runManualSync();
            break;
        case 'refreshPatients':
            loadPacientes();
            break;
        case 'refreshStudents':
            loadEstudiantes();
            break;
        case 'refreshAssignments':
            loadAsignaciones();
            break;
        case 'refreshAnalytics':
            loadAnalytics();
            break;
        case 'testConnection':
            testGoogleSheetsConnection();
            break;
        case 'exportData':
            exportSystemData();
            break;
        case 'cleanupData':
            cleanupSystemData();
            break;
        case 'backupSystem':
            backupSystemData();
            break;
        case 'viewLogs':
            viewSystemLogs();
            break;
        default:
            // Si no coincide con ninguna acción, verificar si es un botón de matching
            if (target.closest('#matching')) {
                handleMatchingAction(target, action);
            }
            break;
    }
}

// Nueva función para manejar acciones específicas de matching
function handleMatchingAction(button, action) {
    const buttonText = button.textContent.trim();
    
    if (buttonText.includes('Ejecutar Matching') || action.includes('matching')) {
        runManualMatching();
    } else if (buttonText.includes('Sugerencias')) {
        loadMatchingSuggestions();
    } else if (buttonText.includes('Pendientes')) {
        showSection('patients');
        const filter = document.getElementById('patientsFilter');
        if (filter) {
            filter.value = 'pendiente';
            filterPacientes('pendiente');
        }
    } else if (buttonText.includes('Disponibles')) {
        showSection('students');
        const filter = document.getElementById('studentsFilter');
        if (filter) {
            filter.value = 'disponible';
            filterEstudiantes('disponible');
        }
    }
}

function handleMatchingAction(button, action) {
    const buttonText = button.textContent.trim();
    
    if (buttonText.includes('Ejecutar Matching') || action.includes('matching')) {
        runManualMatching();
    } else if (buttonText.includes('Sugerencias')) {
        loadMatchingSuggestions();
    } else if (buttonText.includes('Pendientes')) {
        showSection('patients');
        const filter = document.getElementById('patientsFilter');
        if (filter) {
            filter.value = 'pendiente';
            filterPacientes('pendiente');
        }
    } else if (buttonText.includes('Disponibles')) {
        showSection('students');
        const filter = document.getElementById('studentsFilter');
        if (filter) {
            filter.value = 'disponible';
            filterEstudiantes('disponible');
        }
    }
}

function handleModalClicks(e) {
    const target = e.target;
    
    if (target.classList.contains('modal-overlay') || target.classList.contains('modal-close')) {
        closeModal();
    }
}

function handleKeyboardShortcuts(e) {
    // ESC para cerrar modales
    if (e.key === 'Escape') {
        closeModal();
        closeMobileSidebar();
    }
    
    // Atajos de navegación con Ctrl/Cmd
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case '1':
                e.preventDefault();
                showSection('dashboard');
                break;
            case '2':
                e.preventDefault();
                showSection('patients');
                break;
            case '3':
                e.preventDefault();
                showSection('students');
                break;
            case '4':
                e.preventDefault();
                showSection('assignments');
                break;
            case 'r':
                e.preventDefault();
                refreshAllData();
                break;
        }
    }
}

// ====================================
//   FUNCIONES DE ACCIÓN
// ====================================

async function refreshAllData() {
    showToast('Actualizando todos los datos...', 'info');
    
    try {
        await loadSectionData(currentSection);
        showToast('Datos actualizados correctamente', 'success');
    } catch (error) {
        console.error('Error actualizando datos:', error);
        showToast('Error al actualizar los datos', 'error');
    }
}

async function runManualMatching() {
    if (!confirm('¿Estás seguro de que quieres ejecutar el matching manual?')) return;
    
    showToast('Ejecutando matching manual...', 'info');
    
    try {
        const response = await fetch('/api/matching/auto', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showToast(`Matching completado: ${result.data?.matched || 0} pacientes asignados`, 'success');
            await refreshAllData();
            updateBadge('todayMatchesBadge', (result.data?.matched || 0));
        } else {
            throw new Error(result.message || 'Error en matching');
        }
    } catch (error) {
        console.error('Error en matching:', error);
        showToast(`Error en matching: ${error.message}`, 'error');
    }
}

async function runManualSync() {
    if (!confirm('¿Estás seguro de que quieres ejecutar la sincronización manual?')) return;
    
    showToast('Ejecutando sincronización manual...', 'info');
    
    try {
        const response = await fetch('/api/sync/pacientes', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showToast(`Sincronización completada: ${result.data?.processed || 0} pacientes procesados`, 'success');
            await refreshAllData();
        } else {
            throw new Error(result.message || 'Error en sincronización');
        }
    } catch (error) {
        console.error('Error en sincronización:', error);
        showToast(`Error en sincronización: ${error.message}`, 'error');
    }
}

async function testGoogleSheetsConnection() {
    showToast('Probando conexión con Google Sheets...', 'info');
    
    try {
        const response = await fetch('/api/sync/test');
        const result = await response.json();
        
        if (result.success) {
            showToast('Conexión exitosa con Google Sheets', 'success');
        } else {
            throw new Error(result.message || 'Error de conexión');
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        showToast(`Error de conexión: ${error.message}`, 'error');
    }
}

function exportSystemData() {
    showToast('Función de exportación en desarrollo', 'info');
}

function cleanupSystemData() {
    if (!confirm('¿Estás seguro de que quieres limpiar los datos del sistema?')) return;
    showToast('Función de limpieza en desarrollo', 'info');
}

function backupSystemData() {
    showToast('Función de backup en desarrollo', 'info');
}

function viewSystemLogs() {
    showToast('Función de logs en desarrollo', 'info');
}

// ====================================
//   VERIFICACIÓN DE ESTADO
// ====================================

async function checkSystemStatus() {
    try {
        const response = await fetch('/api/test');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Sistema funcionando correctamente');
            updateSystemStatusIndicator(true);
            updateLastUpdateTime();
            
            // Actualizar información adicional si está disponible
            if (result.services) {
                updateSystemStatus({
                    services: {
                        scheduler: result.services.autoSync || false,
                        database: result.services.database !== false,
                        googleSheets: result.services.googleSheets !== false
                    }
                });
            }
        } else {
            console.warn('Sistema con advertencias:', result.message);
            updateSystemStatusIndicator(false);
        }
        
    } catch (error) {
        console.error('Error verificando estado del sistema:', error);
        updateSystemStatusIndicator(false);
    }
}

function updateSystemStatusIndicator(isHealthy) {
    const indicator = document.getElementById('statusIndicator');
    if (indicator) {
        const icon = indicator.querySelector('i');
        const text = indicator.querySelector('span');
        
        if (isHealthy) {
            icon.style.color = '#10b981';
            text.textContent = 'Sistema OK';
        } else {
            icon.style.color = '#ef4444';
            text.textContent = 'Sistema con problemas';
        }
    }
}

function updateLastUpdateTime() {
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
        lastUpdate.textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;
    }
}

// ====================================
//   ACTIVIDAD RECIENTE
// ====================================

async function loadRecentActivity() {
    const activityFeed = document.getElementById('activityFeed');
    if (!activityFeed) return;
    
    const activities = [
        {
            icon: 'fas fa-sync',
            text: 'Sistema iniciado correctamente',
            time: 'Hace 2 minutos',
            type: 'success'
        },
        {
            icon: 'fas fa-database',
            text: 'Base de datos conectada',
            time: 'Hace 5 minutos',
            type: 'info'
        },
        {
            icon: 'fas fa-users',
            text: 'Datos cargados exitosamente',
            time: 'Hace 8 minutos',
            type: 'info'
        }
    ];
    
    activityFeed.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

// ====================================
//   FILTROS DE TABLAS
// ====================================

function filterPacientes(filterValue) {
    const rows = document.querySelectorAll('#patientsTableBody tr');
    
    rows.forEach(row => {
        if (!filterValue || filterValue === '') {
            row.style.display = '';
            return;
        }
        
        // Obtener el estado del paciente desde la celda (columna 7, índice 7)
        const estadoCell = row.cells[7]; // Columna de estado
        if (!estadoCell) {
            row.style.display = 'none';
            return;
        }
        
        const estadoText = estadoCell.textContent.toLowerCase().trim();
        const filterText = filterValue.toLowerCase().trim();
        
        // Lógica de filtrado mejorada
        let shouldShow = false;
        
        switch (filterText) {
            case 'pendiente':
                shouldShow = estadoText.includes('pendiente');
                break;
            case 'asignado':
                shouldShow = estadoText.includes('asignado');
                break;
            case 'completado':
                shouldShow = estadoText.includes('completado');
                break;
            case 'cancelado':
                shouldShow = estadoText.includes('cancelado');
                break;
            default:
                shouldShow = estadoText.includes(filterText);
                break;
        }
        
        row.style.display = shouldShow ? '' : 'none';
    });
    
    // Contar filas visibles
    const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none').length;
    console.log(`Filtro '${filterValue}' aplicado: ${visibleRows} pacientes mostrados`);
}

function filterEstudiantes(filterValue) {
    const rows = document.querySelectorAll('#studentsTableBody tr');
    
    rows.forEach(row => {
        if (!filterValue) {
            row.style.display = '';
            return;
        }
        
        const estadoCell = row.cells[7]; // Columna de estado
        const estado = estadoCell ? estadoCell.textContent.toLowerCase() : '';
        
        if (estado.includes(filterValue.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    console.log('Filtro de estudiantes aplicado:', filterValue);
}

function filterAsignaciones(filterValue) {
    const rows = document.querySelectorAll('#assignmentsTableBody tr');
    
    rows.forEach(row => {
        if (!filterValue) {
            row.style.display = '';
            return;
        }
        
        const estadoCell = row.cells[5]; // Columna de estado
        const estado = estadoCell ? estadoCell.textContent.toLowerCase().trim() : '';

        if (!filterValue || estado.includes(filterValue.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    console.log('Filtro de asignaciones aplicado:', filterValue);
}

// ====================================
//   MODALES Y VISTAS DETALLADAS
// ====================================

function verPaciente(id) {
    console.log('Ver paciente:', id);
    const paciente = data.pacientes.find(p => p.id === id);
    if (paciente) {
        showPatientModal(paciente);
    }
}

function verEstudiante(id) {
    console.log('Ver estudiante:', id);
    const estudiante = data.estudiantes.find(e => e.id === id);
    if (estudiante) {
        showStudentModal(estudiante);
    }
}

function verAsignacion(id) {
    console.log('Ver asignación:', id);
    const asignacion = data.asignaciones.find(a => a.id === id);
    if (asignacion) {
        showAssignmentModal(asignacion);
    }
}

function showPatientModal(paciente) {
    const modal = document.getElementById('patientModal');
    const modalBody = document.getElementById('patientModalBody');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div class="patient-details">
                <h4>${paciente.nombre_completo}</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Edad:</label>
                        <span>${paciente.edad} años</span>
                    </div>
                    <div class="detail-item">
                        <label>Teléfono:</label>
                        <span>${paciente.telefono}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${paciente.email}</span>
                    </div>
                    <div class="detail-item">
                        <label>Ciudad:</label>
                        <span>${paciente.ciudad}</span>
                    </div>
                    <div class="detail-item">
                        <label>Tratamiento:</label>
                        <span>${paciente.tipo_tratamiento_inferido}</span>
                    </div>
                    <div class="detail-item">
                        <label>Nivel de Dolor:</label>
                        <span>${paciente.nivel_dolor}/10</span>
                    </div>
                    <div class="detail-item">
                        <label>Prioridad:</label>
                        <span class="priority-badge ${getPriorityClass(paciente.prioridad)}">${paciente.prioridad}</span>
                    </div>
                    <div class="detail-item">
                        <label>Estado:</label>
                        <span class="status-badge status-${paciente.estado?.toLowerCase()}">${paciente.estado}</span>
                    </div>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }
}

function showStudentModal(estudiante) {
    const modal = document.getElementById('studentModal');
    const modalBody = document.getElementById('studentModalBody');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div class="student-details">
                <h4>${estudiante.nombre_completo}</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Código:</label>
                        <span>${estudiante.codigo_estudiante}</span>
                    </div>
                    <div class="detail-item">
                        <label>Año:</label>
                        <span>${estudiante.año_carrera}</span>
                    </div>
                    <div class="detail-item">
                        <label>Universidad:</label>
                        <span>${estudiante.universidad}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${estudiante.email}</span>
                    </div>
                    <div class="detail-item">
                        <label>Teléfono:</label>
                        <span>${estudiante.telefono}</span>
                    </div>
                    <div class="detail-item">
                        <label>Especialidades:</label>
                        <span>${estudiante.especialidades}</span>
                    </div>
                    <div class="detail-item">
                        <label>Casos Activos:</label>
                        <span>${estudiante.casos_activos}</span>
                    </div>
                    <div class="detail-item">
                        <label>Casos Completados:</label>
                        <span>${estudiante.casos_completados}</span>
                    </div>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }
}

function showAssignmentModal(asignacion) {
    showToast(`Asignación #${asignacion.id}: ${asignacion.paciente_nombre} ↔ ${asignacion.estudiante_nombre}`, 'info');
}

function closeModal() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => modal.style.display = 'none');
}

function closePatientModal() {
    const modal = document.getElementById('patientModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeStudentModal() {
    const modal = document.getElementById('studentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}


// Agregar estos event listeners específicos para matching
function initializeMatchingEventListeners() {
    // Botón ejecutar matching en la sección matching
    const executeMatchingBtn = document.getElementById('executeMatching');
    if (executeMatchingBtn) {
        executeMatchingBtn.addEventListener('click', runManualMatching);
    }

    // Botones de acciones rápidas en matching
    const viewPendingPatientsBtn = document.getElementById('viewPendingPatients');
    if (viewPendingPatientsBtn) {
        viewPendingPatientsBtn.addEventListener('click', () => {
            showSection('patients');
            // Aplicar filtro a pendientes
            const patientsFilter = document.getElementById('patientsFilter');
            if (patientsFilter) {
                patientsFilter.value = 'pendiente';
                filterPacientes('pendiente');
            }
        });
    }

    const viewAvailableStudentsBtn = document.getElementById('viewAvailableStudents');
    if (viewAvailableStudentsBtn) {
        viewAvailableStudentsBtn.addEventListener('click', () => {
            showSection('students');
            // Aplicar filtro a disponibles
            const studentsFilter = document.getElementById('studentsFilter');
            if (studentsFilter) {
                studentsFilter.value = 'disponible';
                filterEstudiantes('disponible');
            }
        });
    }

    const manualMatchingBtn = document.getElementById('manualMatching');
    if (manualMatchingBtn) {
        manualMatchingBtn.addEventListener('click', () => {
            showToast('Funcionalidad de matching manual en desarrollo', 'info');
        });
    }

    const viewSuggestionsBtn = document.getElementById('viewSuggestions');
    if (viewSuggestionsBtn) {
        viewSuggestionsBtn.addEventListener('click', () => {
            showToast('Cargando sugerencias de matching...', 'info');
            loadMatchingSuggestions();
        });
    }
}

// Función para cargar sugerencias de matching
async function loadMatchingSuggestions() {
    try {
        const response = await fetch('/api/matching/pending');
        const result = await response.json();
        
        if (result.success && result.data) {
            const pendingPatients = result.data;
            updateMatchingStats({
                pacientes_pendientes: pendingPatients.length,
                estudiantes_disponibles: 0, // Se actualizará con otra llamada
                hoy: 0
            });
            
            showToast(`${pendingPatients.length} pacientes pendientes encontrados`, 'success');
        }
    } catch (error) {
        console.error('Error cargando sugerencias:', error);
        showToast('Error cargando sugerencias de matching', 'error');
    }
}


// ====================================
//   AUTO-REFRESH
// ====================================

function startAutoRefresh() {
    // Actualizar cada 5 minutos
    setInterval(async () => {
        if (document.visibilityState === 'visible') {
            await loadSectionData(currentSection);
            await checkSystemStatus();
        }
    }, 5 * 60 * 1000);
    
    // Verificar estado cada minuto
    setInterval(checkSystemStatus, 60 * 1000);
}

// ====================================
//   COMPATIBILIDAD Y EXPORTACIÓN
// ====================================

// Exponer funciones globales necesarias para el HTML
window.showSection = showSection;
window.refreshAllData = refreshAllData;
window.runManualMatching = runManualMatching;
window.runManualSync = runManualSync;
window.verPaciente = verPaciente;
window.verEstudiante = verEstudiante;
window.verAsignacion = verAsignacion;
window.closeModal = closeModal;
window.closePatientModal = closePatientModal;
window.closeStudentModal = closeStudentModal;

// ====================================
//   INICIALIZACIÓN FINAL
// ====================================

console.log('✅ Dashboard Administrativo completamente inicializado');