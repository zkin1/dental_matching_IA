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

    // Botones de gestión de códigos
    const validateFixCodesBtn = document.getElementById('validateFixCodes');
    if (validateFixCodesBtn) {
        validateFixCodesBtn.addEventListener('click', validateAndFixAllCodes);
    }

    const getCodeStatsBtn = document.getElementById('getCodeStats');
    if (getCodeStatsBtn) {
        getCodeStatsBtn.addEventListener('click', getCodeStats);
    }

    const generateTestCodeBtn = document.getElementById('generateTestCode');
    if (generateTestCodeBtn) {
        generateTestCodeBtn.addEventListener('click', generateTestCode);
    }

    // Botones de notificaciones automáticas
    const viewNotificationLogsBtn = document.getElementById('viewNotificationLogs');
    if (viewNotificationLogsBtn) {
        viewNotificationLogsBtn.addEventListener('click', viewNotificationLogs);
    }

    const getNotificationStatsBtn = document.getElementById('getNotificationStats');
    if (getNotificationStatsBtn) {
        getNotificationStatsBtn.addEventListener('click', getNotificationStats);
    }

    const clearOldLogsBtn = document.getElementById('clearOldLogs');
    if (clearOldLogsBtn) {
        clearOldLogsBtn.addEventListener('click', clearOldNotificationLogs);
    }

    const testNotificationBtn = document.getElementById('testNotification');
    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', testNotificationSystem);
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
        
        // Cargar datos en paralelo para mejor rendimiento
        const [dashboardResponse, pacientesResponse, estudiantesResponse, asignacionesResponse] = await Promise.all([
            fetch('/api/dashboard').catch(() => ({ ok: false })),
            fetch('/api/pacientes').catch(() => ({ ok: false })),
            fetch('/api/estudiantes').catch(() => ({ ok: false })),
            fetch('/api/asignaciones').catch(() => ({ ok: false }))
        ]);
        
        // Procesar respuesta del dashboard
        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            if (dashboardData.success && dashboardData.data) {
                updateKPICards({
                    pacientes: {
                        total: dashboardData.data.overview?.totalPatients || 0,
                        pendientes: dashboardData.data.overview?.pendingPatients || 0,
                        hoy: dashboardData.data.overview?.todayMatches || 0
                    },
                    estudiantes: {
                        total: dashboardData.data.overview?.totalStudents || 0,
                        activos: dashboardData.data.overview?.availableStudents || 0
                    },
                    matching: {
                        total_asignaciones: dashboardData.data.overview?.totalMatches || 0,
                        score_promedio: dashboardData.data.matching?.averageScore || 0,
                        hoy: dashboardData.data.overview?.todayMatches || 0,
                        automaticas: dashboardData.data.matching?.automaticMatches || 0,
                        manuales: dashboardData.data.matching?.manualMatches || 0
                    },
                    system: {
                        uptime: dashboardData.data.performance?.uptime
                    }
                });
                
                updateSystemStatus({
                    services: {
                        scheduler: dashboardData.data.scheduler?.isActive || false,
                        database: true,
                        googleSheets: true
                    }
                });
            }
        }
        
        // Procesar datos de pacientes
        if (pacientesResponse.ok) {
            const pacientesData = await pacientesResponse.json();
            if (pacientesData.success) {
                data.pacientes = pacientesData.data || [];
                // Actualizar contadores de pacientes
                updatePatientCounts();
            }
        }
        
        // Procesar datos de estudiantes
        if (estudiantesResponse.ok) {
            const estudiantesData = await estudiantesResponse.json();
            if (estudiantesData.success) {
                data.estudiantes = estudiantesData.data || [];
                // Actualizar contadores de estudiantes
                updateStudentCounts();
            }
        }
        
        // Procesar datos de asignaciones
        if (asignacionesResponse.ok) {
            const asignacionesData = await asignacionesResponse.json();
            if (asignacionesData.success) {
                data.asignaciones = asignacionesData.data || [];
                // Actualizar contadores de asignaciones
                updateAssignmentCounts();
            }
        }
        
        await loadRecentActivity();
        hideLoadingState('dashboard-loading');
        
        // Mostrar resumen de datos cargados
        console.log('📊 Dashboard cargado:', {
            pacientes: data.pacientes.length,
            estudiantes: data.estudiantes.length,
            asignaciones: data.asignaciones.length
        });
        
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
        
        console.log('🔄 Iniciando carga de estudiantes...');
        
        const response = await fetch('/api/estudiantes');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📥 Respuesta de /api/estudiantes:', result);
        
        if (result.success && result.data) {
            data.estudiantes = result.data;
            
            // Debug: mostrar estructura de datos
            console.log('📊 Datos de estudiantes cargados:', {
                total: data.estudiantes.length,
                primerEstudiante: data.estudiantes[0],
                camposDisponibles: data.estudiantes[0] ? Object.keys(data.estudiantes[0]) : []
            });
            
            // Verificar si hay datos válidos
            if (data.estudiantes.length === 0) {
                console.log('⚠️ No hay estudiantes para mostrar');
                const tbody = document.getElementById('studentsTableBody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem;">No hay estudiantes registrados</td></tr>';
                }
                return;
            }
            
            // Verificar estructura de datos del primer estudiante
            const primerEstudiante = data.estudiantes[0];
            if (primerEstudiante) {
                console.log('🔍 Estructura del primer estudiante:', {
                    id: primerEstudiante.id,
                    nombre: primerEstudiante.nombre_completo,
                    casos_activos: primerEstudiante.casos_activos,
                    casos_completados: primerEstudiante.casos_completados,
                    especialidades: primerEstudiante.especialidades,
                    tipos: {
                        casos_activos: typeof primerEstudiante.casos_activos,
                        casos_completados: typeof primerEstudiante.casos_completados,
                        especialidades: typeof primerEstudiante.especialidades
                    }
                });
            }
            
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
        console.error('❌ Error cargando estudiantes:', error);
        showErrorMessage('Error cargando estudiantes: ' + error.message);
        
        // Ocultar loading y mostrar error
        const studentsLoading = document.getElementById('studentsLoading');
        if (studentsLoading) {
            studentsLoading.innerHTML = `
                <div class="loading-state error">
                    <i class="fas fa-exclamation-triangle" style="color: #dc2626;"></i>
                    <span style="color: #dc2626;">Error cargando estudiantes: ${error.message}</span>
                </div>
            `;
        }
        
        // Mostrar mensaje de error en la tabla
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem; color: #dc2626;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        <strong>Error cargando estudiantes</strong><br>
                        <small>${error.message}</small><br>
                        <button class="btn btn-primary" onclick="loadEstudiantes()" style="margin-top: 1rem;">
                            <i class="fas fa-refresh"></i> Reintentar
                        </button>
                    </td>
                </tr>
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
        
        console.log('🔄 Iniciando carga de asignaciones...');
        
        const response = await fetch('/api/asignaciones');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📥 Respuesta de /api/asignaciones:', result);
        
        if (result.success) {
            data.asignaciones = result.data || [];
            
            // Debug: mostrar estructura de datos
            console.log('📊 Datos de asignaciones cargados:', {
                total: data.asignaciones.length,
                primerAsignacion: data.asignaciones[0],
                camposDisponibles: data.asignaciones[0] ? Object.keys(data.asignaciones[0]) : []
            });
            
            // Verificar si hay datos válidos
            if (data.asignaciones.length === 0) {
                console.log('⚠️ No hay asignaciones para mostrar');
                const tbody = document.getElementById('assignmentsTableBody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem;">No hay asignaciones registradas</td></tr>';
                }
                return;
            }
            
            renderAsignacionesTable();
            
            console.log(`✅ ${data.asignaciones.length} asignaciones cargadas`);
        } else {
            throw new Error(result.error || 'Error cargando asignaciones');
        }
        
        if (assignmentsLoading) assignmentsLoading.style.display = 'none';
        if (assignmentsTable) assignmentsTable.style.display = 'table';
        
    } catch (error) {
        console.error('❌ Error cargando asignaciones:', error);
        showErrorMessage('Error cargando asignaciones: ' + error.message);
        
        // Ocultar loading y mostrar error
        const assignmentsLoading = document.getElementById('assignmentsLoading');
        if (assignmentsLoading) {
            assignmentsLoading.innerHTML = `
                <div class="loading-state error">
                    <i class="fas fa-exclamation-triangle" style="color: #dc2626;"></i>
                    <span style="color: #dc2626;">Error cargando asignaciones: ${error.message}</span>
                </div>
            `;
        }
        
        // Mostrar mensaje de error en la tabla
        const tbody = document.getElementById('assignmentsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem; color: #dc2626;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        <strong>Error cargando asignaciones</strong><br>
                        <small>${error.message}</small><br>
                        <button class="btn btn-primary" onclick="loadAsignaciones()" style="margin-top: 1rem;">
                            <i class="fas fa-refresh"></i> Reintentar
                        </button>
                    </td>
                </tr>
            `;
        }
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
        
        // Clase CSS para el estado
        let estadoClass = `status-${estadoReal.toLowerCase().replace(' ', '-')}`;
        
        // Información del estudiante asignado si existe
        let estudianteInfo = '';
        if (paciente.estudiante_asignado && paciente.estudiante_nombre) {
            estudianteInfo = `<br><small style="color: #6b7280; font-size: 0.8em;">Asignado a: ${paciente.estudiante_nombre}</small>`;
        }
        
        row.innerHTML = `
            <td>${safeValue(paciente.id)}</td>
            <td><strong>${nombreCompleto}</strong>${estudianteInfo}</td>
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
    
    // Actualizar contadores después de renderizar
    updatePatientCounts();
}

// Nueva función para actualizar contadores de pacientes
function updatePatientCounts() {
    if (!data.pacientes || !Array.isArray(data.pacientes)) return;
    
    const pendientes = data.pacientes.filter(p => 
        !p.estudiante_asignado && (p.estado === 'pendiente' || !p.estado)
    ).length;
    
    const asignados = data.pacientes.filter(p => 
        p.estudiante_asignado || p.estado === 'asignado'
    ).length;
    
    const completados = data.pacientes.filter(p => 
        p.estado === 'completado'
    ).length;
    
    // Actualizar badges
    updateBadge('pendingPatientsBadge', pendientes);
    
    // Actualizar contadores en el dashboard si están disponibles
    const totalPatientsElement = document.getElementById('totalPatients');
    if (totalPatientsElement) {
        totalPatientsElement.textContent = data.pacientes.length;
    }
    
    console.log(`📊 Contadores actualizados: Total: ${data.pacientes.length}, Pendientes: ${pendientes}, Asignados: ${asignados}, Completados: ${completados}`);
}

function renderEstudiantesTable() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!data.estudiantes || !Array.isArray(data.estudiantes)) {
        tbody.innerHTML = '<tr><td colspan="9">No hay estudiantes para mostrar</td></tr>';
        return;
    }
    
    console.log('🔍 Renderizando estudiantes con datos:', data.estudiantes.length);
    
    data.estudiantes.forEach((estudiante, index) => {
        const row = document.createElement('tr');
        
        // Debug: mostrar datos del primer estudiante
        if (index === 0) {
            console.log('📊 Primer estudiante:', {
                id: estudiante.id,
                nombre: estudiante.nombre_completo,
                casos_activos: estudiante.casos_activos,
                casos_completados: estudiante.casos_completados,
                tipo_casos_activos: typeof estudiante.casos_activos,
                tipo_casos_completados: typeof estudiante.casos_completados,
                especialidades: estudiante.especialidades,
                tipo_especialidades: typeof estudiante.especialidades
            });
        }
        
        // Procesar especialidades correctamente
        let especialidadesTexto = 'General';
        if (estudiante.especialidades) {
            if (Array.isArray(estudiante.especialidades)) {
                // Si es array, limpiar y formatear
                especialidadesTexto = estudiante.especialidades
                    .map(e => e.trim())
                    .filter(e => e.length > 0)
                    .join(', ');
            } else if (typeof estudiante.especialidades === 'string') {
                // Si es string, verificar si es JSON válido
                try {
                    const parsed = JSON.parse(estudiante.especialidades);
                    if (Array.isArray(parsed)) {
                        especialidadesTexto = parsed
                            .map(e => e.trim())
                            .filter(e => e.length > 0)
                            .join(', ');
                    } else {
                        // Si no es array, usar el string tal como está
                        especialidadesTexto = estudiante.especialidades
                            .replace(/[\[\]"]/g, '') // Remover corchetes y comillas
                            .split(',')
                            .map(e => e.trim())
                            .filter(e => e.length > 0)
                            .join(', ');
                    }
                } catch (e) {
                    // Si no es JSON válido, tratar como string normal
                    especialidadesTexto = estudiante.especialidades
                        .replace(/[\[\]"]/g, '') // Remover corchetes y comillas
                        .split(',')
                        .map(e => e.trim())
                        .filter(e => e.length > 0)
                        .join(', ');
                }
            }
        }
        
        // Si no hay especialidades o está vacío, mostrar "General"
        if (!especialidadesTexto || especialidadesTexto === '' || especialidadesTexto === 'General') {
            especialidadesTexto = 'General';
        }
        
        // Procesar año de carrera
        const añoCarrera = estudiante.año_carrera || 'N/A';
        
        // Procesar casos activos y completados - CORREGIDO
        let casosActivos = 0;
        let casosCompletados = 0;
        
        // Convertir casos activos a número
        if (estudiante.casos_activos !== undefined && estudiante.casos_activos !== null) {
            if (typeof estudiante.casos_activos === 'string') {
                // Remover caracteres no numéricos y convertir
                casosActivos = parseInt(estudiante.casos_activos.replace(/[^\d]/g, '')) || 0;
            } else {
                casosActivos = parseInt(estudiante.casos_activos) || 0;
            }
        }
        
        // Convertir casos completados a número
        if (estudiante.casos_completados !== undefined && estudiante.casos_completados !== null) {
            if (typeof estudiante.casos_completados === 'string') {
                // Remover caracteres no numéricos y convertir
                casosCompletados = parseInt(estudiante.casos_completados.replace(/[^\d]/g, '')) || 0;
            } else {
                casosCompletados = parseInt(estudiante.casos_completados) || 0;
            }
        }
        
        // Estado del estudiante
        const estado = estudiante.estado || 'activo';
        
        // Clase CSS para casos activos
        const casosActivosClass = casosActivos > 0 ? 'status-active' : 'status-inactive';
        
        // Debug: mostrar valores procesados
        if (index === 0) {
            console.log('📊 Valores procesados del primer estudiante:', {
                casos_activos_original: estudiante.casos_activos,
                casos_activos_procesado: casosActivos,
                casos_completados_original: estudiante.casos_completados,
                casos_completados_procesado: casosCompletados,
                especialidades_original: estudiante.especialidades,
                especialidades_procesado: especialidadesTexto
            });
        }
        
        row.innerHTML = `
            <td class="codigo-estudiante" data-estudiante-id="${estudiante.id}">
                <strong>${estudiante.codigo_estudiante || 'N/A'}</strong>
                <button class="btn btn-sm btn-outline-warning ml-1" 
                        onclick="regenerateStudentCode(${estudiante.id})" 
                        title="Regenerar código">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </td>
            <td>${estudiante.nombre_completo || 'Sin nombre'}</td>
            <td>${añoCarrera}</td>
            <td>${estudiante.universidad || 'N/A'}</td>
            <td><span class="specialty-badge" title="${especialidadesTexto}">${especialidadesTexto}</span></td>
            <td><span class="status-badge ${casosActivosClass}">${casosActivos}</span></td>
            <td><span class="status-badge status-completed">${casosCompletados}</span></td>
            <td><span class="status-badge status-${estado.toLowerCase()}">${estado}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="verEstudiante(${estudiante.id})" title="Ver detalles">
                    <i class="fas fa-eye"></i> Ver
                </button>
                <button class="btn btn-sm btn-primary" onclick="contactarEstudiante(${estudiante.id})" title="Contactar">
                    <i class="fas fa-envelope"></i> Contactar
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Actualizar contadores después de renderizar
    updateStudentCounts();
    
    console.log('✅ Tabla de estudiantes renderizada correctamente');
}

// Nueva función para actualizar contadores de estudiantes
function updateStudentCounts() {
    if (!data.estudiantes || !Array.isArray(data.estudiantes)) return;
    
    const total = data.estudiantes.length;
    const activos = data.estudiantes.filter(e => e.estado === 'activo').length;
    const disponibles = data.estudiantes.filter(e => 
        e.estado === 'activo' && (e.casos_activos || 0) < 3
    ).length;
    
    // Actualizar badges
    updateBadge('availableStudentsBadge', disponibles);
    
    // Actualizar contadores en el dashboard si están disponibles
    const totalStudentsElement = document.getElementById('totalStudents');
    if (totalStudentsElement) {
        totalStudentsElement.textContent = total;
    }
    
    const studentsAvailableElement = document.getElementById('studentsAvailable');
    if (studentsAvailableElement) {
        studentsAvailableElement.textContent = `${disponibles} disponibles`;
    }
    
    console.log(`📊 Contadores de estudiantes: Total: ${total}, Activos: ${activos}, Disponibles: ${disponibles}`);
}

function renderAsignacionesTable() {
    const tbody = document.getElementById('assignmentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!data.asignaciones || !Array.isArray(data.asignaciones)) {
        tbody.innerHTML = '<tr><td colspan="10">No hay asignaciones para mostrar</td></tr>';
        return;
    }
    
    data.asignaciones.forEach(asignacion => {
        const row = document.createElement('tr');
        
        // Fecha de asignación
        const fecha = asignacion.fecha_asignacion ? 
            new Date(asignacion.fecha_asignacion).toLocaleDateString() : '-';
        
        // Score de compatibilidad
        const score = asignacion.score_compatibilidad ? 
            (asignacion.score_compatibilidad * 100).toFixed(0) + '%' : 'N/A';
        
        // Estado de la asignación
        const estado = asignacion.estado || 'asignado';
        
        // Estado de notificación
        const notificado = asignacion.notificado_por_email === 1;
        const fechaNotificacion = asignacion.fecha_notificacion ? 
            new Date(asignacion.fecha_notificacion).toLocaleDateString() : null;
        
        // Tipo de asignación (manual o automática)
        const tipoAsignacion = asignacion.observaciones_sistema && 
            asignacion.observaciones_sistema.includes('MANUAL') ? 'Manual' : 'Auto';
        
        // Clase CSS para el estado
        const estadoClass = `status-${estado.toLowerCase().replace(' ', '-')}`;
        
        // Información adicional del paciente
        const pacienteInfo = asignacion.paciente_nombre || 'Sin nombre';
        const pacienteTelefono = asignacion.paciente_telefono || 'N/A';
        
        // Información del estudiante
        const estudianteInfo = asignacion.estudiante_nombre || 'Sin nombre';
        const estudianteCodigo = asignacion.codigo_estudiante || 'N/A';
        const añoCarrera = asignacion.año_carrera || 'N/A';
        
        // Tratamiento
        const tratamiento = asignacion.tipo_tratamiento_inferido || 'No especificado';
        
        // Prioridad del paciente
        const prioridad = asignacion.prioridad || 'Moderada';
        
        // Botones de acción
        let actionButtons = `
            <button class="btn btn-sm btn-secondary" onclick="verAsignacion(${asignacion.id})" title="Ver detalles">
                <i class="fas fa-eye"></i> Ver
            </button>
        `;
        
        // Si no ha sido notificado, mostrar botón para marcar como notificado
        if (!notificado && estado === 'asignado') {
            actionButtons += `
                <button class="btn btn-sm btn-success" onclick="marcarComoNotificado(${asignacion.id})" title="Marcar como notificado">
                    <i class="fas fa-envelope"></i> Notificar
                </button>
            `;
        }
        
        // Si ya fue notificado, mostrar botón para marcar como contactado
        if (notificado && estado === 'notificado') {
            actionButtons += `
                <button class="btn btn-sm btn-info" onclick="marcarComoContactado(${asignacion.id})" title="Marcar como contactado">
                    <i class="fas fa-phone"></i> Contactado
                </button>
            `;
        }
        
        row.innerHTML = `
            <td>${asignacion.id}</td>
            <td>
                <strong>${pacienteInfo}</strong><br>
                <small style="color: #6b7280;">${pacienteTelefono}</small>
            </td>
            <td>
                <strong>${estudianteInfo}</strong><br>
                <small style="color: #6b7280;">${estudianteCodigo} (${añoCarrera})</small>
            </td>
            <td>
                <span class="treatment-badge">${tratamiento}</span><br>
                <small style="color: #6b7280;">Prioridad: ${prioridad}</small>
            </td>
            <td><span class="score-badge ${getScoreClass(score)}">${score}</span></td>
            <td>
                <span class="status-badge ${estadoClass}">${estado.toUpperCase()}</span>
                ${notificado ? `<br><small style="color: #059669;">✓ Notificado ${fechaNotificacion ? fechaNotificacion : ''}</small>` : ''}
            </td>
            <td>${fecha}</td>
            <td><span class="badge ${tipoAsignacion === 'Manual' ? 'manual' : 'auto'}">${tipoAsignacion}</span></td>
            <td>
                ${actionButtons}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Actualizar contadores después de renderizar
    updateAssignmentCounts();
}

// Nueva función para actualizar contadores de asignaciones
function updateAssignmentCounts() {
    if (!data.asignaciones || !Array.isArray(data.asignaciones)) return;
    
    const total = data.asignaciones.length;
    const asignadas = data.asignaciones.filter(a => a.estado === 'asignado').length;
    const notificadas = data.asignaciones.filter(a => a.estado === 'notificado').length;
    const contactadas = data.asignaciones.filter(a => a.estado === 'contactado').length;
    const enTratamiento = data.asignaciones.filter(a => a.estado === 'en_tratamiento').length;
    const completadas = data.asignaciones.filter(a => a.estado === 'completado').length;
    
    // Contadores de notificaciones
    const notificadasPorEmail = data.asignaciones.filter(a => a.notificado_por_email === 1).length;
    const pendientesNotificacion = data.asignaciones.filter(a => a.notificado_por_email === 0).length;
    
    // Actualizar contadores en el dashboard si están disponibles
    const totalMatchesElement = document.getElementById('totalMatches');
    if (totalMatchesElement) {
        totalMatchesElement.textContent = total;
    }
    
    // Mostrar estadísticas en consola
    console.log(`📊 Contadores de asignaciones:`);
    console.log(`   Total: ${total}`);
    console.log(`   Asignadas: ${asignadas}`);
    console.log(`   Notificadas: ${notificadas} (${notificadasPorEmail} por email)`);
    console.log(`   Contactadas: ${contactadas}`);
    console.log(`   En Tratamiento: ${enTratamiento}`);
    console.log(`   Completadas: ${completadas}`);
    console.log(`   Pendientes de notificación: ${pendientesNotificacion}`);
    
    // Actualizar contadores en la interfaz si existen
    updateDashboardCounters({
        total,
        asignadas,
        notificadas,
        contactadas,
        enTratamiento,
        completadas,
        notificadasPorEmail,
        pendientesNotificacion
    });
}

// Función para actualizar contadores en el dashboard
function updateDashboardCounters(counters) {
    // Buscar elementos del dashboard para actualizar
    const elements = {
        'totalAsignaciones': counters.total,
        'asignadas': counters.asignadas,
        'notificadas': counters.notificadas,
        'contactadas': counters.contactadas,
        'enTratamiento': counters.enTratamiento,
        'completadas': counters.completadas,
        'pendientesNotificacion': counters.pendientesNotificacion
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Nueva función para obtener la clase CSS del score
function getScoreClass(score) {
    if (score === 'N/A') return 'score-na';
    
    const scoreValue = parseInt(score.replace('%', ''));
    if (scoreValue >= 80) return 'score-excellent';
    if (scoreValue >= 60) return 'score-good';
    if (scoreValue >= 40) return 'score-fair';
    return 'score-poor';
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

// Función para debug - mostrar estructura de datos de pacientes
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

// Función para debug - mostrar estructura de datos de estudiantes
function debugStudentData() {
    console.log('🔍 DEBUGGING - Estructura de datos de estudiantes:');
    if (data.estudiantes && data.estudiantes.length > 0) {
        console.log('📊 Resumen general:', {
            total: data.estudiantes.length,
            primerEstudiante: data.estudiantes[0],
            camposDisponibles: Object.keys(data.estudiantes[0])
        });
        
        // Verificar casos activos y completados
        const casosActivos = data.estudiantes.map(e => ({
            id: e.id,
            nombre: e.nombre_completo,
            casos_activos: e.casos_activos,
            casos_completados: e.casos_completados,
            tipo_casos_activos: typeof e.casos_activos,
            tipo_casos_completados: typeof e.casos_completados,
            casos_activos_parsed: parseInt(e.casos_activos) || 0,
            casos_completados_parsed: parseInt(e.casos_completados) || 0
        }));
        console.log('📊 Casos por estudiante:', casosActivos);
        
        // Verificar especialidades
        const especialidades = data.estudiantes.map(e => ({
            id: e.id,
            nombre: e.nombre_completo,
            especialidades: e.especialidades,
            tipo: typeof e.especialidades,
            procesado: (() => {
                if (!e.especialidades) return 'General';
                if (Array.isArray(e.especialidades)) {
                    return e.especialidades.join(', ');
                }
                if (typeof e.especialidades === 'string') {
                    try {
                        const parsed = JSON.parse(e.especialidades);
                        if (Array.isArray(parsed)) {
                            return parsed.join(', ');
                        }
                    } catch (e) {
                        return e.especialidades.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).filter(s => s.length > 0).join(', ');
                    }
                }
                return 'General';
            })()
        }));
        console.log('📊 Especialidades por estudiante:', especialidades);
        
        // Verificar estados
        const estados = [...new Set(data.estudiantes.map(e => e.estado))];
        console.log('📊 Estados encontrados:', estados);
        
        // Verificar universidades
        const universidades = [...new Set(data.estudiantes.map(e => e.universidad))];
        console.log('📊 Universidades encontradas:', universidades);
        
        // Verificar años de carrera
        const añosCarrera = [...new Set(data.estudiantes.map(e => e.año_carrera))];
        console.log('📊 Años de carrera encontrados:', añosCarrera);
        
    } else {
        console.log('❌ No hay datos de estudiantes');
    }
    
    // Verificar si hay problemas en el DOM
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
        console.log('📊 Estado del DOM:', {
            tbodyExists: !!tbody,
            tbodyChildren: tbody.children.length,
            tbodyInnerHTML: tbody.innerHTML.substring(0, 200) + '...'
        });
    } else {
        console.log('❌ Elemento studentsTableBody no encontrado');
    }
}

// Agregar debugStudentData a window para poder ejecutarlo desde consola
window.debugStudentData = debugStudentData;

// Función para debug - mostrar estructura de datos de asignaciones
function debugAssignmentData() {
    console.log('🔍 DEBUGGING - Estructura de datos de asignaciones:');
    if (data.asignaciones && data.asignaciones.length > 0) {
        console.log('📊 Resumen general:', {
            total: data.asignaciones.length,
            primerAsignacion: data.asignaciones[0],
            camposDisponibles: Object.keys(data.asignaciones[0])
        });
        
        // Verificar estados de asignaciones
        const estados = [...new Set(data.asignaciones.map(a => a.estado))];
        console.log('📊 Estados de asignaciones encontrados:', estados);
        
        // Verificar scores de compatibilidad
        const scores = data.asignaciones.map(a => ({
            id: a.id,
            score: a.score_compatibilidad,
            tipo: typeof a.score_compatibilidad,
            procesado: a.score_compatibilidad ? (a.score_compatibilidad * 100).toFixed(0) + '%' : 'N/A'
        }));
        console.log('📊 Scores de compatibilidad:', scores);
        
        // Verificar fechas de asignación
        const fechas = data.asignaciones.map(a => ({
            id: a.id,
            fecha: a.fecha_asignacion,
            tipo: typeof a.fecha_asignacion,
            procesado: a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString() : 'N/A'
        }));
        console.log('📊 Fechas de asignación:', fechas);
        
        // Verificar tipos de asignación
        const tipos = [...new Set(data.asignaciones.map(a => a.tipo_asignacion))];
        console.log('📊 Tipos de asignación encontrados:', tipos);
        
    } else {
        console.log('❌ No hay datos de asignaciones');
    }
    
    // Verificar si hay problemas en el DOM
    const tbody = document.getElementById('assignmentsTableBody');
    if (tbody) {
        console.log('📊 Estado del DOM de asignaciones:', {
            tbodyExists: !!tbody,
            tbodyChildren: tbody.children.length,
            tbodyInnerHTML: tbody.innerHTML.substring(0, 200) + '...'
        });
    } else {
        console.log('❌ Elemento assignmentsTableBody no encontrado');
    }
}

// Agregar debugAssignmentData a window para poder ejecutarlo desde consola
window.debugAssignmentData = debugAssignmentData;

// Función para debug general del sistema
function debugSystemData() {
    console.log('🔍 DEBUGGING GENERAL DEL SISTEMA:');
    console.log('=====================================');
    
    // Estado general
    console.log('📊 Estado general:', {
        currentSection: currentSection,
        dataLoaded: {
            pacientes: data.pacientes ? data.pacientes.length : 0,
            estudiantes: data.estudiantes ? data.estudiantes.length : 0,
            asignaciones: data.asignaciones ? data.asignaciones.length : 0
        },
        systemStats: systemStats,
        schedulerStatus: schedulerStatus
    });
    
    // Verificar elementos del DOM
    console.log('📊 Elementos del DOM:', {
        dashboard: !!document.getElementById('dashboard'),
        patients: !!document.getElementById('patients'),
        students: !!document.getElementById('students'),
        assignments: !!document.getElementById('assignments'),
        patientsTableBody: !!document.getElementById('patientsTableBody'),
        studentsTableBody: !!document.getElementById('studentsTableBody'),
        assignmentsTableBody: !!document.getElementById('assignmentsTableBody')
    });
    
    // Verificar estado de las tablas
    const patientsTable = document.getElementById('patientsTable');
    const studentsTable = document.getElementById('studentsTable');
    const assignmentsTable = document.getElementById('assignmentsTable');
    
    if (patientsTable) {
        console.log('📊 Tabla de pacientes:', {
            display: patientsTable.style.display,
            visible: patientsTable.offsetParent !== null
        });
    }
    
    if (studentsTable) {
        console.log('📊 Tabla de estudiantes:', {
            display: studentsTable.style.display,
            visible: studentsTable.offsetParent !== null
        });
    }
    
    if (assignmentsTable) {
        console.log('📊 Tabla de asignaciones:', {
            display: assignmentsTable.style.display,
            visible: assignmentsTable.offsetParent !== null
        });
    }
    
    // Verificar estado de loading
    const loadings = {
        patientsLoading: document.getElementById('patientsLoading'),
        studentsLoading: document.getElementById('studentsLoading'),
        assignmentsLoading: document.getElementById('assignmentsLoading')
    };
    
    console.log('📊 Estado de loading:', {
        patientsLoading: loadings.patientsLoading ? loadings.patientsLoading.style.display : 'No encontrado',
        studentsLoading: loadings.studientsLoading ? loadings.studientsLoading.style.display : 'No encontrado',
        assignmentsLoading: loadings.assignmentsLoading ? loadings.assignmentsLoading.style.display : 'No encontrado'
    });
    
    console.log('=====================================');
}

// Agregar debugSystemData a window para poder ejecutarlo desde consola
window.debugSystemData = debugSystemData;

// Función para probar todas las conexiones de la API
async function testAllAPIEndpoints() {
    console.log('🧪 PROBANDO TODAS LAS CONEXIONES DE LA API:');
    console.log('==========================================');
    
    const endpoints = [
        { name: 'Dashboard', url: '/api/test' },
        { name: 'Pacientes', url: '/api/pacientes' },
        { name: 'Estudiantes', url: '/api/estudiantes' },
        { name: 'Asignaciones', url: '/api/asignaciones' },
        { name: 'Matching Stats', url: '/api/matching/stats' },
        { name: 'Sync Status', url: '/api/sync/status' }
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`🔍 Probando ${endpoint.name}...`);
            const startTime = Date.now();
            const response = await fetch(endpoint.url);
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ ${endpoint.name}: OK (${responseTime}ms)`, {
                    status: response.status,
                    success: result.success,
                    dataLength: result.data ? (Array.isArray(result.data) ? result.data.length : 'N/A') : 'N/A'
                });
            } else {
                console.log(`❌ ${endpoint.name}: ERROR ${response.status}`, {
                    status: response.status,
                    statusText: response.statusText
                });
            }
        } catch (error) {
            console.log(`❌ ${endpoint.name}: EXCEPCIÓN`, {
                error: error.message,
                type: error.name
            });
        }
    }
    
    console.log('==========================================');
}

// Agregar testAllAPIEndpoints a window para poder ejecutarlo desde consola
window.testAllAPIEndpoints = testAllAPIEndpoints;

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

// Función para limpiar mensajes de "no hay resultados"
function clearNoResultsMessages() {
    const tbody = document.getElementById('patientsTableBody');
    if (tbody) {
        const noResultsRows = tbody.querySelectorAll('tr[data-no-results="true"]');
        noResultsRows.forEach(row => row.remove());
    }
}

function filterPacientes(filterValue) {
    const rows = document.querySelectorAll('#patientsTableBody tr');
    let visibleCount = 0;
    
    // Limpiar mensajes anteriores de "no hay resultados"
    clearNoResultsMessages();
    
    rows.forEach(row => {
        if (!filterValue || filterValue === '') {
            row.style.display = '';
            visibleCount++;
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
            case 'en_tratamiento':
                shouldShow = estadoText.includes('tratamiento');
                break;
            default:
                shouldShow = estadoText.includes(filterText);
                break;
        }
        
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleCount++;
    });
    
    // Mostrar mensaje si no hay resultados
    if (visibleCount === 0 && filterValue) {
        const tbody = document.getElementById('patientsTableBody');
        if (tbody) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.setAttribute('data-no-results', 'true');
            noResultsRow.innerHTML = `<td colspan="10" style="text-align: center; padding: 2rem; color: #6b7280;">No se encontraron pacientes con el filtro "${filterValue}"</td>`;
            tbody.appendChild(noResultsRow);
        }
    }
    
    console.log(`Filtro '${filterValue}' aplicado: ${visibleCount} pacientes mostrados`);
    
    // Actualizar contadores después del filtrado
    updatePatientCounts();
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
    window.contactarEstudiante = contactarEstudiante;
    window.closeContactModal = closeContactModal;
    window.regenerateStudentCode = regenerateStudentCode;
    window.validateAndFixAllCodes = validateAndFixAllCodes;
    window.getCodeStats = getCodeStats;
    window.generateTestCode = generateTestCode;

// ====================================
//   INICIALIZACIÓN FINAL
// ====================================

console.log('✅ Dashboard Administrativo completamente inicializado');

// Mostrar funciones de debug disponibles
console.log('🔧 FUNCIONES DE DEBUG DISPONIBLES:');
console.log('=====================================');
console.log('debugPatientData()     - Debug de datos de pacientes');
console.log('debugStudentData()     - Debug de datos de estudiantes');
console.log('debugAssignmentData()  - Debug de datos de asignaciones');
console.log('debugSystemData()      - Debug general del sistema');
console.log('testAllAPIEndpoints()  - Probar todas las conexiones de la API');
console.log('=====================================');
console.log('💡 Ejecuta cualquiera de estas funciones desde la consola para diagnosticar problemas');

// Función para contactar estudiante
async function contactarEstudiante(estudianteId) {
    try {
        const estudiante = data.estudiantes.find(e => e.id === estudianteId);
        if (!estudiante) {
            showToast('Estudiante no encontrado', 'error');
            return;
        }
        
        // Buscar pacientes asignados a este estudiante
        const pacientesAsignados = data.pacientes.filter(p => 
            p.estudiante_asignado === estudianteId || 
            p.estudiante_asignado === estudiante.codigo_estudiante
        );
        
        if (pacientesAsignados.length === 0) {
            showToast('Este estudiante no tiene pacientes asignados', 'info');
            return;
        }
        
        // Mostrar modal de confirmación
        showContactModal(estudiante, pacientesAsignados);
        
    } catch (error) {
        console.error('Error contactando estudiante:', error);
        showToast('Error al contactar estudiante: ' + error.message, 'error');
    }
}

// Función para mostrar modal de contacto
function showContactModal(estudiante, pacientesAsignados) {
    const modal = document.getElementById('contactModal');
    const modalBody = document.getElementById('contactModalBody');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div class="contact-details">
                <h4>Contactar Estudiante</h4>
                <div class="student-info">
                    <p><strong>Estudiante:</strong> ${estudiante.nombre_completo}</p>
                    <p><strong>Código:</strong> ${estudiante.codigo_estudiante}</p>
                    <p><strong>Email:</strong> ${estudiante.email || 'No disponible'}</p>
                    <p><strong>Pacientes Asignados:</strong> ${pacientesAsignados.length}</p>
                </div>
                
                <div class="patients-list">
                    <h5>Pacientes Asignados:</h5>
                    <ul>
                        ${pacientesAsignados.map(p => `
                            <li>
                                <strong>${p.nombre_completo}</strong> - 
                                ${p.tipo_tratamiento_inferido || 'Tratamiento no especificado'}
                                <br><small>Prioridad: ${p.prioridad || 'Moderada'}</small>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="contact-actions">
                    <button class="btn btn-primary" onclick="sendContactEmail(${estudiante.id})">
                        <i class="fas fa-envelope"></i> Enviar Correo
                    </button>
                    <button class="btn btn-secondary" onclick="closeContactModal()">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }
}

// Función para enviar correo de contacto
async function sendContactEmail(estudianteId) {
    try {
        const estudiante = data.estudiantes.find(e => e.id === estudianteId);
        if (!estudiante) {
            showToast('Estudiante no encontrado', 'error');
            return;
        }
        
        // Buscar pacientes asignados
        const pacientesAsignados = data.pacientes.filter(p => 
            p.estudiante_asignado === estudianteId || 
            p.estudiante_asignado === estudiante.codigo_estudiante
        );
        
        if (pacientesAsignados.length === 0) {
            showToast('No hay pacientes asignados para contactar', 'error');
            return;
        }
        
        showToast('Enviando correo de contacto...', 'info');
        
        // Llamar a la API para enviar el correo
        const response = await fetch('/api/contact/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estudianteId: estudianteId,
                estudianteEmail: estudiante.email,
                estudianteCodigo: estudiante.codigo_estudiante,
                pacientesAsignados: pacientesAsignados.map(p => ({
                    id: p.id,
                    nombre: p.nombre_completo,
                    tratamiento: p.tipo_tratamiento_inferido,
                    prioridad: p.prioridad,
                    telefono: p.telefono,
                    email: p.email
                }))
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Correo enviado exitosamente', 'success');
            closeContactModal();
            
            // Registrar la acción en el sistema
            console.log('📧 Correo enviado a:', {
                estudiante: estudiante.nombre_completo,
                email: estudiante.email,
                pacientes: pacientesAsignados.length,
                timestamp: new Date().toISOString()
            });
            
        } else {
            throw new Error(result.message || 'Error enviando correo');
        }
        
    } catch (error) {
        console.error('Error enviando correo:', error);
        showToast('Error enviando correo: ' + error.message, 'error');
    }
}

// Función para cerrar modal de contacto
function closeContactModal() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ====================================
//   GESTIÓN DE CÓDIGOS DE ESTUDIANTE
// ====================================

// Función para regenerar código de estudiante
async function regenerateStudentCode(estudianteId) {
    try {
        if (!confirm('¿Estás seguro de que quieres regenerar el código de este estudiante? Esto invalidará el código anterior.')) {
            return;
        }

        showToast('Regenerando código...', 'info');

        const response = await fetch('/api/student-codes/regenerate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estudianteId })
        });

        const result = await response.json();

        if (result.success) {
            showToast(`Código regenerado: ${result.data.newCode}`, 'success');
            
            // Actualizar el código en la tabla
            const estudianteRow = document.querySelector(`[data-estudiante-id="${estudianteId}"]`);
            if (estudianteRow) {
                const codigoCell = estudianteRow.querySelector('.codigo-estudiante');
                if (codigoCell) {
                    codigoCell.textContent = result.data.newCode;
                    codigoCell.setAttribute('title', `Código regenerado: ${result.data.oldCode} → ${result.data.newCode}`);
                }
            }
            
            // Recargar datos para asegurar consistencia
            await loadEstudiantes();
            
        } else {
            throw new Error(result.message || 'Error regenerando código');
        }

    } catch (error) {
        console.error('Error regenerando código:', error);
        showToast('Error regenerando código: ' + error.message, 'error');
    }
}

// Función para validar y corregir todos los códigos
async function validateAndFixAllCodes() {
    try {
        if (!confirm('¿Estás seguro de que quieres validar y corregir todos los códigos de estudiante? Esto puede tomar varios segundos.')) {
            return;
        }

        showToast('Validando y corrigiendo códigos...', 'info');

        const response = await fetch('/api/student-codes/validate-fix', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            const { duplicates, invalidCodes, fixed } = result.data;
            
            let message = `Validación completada:\n`;
            message += `• Códigos duplicados encontrados: ${duplicates.length}\n`;
            message += `• Códigos inválidos encontrados: ${invalidCodes.length}\n`;
            message += `• Códigos corregidos: ${fixed.length}`;
            
            if (fixed.length > 0) {
                message += `\n\nCódigos corregidos:\n`;
                fixed.forEach(fix => {
                    message += `• ${fix.estudiante}: ${fix.oldCode} → ${fix.newCode} (${fix.reason})\n`;
                });
            }
            
            alert(message);
            showToast('Validación y corrección completada', 'success');
            
            // Recargar datos
            await loadEstudiantes();
            
        } else {
            throw new Error(result.message || 'Error en la validación');
        }

    } catch (error) {
        console.error('Error validando códigos:', error);
        showToast('Error validando códigos: ' + error.message, 'error');
    }
}

// Función para obtener estadísticas de códigos
async function getCodeStats() {
    try {
        const response = await fetch('/api/student-codes/stats');
        const result = await response.json();

        if (result.success) {
            const stats = result.data;
            
            let message = `📊 Estadísticas de Códigos:\n\n`;
            message += `• Total de estudiantes: ${stats.total_estudiantes}\n`;
            message += `• Con código: ${stats.con_codigo}\n`;
            message += `• Sin código: ${stats.sin_codigo}\n`;
            message += `• Códigos válidos: ${stats.codigos_validos}\n`;
            message += `• Códigos inválidos: ${stats.codigos_invalidos}`;
            
            alert(message);
            
        } else {
            throw new Error(result.message || 'Error obteniendo estadísticas');
        }

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        showToast('Error obteniendo estadísticas: ' + error.message, 'error');
    }
}

// Función para generar un código de prueba
async function generateTestCode() {
    try {
        const response = await fetch('/api/student-codes/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            alert(`Código único generado: ${result.data.codigo}`);
        } else {
            throw new Error(result.message || 'Error generando código');
        }

    } catch (error) {
        console.error('Error generando código:', error);
        showToast('Error generando código: ' + error.message, 'error');
    }
}

// ====================================
//   NOTIFICACIONES AUTOMÁTICAS
// ====================================

// Función para ver logs de notificaciones
async function viewNotificationLogs() {
    try {
        showToast('Cargando logs de notificaciones...', 'info');
        
        const response = await fetch('/api/auto-notifications/logs?limit=50');
        const result = await response.json();

        if (result.success) {
            const logs = result.data;
            
            if (logs.length === 0) {
                alert('No hay logs de notificaciones disponibles');
                return;
            }
            
            let message = `📧 Logs de Notificaciones (Últimos ${logs.length}):\n\n`;
            
            logs.forEach((log, index) => {
                const timestamp = new Date(log.timestamp).toLocaleString('es-ES');
                const status = log.type === 'success' ? '✅' : log.type === 'error' ? '❌' : '⚠️';
                message += `${index + 1}. ${status} ${timestamp}\n`;
                message += `   ${log.message}\n\n`;
            });
            
            alert(message);
            
        } else {
            throw new Error(result.message || 'Error obteniendo logs');
        }

    } catch (error) {
        console.error('Error obteniendo logs de notificaciones:', error);
        showToast('Error obteniendo logs: ' + error.message, 'error');
    }
}

// Función para obtener estadísticas de notificaciones
async function getNotificationStats() {
    try {
        const response = await fetch('/api/auto-notifications/stats');
        const result = await response.json();

        if (result.success) {
            const stats = result.data;
            
            let message = `📊 Estadísticas de Notificaciones:\n\n`;
            message += `• Total de notificaciones: ${stats.total}\n`;
            message += `• Exitosas: ${stats.success} (${stats.successRate}%)\n`;
            message += `• Con error: ${stats.error}\n`;
            message += `• Con advertencia: ${stats.warning}`;
            
            alert(message);
            
        } else {
            throw new Error(result.message || 'Error obteniendo estadísticas');
        }

    } catch (error) {
        console.error('Error obteniendo estadísticas de notificaciones:', error);
        showToast('Error obteniendo estadísticas: ' + error.message, 'error');
    }
}

// Función para limpiar logs antiguos
async function clearOldNotificationLogs() {
    try {
        const daysOld = prompt('¿Cuántos días de antigüedad para limpiar? (por defecto 30):', '30');
        if (!daysOld) return;
        
        const days = parseInt(daysOld) || 30;
        
        if (!confirm(`¿Estás seguro de que quieres limpiar logs de más de ${days} días?`)) {
            return;
        }

        showToast('Limpiando logs antiguos...', 'info');
        
        const response = await fetch('/api/auto-notifications/clear-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ daysOld: days })
        });

        const result = await response.json();

        if (result.success) {
            const { removed, remaining } = result.data;
            alert(`✅ Logs limpiados exitosamente:\n\n• Logs eliminados: ${removed}\n• Logs restantes: ${remaining}`);
            showToast('Logs limpiados exitosamente', 'success');
        } else {
            throw new Error(result.message || 'Error limpiando logs');
        }

    } catch (error) {
        console.error('Error limpiando logs:', error);
        showToast('Error limpiando logs: ' + error.message, 'error');
    }
}

// Función para probar el sistema de notificaciones
async function testNotificationSystem() {
    try {
        // Solicitar IDs para la prueba
        const pacienteId = prompt('Ingrese el ID del paciente para la prueba:');
        if (!pacienteId) return;
        
        const estudianteId = prompt('Ingrese el ID del estudiante para la prueba:');
        if (!estudianteId) return;
        
        if (!confirm(`¿Enviar notificación de prueba?\n\nPaciente ID: ${pacienteId}\nEstudiante ID: ${estudianteId}`)) {
            return;
        }

        showToast('Enviando notificación de prueba...', 'info');
        
        const response = await fetch('/api/auto-notifications/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paciente_id: parseInt(pacienteId),
                estudiante_id: parseInt(estudianteId)
            })
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ Notificación de prueba enviada exitosamente:\n\n• Paciente: ${result.data.paciente}\n• Estudiante: ${result.data.estudiante}`);
            showToast('Notificación de prueba enviada', 'success');
        } else {
            throw new Error(result.message || 'Error enviando notificación de prueba');
        }

    } catch (error) {
        console.error('Error enviando notificación de prueba:', error);
        showToast('Error enviando notificación de prueba: ' + error.message, 'error');
    }
}

// Función para mostrar el estado de notificaciones en la tabla de asignaciones
function updateAssignmentNotificationStatus(asignacion) {
    // Esta función se puede usar para mostrar el estado de las notificaciones
    // en la tabla de asignaciones con badges visuales
    const statusElement = document.querySelector(`[data-asignacion-id="${asignacion.id}"] .notification-status`);
    
    if (statusElement) {
        if (asignacion.notificaciones_enviadas) {
            statusElement.className = 'notification-status success';
            statusElement.innerHTML = '<i class="fas fa-check"></i> Enviado';
        } else {
            statusElement.className = 'notification-status pending';
            statusElement.innerHTML = '<i class="fas fa-clock"></i> Pendiente';
        }
    }
}

// Función para marcar una asignación como notificada
async function marcarComoNotificado(asignacionId) {
    try {
        console.log(`🔄 Marcando asignación ${asignacionId} como notificada...`);
        
        const response = await fetch(`/api/asignaciones/${asignacionId}/notify`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage('Asignación marcada como notificada exitosamente');
            // Recargar la tabla
            await loadAsignaciones();
        } else {
            showErrorMessage(`Error: ${result.message}`);
        }
        
    } catch (error) {
        console.error('❌ Error marcando como notificado:', error);
        showErrorMessage('Error al marcar como notificado');
    }
}

// Función para marcar una asignación como contactada
async function marcarComoContactado(asignacionId) {
    try {
        console.log(`🔄 Marcando asignación ${asignacionId} como contactada...`);
        
        const response = await fetch(`/api/asignaciones/${asignacionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estado: 'contactado',
                observaciones_sistema: 'Marcado como contactado manualmente'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage('Asignación marcada como contactada exitosamente');
            // Recargar la tabla
            await loadAsignaciones();
        } else {
            showErrorMessage(`Error: ${result.message}`);
        }
        
    } catch (error) {
        console.error('❌ Error marcando como contactada:', error);
        showErrorMessage('Error al marcar como contactada');
    }
}

// ====================================
//   FUNCIONES PARA FORMULARIOS DE MÚLTIPLES PASOS
// ====================================

// Función para navegar al siguiente paso
function nextStep(stepNumber) {
    // Ocultar paso actual
    const currentStep = document.querySelector('.form-step.active');
    if (currentStep) {
        currentStep.classList.remove('active');
    }
    
    // Mostrar siguiente paso
    const nextStep = document.querySelector(`[data-step="${stepNumber}"]`);
    if (nextStep) {
        nextStep.classList.add('active');
    }
}

// Función para navegar al paso anterior
function prevStep(stepNumber) {
    // Ocultar paso actual
    const currentStep = document.querySelector('.form-step.active');
    if (currentStep) {
        currentStep.classList.remove('active');
    }
    
    // Mostrar paso anterior
    const prevStep = document.querySelector(`[data-step="${stepNumber}"]`);
    if (prevStep) {
        prevStep.classList.add('active');
    }
}

// Función para cerrar modal de agregar paciente
function closeAddPatientModal() {
    const modal = document.getElementById('addPatientModal');
    if (modal) {
        modal.style.display = 'none';
        // Resetear formulario
        document.getElementById('addPatientForm').reset();
        // Volver al primer paso
        const firstStep = document.querySelector('[data-step="1"]');
        if (firstStep) {
            document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
            firstStep.classList.add('active');
        }
    }
}

// Función para cerrar modal de agregar estudiante
function closeAddStudentModal() {
    const modal = document.getElementById('addStudentModal');
    if (modal) {
        modal.style.display = 'none';
        // Resetear formulario
        document.getElementById('addStudentForm').reset();
        // Volver al primer paso
        const firstStep = document.querySelector('[data-step="1"]');
        if (firstStep) {
            document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
            firstStep.classList.add('active');
        }
    }
}

// Función para manejar el envío del formulario de paciente
async function handlePatientFormSubmit(event) {
    event.preventDefault();
    
    try {
        showLoadingOverlay('Guardando paciente...', 'Procesando información del paciente');
        
        const formData = new FormData(event.target);
        const patientData = {
            nombre_completo: formData.get('nombre_completo'),
            edad: formData.get('edad') ? parseInt(formData.get('edad')) : null,
            telefono: formData.get('telefono'),
            email: formData.get('email') || null,
            ciudad: formData.get('ciudad'),
            sintomas_seleccionados: Array.from(formData.getAll('sintomas[]')),
            diagnostico_previo: formData.get('diagnostico_previo') || null,
            tiempo_problema: formData.get('tiempo_problema') || null,
            nivel_dolor: parseInt(formData.get('nivel_dolor')),
            dias_disponibles: Array.from(formData.getAll('dias[]')).join(', '),
            horario_preferencia: formData.get('horario_preferencia') || null,
            disponibilidad_cita: formData.get('disponibilidad_cita') || null,
            prioridad: formData.get('prioridad'),
            estado: 'pendiente'
        };
        
        // Determinar tipo de tratamiento basado en síntomas
        patientData.tipo_tratamiento_inferido = inferTreatmentType(patientData.sintomas_seleccionados);
        patientData.complejidad = inferComplexity(patientData.sintomas_seleccionados, patientData.nivel_dolor);
        
        const response = await fetch('/api/pacientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            hideLoadingOverlay();
            showToast('Paciente agregado exitosamente', 'success');
            closeAddPatientModal();
            
            // Recargar lista de pacientes
            await loadPatients();
            
            // Actualizar contadores del dashboard
            await updateDashboardCounts();
        } else {
            throw new Error(result.message || 'Error al agregar paciente');
        }
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error agregando paciente:', error);
        showToast('Error al agregar paciente: ' + error.message, 'error');
    }
}

// Función para manejar el envío del formulario de estudiante
async function handleStudentFormSubmit(event) {
    event.preventDefault();
    
    try {
        showLoadingOverlay('Guardando estudiante...', 'Procesando información del estudiante');
        
        const formData = new FormData(event.target);
        const studentData = {
            nombre_completo: formData.get('nombre_completo'),
            email: formData.get('email'),
            telefono: formData.get('telefono') || null,
            ciudad: formData.get('ciudad'),
            año_carrera: formData.get('año_carrera'),
            universidad: formData.get('universidad') || null,
            casos_necesarios: formData.get('casos_necesarios') ? parseInt(formData.get('casos_necesarios')) : null,
            especialidades: Array.from(formData.getAll('especialidades[]')),
            dias_disponibles: Array.from(formData.getAll('dias_disponibles[]')),
            horarios_disponibles: Array.from(formData.getAll('horarios_disponibles[]')),
            estado: 'activo'
        };
        
        const response = await fetch('/api/estudiantes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            hideLoadingOverlay();
            showToast('Estudiante agregado exitosamente', 'success');
            closeAddStudentModal();
            
            // Recargar lista de estudiantes
            await loadEstudiantes();
            
            // Actualizar contadores del dashboard
            await updateDashboardCounts();
        } else {
            throw new Error(result.message || 'Error al agregar estudiante');
        }
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error agregando estudiante:', error);
        showToast('Error al agregar estudiante: ' + error.message, 'error');
    }
}

// Función para inferir el tipo de tratamiento basado en síntomas
function inferTreatmentType(symptoms) {
    const symptomMap = {
        'Endodoncia': ['Dolor de muelas', 'Dolor al masticar', 'Sensibilidad dental'],
        'Periodoncia': ['Inflamación de encías', 'Dientes flojos', 'Sangrado'],
        'Operatoria Dental': ['Diente roto', 'Caries', 'Mal aliento'],
        'Odontopediatría': ['Dolor de muelas', 'Miedo al dentista'],
        'Prostodoncia': ['Diente perdido', 'Dificultad para comer']
    };
    
    for (const [treatment, relatedSymptoms] of Object.entries(symptomMap)) {
        if (relatedSymptoms.some(symptom => symptoms.includes(symptom))) {
            return treatment;
        }
    }
    
    return 'Operatoria Dental'; // Tratamiento por defecto
}

// Función para inferir la complejidad basada en síntomas y nivel de dolor
function inferComplexity(symptoms, painLevel) {
    if (painLevel >= 8 || symptoms.includes('Diente roto') || symptoms.includes('Dientes flojos')) {
        return 'Avanzado';
    } else if (painLevel >= 5 || symptoms.length > 3) {
        return 'Intermedio';
    } else {
        return 'Básico';
    }
}

// ====================================
//   INICIALIZACIÓN DE FORMULARIOS
// ====================================

// Agregar event listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Formulario de paciente
    const patientForm = document.getElementById('addPatientForm');
    if (patientForm) {
        patientForm.addEventListener('submit', handlePatientFormSubmit);
    }
    
    // Formulario de estudiante
    const studentForm = document.getElementById('addStudentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', handleStudentFormSubmit);
    }
    
    // Botón para agregar paciente
    const addPatientBtn = document.getElementById('addPatientBtn');
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', () => {
            const modal = document.getElementById('addPatientModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }
    
    // Botón para agregar estudiante
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => {
            const modal = document.getElementById('addStudentModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }
    
    // Escala de dolor en tiempo real
    const painLevelInput = document.getElementById('patientPainLevel');
    const painValue = document.getElementById('painValue');
    if (painLevelInput && painValue) {
        painLevelInput.addEventListener('input', (e) => {
            painValue.textContent = e.target.value;
        });
    }
});

// ====================================
//   MEJORAS EN LA INTERFAZ
// ====================================

// Función para mostrar loading overlay
function showLoadingOverlay(title = 'Procesando...', message = 'Por favor espere mientras se procesa la operación.') {
    const overlay = document.getElementById('loadingOverlay');
    const titleEl = document.getElementById('loadingTitle');
    const messageEl = document.getElementById('loadingMessage');
    
    if (overlay && titleEl && messageEl) {
        titleEl.textContent = title;
        messageEl.textContent = message;
        overlay.style.display = 'flex';
    }
}

// Función para ocultar loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Función para mostrar toast notifications
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto-remover después del tiempo especificado
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, duration);
    
    // Permitir cerrar manualmente
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

// Función para obtener el ícono del toast según el tipo
function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Función para actualizar contadores del dashboard
async function updateDashboardCounts() {
    try {
        // Actualizar contador de pacientes
        const patientsResponse = await fetch('/api/pacientes');
        if (patientsResponse.ok) {
            const patientsData = await patientsResponse.json();
            const totalPatientsEl = document.getElementById('totalPatients');
            if (totalPatientsEl) {
                totalPatientsEl.textContent = patientsData.total || 0;
            }
        }
        
        // Actualizar contador de estudiantes
        const studentsResponse = await fetch('/api/estudiantes');
        if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json();
            const totalStudentsEl = document.getElementById('totalStudents');
            if (totalStudentsEl) {
                totalStudentsEl.textContent = studentsData.total || 0;
            }
        }
        
        // Actualizar contador de asignaciones
        const assignmentsResponse = await fetch('/api/asignaciones');
        if (assignmentsResponse.ok) {
            const assignmentsData = await assignmentsResponse.json();
            const totalMatchesEl = document.getElementById('totalMatches');
            if (totalMatchesEl) {
                totalMatchesEl.textContent = assignmentsData.total || 0;
            }
        }
        
    } catch (error) {
        console.error('Error actualizando contadores del dashboard:', error);
    }
}