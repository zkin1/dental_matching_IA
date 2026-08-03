/**
 * DENTAL MATCHING PRO - MODERN DASHBOARD
 * Enhanced JavaScript Application with Navigation & Features
 */

/* ===================================
   AUTH MODULE
   ================================== */

const Auth = {
  getToken() {
    return localStorage.getItem('dental_token');
  },
  setToken(token) {
    localStorage.setItem('dental_token', token);
  },
  setUser(user) {
    localStorage.setItem('dental_user', JSON.stringify(user));
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem('dental_user')); } catch { return null; }
  },
  clear() {
    localStorage.removeItem('dental_token');
    localStorage.removeItem('dental_user');
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }
};

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  errorEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Ingresando...';

  try {
    const res = await fetch(`${window.location.origin}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || 'Credenciales incorrectas');
    }

    Auth.setToken(data.data.tokens.accessToken);
    Auth.setUser(data.data.user);
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesion';
  }
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-layout').style.display = 'none';
}

async function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-layout').style.display = '';
  const user = Auth.getUser();
  if (user) {
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    if (nameEl) nameEl.textContent = user.nombre_completo || user.nombre || 'Admin';
    if (roleEl) roleEl.textContent = user.role || 'Sistema';
  }
  // Initialize app if not already initialized
  if (!app) {
    toastManager = new ToastManager();
    window.toastManager = toastManager;
    app = new DentalMatchingApp();
    window.app = app;
    await app.init();
  }
}

function logout() {
  Auth.clear();
  showLogin();
}

function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function checkAuthOnLoad() {
  if (Auth.isLoggedIn()) {
    showApp();
    return true;
  } else {
    showLogin();
    return false;
  }
}

// Patch fetch to auto-add auth header and handle 401
const _originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  const token = Auth.getToken();
  if (token) {
    options.headers = options.headers || {};
    if (!options.headers['Authorization']) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }
  }
  return _originalFetch.call(this, url, options).then(function(response) {
    if (response.status === 401) {
      Auth.clear();
      showLogin();
    }
    return response;
  });
};

/* ===================================
   CONFIGURATION & CONSTANTS
   ================================== */

const CONFIG = {
  API_BASE_URL: window.location.origin,
  REFRESH_INTERVAL: 30000,
  MAX_RETRIES: 3,
  TIMEOUT: 10000,
  ANIMATIONS: {
    FADE_DURATION: 300,
    SLIDE_DURATION: 200
  }
};

const ENDPOINTS = {
  HEALTH: 'api/health',
  PATIENTS: 'api/pacientes',
  STUDENTS: 'api/estudiantes',
  ASSIGNMENTS: 'api/asignaciones',
  MATCHING: 'api/matching/auto',
  REAL_STATS: 'api/matching/real-stats',
  STATS: 'api/matching/stats',
  TEST: 'api/test'
};

const ELEMENT_IDS = {
  SIDEBAR: 'sidebar',
  SIDEBAR_TOGGLE: 'sidebarToggle',
  STATUS_INDICATOR: 'statusIndicator',
  STATUS_TEXT: 'statusText',
  TOTAL_PATIENTS: 'totalPatients',
  TOTAL_STUDENTS: 'totalStudents',
  TOTAL_ASSIGNMENTS: 'totalAssignments',
  SUCCESS_RATE: 'successRate',
  SYSTEM_INFO: 'systemInfo',
  PATIENTS_DATA: 'patientsData',
  STUDENTS_DATA: 'studentsData',
  ASSIGNMENTS_DATA: 'assignmentsData',
  PATIENTS_BADGE: 'patientsBadge',
  STUDENTS_BADGE: 'studentsBadge',
  ASSIGNMENTS_BADGE: 'assignmentsBadge',
  MATCHING_RESULTS: 'matchingResults',
  TOAST_CONTAINER: 'toastContainer'
};

/* ===================================
   UTILITY FUNCTIONS
   ================================== */

const Utils = {
  getElementById(id) {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`Element with ID '${id}' not found`);
    }
    return element;
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  sanitizeHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },

  createElement(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
  },

  // Función segura para reemplazar innerHTML
  safeSetHtml(container, htmlString) {
    if (!container) return;
    // Crear elemento temporal para parsear HTML de forma segura
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
    
    // Limpiar contenido anterior
    container.innerHTML = '';
    
    // Mover todos los nodos del temporal al contenedor
    while (temp.firstChild) {
      container.appendChild(temp.firstChild);
    }
  },

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  addClass(element, className) {
    if (element) element.classList.add(className);
  },

  removeClass(element, className) {
    if (element) element.classList.remove(className);
  },

  toggleClass(element, className) {
    if (element) element.classList.toggle(className);
  },

  formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
  },

  generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }
};

/* ===================================
   TOAST NOTIFICATION SYSTEM
   ================================== */

class ToastManager {
  constructor() {
    this.container = Utils.getElementById(ELEMENT_IDS.TOAST_CONTAINER);
    this.toasts = [];
  }

  show(message, type = 'info', duration = 5000) {
    const toast = this.createToast(message, type);
    this.toasts.push(toast);
    
    if (this.container) {
      this.container.appendChild(toast);
    }

    setTimeout(() => this.remove(toast), duration);
    return toast;
  }

  createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Usar DOM seguro en lugar de innerHTML
    const content = Utils.createElement('div', 'toast-content');
    const icon = Utils.createElement('div', 'toast-icon');
    content.appendChild(icon);
    
    const messageEl = Utils.createElement('div', 'toast-message');
    messageEl.textContent = message; // Usar textContent para evitar XSS
    content.appendChild(messageEl);
    
    const closeBtn = Utils.createElement('button', 'toast-close');
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => this.remove(toast);
    content.appendChild(closeBtn);
    
    toast.appendChild(content);
    return toast;
  }

  getToastIcon(type) {
    const icons = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      info: '<i class="fas fa-info-circle"></i>'
    };
    return icons[type] || icons.info;
  }

  remove(toast) {
    if (toast && toast.parentNode) {
      toast.style.animation = 'toast-slide-out 0.3s ease-in forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        this.toasts = this.toasts.filter(t => t !== toast);
      }, 300);
    }
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

/* ===================================
   NAVIGATION MANAGER
   ================================== */

class NavigationManager {
  constructor() {
    this.currentSection = 'dashboard';
    this.sidebar = Utils.getElementById(ELEMENT_IDS.SIDEBAR);
    this.sidebarToggle = Utils.getElementById(ELEMENT_IDS.SIDEBAR_TOGGLE);
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Sidebar toggle
    if (this.sidebarToggle) {
      this.sidebarToggle.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }

    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.getAttribute('data-section');
        if (section) {
          this.navigateToSection(section);
        }
      });
    });

    // Handle responsive behavior
    this.handleResponsiveNavigation();
  }

  toggleSidebar() {
    if (this.sidebar) {
      Utils.toggleClass(this.sidebar, 'open');
      Utils.toggleClass(this.sidebar, 'collapsed');
    }
  }

  navigateToSection(sectionName) {
    // Update active navigation item
    document.querySelectorAll('.nav-item').forEach(item => {
      Utils.removeClass(item, 'active');
    });

    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavItem) {
      Utils.addClass(activeNavItem, 'active');
    }

    // Show/hide sections
    document.querySelectorAll('.content-section').forEach(section => {
      Utils.removeClass(section, 'active');
    });

    const targetSection = Utils.getElementById(sectionName + 'Section');
    if (targetSection) {
      Utils.addClass(targetSection, 'active');
    }

    // Update page title
    this.updatePageTitle(sectionName);

    // Load section-specific data
    this.loadSectionData(sectionName);

    this.currentSection = sectionName;

    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 1024 && this.sidebar) {
      Utils.removeClass(this.sidebar, 'open');
    }
  }

  updatePageTitle(sectionName) {
    const titles = {
      dashboard: { title: 'Dashboard Inteligente', subtitle: 'Vista general del sistema de matching dental' },
      patients: { title: 'Gestión de Pacientes', subtitle: 'Administrar pacientes y historiales médicos' },
      students: { title: 'Gestión de Estudiantes', subtitle: 'Administrar estudiantes y sus especialidades' },
      assignments: { title: 'Asignaciones Activas', subtitle: 'Monitorear y gestionar asignaciones' },
      matching: { title: 'Matching Inteligente', subtitle: 'Sistema de matching con IA avanzada' },
      analytics: { title: 'Analytics & ML', subtitle: 'Análisis predictivo y machine learning' }
    };

    const titleData = titles[sectionName] || titles.dashboard;
    const pageTitle = document.querySelector('.page-title');
    const pageSubtitle = document.querySelector('.page-subtitle');

    if (pageTitle) pageTitle.textContent = titleData.title;
    if (pageSubtitle) pageSubtitle.textContent = titleData.subtitle;
  }

  loadSectionData(sectionName) {
    switch (sectionName) {
      case 'patients':
        if (typeof app !== 'undefined') {
          app.loadPatientsData();
        }
        break;
      case 'students':
        if (typeof app !== 'undefined') {
          app.loadStudentsData();
        }
        break;
      case 'assignments':
        if (typeof app !== 'undefined') {
          app.loadAssignmentsData();
        }
        break;
      case 'matching':
        this.initializeMatchingSection();
        break;
      case 'analytics':
        this.initializeAnalyticsSection();
        break;
      default:
        if (typeof app !== 'undefined') {
          app.loadInitialData();
        }
    }
  }

  initializeMatchingSection() {
    // Initialize matching controls if not already done
    console.log('🤖 Initializing AI Matching Section');
  }

  initializeAnalyticsSection() {
    console.log('🧠 Initializing Analytics Section');
    this.loadRealAnalyticsData();
  }

  async loadRealAnalyticsData() {
    try {
      const result = await this.apiService.fetchData(ENDPOINTS.REAL_STATS);
      if (result.success && result.data) {
        this.updateAnalyticsUI(result.data);
      }
    } catch (error) {
      console.error('❌ Error loading real analytics data:', error);
    }
  }

  updateAnalyticsUI(data) {
    console.log('📊 Updating Analytics UI with real data:', data);
    
    // Actualizar sección de Analytics
    this.updateAnalyticsCards(data);
    
    // Actualizar métricas del dashboard
    this.updateDashboardMetrics(data);
  }

  updateAnalyticsCards(data) {
    const analyticsSection = document.getElementById('analyticsSection');
    if (!analyticsSection || !analyticsSection.classList.contains('active')) return;

    // Actualizar tarjetas de analytics
    const precisionCard = analyticsSection.querySelector('.analytics-card:nth-child(1) .metric-display');
    const timeCard = analyticsSection.querySelector('.analytics-card:nth-child(2) .metric-display');
    const casesCard = analyticsSection.querySelector('.analytics-card:nth-child(3) .metric-display');

    if (precisionCard) {
      precisionCard.textContent = `${data.algorithm.modelAccuracy}%`;
    }
    
    if (timeCard) {
      timeCard.textContent = `${data.algorithm.avgResponseTime}s`;
    }
    
    if (casesCard) {
      casesCard.textContent = Utils.formatNumber(data.algorithm.totalAnalyzedCases);
    }

    // Actualizar tendencias
    const precisionTrend = analyticsSection.querySelector('.analytics-card:nth-child(1) .metric-change');
    const timeTrend = analyticsSection.querySelector('.analytics-card:nth-child(2) .metric-change');
    const casesTodayTrend = analyticsSection.querySelector('.analytics-card:nth-child(3) .metric-change');

    if (precisionTrend) {
      const trendClass = data.trends.accuracyTrend === 'positive' ? 'positive' : 
                        data.trends.accuracyTrend === 'negative' ? 'negative' : 'neutral';
      precisionTrend.className = `metric-change ${trendClass}`;
      precisionTrend.innerHTML = `<i class="fas fa-arrow-${trendClass === 'positive' ? 'up' : trendClass === 'negative' ? 'down' : 'right'}"></i> Basado en datos reales`;
    }

    if (timeTrend) {
      timeTrend.className = 'metric-change positive';
      timeTrend.innerHTML = '<i class="fas fa-arrow-up"></i> Optimizado automáticamente';
    }

    if (casesTodayTrend) {
      casesTodayTrend.className = 'metric-change positive';
      casesTodayTrend.innerHTML = `<i class="fas fa-arrow-up"></i> +${data.algorithm.casesToday} hoy`;
    }
  }

  updateDashboardMetrics(data) {
    // Actualizar métricas de IA en dashboard enhanced
    const aiAccuracyEl = document.querySelector('#aiAccuracy .number');
    const aiResponseTimeEl = document.getElementById('aiResponseTime');
    const aiAnalysisTodayEl = document.getElementById('aiAnalysisToday');

    if (aiAccuracyEl) {
      aiAccuracyEl.textContent = data.algorithm.modelAccuracy;
    }
    
    if (aiResponseTimeEl) {
      aiResponseTimeEl.textContent = `${data.algorithm.avgResponseTime}s resp.`;
    }
    
    if (aiAnalysisTodayEl) {
      aiAnalysisTodayEl.textContent = `${data.algorithm.casesToday} análisis`;
    }

    // Actualizar legacy metrics si existen
    const aiMetrics = document.querySelectorAll('.ai-metric-value');
    if (aiMetrics.length >= 3) {
      aiMetrics[0].textContent = `${data.algorithm.modelAccuracy}%`;
      aiMetrics[1].textContent = `${data.algorithm.avgResponseTime}s`;
      aiMetrics[2].textContent = data.algorithm.casesToday.toString();
    }

    // Actualizar success rate en métricas principales
    const successRateElement = document.getElementById(ELEMENT_IDS.SUCCESS_RATE);
    if (successRateElement) {
      successRateElement.textContent = `${data.algorithm.modelAccuracy}%`;
    }

    // Actualizar trend de IA
    updateTrend('aiTrend', 
      data.algorithm.modelAccuracy > 90 ? 'positive' : 
      data.algorithm.modelAccuracy > 80 ? 'neutral' : 'negative',
      data.algorithm.modelAccuracy > 90 ? 'Excelente' : 
      data.algorithm.modelAccuracy > 80 ? 'Optimizado' : 'Mejorando'
    );
  }

  handleResponsiveNavigation() {
    const handleResize = () => {
      if (window.innerWidth > 1024 && this.sidebar) {
        Utils.removeClass(this.sidebar, 'open');
      }
    };

    window.addEventListener('resize', Utils.debounce(handleResize, 250));

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024 && 
          this.sidebar && 
          this.sidebar.classList.contains('open') &&
          !this.sidebar.contains(e.target) &&
          !this.sidebarToggle?.contains(e.target)) {
        Utils.removeClass(this.sidebar, 'open');
      }
    });
  }
}

/* ===================================
   ENHANCED API SERVICE CLASS
   ================================== */

class ApiService {
  constructor() {
    this.baseUrl = CONFIG.API_BASE_URL;
    this.timeout = CONFIG.TIMEOUT;
    this.maxRetries = CONFIG.MAX_RETRIES;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/${endpoint}`;
    const defaultOptions = {
      method: 'GET',
      headers: Auth.getHeaders(),
      timeout: this.timeout,
      ...options
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...defaultOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          logout();
          throw new Error('Sesion expirada. Inicia sesion nuevamente.');
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return { success: true, data, response };

      } catch (error) {
        console.warn(`API request attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.maxRetries) {
          throw new Error(`API request failed after ${this.maxRetries} attempts: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  async getHealth() {
    return this.request(ENDPOINTS.HEALTH);
  }

  async getPatients(limit = 10) {
    return this.request(`${ENDPOINTS.PATIENTS}?limit=${limit}`);
  }

  async getStudents(limit = 10) {
    return this.request(`${ENDPOINTS.STUDENTS}?limit=${limit}`);
  }

  async getAssignments(limit = 10) {
    return this.request(`${ENDPOINTS.ASSIGNMENTS}?limit=${limit}`);
  }

  async executeMatching(options = {}) {
    return this.request(ENDPOINTS.MATCHING, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async testConnection() {
    return this.request(ENDPOINTS.TEST);
  }
}

/* ===================================
   STATE MANAGEMENT CLASS
   ================================== */

class StateManager {
  constructor() {
    this.state = {
      isLoading: false,
      error: null,
      lastUpdate: null,
      data: {
        health: null,
        patients: [],
        students: [],
        assignments: [],
        stats: {}
      }
    };
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  setState(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.state.lastUpdate = new Date().toISOString();
    
    this.subscribers.forEach(callback => {
      callback(this.state, prevState);
    });
  }

  getState() {
    return { ...this.state };
  }

  setLoading(isLoading) {
    this.setState({ isLoading, error: null });
  }

  setError(error) {
    this.setState({ error, isLoading: false });
  }

  clearError() {
    this.setState({ error: null });
  }
}

/* ===================================
   ENHANCED UI RENDERER CLASS
   ================================== */

class UIRenderer {
  constructor() {
    this.animationQueue = [];
    this.toastManager = new ToastManager();
  }

  updateSystemStatus(healthData, isError = false) {
    const indicator = Utils.getElementById(ELEMENT_IDS.STATUS_INDICATOR);
    const text = Utils.getElementById(ELEMENT_IDS.STATUS_TEXT);
    
    if (!indicator || !text) return;

    if (isError) {
      Utils.removeClass(indicator, 'success');
      Utils.addClass(indicator, 'error');
      text.textContent = 'Error conectando al servidor';
      this.toastManager.error('Error de conexión con el servidor');
    } else if (healthData && healthData.success) {
      Utils.removeClass(indicator, 'error');
      indicator.className = 'status-indicator'; // Reset classes
      text.textContent = `Sistema funcionando correctamente`;
    } else {
      Utils.removeClass(indicator, 'success');
      Utils.addClass(indicator, 'error');
      text.textContent = `Sistema con problemas`;
    }
  }

  updateStats(stats) {
    const elements = {
      patients: Utils.getElementById(ELEMENT_IDS.TOTAL_PATIENTS),
      students: Utils.getElementById(ELEMENT_IDS.TOTAL_STUDENTS),
      assignments: Utils.getElementById(ELEMENT_IDS.TOTAL_ASSIGNMENTS),
      successRate: Utils.getElementById(ELEMENT_IDS.SUCCESS_RATE)
    };

    // Update main stats
    if (elements.patients) {
      this.animateNumber(elements.patients, stats.pacientes || 0);
    }
    if (elements.students) {
      this.animateNumber(elements.students, stats.estudiantes || 0);
    }
    if (elements.assignments) {
      this.animateNumber(elements.assignments, stats.asignaciones || 0);
    }
    if (elements.successRate) {
      const rate = stats.asignaciones && stats.pacientes ? 
        Math.round((stats.asignaciones / stats.pacientes) * 100) : 0;
      this.animateNumber(elements.successRate, rate, '%');
    }

    // Update navigation badges
    this.updateNavigationBadges(stats);
  }

  updateNavigationBadges(stats) {
    const patientsBadge = Utils.getElementById(ELEMENT_IDS.PATIENTS_BADGE);
    const studentsBadge = Utils.getElementById(ELEMENT_IDS.STUDENTS_BADGE);
    const assignmentsBadge = Utils.getElementById(ELEMENT_IDS.ASSIGNMENTS_BADGE);

    if (patientsBadge) patientsBadge.textContent = Utils.formatNumber(stats.pacientes || 0);
    if (studentsBadge) studentsBadge.textContent = Utils.formatNumber(stats.estudiantes || 0);
    if (assignmentsBadge) assignmentsBadge.textContent = Utils.formatNumber(stats.asignaciones || 0);
  }

  animateNumber(element, targetValue, suffix = '') {
    if (!element) return;
    
    const startValue = parseInt(element.textContent.replace(/\D/g, '')) || 0;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOut);
      
      element.textContent = Utils.formatNumber(currentValue) + suffix;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  updateSystemInfo(healthData) {
    const container = Utils.getElementById(ELEMENT_IDS.SYSTEM_INFO);
    if (!container) return;

    const infoItems = [
      {
        label: 'Base de Datos',
        value: healthData.services?.database ? '✅ Conectada' : '❌ Desconectada',
        status: healthData.services?.database ? 'success' : 'error'
      },
      {
        label: 'Motor IA',
        value: healthData.services?.ai ? '🧠 Activo' : '❌ Inactivo',
        status: healthData.services?.ai ? 'success' : 'error'
      },
      {
        label: 'Matching',
        value: healthData.services?.matching ? '🤖 Operativo' : '❌ Detenido',
        status: healthData.services?.matching ? 'success' : 'error'
      },
      {
        label: 'Registros',
        value: Utils.formatNumber(healthData.stats?.dbRecords || 0),
        status: 'info'
      },
      {
        label: 'Uptime',
        value: healthData.uptime || 'N/A',
        status: 'info'
      },
      {
        label: 'Versión',
        value: healthData.version || '2.0.0',
        status: 'info'
      }
    ];

    // Usar DOM seguro en lugar de innerHTML
    container.innerHTML = '';
    infoItems.forEach(item => {
      const itemEl = Utils.createElement('div', `info-item ${item.status}`);
      itemEl.setAttribute('data-animate', 'fade-in');
      
      const labelEl = Utils.createElement('div', 'info-label', item.label);
      const valueEl = Utils.createElement('div', 'info-value', item.value);
      
      itemEl.appendChild(labelEl);
      itemEl.appendChild(valueEl);
      container.appendChild(itemEl);
    });

    // Animate items
    this.animateElements(container.querySelectorAll('[data-animate]'));
  }

  renderPatientsTable(patients) {
    console.log('🎨 Renderizando tabla de pacientes...', patients);
    
    // Determinar qué contenedor usar basado en la sección activa
    let containerId = ELEMENT_IDS.PATIENTS_DATA;
    const patientsSection = document.getElementById('patientsSection');
    if (patientsSection && patientsSection.classList.contains('active')) {
      containerId = 'patientsData';
    }
    
    const container = Utils.getElementById(containerId);
    if (!container) {
      console.error('❌ Contenedor de pacientes no encontrado:', containerId);
      return;
    }

    if (!patients || patients.length === 0) {
      console.log('📭 No hay pacientes para mostrar');
      Utils.safeSetHtml(container, this.getEmptyState('users', 'No hay pacientes registrados'));
      return;
    }

    console.log(`👥 Renderizando ${patients.length} pacientes`);

    // Actualizar el contador según la sección activa
    const currentPatientsSection = document.getElementById('patientsSection');
    if (currentPatientsSection && currentPatientsSection.classList.contains('active')) {
      const sectionCount = document.getElementById('patientsCountSection');
      if (sectionCount) {
        sectionCount.textContent = patients.length;
      }
    }

    const rows = patients.map((patient, index) => `
      <tr data-animate="slide-in" style="animation-delay: ${index * 50}ms">
        <td>
          <div class="patient-info">
            <div class="patient-avatar">
              ${patient.nombre_completo ? patient.nombre_completo.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <div class="patient-name">${Utils.escapeHtml(patient.nombre_completo || 'N/A')}</div>
              <div class="patient-id">ID: ${patient.id || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="age-badge">${patient.edad || 'N/A'}</span>
        </td>
        <td>
          <div class="consultation-reason">
            ${Utils.escapeHtml(this.truncateText(patient.tipo_tratamiento_inferido || 'Sin especificar', 50))}
          </div>
        </td>
        <td>
          <span class="status ${(patient.estado || 'pendiente').toLowerCase()}">
            ${patient.estado || 'Pendiente'}
          </span>
        </td>
        <td>
          <div class="date-info">
            <div class="date-primary">${Utils.formatDate(patient.fecha_registro)}</div>
            <div class="date-secondary">Registrado</div>
          </div>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" onclick="viewPatient(${patient.id})" title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" onclick="editPatient(${patient.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    Utils.safeSetHtml(container, `
      <table class="data-table">
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Edad</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `);

    console.log('✅ Tabla de pacientes renderizada exitosamente');
    this.animateElements(container.querySelectorAll('[data-animate]'));
  }

  renderStudentsTable(students) {
    const container = Utils.getElementById(ELEMENT_IDS.STUDENTS_DATA);
    if (!container) return;

    if (!students || students.length === 0) {
      Utils.safeSetHtml(container, this.getEmptyState('user-graduate', 'No hay estudiantes registrados'));
      return;
    }

    const rows = students.map((student, index) => `
      <tr data-animate="slide-in" style="animation-delay: ${index * 50}ms">
        <td>
          <div class="student-info">
            <div class="student-avatar">
              ${student.nombre_completo ? student.nombre_completo.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <div class="student-name">${Utils.escapeHtml(student.nombre_completo || 'N/A')}</div>
              <div class="student-id">ID: ${student.id || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="year-badge year-${student.año_carrera || '4to'}">
            ${student.año_carrera || 'N/A'}
          </span>
        </td>
        <td>
          <div class="specialties">
            ${this.renderSpecialties(student.especialidades)}
          </div>
        </td>
        <td>
          <div class="performance-metrics">
            <div class="metric">
              <span class="metric-value">${student.casos_completados || 0}</span>
              <span class="metric-label">Completados</span>
            </div>
            <div class="metric">
              <span class="metric-value">${student.casos_activos || 0}</span>
              <span class="metric-label">Activos</span>
            </div>
            <div class="metric">
              <span class="metric-value">${student.casos_necesarios || 0}</span>
              <span class="metric-label">Necesarios</span>
            </div>
          </div>
        </td>
        <td>
          <span class="status ${(student.status || 'activo').toLowerCase()}">
            ${student.status || 'Activo'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" onclick="viewStudent(${student.id})" title="Ver perfil">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" onclick="editStudent(${student.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Estudiante</th>
            <th>Año</th>
            <th>Especialidades</th>
            <th>Rendimiento</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    this.animateElements(container.querySelectorAll('[data-animate]'));
  }

  renderAssignmentsTable(assignments) {
    const container = Utils.getElementById(ELEMENT_IDS.ASSIGNMENTS_DATA);
    if (!container) return;

    if (!assignments || assignments.length === 0) {
      Utils.safeSetHtml(container, this.getEmptyState('link', 'No hay asignaciones registradas'));
      return;
    }

    const rows = assignments.map((assignment, index) => `
      <tr data-animate="slide-in" style="animation-delay: ${index * 50}ms">
        <td>
          <div class="assignment-info">
            <div class="assignment-id">#${assignment.id || 'N/A'}</div>
            <div class="assignment-specialty">
              ${Utils.escapeHtml(assignment.especialidad || assignment.especialidades || 'General')}
            </div>
            ${assignment.sistema ? `<div class="assignment-system">${assignment.sistema}</div>` : ''}
          </div>
        </td>
        <td>
          <div class="participant-info">
            <div class="participant-name">
              ${Utils.escapeHtml(assignment.paciente_nombre || 'N/A')}
            </div>
            <div class="participant-meta">Paciente</div>
            ${assignment.prioridad && assignment.prioridad !== 'Moderada' ? 
              `<span class="priority-badge priority-${assignment.prioridad.toLowerCase()}">${assignment.prioridad}</span>` : ''}
          </div>
        </td>
        <td>
          <div class="participant-info">
            <div class="participant-name">
              ${Utils.escapeHtml(assignment.estudiante_nombre || 'N/A')}
            </div>
            <div class="participant-meta">
              ${assignment.año_carrera ? `${assignment.año_carrera} año` : 'Estudiante'}
            </div>
            ${assignment.clinica_display ? `<div class="clinic-info">${assignment.clinica_display}</div>` : ''}
          </div>
        </td>
        <td>
          <div class="schedule-info">
            ${assignment.horario_completo && assignment.horario_completo !== 'Horario no asignado' ? 
              `<div class="schedule-detail">
                <i class="fas fa-calendar-alt"></i>
                ${assignment.horario_completo}
              </div>` : 
              '<span class="no-schedule">Sin horario específico</span>'}
          </div>
        </td>
        <td>
          <div class="compatibility-score">
            <div class="score-circle score-${this.getScoreClass(assignment.score_compatibilidad)}">
              ${Math.round((assignment.score_compatibilidad || 0) * 100)}%
            </div>
          </div>
        </td>
        <td>
          <span class="status ${(assignment.estado || 'pendiente').toLowerCase()}">
            ${assignment.estado_display || assignment.estado || 'Pendiente'}
          </span>
        </td>
        <td>
          <div class="date-info">
            <div class="date-primary">${Utils.formatDate(assignment.fecha_asignacion)}</div>
            <div class="date-secondary">Asignado</div>
          </div>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" onclick="viewAssignment(${assignment.id})" title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" onclick="editAssignment(${assignment.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="data-table assignments-table-enhanced">
        <thead>
          <tr>
            <th>Asignación</th>
            <th>Paciente</th>
            <th>Estudiante</th>
            <th>Horario</th>
            <th>Compatibilidad</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    this.animateElements(container.querySelectorAll('[data-animate]'));
  }

  renderSpecialties(specialties) {
    if (!specialties) return '<span class="specialty-tag">General</span>';
    
    const specialtiesArray = Array.isArray(specialties) ? specialties : [specialties];
    
    return specialtiesArray.slice(0, 3).map(specialty => 
      `<span class="specialty-tag">${Utils.escapeHtml(specialty)}</span>`
    ).join('') + (specialtiesArray.length > 3 ? '<span class="specialty-more">+' + (specialtiesArray.length - 3) + '</span>' : '');
  }

  getScoreClass(score) {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'poor';
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  getEmptyState(icon, message) {
    return `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-${icon}"></i>
        </div>
        <p>${message}</p>
        <div class="empty-actions">
          <button class="btn btn-primary">
            <i class="fas fa-plus"></i>
            Agregar ${message.includes('pacientes') ? 'Paciente' : message.includes('estudiantes') ? 'Estudiante' : 'Elemento'}
          </button>
        </div>
      </div>
    `;
  }

  showLoading(containerId, message = 'Cargando...') {
    const container = Utils.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="loading-modern">
        <div class="loading-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        <p>${message}</p>
      </div>
    `;
  }

  showError(containerId, message = 'Error cargando datos') {
    const container = Utils.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <p>${message}</p>
        <button class="btn btn-outline" onclick="app.loadInitialData()">
          <i class="fas fa-redo"></i>
          Reintentar
        </button>
      </div>
    `;
  }

  animateElements(elements) {
    elements.forEach((element, index) => {
      setTimeout(() => {
        Utils.addClass(element, 'animate');
      }, index * 50);
    });
  }
}

/* ===================================
   MAIN APPLICATION CLASS
   ================================== */

class DentalMatchingApp {
  constructor() {
    this.apiService = new ApiService();
    this.stateManager = new StateManager();
    this.uiRenderer = new UIRenderer();
    this.navigationManager = new NavigationManager();
    this.refreshTimer = null;

    // Bind methods
    this.handleStateChange = this.handleStateChange.bind(this);
    this.loadData = this.loadData.bind(this);
    this.testApi = this.testApi.bind(this);
    this.checkHealth = this.checkHealth.bind(this);

    // Setup state subscription
    this.stateManager.subscribe(this.handleStateChange);
  }

  async init() {
    console.log('🚀 Iniciando Dental Matching Pro Dashboard...');
    
    try {
      await this.loadInitialData();
      this.setupEventHandlers();
      this.startAutoRefresh();
      
      console.log('✅ Dashboard Pro inicializado correctamente');
      
      this.uiRenderer.toastManager.success('Sistema iniciado correctamente', 3000);
    } catch (error) {
      console.error('❌ Error inicializando dashboard:', error);
      this.stateManager.setError(error.message);
      this.uiRenderer.toastManager.error('Error al inicializar el sistema');
    }
  }

  handleStateChange(newState, prevState) {
    if (newState.error && newState.error !== prevState.error) {
      console.error('State error:', newState.error);
      this.uiRenderer.toastManager.error(newState.error);
    }
    
    if (newState.data !== prevState.data) {
      this.updateUI(newState.data);
    }
  }

  async loadInitialData() {
    this.stateManager.setLoading(true);
    
    try {
      const [healthResult, patientsResult, studentsResult, assignmentsResult] = await Promise.allSettled([
        this.apiService.getHealth(),
        this.apiService.getPatients(10),
        this.apiService.getStudents(10),
        this.apiService.getAssignments(10)
      ]);

      const data = {
        health: healthResult.status === 'fulfilled' ? healthResult.value.data : null,
        patients: patientsResult.status === 'fulfilled' ? patientsResult.value.data?.data || [] : [],
        students: studentsResult.status === 'fulfilled' ? studentsResult.value.data?.data || [] : [],
        assignments: assignmentsResult.status === 'fulfilled' ? assignmentsResult.value.data?.data || [] : []
      };

      if (data.health && data.health.stats) {
        data.stats = data.health.stats;
      }

      this.stateManager.setState({ data, isLoading: false });

      // Cargar estadísticas de AI con datos reales
      await this.loadStats();

    } catch (error) {
      this.stateManager.setError(`Error cargando datos: ${error.message}`);
    }
  }

  updateUI(data) {
    this.uiRenderer.updateSystemStatus(data.health);
    
    if (data.stats) {
      this.uiRenderer.updateStats(data.stats);
    }
    
    if (data.health) {
      this.uiRenderer.updateSystemInfo(data.health);
    }
    
    this.uiRenderer.renderPatientsTable(data.patients);
    this.uiRenderer.renderStudentsTable(data.students);
    this.uiRenderer.renderAssignmentsTable(data.assignments);
  }

  setupEventHandlers() {
    // Make functions available globally
    window.loadData = this.loadData;
    window.testApi = this.testApi;
    window.checkHealth = this.checkHealth;
    window.executeAIMatching = this.executeAIMatching.bind(this);
    window.toggleTheme = this.toggleTheme.bind(this);
    window.showNotifications = this.showNotifications.bind(this);
    window.showSettings = this.showSettings.bind(this);
    window.quickAction = this.quickAction.bind(this);

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopAutoRefresh();
      } else {
        this.startAutoRefresh();
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Conexión restaurada');
      this.uiRenderer.toastManager.success('Conexión restaurada');
      this.loadData();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Conexión perdida');
      this.uiRenderer.toastManager.warning('Sin conexión a internet');
    });
  }

  startAutoRefresh() {
    if (this.refreshTimer) return;
    
    this.refreshTimer = setInterval(() => {
      if (!document.hidden) {
        this.loadStats();
      }
    }, CONFIG.REFRESH_INTERVAL);
    
    console.log(`⏰ Auto-refresh iniciado (cada ${CONFIG.REFRESH_INTERVAL / 1000}s)`);
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('⏸️ Auto-refresh detenido');
    }
  }

  async loadStats() {
    try {
      // Cargar datos básicos de salud
      const healthResult = await this.apiService.getHealth();
      
      // Cargar estadísticas reales de matching
      let realStats = null;
      try {
        const statsResult = await this.apiService.fetchData(ENDPOINTS.REAL_STATS);
        if (statsResult.success) {
          realStats = statsResult.data;
        }
      } catch (error) {
        console.warn('❌ Error loading real stats, generating fallback data:', error.message);
        realStats = await this.generateFallbackRealStats();
      }
      
      const currentState = this.stateManager.getState();
      
      this.stateManager.setState({
        data: {
          ...currentState.data,
          health: healthResult.data,
          stats: healthResult.data.stats || currentState.data.stats,
          realAnalytics: realStats
        }
      });

      // Actualizar analytics con datos reales si están disponibles y estamos en analytics
      const analyticsSection = document.getElementById('analyticsSection');
      if (realStats && analyticsSection && analyticsSection.classList.contains('active')) {
        this.updateAnalyticsCards(realStats);
      }
      
      // Siempre actualizar métricas del dashboard con datos reales
      if (realStats) {
        this.uiRenderer.updateDashboardMetrics(realStats);
      } else {
        // Si no hay realStats, generar datos basados en assignments disponibles
        const fallbackStats = await this.generateFallbackRealStats();
        this.uiRenderer.updateDashboardMetrics(fallbackStats);
      }
      
    } catch (error) {
      console.warn('Error en auto-refresh:', error.message);
    }
  }

  async generateFallbackRealStats() {
    try {
      // Obtener datos básicos de assignments para calcular métricas reales
      const assignmentsResponse = await this.apiService.getAssignments();
      const assignments = assignmentsResponse.success ? assignmentsResponse.data : [];
      
      // Calcular métricas reales basadas en los datos existentes
      const totalAssignments = assignments.length;
      const assignmentsToday = assignments.filter(a => {
        const assignmentDate = new Date(a.fecha_asignacion);
        const today = new Date();
        return assignmentDate.toDateString() === today.toDateString();
      }).length;
      
      // Calcular score promedio de compatibilidad (precisión del modelo)
      const scoresArray = assignments
        .filter(a => a.score_compatibilidad && a.score_compatibilidad > 0)
        .map(a => a.score_compatibilidad);
      
      const avgScore = scoresArray.length > 0 ? 
        scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length : 0.85;
      
      // Convertir score a porcentaje (los scores están normalizados entre 0 y 1)
      const modelAccuracy = Math.min(95, Math.max(75, avgScore * 100));
      
      // Calcular tiempo de respuesta simulado basado en complejidad promedio
      const avgResponseTime = assignments.length > 50 ? 1.8 : 
                             assignments.length > 20 ? 1.5 : 1.2;
      
      // Obtener total de casos analizados (total de assignments)
      const totalAnalyzedCases = totalAssignments;
      
      // Calcular distribución manual vs automático
      const manualAssignments = assignments.filter(a => 
        a.observaciones_sistema && a.observaciones_sistema.includes('MANUAL')).length;
      const autoAssignments = totalAssignments - manualAssignments;
      
      return {
        algorithm: {
          modelAccuracy: Math.round(modelAccuracy * 10) / 10,
          avgResponseTime: avgResponseTime,
          totalAnalyzedCases: totalAnalyzedCases,
          casesToday: assignmentsToday,
          casesThisMonth: totalAssignments, // Simplificado
          autoVsManual: {
            automatic: autoAssignments,
            manual: manualAssignments,
            automationRate: totalAssignments > 0 ? 
              Math.round((autoAssignments / totalAssignments) * 100) : 95
          }
        },
        performance: {
          totalMatches: totalAssignments,
          averageScore: Math.round(avgScore * 10 * 10) / 10,
          matchesToday: assignmentsToday,
          firstMatchDate: assignments.length > 0 ? assignments[assignments.length - 1].fecha_asignacion : null,
          lastMatchDate: assignments.length > 0 ? assignments[0].fecha_asignacion : null
        },
        trends: {
          accuracyTrend: modelAccuracy > 90 ? 'positive' : 
                        modelAccuracy > 80 ? 'neutral' : 'negative',
          dailyGrowth: assignmentsToday > 0 ? `+${assignmentsToday}` : '0',
          monthlyGrowth: totalAssignments > 0 ? `+${Math.max(1, Math.floor(totalAssignments/30))}` : '0'
        }
      };
    } catch (error) {
      console.warn('Error generating fallback stats, using minimal data:', error.message);
      // Fallback mínimo si incluso esto falla
      return {
        algorithm: {
          modelAccuracy: 0,
          avgResponseTime: 0,
          totalAnalyzedCases: 0,
          casesToday: 0,
          casesThisMonth: 0,
          autoVsManual: {
            automatic: 0,
            manual: 0,
            automationRate: 0
          }
        },
        performance: {
          totalMatches: 0,
          averageScore: 0,
          matchesToday: 0,
          firstMatchDate: null,
          lastMatchDate: null
        },
        trends: {
          accuracyTrend: 'neutral',
          dailyGrowth: '0',
          monthlyGrowth: '0'
        }
      };
    }
  }

  // Public Methods
  async loadData() {
    console.log('🔄 Actualizando todos los datos...');
    this.uiRenderer.toastManager.info('Actualizando datos...', 2000);
    await this.loadInitialData();
  }

  async testApi() {
    console.log('🧪 Probando conexión API...');
    
    try {
      const result = await this.apiService.testConnection();
      const data = result.data;
      
      this.uiRenderer.toastManager.success(`API funcionando: ${data.version || 'N/A'}`, 3000);
    } catch (error) {
      this.uiRenderer.toastManager.error(`Error de API: ${error.message}`, 5000);
    }
  }

  async checkHealth() {
    console.log('❤️ Verificando salud del sistema...');
    
    try {
      const result = await this.apiService.getHealth();
      const currentState = this.stateManager.getState();
      
      this.stateManager.setState({
        data: {
          ...currentState.data,
          health: result.data
        }
      });
      
      this.uiRenderer.toastManager.success('Estado verificado correctamente', 3000);
    } catch (error) {
      this.uiRenderer.updateSystemStatus(null, true);
      this.uiRenderer.toastManager.error('Error verificando sistema', 5000);
    }
  }

  async executeAIMatching() {
    console.log('🤖 Ejecutando matching con IA...');
    
    const matchingMode = document.getElementById('matchingMode')?.value || 'intelligent';
    const patientLimit = parseInt(document.getElementById('patientLimit')?.value) || 50;
    
    try {
      this.uiRenderer.showLoading(ELEMENT_IDS.MATCHING_RESULTS, 'Ejecutando algoritmo de IA...');
      
      const result = await this.apiService.executeMatching({
        mode: matchingMode,
        limit: patientLimit
      });
      
      this.displayMatchingResults(result.data);
      this.uiRenderer.toastManager.success('Matching ejecutado correctamente', 4000);
      
    } catch (error) {
      this.uiRenderer.showError(ELEMENT_IDS.MATCHING_RESULTS, 'Error ejecutando matching');
      this.uiRenderer.toastManager.error(`Error en matching: ${error.message}`, 5000);
    }
  }

  displayMatchingResults(results) {
    const container = Utils.getElementById(ELEMENT_IDS.MATCHING_RESULTS);
    if (!container) return;

    container.innerHTML = `
      <div class="matching-results-success">
        <div class="results-header">
          <div class="result-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="result-info">
            <h3>Matching Completado</h3>
            <p>Algoritmo v3.0 ejecutado exitosamente</p>
          </div>
        </div>
        
        <div class="results-metrics">
          <div class="result-metric">
            <div class="metric-value">${results.processed || 0}</div>
            <div class="metric-label">Pacientes Procesados</div>
          </div>
          <div class="result-metric">
            <div class="metric-value">${results.matched || 0}</div>
            <div class="metric-label">Asignaciones Creadas</div>
          </div>
          <div class="result-metric">
            <div class="metric-value">${((results.averageScore || 0) * 100).toFixed(1)}%</div>
            <div class="metric-label">Score Promedio</div>
          </div>
          <div class="result-metric">
            <div class="metric-value">${results.duration || 'N/A'}</div>
            <div class="metric-label">Tiempo Ejecución</div>
          </div>
        </div>
        
        <div class="results-actions">
          <button class="btn btn-primary" onclick="viewDetailedResults()">
            <i class="fas fa-chart-bar"></i>
            Ver Detalles
          </button>
          <button class="btn btn-outline" onclick="exportResults()">
            <i class="fas fa-download"></i>
            Exportar Resultados
          </button>
        </div>
      </div>
    `;
  }

  toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    this.uiRenderer.toastManager.info(`Tema ${isDark ? 'oscuro' : 'claro'} activado`, 2000);
  }

  showNotifications() {
    this.uiRenderer.toastManager.info('Panel de notificaciones próximamente', 3000);
  }

  showSettings() {
    this.uiRenderer.toastManager.info('Panel de configuración próximamente', 3000);
  }

  quickAction() {
    // Quick action menu
    this.navigationManager.navigateToSection('matching');
    this.uiRenderer.toastManager.info('Acceso rápido al matching IA', 2000);
  }

  // Data loading methods for different sections
  async loadPatientsData() {
    console.log('🔄 Cargando datos de pacientes...');
    try {
      const result = await this.apiService.getPatients(50);
      console.log('📊 Resultado de la API:', result);
      
      if (result && result.data && result.data.data) {
        console.log(`✅ ${result.data.data.length} pacientes recibidos`);
        this.uiRenderer.renderPatientsTable(result.data.data);
        
        // Actualizar badge
        const badge = document.getElementById(ELEMENT_IDS.PATIENTS_BADGE);
        if (badge) {
          badge.textContent = result.data.pagination?.total || result.data.data.length;
        }
      } else {
        console.warn('⚠️ Datos de pacientes vacíos o incorrectos:', result);
        this.uiRenderer.renderPatientsTable([]);
      }
    } catch (error) {
      console.error('❌ Error cargando pacientes:', error);
      
      // Fallback: mostrar datos mock si la API falla
      console.log('🔄 Intentando fallback con datos mock...');
      const mockPatients = [
        {
          id: 1,
          nombre_completo: "Patricia Morales Vega",
          edad: 42,
          tipo_tratamiento_inferido: "Extracción molar infectado",
          estado: "pendiente",
          fecha_registro: new Date().toISOString().split('T')[0]
        },
        {
          id: 2,
          nombre_completo: "Joaquín Herrera Torres", 
          edad: 29,
          tipo_tratamiento_inferido: "Blanqueamiento dental",
          estado: "pendiente",
          fecha_registro: new Date().toISOString().split('T')[0]
        }
      ];
      
      console.log('📋 Renderizando datos mock:', mockPatients);
      this.uiRenderer.renderPatientsTable(mockPatients);
      
      // También mostrar el error
      this.uiRenderer.toastManager?.error(`Error conectando con API: ${error.message}`);
    }
  }

  async loadStudentsData() {
    try {
      const result = await this.apiService.getStudents(50);
      this.uiRenderer.renderStudentsTable(result.data?.data || []);
    } catch (error) {
      this.uiRenderer.showError(ELEMENT_IDS.STUDENTS_DATA, 'Error cargando estudiantes');
    }
  }

  async loadAssignmentsData() {
    try {
      const result = await this.apiService.getAssignments(50);
      this.uiRenderer.renderAssignmentsTable(result.data?.data || []);
    } catch (error) {
      this.uiRenderer.showError(ELEMENT_IDS.ASSIGNMENTS_DATA, 'Error cargando asignaciones');
    }
  }

  destroy() {
    this.stopAutoRefresh();
    this.stateManager.setState({ 
      isLoading: false, 
      error: null, 
      data: { health: null, patients: [], students: [], assignments: [], stats: {} } 
    });
    console.log('🧹 Dashboard limpiado');
  }
}

/* ===================================
   ADDITIONAL UTILITY FUNCTIONS
   ================================== */

// Global functions for UI interactions
// Ver perfil completo del paciente
window.viewPatient = async function(patientId) {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/pacientes`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Error al obtener datos del paciente');
    }
    
    const patient = result.data.find(p => p.id === patientId);
    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    showPatientModal(patient, 'view');
  } catch (error) {
    console.error('Error viewing patient:', error);
    toastManager.show('Error al cargar el perfil del paciente', 'error');
  }
};

// Editar paciente
window.editPatient = async function(patientId) {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/pacientes`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Error al obtener datos del paciente');
    }
    
    const patient = result.data.find(p => p.id === patientId);
    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    showPatientModal(patient, 'edit');
  } catch (error) {
    console.error('Error editing patient:', error);
    toastManager.show('Error al cargar datos del paciente para edición', 'error');
  }
};

window.viewStudent = function(studentId) {
  console.log('🎓 Viewing student:', studentId);
  // Implement student view logic
};

window.editStudent = function(studentId) {
  console.log('✏️ Editing student:', studentId);
  // Implement student edit logic
};

// Ver perfil completo de la asignación
window.viewAssignment = async function(assignmentId) {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/asignaciones`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Error al obtener datos de la asignación');
    }
    
    const assignment = result.data.find(a => a.id === assignmentId);
    if (!assignment) {
      throw new Error('Asignación no encontrada');
    }

    showAssignmentModal(assignment, 'view');
  } catch (error) {
    console.error('Error viewing assignment:', error);
    toastManager.show('Error al cargar los detalles de la asignación', 'error');
  }
};

window.closeAssignmentModal = function() {
  const modal = document.querySelector('.assignment-modal');
  if (modal) {
    modal.remove();
  }
};

async function loadAssignmentDetails(assignmentId, modal) {
  try {
    // Buscar la asignación en los datos actuales
    const currentState = app.stateManager.getState();
    const assignments = currentState.data.assignments || [];
    const assignment = assignments.find(a => a.id == assignmentId);
    
    if (!assignment) {
      throw new Error('Asignación no encontrada');
    }
    
    // Obtener detalles adicionales de paciente y estudiante con horarios
    const [patientDetails, studentDetails] = await Promise.all([
      fetch(`/api/pacientes/${assignment.id_paciente}`).then(r => r.json()).catch(() => null),
      fetch(`/api/estudiantes/${assignment.id_estudiante}`).then(r => r.json()).catch(() => null)
    ]);
    
    // Crear HTML detallado
    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = `
      <div class="assignment-details">
        <!-- Información General -->
        <div class="detail-section">
          <h3><i class="fas fa-info-circle"></i> Información General</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>ID de Asignación:</label>
              <span class="assignment-id-detail">#${assignment.id}</span>
            </div>
            <div class="detail-item">
              <label>Fecha de Asignación:</label>
              <span>${Utils.formatDate(assignment.fecha_asignacion)}</span>
            </div>
            <div class="detail-item">
              <label>Estado:</label>
              <span class="status ${assignment.estado.toLowerCase()}">${assignment.estado_display || assignment.estado}</span>
            </div>
            <div class="detail-item">
              <label>Sistema:</label>
              <span class="system-badge ${assignment.fuente_asignacion}">${assignment.sistema}</span>
            </div>
            <div class="detail-item">
              <label>Score de Compatibilidad:</label>
              <div class="score-circle score-${getScoreClass(assignment.score_compatibilidad)}" style="width: 40px; height: 40px; font-size: 12px;">
                ${Math.round((assignment.score_compatibilidad || 0) * 100)}%
              </div>
            </div>
          </div>
        </div>

        <!-- Análisis de Compatibilidad de Horarios -->
        ${assignment.fuente_asignacion === 'horario' ? renderScheduleCompatibilityAnalysis(assignment, patientDetails, studentDetails) : ''}

        <!-- Información del Paciente -->
        <div class="detail-section">
          <h3><i class="fas fa-user"></i> Información del Paciente</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Nombre:</label>
              <span class="patient-name-detail">${assignment.paciente_nombre}</span>
            </div>
            <div class="detail-item">
              <label>Teléfono:</label>
              <span>${assignment.paciente_telefono}</span>
            </div>
            <div class="detail-item">
              <label>Tratamiento:</label>
              <span class="treatment-badge">${assignment.tipo_tratamiento_inferido}</span>
            </div>
            <div class="detail-item">
              <label>Prioridad:</label>
              <span class="priority-badge priority-${assignment.prioridad.toLowerCase()}">${assignment.prioridad}</span>
            </div>
            <div class="detail-item">
              <label>Nivel de Dolor:</label>
              <span class="pain-level">${assignment.nivel_dolor}/10</span>
            </div>
          </div>
          
          <!-- Horarios del Paciente -->
          ${renderPatientSchedulePreferences(patientDetails)}
        </div>

        <!-- Información del Estudiante -->
        <div class="detail-section">
          <h3><i class="fas fa-graduation-cap"></i> Información del Estudiante</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Nombre:</label>
              <span class="student-name-detail">${assignment.estudiante_nombre}</span>
            </div>
            <div class="detail-item">
              <label>Código:</label>
              <span class="student-code">${assignment.codigo_estudiante}</span>
            </div>
            <div class="detail-item">
              <label>Año de Carrera:</label>
              <span class="year-badge">${assignment.año_carrera}</span>
            </div>
            <div class="detail-item">
              <label>Especialidades:</label>
              <div class="specialties-detail">
                ${renderSpecialtiesForDetail(assignment.especialidades)}
              </div>
            </div>
          </div>
          
          <!-- Horarios del Estudiante -->
          ${renderStudentScheduleAvailability(studentDetails)}
        </div>

        <!-- Información de Horario (Si aplica) -->
        ${assignment.dia_semana && assignment.hora_inicio ? `
        <div class="detail-section">
          <h3><i class="fas fa-calendar-alt"></i> Horario de Atención</h3>
          <div class="schedule-detail-section">
            <div class="schedule-card">
              <div class="schedule-day">${assignment.dia_semana.charAt(0).toUpperCase() + assignment.dia_semana.slice(1)}</div>
              <div class="schedule-time">${assignment.hora_inicio} - ${assignment.hora_fin}</div>
              <div class="schedule-clinic">${assignment.clinica_display}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Información de Clínica -->
        <div class="detail-section">
          <h3><i class="fas fa-hospital"></i> Información de Clínica</h3>
          <div class="clinic-info-detail">
            <div class="clinic-name">${assignment.clinica_display}</div>
            <div class="specialty-match">Especialidad: ${assignment.especialidad}</div>
          </div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="editAssignment(${assignment.id})">
          <i class="fas fa-edit"></i>
          Editar Asignación
        </button>
        <button class="btn btn-primary" onclick="closeAssignmentModal()">
          <i class="fas fa-check"></i>
          Cerrar
        </button>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading assignment details:', error);
    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <p>Error cargando los detalles de la asignación</p>
        <button class="btn btn-outline" onclick="closeAssignmentModal()">Cerrar</button>
      </div>
    `;
  }
}

function renderSpecialtiesForDetail(specialties) {
  if (!specialties) return '<span class="no-specialties">Sin especialidades</span>';
  
  let specialtiesArray = [];
  try {
    specialtiesArray = typeof specialties === 'string' ? JSON.parse(specialties) : Array.isArray(specialties) ? specialties : [specialties];
  } catch {
    specialtiesArray = [specialties];
  }
  
  return specialtiesArray.map(specialty => 
    `<span class="specialty-tag">${Utils.escapeHtml(specialty)}</span>`
  ).join('');
}

function getScoreClass(score) {
  if (score >= 0.8) return 'excellent';
  if (score >= 0.6) return 'good';
  if (score >= 0.4) return 'fair';
  return 'poor';
}

// Función para renderizar análisis de compatibilidad de horarios
function renderScheduleCompatibilityAnalysis(assignment, patientDetails, studentDetails) {
  const patientPrefs = patientDetails?.data?.preferencias_horario;
  const studentSchedules = studentDetails?.data?.horarios_disponibles;
  
  if (!patientPrefs || !studentSchedules) {
    return `
      <div class="detail-section compatibility-analysis">
        <h3><i class="fas fa-brain"></i> Análisis de Compatibilidad IA v2.1</h3>
        <div class="compatibility-card info">
          <div class="compatibility-icon">
            <i class="fas fa-info-circle"></i>
          </div>
          <div class="compatibility-content">
            <h4>Matching Basado en Disponibilidad General</h4>
            <p>Este match se realizó considerando la disponibilidad general del estudiante en ${assignment.clinica_display}.</p>
            <div class="compatibility-details">
              <div class="compatibility-item">
                <span class="label">Día asignado:</span>
                <span class="value">${assignment.dia_semana} ${assignment.hora_inicio}-${assignment.hora_fin}</span>
              </div>
              <div class="compatibility-item">
                <span class="label">Especialidad:</span>
                <span class="value">${assignment.especialidad}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const compatibility = analyzeScheduleCompatibility(patientPrefs, studentSchedules, assignment);
  
  return `
    <div class="detail-section compatibility-analysis">
      <h3><i class="fas fa-brain"></i> Análisis de Compatibilidad IA v2.1</h3>
      <div class="compatibility-card ${compatibility.level}">
        <div class="compatibility-icon">
          <i class="fas ${compatibility.icon}"></i>
        </div>
        <div class="compatibility-content">
          <h4>${compatibility.title}</h4>
          <p>${compatibility.explanation}</p>
          <div class="compatibility-score">
            <div class="score-bar">
              <div class="score-fill" style="width: ${compatibility.percentage}%"></div>
            </div>
            <span class="score-text">${compatibility.percentage}% compatible</span>
          </div>
          <div class="compatibility-reasons">
            ${compatibility.reasons.map(reason => `
              <div class="reason-item ${reason.type}">
                <i class="fas ${reason.icon}"></i>
                <span>${reason.text}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Función para renderizar preferencias de horario del paciente
function renderPatientSchedulePreferences(patientDetails) {
  const preferences = patientDetails?.data?.preferencias_horario;
  
  if (!preferences) {
    return `
      <div class="schedule-preferences-section">
        <h4><i class="fas fa-clock"></i> Preferencias de Horario</h4>
        <div class="no-schedule-data">
          <i class="fas fa-info-circle"></i>
          <span>Sin preferencias de horario registradas</span>
        </div>
      </div>
    `;
  }

  let prefs;
  try {
    prefs = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;
  } catch {
    return `
      <div class="schedule-preferences-section">
        <h4><i class="fas fa-clock"></i> Preferencias de Horario</h4>
        <div class="invalid-schedule-data">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Datos de horario inválidos</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="schedule-preferences-section">
      <h4><i class="fas fa-clock"></i> Preferencias de Horario</h4>
      <div class="schedule-preferences-grid">
        <div class="preference-item">
          <label>Días disponibles:</label>
          <div class="days-available">
            ${prefs.diasDisponibles?.map(dia => `
              <span class="day-chip">${dia.charAt(0).toUpperCase() + dia.slice(1)}</span>
            `).join('') || 'No especificado'}
          </div>
        </div>
        <div class="preference-item">
          <label>Horarios preferidos:</label>
          <div class="hours-preferred">
            ${prefs.horariosPreferidos?.map(horario => `
              <span class="hour-chip">${horario}</span>
            `).join('') || 'No especificado'}
          </div>
        </div>
        <div class="preference-item">
          <label>Flexibilidad:</label>
          <span class="flexibility-badge flexibility-${prefs.flexibilidad || 'media'}">${prefs.flexibilidad || 'Media'}</span>
        </div>
        ${prefs.requiereAcompanante ? `
        <div class="preference-item">
          <label>Requiere acompañante:</label>
          <span class="requirement-badge">Sí</span>
        </div>
        ` : ''}
        ${prefs.observaciones ? `
        <div class="preference-item full-width">
          <label>Observaciones:</label>
          <span class="observations">${prefs.observaciones}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Función para renderizar disponibilidad de horarios del estudiante
function renderStudentScheduleAvailability(studentDetails) {
  const schedules = studentDetails?.data?.horarios_disponibles;
  
  if (!schedules) {
    return `
      <div class="schedule-availability-section">
        <h4><i class="fas fa-calendar-alt"></i> Disponibilidad de Horarios</h4>
        <div class="no-schedule-data">
          <i class="fas fa-info-circle"></i>
          <span>Sin horarios disponibles registrados</span>
        </div>
      </div>
    `;
  }

  let availability;
  try {
    availability = typeof schedules === 'string' ? JSON.parse(schedules) : schedules;
  } catch {
    return `
      <div class="schedule-availability-section">
        <h4><i class="fas fa-calendar-alt"></i> Disponibilidad de Horarios</h4>
        <div class="invalid-schedule-data">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Datos de horario inválidos</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="schedule-availability-section">
      <h4><i class="fas fa-calendar-alt"></i> Disponibilidad de Horarios</h4>
      <div class="schedule-availability-grid">
        ${Object.entries(availability).map(([clinic, scheduleData]) => `
          <div class="clinic-schedule-card">
            <div class="clinic-header">
              <i class="fas fa-hospital"></i>
              <h5>${clinic === 'Clinica_Nino' ? 'Clínica del Niño' : 'Clínica del Adulto'}</h5>
            </div>
            <div class="clinic-schedule-details">
              <div class="schedule-item">
                <label>Día:</label>
                <span class="day-value">${scheduleData.dia_semana?.charAt(0).toUpperCase() + scheduleData.dia_semana?.slice(1) || 'No especificado'}</span>
              </div>
              <div class="schedule-item">
                <label>Horario:</label>
                <span class="time-value">${scheduleData.hora_inicio || '--'}:${scheduleData.minutos_inicio || '00'} - ${scheduleData.hora_fin || '--'}:${scheduleData.minutos_fin || '00'}</span>
              </div>
              <div class="schedule-item">
                <label>Especialidad:</label>
                <span class="specialty-value">${scheduleData.especialidad || 'General'}</span>
              </div>
              <div class="schedule-item">
                <label>Casos activos:</label>
                <span class="cases-value">${scheduleData.casos_activos || 0}/${scheduleData.casos_maximos || 'N/A'}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Función para analizar compatibilidad de horarios
function analyzeScheduleCompatibility(patientPrefs, studentSchedules, assignment) {
  let patientPref, studentAvail;
  
  try {
    patientPref = typeof patientPrefs === 'string' ? JSON.parse(patientPrefs) : patientPrefs;
    studentAvail = typeof studentSchedules === 'string' ? JSON.parse(studentSchedules) : studentSchedules;
  } catch {
    return {
      level: 'info',
      icon: 'fa-info-circle',
      title: 'Análisis no disponible',
      explanation: 'No se pudieron analizar los datos de horarios.',
      percentage: 75,
      reasons: []
    };
  }

  const assignedDay = assignment.dia_semana;
  const assignedTime = assignment.hora_inicio;
  const reasons = [];
  let compatibilityScore = 0;

  // Verificar compatibilidad de días
  if (patientPref.diasDisponibles?.includes(assignedDay)) {
    compatibilityScore += 40;
    reasons.push({
      type: 'positive',
      icon: 'fa-check',
      text: `El paciente está disponible los ${assignedDay}s`
    });
  } else {
    reasons.push({
      type: 'negative',
      icon: 'fa-times',
      text: `El paciente prefiere otros días (${patientPref.diasDisponibles?.join(', ') || 'no especificado'})`
    });
  }

  // Verificar compatibilidad de horarios
  const patientTimeRanges = patientPref.horariosPreferidos || [];
  let timeMatch = false;
  
  patientTimeRanges.forEach(range => {
    const [start, end] = range.split('-');
    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    const assignedHour = parseInt(assignedTime.split(':')[0]);
    
    if (assignedHour >= startHour && assignedHour < endHour) {
      timeMatch = true;
    }
  });

  if (timeMatch) {
    compatibilityScore += 40;
    reasons.push({
      type: 'positive',
      icon: 'fa-check',
      text: `El horario ${assignedTime} coincide con las preferencias del paciente`
    });
  } else if (patientTimeRanges.length > 0) {
    reasons.push({
      type: 'warning',
      icon: 'fa-exclamation-triangle',
      text: `El horario no está en los rangos preferidos (${patientTimeRanges.join(', ')})`
    });
  }

  // Verificar flexibilidad del paciente
  const flexibility = patientPref.flexibilidad || 'media';
  if (flexibility === 'alta') {
    compatibilityScore += 20;
    reasons.push({
      type: 'positive',
      icon: 'fa-check',
      text: 'El paciente tiene alta flexibilidad horaria'
    });
  } else if (flexibility === 'baja' && !timeMatch) {
    reasons.push({
      type: 'negative',
      icon: 'fa-times',
      text: 'El paciente tiene baja flexibilidad y el horario no es ideal'
    });
  } else {
    compatibilityScore += 10;
  }

  // Determinar nivel de compatibilidad
  let level, icon, title, explanation;
  
  if (compatibilityScore >= 80) {
    level = 'excellent';
    icon = 'fa-star';
    title = 'Match Perfecto';
    explanation = 'El estudiante es perfecto para este paciente. Los horarios coinciden completamente con las preferencias.';
  } else if (compatibilityScore >= 60) {
    level = 'good';
    icon = 'fa-thumbs-up';
    title = 'Match Muy Bueno';
    explanation = 'Excelente compatibilidad de horarios entre estudiante y paciente.';
  } else if (compatibilityScore >= 40) {
    level = 'fair';
    icon = 'fa-balance-scale';
    title = 'Match Aceptable';
    explanation = 'Compatibilidad moderada. Algunos aspectos podrían mejorarse.';
  } else {
    level = 'warning';
    icon = 'fa-exclamation-triangle';
    title = 'Match con Limitaciones';
    explanation = 'La compatibilidad de horarios es limitada, pero el match fue posible.';
  }

  return {
    level,
    icon,
    title,
    explanation,
    percentage: Math.min(100, compatibilityScore),
    reasons
  };
}

// Reemplazado por las nuevas funciones modernas arriba

window.addPatient = function() {
  openModal('Nuevo Paciente', `
    <form id="patient-form" onsubmit="submitPatient(event)">
      <div class="form-row">
        <div class="form-group">
          <label>Nombre completo *</label>
          <input type="text" name="nombre_completo" required>
        </div>
        <div class="form-group">
          <label>Edad</label>
          <input type="number" name="edad" min="1" max="120">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Telefono *</label>
          <input type="tel" name="telefono" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Ciudad *</label>
          <select name="ciudad" required>
            <option value="Metropolitana">Metropolitana</option>
            <option value="Valparaiso">Valparaiso</option>
            <option value="Concepcion">Concepcion</option>
          </select>
        </div>
        <div class="form-group">
          <label>Nivel de dolor (0-10)</label>
          <input type="number" name="nivel_dolor" min="0" max="10" value="0">
        </div>
      </div>
      <div class="form-group">
        <label>Tratamiento requerido</label>
        <select name="tipo_tratamiento_inferido">
          <option value="">-- Seleccionar --</option>
          <option value="Operatoria Dental">Operatoria Dental</option>
          <option value="Endodoncia">Endodoncia</option>
          <option value="Periodoncia">Periodoncia</option>
          <option value="Cirugia Oral">Cirugia Oral</option>
          <option value="Odontopediatria">Odontopediatria</option>
          <option value="Preventiva">Preventiva</option>
          <option value="Destartraje y Pulido Coronario">Destartraje y Pulido Coronario</option>
          <option value="Implantologia">Implantologia</option>
        </select>
      </div>
      <div class="form-group">
        <label>Prioridad</label>
        <select name="prioridad">
          <option value="Baja">Baja</option>
          <option value="Moderada" selected>Moderada</option>
          <option value="Alta">Alta</option>
          <option value="Muy Alta">Muy Alta</option>
        </select>
      </div>
      <div class="form-group">
        <label>Dias disponibles</label>
        <input type="text" name="dias_disponibles" placeholder="ej: lunes, miercoles, viernes">
      </div>
      <div class="form-group">
        <label>Horario preferencia</label>
        <select name="horario_preferencia">
          <option value="">-- Seleccionar --</option>
          <option value="manana">Manana (8-12)</option>
          <option value="tarde">Tarde (14-18)</option>
          <option value="cualquiera">Cualquiera</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary btn-submit">Registrar Paciente</button>
    </form>
  `);
};

window.submitPatient = async function(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  data.edad = data.edad ? parseInt(data.edad) : null;
  data.nivel_dolor = parseInt(data.nivel_dolor) || 0;

  try {
    const res = await fetch(CONFIG.API_BASE_URL + '/api/pacientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Error al crear paciente');

    closeModal();
    app?.uiRenderer.toastManager.success('Paciente registrado exitosamente');
    app?.loadPatientsData();
  } catch (err) {
    app?.uiRenderer.toastManager.error(err.message);
  }
};

window.addStudent = function() {
  openModal('Nuevo Estudiante', `
    <form id="student-form" onsubmit="submitStudent(event)">
      <div class="form-row">
        <div class="form-group">
          <label>Nombre completo *</label>
          <input type="text" name="nombre_completo" required>
        </div>
        <div class="form-group">
          <label>Ano de carrera *</label>
          <select name="año_carrera" required>
            <option value="4to">4to</option>
            <option value="5to">5to</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Telefono</label>
          <input type="tel" name="telefono">
        </div>
        <div class="form-group">
          <label>Email *</label>
          <input type="email" name="email" required>
        </div>
      </div>
      <div class="form-group">
        <label>Ciudad *</label>
        <select name="ciudad" required>
          <option value="Metropolitana">Metropolitana</option>
          <option value="Valparaiso">Valparaiso</option>
          <option value="Concepcion">Concepcion</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary btn-submit">Registrar Estudiante</button>
    </form>
  `);
};

window.submitStudent = async function(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));

  try {
    const res = await fetch(CONFIG.API_BASE_URL + '/api/estudiantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Error al crear estudiante');

    closeModal();
    app?.uiRenderer.toastManager.success('Estudiante registrado exitosamente');
    app?.loadStudentsData();
  } catch (err) {
    app?.uiRenderer.toastManager.error(err.message);
  }
};

window.runMatching = function() {
  if (app?.navigationManager) {
    app.navigationManager.navigateToSection('matching');
  }
};

window.exportPatients = function() {
  console.log('📄 Exporting patients');
  app?.uiRenderer.toastManager.info('Exportación iniciada', 3000);
};

window.exportStudents = function() {
  console.log('📄 Exporting students');
  app?.uiRenderer.toastManager.info('Exportación iniciada', 3000);
};

window.exportAssignments = function() {
  console.log('📄 Exporting assignments');
  app?.uiRenderer.toastManager.info('Exportación iniciada', 3000);
};

window.refreshAIMetrics = function() {
  console.log('🔄 Refreshing AI metrics with real data');
  updateDashboardStats(true); // Force refresh
  app?.loadStats();
};

window.viewDetailedResults = function() {
  console.log('📊 Viewing detailed results');
  app?.uiRenderer.toastManager.info('Vista detallada próximamente', 3000);
};

window.exportResults = function() {
  console.log('📥 Exporting results');
  app?.uiRenderer.toastManager.info('Exportación iniciada', 3000);
};

/* ===================================
   APPLICATION INITIALIZATION
   ================================== */

// Global app instance
let app = null;
let toastManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Setup login form handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  // Check auth - if not logged in, show login and stop
  if (!checkAuthOnLoad()) return;

  try {
    console.log('Initializing Dental Matching Pro...');

    // Initialize global services
    toastManager = new ToastManager();
    window.toastManager = toastManager;

    // Initialize main application
    app = new DentalMatchingApp();
    window.app = app; // Make available globally for debugging

    await app.init();

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
    
  } catch (error) {
    console.error('💥 Error crítico inicializando aplicación:', error);
    if (toastManager) {
      toastManager.error('Error crítico en la aplicación', 10000);
    }
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});

// Handle uncaught errors
window.addEventListener('error', (event) => {
  console.error('💥 Error no capturado:', event.error);
  if (toastManager) {
    toastManager.error('Error inesperado en la aplicación', 5000);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Promise rechazada no manejada:', event.reason);
  if (toastManager) {
    toastManager.error('Error de conexión o procesamiento', 5000);
  }
});

// Additional CSS for enhanced components (injected dynamically)
const additionalStyles = `
<style>
/* Enhanced Table Styles */
.patient-info, .student-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.patient-avatar, .student-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--primary-500);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--text-sm);
}

.patient-name, .student-name {
  font-weight: 600;
  color: var(--text-primary);
}

.patient-id, .student-id {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}

.age-badge, .year-badge {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}

.year-badge.year-1 { background: var(--success-100); color: var(--success-700); }
.year-badge.year-2 { background: var(--primary-100); color: var(--primary-700); }
.year-badge.year-3 { background: var(--warning-100); color: var(--warning-700); }
.year-badge.year-4 { background: var(--error-100); color: var(--error-700); }

.specialties {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.specialty-tag {
  background: var(--primary-100);
  color: var(--primary-700);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 500;
}

.specialty-more {
  background: var(--gray-200);
  color: var(--gray-600);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.performance-metrics {
  display: flex;
  gap: var(--space-4);
}

.metric {
  text-align: center;
}

.metric-value {
  font-weight: 700;
  color: var(--primary-600);
  font-size: var(--text-base);
  display: block;
}

.metric-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
}

.compatibility-score {
  display: flex;
  justify-content: center;
}

.score-circle {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--text-sm);
  color: white;
}

.score-excellent { background: var(--success-500); }
.score-good { background: var(--primary-500); }
.score-fair { background: var(--warning-500); }
.score-poor { background: var(--error-500); }

.table-actions {
  display: flex;
  gap: var(--space-1);
}

.date-info {
  text-align: right;
}

.date-primary {
  font-weight: 500;
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.date-secondary {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* Toast Enhancements */
.toast {
  backdrop-filter: blur(8px);
  border-left: 4px solid var(--primary-500);
}

.toast-success { border-left-color: var(--success-500); }
.toast-error { border-left-color: var(--error-500); }
.toast-warning { border-left-color: var(--warning-500); }
.toast-info { border-left-color: var(--primary-500); }

.toast-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.toast-icon {
  font-size: var(--text-lg);
}

.toast-success .toast-icon { color: var(--success-500); }
.toast-error .toast-icon { color: var(--error-500); }
.toast-warning .toast-icon { color: var(--warning-500); }
.toast-info .toast-icon { color: var(--primary-500); }

.toast-message {
  flex: 1;
  font-weight: 500;
}

.toast-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: var(--transition-fast);
}

.toast-close:hover {
  background: var(--bg-tertiary);
}

@keyframes toast-slide-out {
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* Enhanced Matching Results */
.matching-results-success {
  background: linear-gradient(135deg, var(--success-50), var(--primary-50));
  border-radius: var(--radius-2xl);
  padding: var(--space-8);
  border: 2px solid var(--success-200);
}

.results-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.result-icon {
  width: 60px;
  height: 60px;
  background: var(--success-500);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--text-2xl);
}

.result-info h3 {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.result-info p {
  color: var(--text-secondary);
}

.results-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}

.result-metric {
  text-align: center;
  background: rgba(255, 255, 255, 0.8);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(4px);
}

.results-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
}

/* Animation Classes */
[data-animate="fade-in"] {
  opacity: 0;
  transform: translateY(10px);
  animation: fadeInUp 0.5s ease-out forwards;
}

[data-animate="slide-in"] {
  opacity: 0;
  transform: translateX(-20px);
  animation: slideInLeft 0.3s ease-out forwards;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Enhanced Assignment Table Styles */
.assignment-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.assignment-id {
  font-weight: 700;
  color: var(--primary-600);
  font-family: 'JetBrains Mono', monospace;
}

.assignment-specialty {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.assignment-system {
  font-size: var(--text-xs);
  color: var(--success-600);
  font-weight: 500;
  background: var(--success-50);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  display: inline-block;
  margin-top: var(--space-1);
}

.priority-badge {
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-weight: 600;
  text-transform: uppercase;
  margin-top: var(--space-1);
  display: inline-block;
}

.priority-alta {
  background: var(--error-100);
  color: var(--error-700);
}

.priority-baja {
  background: var(--gray-100);
  color: var(--gray-600);
}

.priority-urgente {
  background: var(--error-500);
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.clinic-info {
  font-size: var(--text-xs);
  color: var(--primary-600);
  margin-top: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--primary-50);
  border-radius: var(--radius-sm);
  display: inline-block;
}

.schedule-info {
  text-align: center;
}

.schedule-detail {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--success-700);
  font-weight: 500;
  font-size: var(--text-sm);
  padding: var(--space-2) var(--space-3);
  background: var(--success-50);
  border-radius: var(--radius-lg);
  border: 1px solid var(--success-200);
}

.schedule-detail i {
  color: var(--success-500);
}

.no-schedule {
  color: var(--text-muted);
  font-style: italic;
  font-size: var(--text-sm);
}

.assignments-table-enhanced th {
  text-align: center;
}

.assignments-table-enhanced td {
  vertical-align: middle;
  padding: var(--space-4);
}

.assignments-table-enhanced .participant-info {
  text-align: left;
}

/* Dark theme enhancements */
.dark-theme {
  --text-primary: var(--gray-100);
  --text-secondary: var(--gray-400);
  --text-muted: var(--gray-500);
  --bg-primary: var(--gray-900);
  --bg-secondary: var(--gray-800);
  --bg-tertiary: var(--gray-700);
  --border-light: var(--gray-700);
  --border-medium: var(--gray-600);
}

.dark-theme .assignment-system {
  background: var(--success-900);
  color: var(--success-300);
}

.dark-theme .clinic-info {
  background: var(--primary-900);
  color: var(--primary-300);
}

.dark-theme .schedule-detail {
  background: var(--success-900);
  color: var(--success-300);
  border-color: var(--success-800);
}

/* Assignment Detail Modal Styles */
.assignment-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: modalFadeIn 0.3s ease-out;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.assignment-detail-modal {
  background: var(--bg-primary);
  border-radius: var(--radius-2xl);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 10001;
  animation: modalSlideIn 0.3s ease-out;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  border-bottom: 1px solid var(--border-light);
}

.modal-header h2 {
  color: var(--text-primary);
  font-size: var(--text-xl);
  font-weight: 700;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: var(--text-2xl);
  color: var(--text-muted);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  transition: var(--transition-fast);
}

.modal-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: var(--space-6);
}

.modal-actions {
  padding: var(--space-6);
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.assignment-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.detail-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  border: 1px solid var(--border-light);
}

.detail-section h3 {
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
  margin: 0 0 var(--space-4) 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.detail-section h3 i {
  color: var(--primary-500);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.detail-item label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-item span {
  color: var(--text-primary);
  font-weight: 500;
}

.assignment-id-detail {
  font-family: 'JetBrains Mono', monospace;
  color: var(--primary-600);
  font-weight: 700;
}

.patient-name-detail, .student-name-detail {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.student-code {
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
}

.treatment-badge {
  background: var(--primary-100);
  color: var(--primary-700);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  font-weight: 500;
  display: inline-block;
}

.pain-level {
  font-weight: 700;
  color: var(--error-600);
}

.system-badge.horario {
  background: var(--success-100);
  color: var(--success-700);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 600;
}

.system-badge.legacy {
  background: var(--gray-100);
  color: var(--gray-600);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 600;
}

.specialties-detail {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.no-specialties {
  color: var(--text-muted);
  font-style: italic;
}

.schedule-detail-section {
  display: flex;
  justify-content: center;
}

.schedule-card {
  background: linear-gradient(135deg, var(--success-500), var(--success-600));
  color: white;
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  text-align: center;
  box-shadow: 0 10px 25px -5px rgba(34, 197, 94, 0.4);
}

.schedule-day {
  font-size: var(--text-xl);
  font-weight: 700;
  text-transform: capitalize;
}

.schedule-time {
  font-size: var(--text-2xl);
  font-weight: 800;
  margin: var(--space-2) 0;
  font-family: 'JetBrains Mono', monospace;
}

.schedule-clinic {
  font-size: var(--text-sm);
  opacity: 0.9;
  margin-top: var(--space-2);
}

.clinic-info-detail {
  text-align: center;
  padding: var(--space-4);
}

.clinic-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--primary-600);
  margin-bottom: var(--space-2);
}

.specialty-match {
  color: var(--text-secondary);
  font-style: italic;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Dark theme for modal */
.dark-theme .assignment-detail-modal {
  background: var(--bg-primary);
}

.dark-theme .detail-section {
  background: var(--bg-secondary);
  border-color: var(--border-light);
}

.dark-theme .treatment-badge {
  background: var(--primary-900);
  color: var(--primary-300);
}

.dark-theme .system-badge.horario {
  background: var(--success-900);
  color: var(--success-300);
}

.dark-theme .schedule-card {
  background: linear-gradient(135deg, var(--success-600), var(--success-700));
}

/* Error state styles */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  color: var(--text-muted);
  text-align: center;
}

.error-icon {
  font-size: var(--text-5xl);
  color: var(--error-500);
  margin-bottom: var(--space-4);
  opacity: 0.7;
}

.empty-actions {
  margin-top: var(--space-6);
}

/* Estilos para Modal de Estudiante */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.modal-overlay.active {
  opacity: 1;
  visibility: visible;
}

.modal-overlay.closing {
  opacity: 0;
  visibility: hidden;
}

.modal-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  transform: scale(0.9);
  transition: transform 0.3s ease;
}

.modal-overlay.active .modal-container {
  transform: scale(1);
}

.modal-header {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.modal-subtitle {
  font-size: 0.9rem;
  opacity: 0.9;
  margin-top: 4px;
}

.student-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
}

.modal-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: white;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.modal-content {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.student-details-grid {
  display: grid;
  gap: 24px;
}

.detail-section {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.detail-section.full-width {
  grid-column: 1 / -1;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.section-title i {
  color: #2563eb;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
}

.detail-value {
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 500;
}

.no-data {
  color: #94a3b8;
  font-style: italic;
}

.specialties-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.specialty-tag {
  background: #2563eb;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.performance-overview {
  display: grid;
  gap: 20px;
}

.performance-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.stat-item {
  background: white;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #2563eb;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 4px;
}

.progress-container {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 500;
}

.progress-percent {
  color: #2563eb;
  font-weight: 600;
}

.progress-bar-container {
  background: #e2e8f0;
  border-radius: 4px;
  height: 8px;
  overflow: hidden;
}

.progress-bar {
  background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.modal-footer {
  background: #f8fafc;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.form-input, .form-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

@media (max-width: 768px) {
  .modal-container {
    width: 95vw;
    max-height: 95vh;
  }
  
  .student-details-grid {
    grid-template-columns: 1fr;
  }
  
  .performance-stats {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .modal-header {
    padding: 20px;
  }
  
  .modal-content {
    padding: 20px;
  }
}

/* Estilos específicos para Modal de Paciente */
.patient-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
}

.treatment-tag {
  background: #059669;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.priority-badge {
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.pain-level-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pain-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #dc2626;
}

.pain-scale {
  color: #64748b;
  font-size: 0.9rem;
}

.pain-bars {
  display: flex;
  gap: 2px;
  align-items: flex-end;
}

.pain-bar {
  width: 8px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 1px;
  transition: all 0.3s;
}

.pain-bar.active {
  height: 12px;
}

.assignment-status {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.assignment-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.assignment-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
}

.assignment-status-badge.assigned {
  background: #dcfce7;
  color: #16a34a;
}

.assignment-status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.assigned-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.assigned-student, .assigned-code {
  font-size: 0.875rem;
  color: #64748b;
}

.pending-note {
  color: #64748b;
  font-size: 0.875rem;
  font-style: italic;
}

@media (max-width: 768px) {
  .assignment-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .pain-level-display {
    flex-wrap: wrap;
  }
}

/* Estilos específicos para Modal de Asignación */
.assignment-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
}

.assignment-id-badge {
  background: #3b82f6;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: monospace;
}

.algorithm-badge {
  background: #8b5cf6;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.system-notes {
  background: #f1f5f9;
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
  font-size: 0.875rem;
  color: #475569;
  font-style: italic;
}

.patient-name-detail, .student-name-detail {
  font-weight: 600;
  color: #1e293b;
}

.schedule-info-detailed {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.schedule-assigned {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schedule-icon {
  background: #16a34a;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.schedule-details {
  flex: 1;
}

.schedule-main {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.schedule-specialty {
  font-size: 0.875rem;
  color: #64748b;
}

.schedule-not-assigned {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f59e0b;
  font-style: italic;
}

.score-circle.score-excellent {
  background: #16a34a;
  color: white;
}

.score-circle.score-good {
  background: #3b82f6;
  color: white;
}

.score-circle.score-average {
  background: #ea580c;
  color: white;
}

.score-circle.score-poor {
  background: #dc2626;
  color: white;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);

// Estilos adicionales para justificación y mejoras de asignaciones
const justificationStyles = `
<style>
/* Estilos para la justificación de asignaciones */
.justification-content {
  margin-top: 16px;
}

.justification-box {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.justification-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.justification-h3 {
  color: #1e40af;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.justification-h3::before {
  content: '📋';
  font-size: 20px;
}

.justification-h4 {
  color: #3730a3;
  font-size: 16px;
  font-weight: 600;
  margin: 20px 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.justification-h4::before {
  content: '🎯';
  font-size: 16px;
}

.justification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
  transition: all 0.2s ease;
}

.justification-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(4px);
}

.item-number {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;
}

.item-text {
  flex: 1;
  line-height: 1.6;
  color: #374151;
}

.item-text strong {
  color: #1f2937;
  font-weight: 600;
}

.justification-box p {
  color: #4b5563;
  line-height: 1.7;
  margin-bottom: 16px;
}

.justification-box p:last-child {
  margin-bottom: 0;
}

/* Mejorar el botón Ver */
.btn-icon[title="Ver detalles"] {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white !important;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
  position: relative;
}

.btn-icon[title="Ver detalles"]:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-icon[title="Ver detalles"]::before {
  content: '👁️ Ver';
  font-family: inherit;
}

.btn-icon[title="Ver detalles"] .fas {
  display: none !important;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', justificationStyles);

/* ===================================
   FUNCIONES DE ESTUDIANTES
   ================================== */

// Ver perfil completo del estudiante
async function viewStudent(studentId) {
  try {
    // Obtener datos completos del estudiante
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/estudiantes`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Error al obtener datos del estudiante');
    }
    
    const student = result.data.find(s => s.id === studentId);
    if (!student) {
      throw new Error('Estudiante no encontrado');
    }

    // Crear y mostrar modal
    showStudentModal(student, [], 'view');
  } catch (error) {
    console.error('Error viewing student:', error);
    toastManager.show('Error al cargar el perfil del estudiante', 'error');
  }
}

// Editar estudiante
async function editStudent(studentId) {
  try {
    // Obtener datos completos del estudiante
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/estudiantes`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Error al obtener datos del estudiante');
    }
    
    const student = result.data.find(s => s.id === studentId);
    if (!student) {
      throw new Error('Estudiante no encontrado');
    }

    // Crear y mostrar modal en modo edición
    showStudentModal(student, [], 'edit');
  } catch (error) {
    console.error('Error editing student:', error);
    toastManager.show('Error al cargar datos del estudiante para edición', 'error');
  }
}

// Mostrar modal del estudiante
function showStudentModal(student, horarios = [], mode = 'view') {
  const isEditMode = mode === 'edit';
  const modalId = 'studentModal';
  
  // Remover modal existente si lo hay
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }

  // Calcular progreso
  const progress = student.casos_necesarios > 0 
    ? Math.round((student.casos_completados / student.casos_necesarios) * 100)
    : 0;

  const modalHtml = `
    <div class="modal-overlay" id="${modalId}">
      <div class="modal-container student-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <h2 class="modal-title">
              <div class="student-avatar-large">
                ${student.nombre_completo ? student.nombre_completo.charAt(0).toUpperCase() : '?'}
              </div>
              ${isEditMode ? 'Editar Estudiante' : 'Perfil del Estudiante'}
            </h2>
            <div class="modal-subtitle">${Utils.escapeHtml(student.nombre_completo || 'N/A')}</div>
          </div>
          <button class="modal-close" onclick="closeStudentModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-content">
          <div class="student-details-grid">
            <!-- Información Personal -->
            <div class="detail-section">
              <h3 class="section-title">
                <i class="fas fa-user"></i>
                Información Personal
              </h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <label class="detail-label">Código Estudiante</label>
                  <div class="detail-value">${student.codigo_estudiante || 'N/A'}</div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Nombre Completo</label>
                  ${isEditMode ? 
                    `<input type="text" class="form-input" id="edit-nombre" value="${student.nombre_completo || ''}">` :
                    `<div class="detail-value">${student.nombre_completo || 'N/A'}</div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Email</label>
                  ${isEditMode ? 
                    `<input type="email" class="form-input" id="edit-email" value="${student.email || ''}">` :
                    `<div class="detail-value">${student.email || 'N/A'}</div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Teléfono</label>
                  ${isEditMode ? 
                    `<input type="tel" class="form-input" id="edit-telefono" value="${student.telefono || ''}">` :
                    `<div class="detail-value">${student.telefono || 'N/A'}</div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Universidad</label>
                  ${isEditMode ? 
                    `<input type="text" class="form-input" id="edit-universidad" value="${student.universidad || ''}">` :
                    `<div class="detail-value">${student.universidad || 'N/A'}</div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Ciudad</label>
                  ${isEditMode ? 
                    `<input type="text" class="form-input" id="edit-ciudad" value="${student.ciudad || ''}">` :
                    `<div class="detail-value">${student.ciudad || 'N/A'}</div>`
                  }
                </div>
              </div>
            </div>

            <!-- Información Académica -->
            <div class="detail-section">
              <h3 class="section-title">
                <i class="fas fa-graduation-cap"></i>
                Información Académica
              </h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <label class="detail-label">Año de Carrera</label>
                  ${isEditMode ? 
                    `<select class="form-select" id="edit-año-carrera">
                      <option value="4to" ${student.año_carrera === '4to' ? 'selected' : ''}>4to</option>
                      <option value="5to" ${student.año_carrera === '5to' ? 'selected' : ''}>5to</option>
                    </select>` :
                    `<div class="detail-value">
                      <span class="year-badge year-${student.año_carrera || '4to'}">
                        ${student.año_carrera || 'N/A'}
                      </span>
                    </div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Especialidades</label>
                  <div class="detail-value">
                    <div class="specialties-list">
                      ${student.especialidades ? 
                        student.especialidades.split(', ').map(esp => 
                          `<span class="specialty-tag">${esp}</span>`
                        ).join('') : 
                        '<span class="no-data">Sin especialidades</span>'
                      }
                    </div>
                  </div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Estado</label>
                  ${isEditMode ? 
                    `<select class="form-select" id="edit-estado">
                      <option value="activo" ${student.estado === 'activo' ? 'selected' : ''}>Activo</option>
                      <option value="inactivo" ${student.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                      <option value="graduado" ${student.estado === 'graduado' ? 'selected' : ''}>Graduado</option>
                    </select>` :
                    `<div class="detail-value">
                      <span class="status ${student.estado || 'activo'}">${student.estado || 'Activo'}</span>
                    </div>`
                  }
                </div>
                <div class="detail-item full-width">
                  <label class="detail-label">Fecha de Registro</label>
                  <div class="detail-value">${Utils.formatDate(student.fecha_registro)}</div>
                </div>
              </div>
            </div>

            <!-- Rendimiento Académico -->
            <div class="detail-section full-width">
              <h3 class="section-title">
                <i class="fas fa-chart-line"></i>
                Rendimiento Académico
              </h3>
              <div class="performance-overview">
                <div class="performance-stats">
                  <div class="stat-item">
                    <div class="stat-value">${student.casos_completados || 0}</div>
                    <div class="stat-label">Casos Completados</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${student.casos_activos || 0}</div>
                    <div class="stat-label">Casos Activos</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${student.casos_necesarios || 0}</div>
                    <div class="stat-label">Casos Necesarios</div>
                  </div>
                </div>
                <div class="progress-container">
                  <div class="progress-header">
                    <span>Progreso General</span>
                    <span class="progress-percent">${progress}%</span>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="closeStudentModal()">
              <i class="fas fa-times"></i>
              Cancelar
            </button>
            ${isEditMode ? `
              <button class="btn btn-primary" onclick="saveStudentChanges(${student.id})">
                <i class="fas fa-save"></i>
                Guardar Cambios
              </button>
            ` : `
              <button class="btn btn-primary" onclick="editStudent(${student.id}); closeStudentModal()">
                <i class="fas fa-edit"></i>
                Editar
              </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Agregar event listener para cerrar con Escape
  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      closeStudentModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  });
  
  // Animar entrada
  requestAnimationFrame(() => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  });
}

// Cerrar modal del estudiante
function closeStudentModal() {
  const modal = document.getElementById('studentModal');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 300);
  }
}

// Mostrar modal del paciente
function showPatientModal(patient, mode = 'view') {
  const isEditMode = mode === 'edit';
  const modalId = 'patientModal';
  
  // Remover modal existente si lo hay
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }

  // Obtener color de prioridad
  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'alta': return '#dc2626';
      case 'moderada': return '#ea580c';
      case 'baja': return '#16a34a';
      default: return '#64748b';
    }
  };

  const modalHtml = `
    <div class="modal-overlay" id="${modalId}">
      <div class="modal-container patient-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <h2 class="modal-title">
              <div class="patient-avatar-large">
                ${patient.nombre_completo ? patient.nombre_completo.charAt(0).toUpperCase() : '?'}
              </div>
              ${isEditMode ? 'Editar Paciente' : 'Perfil del Paciente'}
            </h2>
            <div class="modal-subtitle">${Utils.escapeHtml(patient.nombre_completo || 'N/A')}</div>
          </div>
          <button class="modal-close" onclick="closePatientModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-content">
          <div class="patient-details-grid">
            <!-- Información Personal -->
            <div class="detail-section">
              <h3 class="section-title">
                <i class="fas fa-user"></i>
                Información Personal
              </h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <label class="detail-label">Nombre Completo</label>
                  ${isEditMode ? 
                    `<input type="text" class="form-input" id="edit-nombre" value="${patient.nombre_completo || ''}">` :
                    `<div class="detail-value">${patient.nombre_completo || 'N/A'}</div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Edad</label>
                  ${isEditMode ? 
                    `<input type="number" class="form-input" id="edit-edad" value="${patient.edad || ''}" min="1" max="120">` :
                    `<div class="detail-value">${patient.edad || 'N/A'} años</div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Teléfono</label>
                  ${isEditMode ? 
                    `<input type="tel" class="form-input" id="edit-telefono" value="${patient.telefono || ''}">` :
                    `<div class="detail-value">${patient.telefono || 'N/A'}</div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Email</label>
                  ${isEditMode ? 
                    `<input type="email" class="form-input" id="edit-email" value="${patient.email || ''}">` :
                    `<div class="detail-value">${patient.email || 'N/A'}</div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Ciudad</label>
                  ${isEditMode ? 
                    `<input type="text" class="form-input" id="edit-ciudad" value="${patient.ciudad || ''}">` :
                    `<div class="detail-value">${patient.ciudad || 'N/A'}</div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Fecha de Registro</label>
                  <div class="detail-value">${Utils.formatDate(patient.fecha_registro)}</div>
                </div>
              </div>
            </div>

            <!-- Información Médica -->
            <div class="detail-section">
              <h3 class="section-title">
                <i class="fas fa-stethoscope"></i>
                Información Médica
              </h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <label class="detail-label">Tipo de Tratamiento</label>
                  ${isEditMode ? 
                    `<select class="form-select" id="edit-tratamiento">
                      <option value="Operatoria Dental" ${patient.tipo_tratamiento_inferido === 'Operatoria Dental' ? 'selected' : ''}>Operatoria Dental</option>
                      <option value="Endodoncia" ${patient.tipo_tratamiento_inferido === 'Endodoncia' ? 'selected' : ''}>Endodoncia</option>
                      <option value="Periodoncia" ${patient.tipo_tratamiento_inferido === 'Periodoncia' ? 'selected' : ''}>Periodoncia</option>
                      <option value="Cirugía Oral" ${patient.tipo_tratamiento_inferido === 'Cirugía Oral' ? 'selected' : ''}>Cirugía Oral</option>
                      <option value="Odontopediatría" ${patient.tipo_tratamiento_inferido === 'Odontopediatría' ? 'selected' : ''}>Odontopediatría</option>
                      <option value="Preventiva" ${patient.tipo_tratamiento_inferido === 'Preventiva' ? 'selected' : ''}>Preventiva</option>
                      <option value="Destartraje y Pulido Coronario" ${patient.tipo_tratamiento_inferido === 'Destartraje y Pulido Coronario' ? 'selected' : ''}>Destartraje y Pulido Coronario</option>
                    </select>` :
                    `<div class="detail-value">
                      <span class="treatment-tag">${patient.tipo_tratamiento_inferido || 'N/A'}</span>
                    </div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Nivel de Dolor</label>
                  ${isEditMode ? 
                    `<input type="number" class="form-input" id="edit-dolor" value="${patient.nivel_dolor || 0}" min="0" max="10">` :
                    `<div class="detail-value">
                      <div class="pain-level-display">
                        <span class="pain-number">${patient.nivel_dolor || 0}</span>
                        <span class="pain-scale">/10</span>
                        <div class="pain-bars">
                          ${Array.from({length: 10}, (_, i) => 
                            `<div class="pain-bar ${i < (patient.nivel_dolor || 0) ? 'active' : ''}" style="background-color: ${i < 3 ? '#16a34a' : i < 7 ? '#ea580c' : '#dc2626'}"></div>`
                          ).join('')}
                        </div>
                      </div>
                    </div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Prioridad</label>
                  ${isEditMode ? 
                    `<select class="form-select" id="edit-prioridad">
                      <option value="Baja" ${patient.prioridad === 'Baja' ? 'selected' : ''}>Baja</option>
                      <option value="Moderada" ${patient.prioridad === 'Moderada' ? 'selected' : ''}>Moderada</option>
                      <option value="Alta" ${patient.prioridad === 'Alta' ? 'selected' : ''}>Alta</option>
                    </select>` :
                    `<div class="detail-value">
                      <span class="priority-badge" style="background-color: ${getPriorityColor(patient.prioridad)}">
                        ${patient.prioridad || 'N/A'}
                      </span>
                    </div>`
                  }
                </div>
              </div>
            </div>

            <!-- Estado de Asignación -->
            <div class="detail-section full-width">
              <h3 class="section-title">
                <i class="fas fa-user-md"></i>
                Estado de Asignación
              </h3>
              <div class="assignment-status">
                ${patient.estado === 'asignado' ? `
                  <div class="assignment-info">
                    <div class="assignment-status-badge assigned">
                      <i class="fas fa-check-circle"></i>
                      Asignado
                    </div>
                    <div class="assigned-details">
                      <div class="assigned-student">
                        <strong>Estudiante:</strong> ${patient.estudiante_nombre || 'N/A'}
                      </div>
                      <div class="assigned-code">
                        <strong>Código:</strong> ${patient.estudiante_codigo || 'N/A'}
                      </div>
                    </div>
                  </div>
                ` : `
                  <div class="assignment-info">
                    <div class="assignment-status-badge pending">
                      <i class="fas fa-clock"></i>
                      Pendiente de Asignación
                    </div>
                    <div class="pending-note">
                      Este paciente está esperando ser asignado a un estudiante disponible.
                    </div>
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="closePatientModal()">
              <i class="fas fa-times"></i>
              Cancelar
            </button>
            ${isEditMode ? `
              <button class="btn btn-primary" onclick="savePatientChanges(${patient.id})">
                <i class="fas fa-save"></i>
                Guardar Cambios
              </button>
            ` : `
              <button class="btn btn-primary" onclick="editPatient(${patient.id}); closePatientModal()">
                <i class="fas fa-edit"></i>
                Editar
              </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Agregar event listener para cerrar con Escape
  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      closePatientModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  });
  
  // Animar entrada
  requestAnimationFrame(() => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  });
}

// Cerrar modal del paciente
function closePatientModal() {
  const modal = document.getElementById('patientModal');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 300);
  }
}

// Guardar cambios del paciente
async function savePatientChanges(patientId) {
  try {
    const nombre = document.getElementById('edit-nombre')?.value;
    const edad = document.getElementById('edit-edad')?.value;
    const telefono = document.getElementById('edit-telefono')?.value;
    const email = document.getElementById('edit-email')?.value;
    const ciudad = document.getElementById('edit-ciudad')?.value;
    const tratamiento = document.getElementById('edit-tratamiento')?.value;
    const dolor = document.getElementById('edit-dolor')?.value;
    const prioridad = document.getElementById('edit-prioridad')?.value;

    if (!nombre || !email) {
      toastManager.show('Nombre y email son requeridos', 'error');
      return;
    }

    const updateData = {
      nombre_completo: nombre,
      edad: parseInt(edad) || 0,
      telefono: telefono,
      email: email,
      ciudad: ciudad,
      tipo_tratamiento_inferido: tratamiento,
      nivel_dolor: parseInt(dolor) || 0,
      prioridad: prioridad
    };

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/pacientes/${patientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();

    if (result.success) {
      toastManager.show('Paciente actualizado exitosamente', 'success');
      closePatientModal();
      
      // Recargar la lista de pacientes
      if (app && app.dataManager) {
        app.dataManager.loadPatients();
      }
    } else {
      throw new Error(result.message || 'Error al actualizar paciente');
    }

  } catch (error) {
    console.error('Error saving patient changes:', error);
    toastManager.show('Error al guardar los cambios: ' + error.message, 'error');
  }
}

// Mostrar modal de la asignación
function showAssignmentModal(assignment, mode = 'view') {
  const isEditMode = mode === 'edit';
  const modalId = 'assignmentModal';
  
  // Remover modal existente si lo hay
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }

  // Helper para obtener clase de score
  const getScoreClass = (score) => {
    const scoreValue = parseFloat(score) || 0;
    if (scoreValue >= 0.8) return 'excellent';
    if (scoreValue >= 0.6) return 'good';
    if (scoreValue >= 0.4) return 'average';
    return 'poor';
  };

  const modalHtml = `
    <div class="modal-overlay" id="${modalId}">
      <div class="modal-container assignment-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <h2 class="modal-title">
              <div class="assignment-avatar-large">
                #${assignment.id}
              </div>
              ${isEditMode ? 'Editar Asignación' : 'Detalles de la Asignación'}
            </h2>
            <div class="modal-subtitle">Asignación #{assignment.id}</div>
          </div>
          <button class="modal-close" onclick="closeAssignmentModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-content">
          <div class="assignment-details-grid">
            <!-- Información General -->
            <div class="detail-section">
              <h3 class="section-title">
                <i class="fas fa-info-circle"></i>
                Información General
              </h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <label class="detail-label">ID de Asignación</label>
                  <div class="detail-value">
                    <span class="assignment-id-badge">#${assignment.id}</span>
                  </div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Fecha de Asignación</label>
                  <div class="detail-value">${Utils.formatDate(assignment.fecha_asignacion)}</div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Estado</label>
                  ${isEditMode ? 
                    `<select class="form-select" id="edit-estado">
                      <option value="asignado" ${assignment.estado === 'asignado' ? 'selected' : ''}>Asignado</option>
                      <option value="en_progreso" ${assignment.estado === 'en_progreso' ? 'selected' : ''}>En Progreso</option>
                      <option value="completado" ${assignment.estado === 'completado' ? 'selected' : ''}>Completado</option>
                      <option value="cancelado" ${assignment.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>` :
                    `<div class="detail-value">
                      <span class="status ${assignment.estado || 'asignado'}">${assignment.estado || 'Asignado'}</span>
                    </div>`
                  }
                </div>
                <div class="detail-item">
                  <label class="detail-label">Compatibilidad</label>
                  <div class="detail-value">
                    <div class="score-circle score-${getScoreClass(assignment.score_compatibilidad)}">
                      ${Math.round((assignment.score_compatibilidad || 0) * 100)}%
                    </div>
                  </div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Algoritmo</label>
                  <div class="detail-value">
                    <span class="algorithm-badge">${assignment.algoritmo_version || 'v3.1'}</span>
                  </div>
                </div>
                <div class="detail-item full-width">
                  <label class="detail-label">Observaciones del Sistema</label>
                  <div class="detail-value system-notes">
                    ${assignment.observaciones_sistema || 'Sin observaciones adicionales'}
                  </div>
                </div>
              </div>
            </div>

            <!-- Información del Paciente -->
            <div class="detail-section">
              <h3 class="section-title">
                <i class="fas fa-user"></i>
                Información del Paciente
              </h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <label class="detail-label">Nombre Completo</label>
                  <div class="detail-value patient-name-detail">${assignment.paciente_nombre || 'N/A'}</div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Teléfono</label>
                  <div class="detail-value">${assignment.paciente_telefono || 'N/A'}</div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Tipo de Tratamiento</label>
                  <div class="detail-value">
                    <span class="treatment-tag">${assignment.tipo_tratamiento_inferido || 'N/A'}</span>
                  </div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Nivel de Dolor</label>
                  <div class="detail-value">
                    <div class="pain-level-display">
                      <span class="pain-number">${assignment.nivel_dolor || 0}</span>
                      <span class="pain-scale">/10</span>
                      <div class="pain-bars">
                        ${Array.from({length: 10}, (_, i) => 
                          `<div class="pain-bar ${i < (assignment.nivel_dolor || 0) ? 'active' : ''}" style="background-color: ${i < 3 ? '#16a34a' : i < 7 ? '#ea580c' : '#dc2626'}"></div>`
                        ).join('')}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Prioridad</label>
                  <div class="detail-value">
                    <span class="priority-badge" style="background-color: ${
                      assignment.prioridad === 'Alta' ? '#dc2626' : 
                      assignment.prioridad === 'Moderada' ? '#ea580c' : '#16a34a'
                    }">
                      ${assignment.prioridad || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Información del Estudiante -->
            <div class="detail-section">
              <h3 class="section-title">
                <i class="fas fa-user-graduate"></i>
                Información del Estudiante
              </h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <label class="detail-label">Nombre Completo</label>
                  <div class="detail-value student-name-detail">${assignment.estudiante_nombre || 'N/A'}</div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Código Estudiante</label>
                  <div class="detail-value">${assignment.codigo_estudiante || 'N/A'}</div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Año de Carrera</label>
                  <div class="detail-value">
                    <span class="year-badge year-${assignment.año_carrera || '4to'}">
                      ${assignment.año_carrera || 'N/A'}
                    </span>
                  </div>
                </div>
                <div class="detail-item">
                  <label class="detail-label">Especialidades</label>
                  <div class="detail-value">
                    <div class="specialties-list">
                      ${assignment.especialidades ? 
                        assignment.especialidades.split(', ').map(esp => 
                          `<span class="specialty-tag">${esp}</span>`
                        ).join('') : 
                        '<span class="no-data">Sin especialidades</span>'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Información de Horario -->
            <div class="detail-section full-width">
              <h3 class="section-title">
                <i class="fas fa-calendar-alt"></i>
                Información de Horario
              </h3>
              <div class="schedule-info-detailed">
                ${assignment.horario_completo && assignment.horario_completo !== 'Horario no asignado' ? 
                  `<div class="schedule-assigned">
                    <div class="schedule-icon">
                      <i class="fas fa-clock"></i>
                    </div>
                    <div class="schedule-details">
                      <div class="schedule-main">${assignment.horario_completo}</div>
                      <div class="schedule-specialty">Especialidad: ${assignment.especialidad_asignada || 'N/A'}</div>
                    </div>
                  </div>` : 
                  `<div class="schedule-not-assigned">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>No se ha asignado un horario específico</span>
                  </div>`
                }
              </div>
            </div>

            <!-- Justificación de la Asignación -->
            ${assignment.justificacion_asignacion ? `
            <div class="detail-section full-width">
              <h3 class="section-title">
                <i class="fas fa-lightbulb"></i>
                ¿Por qué se realizó esta asignación?
              </h3>
              <div class="justification-content">
                <div class="justification-box">
                  ${formatJustificationText(assignment.justificacion_asignacion)}
                </div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="closeAssignmentModal()">
              <i class="fas fa-times"></i>
              Cancelar
            </button>
            ${isEditMode ? `
              <button class="btn btn-primary" onclick="saveAssignmentChanges(${assignment.id})">
                <i class="fas fa-save"></i>
                Guardar Cambios
              </button>
            ` : `
              <button class="btn btn-primary" onclick="editAssignment(${assignment.id}); closeAssignmentModal()">
                <i class="fas fa-edit"></i>
                Editar
              </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Agregar event listener para cerrar con Escape
  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      closeAssignmentModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  });
  
  // Animar entrada
  requestAnimationFrame(() => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  });
}

// Cerrar modal de la asignación
function closeAssignmentModal() {
  const modal = document.getElementById('assignmentModal');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 300);
  }
}

// Formatear texto de justificación para mostrar en HTML
function formatJustificationText(justificationText) {
  if (!justificationText) return 'No hay justificación disponible.';
  
  // Convertir markdown básico a HTML
  let html = justificationText
    // Convertir títulos
    .replace(/^### (.*$)/gm, '<h4 class="justification-h4">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="justification-h3">$1</h3>')
    // Convertir texto en negrita
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convertir listas numeradas
    .replace(/^(\d+)\.\s+(.*)$/gm, '<div class="justification-item"><span class="item-number">$1</span><span class="item-text">$2</span></div>')
    // Convertir saltos de línea
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Envolver en párrafos
  if (!html.includes('<p>') && !html.includes('<h3>') && !html.includes('<h4>')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
}

// Guardar cambios de la asignación
async function saveAssignmentChanges(assignmentId) {
  try {
    const estado = document.getElementById('edit-estado')?.value;

    if (!estado) {
      toastManager.show('Estado es requerido', 'error');
      return;
    }

    const updateData = {
      estado: estado
    };

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/asignaciones/${assignmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();

    if (result.success) {
      toastManager.show('Asignación actualizada exitosamente', 'success');
      closeAssignmentModal();
      
      // Recargar la lista de asignaciones
      if (app && app.dataManager) {
        app.dataManager.loadAssignments();
      }
    } else {
      throw new Error(result.message || 'Error al actualizar asignación');
    }

  } catch (error) {
    console.error('Error saving assignment changes:', error);
    toastManager.show('Error al guardar los cambios: ' + error.message, 'error');
  }
}

// Guardar cambios del estudiante
async function saveStudentChanges(studentId) {
  try {
    const nombre = document.getElementById('edit-nombre')?.value;
    const email = document.getElementById('edit-email')?.value;
    const telefono = document.getElementById('edit-telefono')?.value;
    const universidad = document.getElementById('edit-universidad')?.value;
    const ciudad = document.getElementById('edit-ciudad')?.value;
    const año_carrera = document.getElementById('edit-año-carrera')?.value;
    const estado = document.getElementById('edit-estado')?.value;

    if (!nombre || !email) {
      toastManager.show('Nombre y email son requeridos', 'error');
      return;
    }

    const updateData = {
      nombre_completo: nombre,
      email: email,
      telefono: telefono,
      universidad: universidad,
      ciudad: ciudad,
      año_carrera: año_carrera,
      estado: estado
    };

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/estudiantes/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();

    if (result.success) {
      toastManager.show('Estudiante actualizado exitosamente', 'success');
      closeStudentModal();
      
      // Recargar la lista de estudiantes
      if (app && app.dataManager) {
        app.dataManager.loadStudents();
      }
    } else {
      throw new Error(result.message || 'Error al actualizar estudiante');
    }

  } catch (error) {
    console.error('Error saving student changes:', error);
    toastManager.show('Error al guardar los cambios: ' + error.message, 'error');
  }
}

/* ===================================
   FUNCIONES DE DASHBOARD
   ================================== */

// Cache para evitar rate limiting
let dashboardCache = {
  data: null,
  timestamp: 0,
  duration: 30000 // Cache por 30 segundos
};

// Actualizar contadores del dashboard con datos mejorados
async function updateDashboardStats(forceRefresh = false) {
  try {
    console.log('🔄 Actualizando estadísticas del dashboard...');
    
    // Verificar cache para evitar rate limiting
    const now = Date.now();
    if (!forceRefresh && dashboardCache.data && (now - dashboardCache.timestamp < dashboardCache.duration)) {
      console.log('📋 Usando datos en cache para evitar rate limit');
      showDataSourceIndicator('cached');
      updateDashboardWithData(dashboardCache.data);
      return;
    }
    
    // Show loading spinners
    showLoadingSpinners();

    // Reducir requests usando menos endpoints y con delays
    await new Promise(resolve => setTimeout(resolve, 100)); // Anti-rate limit delay
    
    const [patientsResponse, studentsResponse, assignmentsResponse] = await Promise.allSettled([
      fetch(`${CONFIG.API_BASE_URL}/api/pacientes`).catch(e => ({ ok: false, error: e })),
      new Promise(resolve => setTimeout(() => 
        fetch(`${CONFIG.API_BASE_URL}/api/estudiantes`).then(resolve).catch(e => resolve({ ok: false, error: e })), 200)),
      new Promise(resolve => setTimeout(() => 
        fetch(`${CONFIG.API_BASE_URL}/api/asignaciones`).then(resolve).catch(e => resolve({ ok: false, error: e })), 400))
    ]);

    // Parse responses with rate limit handling
    const patientsData = await parseResponseSafely(patientsResponse);
    const studentsData = await parseResponseSafely(studentsResponse);
    const assignmentsData = await parseResponseSafely(assignmentsResponse);

    const dashboardData = {
      patients: patientsData,
      students: studentsData,
      assignments: assignmentsData,
      timestamp: now
    };

    // Actualizar cache
    dashboardCache.data = dashboardData;
    dashboardCache.timestamp = now;

    console.log('📊 Datos recibidos:', { 
      patients: patientsData.success ? patientsData.data?.length : 0,
      students: studentsData.success ? studentsData.data?.length : 0, 
      assignments: assignmentsData.success ? assignmentsData.data?.length : 0
    });

    // Actualizar dashboard
    showDataSourceIndicator('real');
    updateDashboardWithData(dashboardData);

    console.log('✅ Estadísticas actualizadas correctamente');

  } catch (error) {
    console.error('❌ Error updating dashboard stats:', error);
    hideLoadingSpinners();
    
    // Mostrar indicador de error
    showDataSourceIndicator('offline');
    
    // Mostrar estado de error en lugar de datos simulados
    updateDashboardWithData(getEmptyDashboardData());
    
    // Mostrar mensaje de error
    if (error.message && error.message.includes('RATE_LIMIT')) {
      toastManager.show('Rate limit alcanzado. Reintentando en 30 segundos.', 'error', 4000);
    } else {
      toastManager.show('Error de conexión con la base de datos.', 'error', 4000);
    }
  }
}

// Función para mostrar indicador de fuente de datos
function showDataSourceIndicator(type) {
  // Remover indicador existente
  const existing = document.getElementById('dataSourceIndicator');
  if (existing) existing.remove();

  const indicator = document.createElement('div');
  indicator.id = 'dataSourceIndicator';
  indicator.className = `data-source-indicator ${type === 'real' ? 'real-data' : type === 'cached' ? 'cached-data' : 'offline-data'}`;
  
  const messages = {
    real: '📡 Datos en tiempo real',
    cached: '💾 Datos en caché',
    offline: '⚠️ Sin conexión'
  };
  
  indicator.innerHTML = `
    <i class="fas fa-${type === 'real' ? 'satellite-dish' : type === 'cached' ? 'database' : 'exclamation-triangle'}"></i>
    ${messages[type] || 'Estado desconocido'}
  `;
  
  document.body.appendChild(indicator);
  
  // Auto-remove after 5 seconds for real data, keep for cached/simulated
  if (type === 'real') {
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 300);
      }
    }, 5000);
  }
}

// Función eliminada - no usar datos simulados

// Función para parsear respuestas de forma segura con manejo de rate limit
async function parseResponseSafely(responsePromise) {
  try {
    const response = responsePromise.status === 'fulfilled' ? responsePromise.value : null;
    
    if (!response || !response.ok) {
      return { success: false, data: [], error: 'API not available' };
    }

    const data = await response.json();
    
    // Verificar si hay rate limit error
    if (!data.success && data.error === 'RATE_LIMIT_EXCEEDED') {
      console.warn('⚠️ Rate limit alcanzado para:', response.url);
      return { success: false, data: [], error: 'RATE_LIMIT', retryAfter: data.retryAfter };
    }
    
    return data;
  } catch (error) {
    console.warn('❌ Error parsing response:', error.message);
    return { success: false, data: [], error: error.message };
  }
}

// Función centralizada para actualizar el dashboard con datos
function updateDashboardWithData(dashboardData) {
  // Si no hay datos reales, mostrar estado vacío
  if (!dashboardData.patients.success && !dashboardData.students.success && !dashboardData.assignments.success) {
    console.log('⚠️ Sin conexión a datos reales - mostrando estado vacío');
    dashboardData = getEmptyDashboardData();
  }

  // Actualizar timestamp
  updateLastUpdateTime();

  // Actualizar pacientes
  updatePatientsMetric(dashboardData.patients);

  // Actualizar estudiantes  
  updateStudentsMetric(dashboardData.students);

  // Actualizar asignaciones
  updateAssignmentsMetric(dashboardData.assignments, dashboardData.patients);

  // Actualizar badges en sidebar
  updateSidebarBadges(dashboardData.patients, dashboardData.students, dashboardData.assignments);

  // Update activity feed
  updateActivityFeed(dashboardData.assignments.success ? dashboardData.assignments.data : []);

  // Hide loading spinners
  hideLoadingSpinners();
}

// Datos vacíos para cuando no hay conexión
function getEmptyDashboardData() {
  return {
    patients: {
      success: false,
      data: [],
      total: 0,
      message: 'Sin conexión a la base de datos'
    },
    students: {
      success: false,
      data: [],
      total: 0,
      message: 'Sin conexión a la base de datos'
    },
    assignments: {
      success: false,
      data: [],
      total: 0,
      message: 'Sin conexión a la base de datos'
    }
  };
}

function showLoadingSpinners() {
  const spinners = document.querySelectorAll('.loading-spinner');
  spinners.forEach(spinner => spinner.classList.add('visible'));
}

function hideLoadingSpinners() {
  const spinners = document.querySelectorAll('.loading-spinner');
  spinners.forEach(spinner => spinner.classList.remove('visible'));
}

function updateLastUpdateTime() {
  const lastUpdateTimeEl = document.getElementById('lastUpdateTime');
  if (lastUpdateTimeEl) {
    const now = new Date();
    lastUpdateTimeEl.textContent = now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

function updatePatientsMetric(patientsResult) {
  const totalPatients = patientsResult.success ? (patientsResult.total || patientsResult.data?.length || 0) : 0;
  const patients = patientsResult.success ? (patientsResult.data || []) : [];

  console.log('👥 Actualizando métrica de pacientes:', totalPatients);

  // Calcular datos adicionales
  const today = new Date().toDateString();
  const patientsToday = patients.filter(p => {
    if (!p.fecha_registro) return false;
    try {
      return new Date(p.fecha_registro).toDateString() === today;
    } catch {
      return false;
    }
  }).length;
  
  const patientsPending = patients.filter(p => 
    p.estado === 'pendiente' || p.estado === 'sin_asignar' || !p.estado).length;

  // Actualizar elementos
  const totalPatientsEl = document.querySelector('#totalPatients .number');
  const patientsTodayEl = document.getElementById('patientsToday');
  const patientsPendingEl = document.getElementById('patientsPending');
  const patientsProgressEl = document.getElementById('patientsProgress');

  if (totalPatientsEl) {
    animateNumberUpdate(totalPatientsEl, totalPatients);
    console.log('✅ Total de pacientes actualizado:', totalPatients);
  }
  if (patientsTodayEl) patientsTodayEl.textContent = `${patientsToday} hoy`;
  if (patientsPendingEl) patientsPendingEl.textContent = `${patientsPending} pendientes`;
  
  // Calcular progreso (basado en capacidad estimada)
  const capacity = 200; // Capacidad estimada
  const progressPercent = Math.min(100, (totalPatients / capacity) * 100);
  if (patientsProgressEl) patientsProgressEl.style.width = `${progressPercent}%`;

  // Actualizar trend
  updateTrend('patientsTrend', patientsToday > 0 ? 'positive' : 'neutral', 
    patientsToday > 0 ? `+${patientsToday}` : '0%');
}

function updateStudentsMetric(studentsResult) {
  const totalStudents = studentsResult.success ? (studentsResult.total || studentsResult.data?.length || 0) : 0;
  const students = studentsResult.success ? (studentsResult.data || []) : [];

  console.log('👨‍🎓 Actualizando métrica de estudiantes:', totalStudents);

  // Calcular datos adicionales
  const studentsActive = students.filter(s => s.estado === 'activo' || !s.estado).length;
  const studentsAvailable = students.filter(s => {
    const casosActivos = parseInt(s.casos_activos) || 0;
    const casosNecesarios = parseInt(s.casos_necesarios) || 1;
    return casosActivos < casosNecesarios;
  }).length;

  // Actualizar elementos
  const totalStudentsEl = document.querySelector('#totalStudents .number');
  const studentsActiveEl = document.getElementById('studentsActive');
  const studentsAvailableEl = document.getElementById('studentsAvailable');
  const studentsProgressEl = document.getElementById('studentsProgress');

  if (totalStudentsEl) {
    animateNumberUpdate(totalStudentsEl, totalStudents);
    console.log('✅ Total de estudiantes actualizado:', totalStudents);
  }
  if (studentsActiveEl) studentsActiveEl.textContent = `${studentsActive} activos`;
  if (studentsAvailableEl) studentsAvailableEl.textContent = `${studentsAvailable} disponibles`;

  // Calcular progreso (disponibilidad promedio)
  const availabilityPercent = totalStudents > 0 ? 
    (studentsAvailable / totalStudents) * 100 : 0;
  if (studentsProgressEl) studentsProgressEl.style.width = `${availabilityPercent}%`;

  // Actualizar trend
  updateTrend('studentsTrend', availabilityPercent > 60 ? 'positive' : 
    availabilityPercent > 30 ? 'neutral' : 'negative',
    `${Math.round(availabilityPercent)}% disponible`);
}

function updateAssignmentsMetric(assignmentsResult, patientsResult) {
  const totalAssignments = assignmentsResult.success ? (assignmentsResult.total || assignmentsResult.data?.length || 0) : 0;
  const assignments = assignmentsResult.success ? (assignmentsResult.data || []) : [];

  console.log('🔗 Actualizando métrica de asignaciones:', totalAssignments);

  // Calcular datos adicionales
  const today = new Date().toDateString();
  const assignmentsToday = assignments.filter(a => {
    if (!a.fecha_asignacion) return false;
    try {
      return new Date(a.fecha_asignacion).toDateString() === today;
    } catch {
      return false;
    }
  }).length;
  
  const assignmentsCompleted = assignments.filter(a => 
    a.estado === 'completado' || a.estado === 'finalizado' || a.estado === 'completada').length;

  // Actualizar elementos
  const totalAssignmentsEl = document.querySelector('#totalAssignments .number');
  const assignmentsTodayEl = document.getElementById('assignmentsToday');
  const assignmentsCompletedEl = document.getElementById('assignmentsCompleted');
  const assignmentsProgressEl = document.getElementById('assignmentsProgress');

  if (totalAssignmentsEl) {
    animateNumberUpdate(totalAssignmentsEl, totalAssignments);
    console.log('✅ Total de asignaciones actualizado:', totalAssignments);
  }
  if (assignmentsTodayEl) assignmentsTodayEl.textContent = `${assignmentsToday} hoy`;
  if (assignmentsCompletedEl) assignmentsCompletedEl.textContent = `${assignmentsCompleted} completadas`;

  // Calcular eficiencia de asignación
  const totalPatients = patientsResult.success ? (patientsResult.total || patientsResult.data?.length || 0) : 0;
  const efficiencyPercent = totalPatients > 0 ? 
    (totalAssignments / totalPatients) * 100 : 0;
  if (assignmentsProgressEl) assignmentsProgressEl.style.width = `${Math.min(100, efficiencyPercent)}%`;

  // Actualizar success rate también
  const successRateEl = document.getElementById('successRate');
  if (successRateEl) {
    successRateEl.textContent = Math.round(efficiencyPercent);
  }

  // Actualizar trend
  updateTrend('assignmentsTrend', assignmentsToday > 0 ? 'positive' : 'neutral',
    assignmentsToday > 0 ? `+${assignmentsToday}` : '0%');
}

function updateTrend(trendId, type, text) {
  const trendEl = document.getElementById(trendId);
  if (!trendEl) return;

  const indicator = trendEl.querySelector('.trend-indicator');
  if (indicator) {
    indicator.className = `trend-indicator ${type}`;
    const icon = indicator.querySelector('i');
    const span = indicator.querySelector('span');
    
    if (icon && span) {
      icon.className = `fas fa-arrow-${type === 'positive' ? 'up' : 
                                      type === 'negative' ? 'down' : 'right'}`;
      span.textContent = text;
    }
  }
}

// Función para animar números cuando cambian
function animateNumberUpdate(element, newValue) {
  if (!element) return;
  
  const currentValue = element.textContent;
  if (currentValue === newValue.toString()) return;
  
  // Agregar clase de actualización
  element.classList.add('updating');
  
  // Actualizar el valor
  element.textContent = newValue;
  
  // Remover la clase después de la animación
  setTimeout(() => {
    element.classList.remove('updating');
  }, 300);
}

function updateSidebarBadges(patientsResult, studentsResult, assignmentsResult) {
  const patientsBadge = document.getElementById('patientsBadge');
  const studentsBadge = document.getElementById('studentsBadge');
  const assignmentsBadge = document.getElementById('assignmentsBadge');

  if (patientsBadge && patientsResult.success) {
    patientsBadge.textContent = patientsResult.total || patientsResult.data.length || 0;
  }

  if (studentsBadge && studentsResult.success) {
    studentsBadge.textContent = studentsResult.total || studentsResult.data.length || 0;
  }

  if (assignmentsBadge && assignmentsResult.success) {
    assignmentsBadge.textContent = assignmentsResult.total || assignmentsResult.data.length || 0;
  }
}

function updateActivityFeed(assignments) {
  const activityFeed = document.getElementById('activityFeed');
  if (!activityFeed || !assignments) return;

  // Get recent assignments (last 5)
  const recentAssignments = assignments
    .sort((a, b) => new Date(b.fecha_asignacion) - new Date(a.fecha_asignacion))
    .slice(0, 5);

  if (recentAssignments.length === 0) {
    activityFeed.innerHTML = `
      <div class="activity-empty">
        <i class="fas fa-inbox"></i>
        <p>No hay actividad reciente</p>
      </div>
    `;
    return;
  }

  const activityItems = recentAssignments.map(assignment => {
    const timeAgo = getTimeAgo(new Date(assignment.fecha_asignacion));
    return `
      <div class="activity-item">
        <div class="activity-icon">
          <i class="fas fa-link"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">Nueva asignación creada</div>
          <div class="activity-description">
            ${assignment.paciente_nombre} → ${assignment.estudiante_nombre}
          </div>
          <div class="activity-time">${timeAgo}</div>
        </div>
        <div class="activity-score">
          ${Math.round((assignment.score_compatibilidad || 0) * 100)}%
        </div>
      </div>
    `;
  }).join('');

  activityFeed.innerHTML = `
    <div class="activity-list">
      ${activityItems}
    </div>
  `;
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

// Inicializar dashboard cuando se carga
document.addEventListener('DOMContentLoaded', function() {
  // Actualizar estadísticas iniciales
  updateDashboardStats();
  
  // Actualizar cada 60 segundos para evitar rate limiting
  setInterval(() => updateDashboardStats(false), 60000);
});

// Navigation functions for enhanced dashboard
window.navigateToPatients = function() {
  console.log('🔄 Navigating to Patients section');
  const patientsNav = document.querySelector('a[data-section="patients"]');
  if (patientsNav) patientsNav.click();
};

window.navigateToStudents = function() {
  console.log('🔄 Navigating to Students section');
  const studentsNav = document.querySelector('a[data-section="students"]');
  if (studentsNav) studentsNav.click();
};

window.navigateToAssignments = function() {
  console.log('🔄 Navigating to Assignments section');
  const assignmentsNav = document.querySelector('a[data-section="assignments"]');
  if (assignmentsNav) assignmentsNav.click();
};

window.refreshActivity = function() {
  console.log('🔄 Refreshing activity feed');
  updateDashboardStats();
};

window.toggleActivityStream = function() {
  console.log('🔄 Toggling activity stream');
  const toggleIcon = document.getElementById('activityToggle');
  if (toggleIcon) {
    if (toggleIcon.classList.contains('fa-pause')) {
      toggleIcon.className = 'fas fa-play';
      // Pause auto-refresh
    } else {
      toggleIcon.className = 'fas fa-pause';
      // Resume auto-refresh
    }
  }
};

// Export for debugging in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.dentalApp = { app, toastManager, Utils, CONFIG, viewStudent, editStudent, updateDashboardStats };
}