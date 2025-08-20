// Estado de la aplicación
let currentTab = 'pacientes';
let data = {
    pacientes: [],
    estudiantes: [],
    asignaciones: []
};

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Dental Matching System V0.1');
    checkApiStatus();
    loadAllData();
});

// Verificar estado de la API
async function checkApiStatus() {
    const statusDiv = document.getElementById('api-status');
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

// Cargar todos los datos
async function loadAllData() {
    await Promise.all([
        loadPacientes(),
        loadEstudiantes(),
        loadAsignaciones()
    ]);
    updateStats();
}

// Cargar pacientes
async function loadPacientes() {
    const loading = document.getElementById('loading-pacientes');
    const table = document.getElementById('tabla-pacientes');
    
    try {
        loading.style.display = 'block';
        table.style.display = 'none';
        
        const response = await fetch('/api/pacientes');
        const result = await response.json();
        
        if (result.success) {
            data.pacientes = result.data;
            renderPacientes();
            loading.style.display = 'none';
            table.style.display = 'table';
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error cargando pacientes:', error);
        loading.textContent = '❌ Error cargando datos';
    }
}

// Cargar estudiantes
async function loadEstudiantes() {
    const loading = document.getElementById('loading-estudiantes');
    const table = document.getElementById('tabla-estudiantes');
    
    try {
        loading.style.display = 'block';
        table.style.display = 'none';
        
        const response = await fetch('/api/estudiantes');
        const result = await response.json();
        
        if (result.success) {
            data.estudiantes = result.data;
            renderEstudiantes();
            loading.style.display = 'none';
            table.style.display = 'table';
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error cargando estudiantes:', error);
        loading.textContent = '❌ Error cargando datos';
    }
}

// Cargar asignaciones
async function loadAsignaciones() {
    const loading = document.getElementById('loading-asignaciones');
    const table = document.getElementById('tabla-asignaciones');
    
    try {
        loading.style.display = 'block';
        table.style.display = 'none';
        
        const response = await fetch('/api/asignaciones');
        const result = await response.json();
        
        if (result.success) {
            data.asignaciones = result.data;
            renderAsignaciones();
            loading.style.display = 'none';
            table.style.display = 'table';
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error cargando asignaciones:', error);
        loading.textContent = '❌ Error cargando datos';
    }
}

// Renderizar tabla de pacientes
function renderPacientes() {
    const tbody = document.getElementById('tbody-pacientes');
    tbody.innerHTML = '';
    
    data.pacientes.forEach(paciente => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${paciente.id}</td>
            <td><strong>${paciente.nombre_completo}</strong></td>
            <td>${paciente.telefono || '-'}</td>
            <td>${paciente.ciudad}</td>
            <td>${paciente.tipo_tratamiento_inferido || '-'}</td>
            <td><span class="status-badge">${paciente.nivel_dolor}/10</span></td>
            <td><span class="status-badge status-${paciente.prioridad?.toLowerCase() || 'baja'}">${paciente.prioridad || 'N/A'}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Renderizar tabla de estudiantes
function renderEstudiantes() {
    const tbody = document.getElementById('tbody-estudiantes');
    tbody.innerHTML = '';
    
    data.estudiantes.forEach(estudiante => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${estudiante.codigo_estudiante}</strong></td>
            <td>${estudiante.nombre_completo}</td>
            <td>${estudiante.año_carrera}</td>
            <td>${estudiante.ciudad}</td>
            <td><span class="status-badge">${estudiante.casos_activos}</span></td>
            <td><span class="status-badge">${estudiante.casos_completados}</span></td>
            <td><span class="status-badge status-${estudiante.estado}">${estudiante.estado}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Renderizar tabla de asignaciones
function renderAsignaciones() {
    const tbody = document.getElementById('tbody-asignaciones');
    tbody.innerHTML = '';
    
    data.asignaciones.forEach(asignacion => {
        const row = document.createElement('tr');
        const fecha = new Date(asignacion.fecha_asignacion).toLocaleDateString();
        const score = asignacion.score_compatibilidad ? (asignacion.score_compatibilidad * 100).toFixed(0) + '%' : 'N/A';
        
        row.innerHTML = `
            <td>${asignacion.id}</td>
            <td>${asignacion.paciente_nombre}</td>
            <td>${asignacion.estudiante_nombre} (${asignacion.codigo_estudiante})</td>
            <td>${asignacion.tipo_tratamiento_inferido || '-'}</td>
            <td><span class="status-badge">${score}</span></td>
            <td><span class="status-badge status-${asignacion.estado}">${asignacion.estado}</span></td>
            <td>${fecha}</td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar estadísticas
function updateStats() {
    document.getElementById('total-pacientes').textContent = data.pacientes.length;
    document.getElementById('total-estudiantes').textContent = data.estudiantes.length;
    document.getElementById('total-asignaciones').textContent = data.asignaciones.length;
}

// Mostrar tab
function showTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Desactivar todos los botones
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Mostrar tab seleccionado
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    currentTab = tabName;
}

// Función para refrescar datos (para uso futuro)
function refreshData() {
    console.log('🔄 Refrescando datos...');
    loadAllData();
}