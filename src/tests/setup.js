/**
 * DENTAL MATCHING - TEST SETUP
 * Global test configuration and utilities
 */

const { jest } = require('@jest/globals');
const path = require('path');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Test database configuration
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '3306';
process.env.DB_USER = process.env.TEST_DB_USER || 'test_user';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test_password';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'dental_matching_test';

// Redis test configuration
process.env.REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.TEST_REDIS_PORT || '6379';
process.env.REDIS_DB = process.env.TEST_REDIS_DB || '1'; // Use different DB for tests

// JWT test configuration
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.JWT_EXPIRATION = '1h';
process.env.REFRESH_TOKEN_EXPIRATION = '7d';

// Extend global timeout for async operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Generate test data
  generateTestPatient: (overrides = {}) => ({
    nombre_completo: 'Juan Pérez Test',
    email: `test.patient.${Date.now()}@test.com`,
    telefono: '555-0123',
    edad: 25,
    tipo_tratamiento: 'ortodoncia',
    descripcion_caso: 'Caso de prueba para ortodoncia',
    urgencia: 'media',
    historial_medico: {
      alergias: ['penicilina'],
      medicamentos: [],
      condiciones: []
    },
    status: 'pendiente',
    ...overrides
  }),

  generateTestStudent: (overrides = {}) => ({
    nombre_completo: 'María García Test',
    email: `test.student.${Date.now()}@test.com`,
    telefono: '555-0124',
    semestre: 8,
    especialidades: ['ortodoncia', 'endodoncia'],
    experiencia_previa: {
      casos_completados: 5,
      especialidades_practicadas: ['ortodoncia']
    },
    disponibilidad: {
      dias: ['lunes', 'martes', 'miércoles'],
      horarios: ['mañana', 'tarde']
    },
    calificacion_promedio: 8.5,
    casos_completados: 12,
    status: 'activo',
    ...overrides
  }),

  generateTestUser: (overrides = {}) => ({
    email: `test.user.${Date.now()}@test.com`,
    password: 'TestPassword123!',
    nombre_completo: 'Usuario Test',
    role: 'coordinator',
    permissions: ['read', 'write'],
    status: 'active',
    email_verified: true,
    ...overrides
  }),

  generateTestAssignment: (patientId, studentId, overrides = {}) => ({
    paciente_id: patientId,
    estudiante_id: studentId,
    supervisor_id: 1,
    status: 'pendiente',
    notas: 'Asignación de prueba',
    ...overrides
  }),

  // Wait utility for async tests
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Clean test data patterns
  cleanTestData: async (db) => {
    if (!db) return;
    
    try {
      // Clean test data (emails containing 'test')
      await db.execute("DELETE FROM asignaciones WHERE id IN (SELECT id FROM asignaciones a INNER JOIN pacientes p ON a.paciente_id = p.id WHERE p.email LIKE '%test%')");
      await db.execute("DELETE FROM asignaciones WHERE id IN (SELECT id FROM asignaciones a INNER JOIN estudiantes e ON a.estudiante_id = e.id WHERE e.email LIKE '%test%')");
      await db.execute("DELETE FROM ai_matching_results WHERE paciente_id IN (SELECT id FROM pacientes WHERE email LIKE '%test%')");
      await db.execute("DELETE FROM pacientes WHERE email LIKE '%test%'");
      await db.execute("DELETE FROM estudiantes WHERE email LIKE '%test%'");
      await db.execute("DELETE FROM users WHERE email LIKE '%test%'");
      await db.execute("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')");
    } catch (error) {
      console.error('Error cleaning test data:', error);
    }
  },

  // Mock external services
  mockEmailService: () => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
    sendPasswordReset: jest.fn().mockResolvedValue({ success: true }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true })
  }),

  mockAIService: () => ({
    generateMatching: jest.fn().mockResolvedValue([
      {
        estudiante_id: 1,
        score: 0.85,
        factores_matching: {
          especialidad: 0.9,
          experiencia: 0.8,
          disponibilidad: 0.85
        },
        confianza: 0.87
      }
    ]),
    analyzeCase: jest.fn().mockResolvedValue({
      complexity: 'medium',
      recommendedSemester: 7,
      specialties: ['ortodoncia']
    })
  }),

  // Mock request objects
  mockRequest: (overrides = {}) => ({
    body: {},
    query: {},
    params: {},
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '127.0.0.1'
    },
    ip: '127.0.0.1',
    method: 'GET',
    path: '/test',
    originalUrl: '/test',
    user: null,
    ...overrides
  }),

  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  },

  mockNext: () => jest.fn(),

  // Database transaction helper for tests
  withTransaction: async (db, testFn) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      await testFn(connection);
      await connection.rollback(); // Always rollback in tests
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

// Mock console methods in tests to reduce noise
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep errors visible
};

// Global setup
beforeAll(async () => {
  // Any global setup needed
});

// Global cleanup
afterAll(async () => {
  // Cleanup any global resources
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

module.exports = global.testUtils;