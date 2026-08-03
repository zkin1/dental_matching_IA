/**
 * DENTAL MATCHING - API INTEGRATION TESTS
 * Tests for actual API endpoints used by the React frontend
 *
 * Note: These tests mock the database layer to run without MySQL.
 */

const request = require('supertest');

// Mock database before any imports
jest.mock('../../../config/database', () => {
  const mockPool = {
    execute: jest.fn().mockResolvedValue([[], []]),
    query: jest.fn().mockResolvedValue([[], []]),
    ping: jest.fn().mockResolvedValue(),
    getConnection: jest.fn().mockResolvedValue({ release: jest.fn() })
  };
  return {
    getConnection: jest.fn().mockResolvedValue(mockPool),
    executeQuery: jest.fn().mockResolvedValue({ rows: [], result: {} }),
    instance: { initialize: jest.fn().mockResolvedValue() },
    middleware: () => (req, res, next) => next(),
    closePool: jest.fn().mockResolvedValue(),
    performHealthCheck: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 1 })
  };
});

jest.mock('../../infrastructure/cache/cacheService', () => ({
  initialize: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue(),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(),
  stats: { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 },
  getStats: jest.fn().mockReturnValue({ hitRate: 0 })
}));

jest.mock('../../infrastructure/database/databaseService', () => ({
  initialize: jest.fn().mockResolvedValue(),
  performHealthCheck: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 1 }),
  close: jest.fn().mockResolvedValue()
}));

jest.mock('../../infrastructure/health/healthChecker', () => ({
  registerDefaultChecks: jest.fn(),
  register: jest.fn()
}));

jest.mock('../../infrastructure/health/systemMetrics', () => ({
  registerDefaultCollectors: jest.fn(),
  start: jest.fn()
}));

jest.mock('../../../services/studentCodeService', () => ({
  validateCodeFormat: jest.fn().mockReturnValue(true),
  generateUniqueCode: jest.fn().mockResolvedValue('EST-TEST-001')
}));

jest.mock('../../../services/autoNotificationService', () => ({
  sendAssignmentNotifications: jest.fn().mockResolvedValue({ success: true })
}));

let app;

beforeAll(async () => {
  app = require('../../app');
});

describe('Health & Info Endpoints', () => {
  test('GET /api/health should return health status', async () => {
    const { getConnection } = require('../../../config/database');
    const mockPool = await getConnection();
    mockPool.query
      .mockResolvedValueOnce([[{ '1': 1 }]])
      .mockResolvedValueOnce([[{ count: 5 }]])
      .mockResolvedValueOnce([[{ count: 3 }]])
      .mockResolvedValueOnce([[{ count: 2 }]]);

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/info should return API info', async () => {
    const res = await request(app).get('/api/info');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.api.name).toBe('Dental Matching API');
  });

  test('GET /api should return welcome message', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBe('2.0.0');
  });
});

describe('Auth Endpoints', () => {
  test('POST /api/auth/login with missing fields should fail', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.body.success).toBeFalsy();
  });
});

describe('Pacientes Endpoints', () => {
  test('GET /api/pacientes should return patient list', async () => {
    const { getConnection } = require('../../../config/database');
    const mockPool = await getConnection();
    mockPool.execute.mockResolvedValueOnce([[
      { id: 1, nombre_completo: 'Juan Test', telefono: '555', ciudad: 'Lima', estado: 'pendiente', activo: 1 }
    ], []]);

    const res = await request(app).get('/api/pacientes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/pacientes with missing required fields should return 400', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .send({ nombre_completo: 'Test' });
    expect(res.status).toBe(400);
  });

  test('POST /api/pacientes with valid data should create patient', async () => {
    const { getConnection } = require('../../../config/database');
    const mockPool = await getConnection();
    mockPool.execute.mockResolvedValueOnce([{ insertId: 99 }, {}]);

    const res = await request(app)
      .post('/api/pacientes')
      .send({
        nombre_completo: 'Test Paciente',
        telefono: '555-1234',
        ciudad: 'Bogota',
        tipo_tratamiento: 'ortodoncia',
        urgencia: 'media'
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(99);
  });
});

describe('Estudiantes Endpoints', () => {
  test('GET /api/estudiantes should return student list', async () => {
    const { executeQuery } = require('../../../config/database');
    executeQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre_completo: 'Maria Test', email: 'maria@test.com', estado: 'activo', codigo_estudiante: 'EST-001' }
      ]
    });

    const res = await request(app).get('/api/estudiantes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
