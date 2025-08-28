/**
 * DENTAL MATCHING - API INTEGRATION TESTS
 * End-to-end tests for API endpoints
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../server'); // Assuming server exports Express app
const databaseService = require('../../infrastructure/database/databaseService');

describe('API Integration Tests', () => {
  let testDb;
  let authToken;
  let testUser;
  let testPatient;
  let testStudent;

  beforeAll(async () => {
    // Initialize test database
    await databaseService.initialize();
    testDb = databaseService;
    
    // Create test user and get auth token
    const userData = global.testUtils.generateTestUser({
      email: 'integration.test@example.com'
    });
    
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    expect(registerResponse.status).toBe(201);
    testUser = registerResponse.body.data.user;
    authToken = registerResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await global.testUtils.cleanTestData(testDb);
    await testDb.close();
  });

  beforeEach(async () => {
    // Clean any data from previous tests
    await global.testUtils.cleanTestData(testDb);
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      test('should register a new user successfully', async () => {
        const userData = global.testUtils.generateTestUser();

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toEqual(
          expect.objectContaining({
            email: userData.email,
            nombre_completo: userData.nombre_completo,
            role: userData.role
          })
        );
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
      });

      test('should reject duplicate email registration', async () => {
        const userData = global.testUtils.generateTestUser();

        // First registration
        await request(app)
          .post('/api/auth/register')
          .send(userData);

        // Second registration with same email
        const response = await request(app)
          .post('/api/auth/register')
          .send(userData);

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('USER_ALREADY_EXISTS');
      });

      test('should validate input data', async () => {
        const invalidData = {
          email: 'invalid-email',
          password: '123', // Too weak
          nombre_completo: '' // Empty
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/auth/login', () => {
      test('should login with valid credentials', async () => {
        const userData = global.testUtils.generateTestUser();
        
        // Register user first
        await request(app)
          .post('/api/auth/register')
          .send(userData);

        // Login
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
        expect(response.body.data.user.email).toBe(userData.email);
      });

      test('should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword'
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('INVALID_CREDENTIALS');
      });
    });

    describe('POST /api/auth/refresh', () => {
      test('should refresh token successfully', async () => {
        const userData = global.testUtils.generateTestUser();
        
        const registerResponse = await request(app)
          .post('/api/auth/register')
          .send(userData);

        const refreshToken = registerResponse.body.data.refreshToken;

        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
      });

      test('should reject invalid refresh token', async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: 'invalid-token' });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('INVALID_REFRESH_TOKEN');
      });
    });
  });

  describe('Patient Endpoints', () => {
    beforeEach(() => {
      // Ensure we have a valid auth token for protected routes
      expect(authToken).toBeDefined();
    });

    describe('POST /api/patients', () => {
      test('should create a new patient', async () => {
        const patientData = global.testUtils.generateTestPatient();

        const response = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patientData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.patient).toEqual(
          expect.objectContaining({
            nombre_completo: patientData.nombre_completo,
            email: patientData.email,
            tipo_tratamiento: patientData.tipo_tratamiento,
            status: 'pendiente'
          })
        );

        testPatient = response.body.data.patient;
      });

      test('should validate patient data', async () => {
        const invalidData = {
          nombre_completo: '',
          email: 'invalid-email',
          tipo_tratamiento: 'invalid_treatment'
        };

        const response = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      test('should require authentication', async () => {
        const patientData = global.testUtils.generateTestPatient();

        const response = await request(app)
          .post('/api/patients')
          .send(patientData);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/patients', () => {
      beforeEach(async () => {
        // Create test patients
        const patient1 = global.testUtils.generateTestPatient();
        const patient2 = global.testUtils.generateTestPatient({
          tipo_tratamiento: 'endodoncia'
        });

        await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patient1);

        await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patient2);
      });

      test('should get all patients', async () => {
        const response = await request(app)
          .get('/api/patients')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.patients)).toBe(true);
        expect(response.body.data.patients.length).toBeGreaterThanOrEqual(2);
      });

      test('should filter patients by treatment type', async () => {
        const response = await request(app)
          .get('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ tipo_tratamiento: 'endodoncia' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.patients).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              tipo_tratamiento: 'endodoncia'
            })
          ])
        );
      });

      test('should support pagination', async () => {
        const response = await request(app)
          .get('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 1 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.patients.length).toBe(1);
        expect(response.body.data.pagination).toEqual(
          expect.objectContaining({
            page: 1,
            limit: 1,
            total: expect.any(Number)
          })
        );
      });
    });

    describe('GET /api/patients/:id', () => {
      test('should get patient by ID', async () => {
        // Create a patient first
        const patientData = global.testUtils.generateTestPatient();
        const createResponse = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patientData);

        const patientId = createResponse.body.data.patient.id;

        const response = await request(app)
          .get(`/api/patients/${patientId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.patient.id).toBe(patientId);
      });

      test('should return 404 for non-existent patient', async () => {
        const response = await request(app)
          .get('/api/patients/99999')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('PATIENT_NOT_FOUND');
      });
    });

    describe('PUT /api/patients/:id', () => {
      test('should update patient data', async () => {
        // Create a patient first
        const patientData = global.testUtils.generateTestPatient();
        const createResponse = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patientData);

        const patientId = createResponse.body.data.patient.id;
        const updateData = {
          telefono: '+1987654321',
          urgencia: 'alta'
        };

        const response = await request(app)
          .put(`/api/patients/${patientId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.patient.telefono).toBe(updateData.telefono);
        expect(response.body.data.patient.urgencia).toBe(updateData.urgencia);
      });
    });
  });

  describe('Student Endpoints', () => {
    describe('POST /api/students', () => {
      test('should create a new student', async () => {
        const studentData = global.testUtils.generateTestStudent();

        const response = await request(app)
          .post('/api/students')
          .set('Authorization', `Bearer ${authToken}`)
          .send(studentData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.student).toEqual(
          expect.objectContaining({
            nombre_completo: studentData.nombre_completo,
            email: studentData.email,
            semestre: studentData.semestre,
            status: 'activo'
          })
        );

        testStudent = response.body.data.student;
      });

      test('should validate semester constraints', async () => {
        const invalidData = global.testUtils.generateTestStudent({
          semestre: 15 // Invalid semester
        });

        const response = await request(app)
          .post('/api/students')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/students', () => {
      test('should get all students', async () => {
        // Create test students
        const student1 = global.testUtils.generateTestStudent();
        const student2 = global.testUtils.generateTestStudent({
          semestre: 6
        });

        await request(app)
          .post('/api/students')
          .set('Authorization', `Bearer ${authToken}`)
          .send(student1);

        await request(app)
          .post('/api/students')
          .set('Authorization', `Bearer ${authToken}`)
          .send(student2);

        const response = await request(app)
          .get('/api/students')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.students)).toBe(true);
        expect(response.body.data.students.length).toBeGreaterThanOrEqual(2);
      });

      test('should filter students by semester', async () => {
        const response = await request(app)
          .get('/api/students')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ semestre: 6 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        if (response.body.data.students.length > 0) {
          expect(response.body.data.students).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                semestre: 6
              })
            ])
          );
        }
      });
    });
  });

  describe('Assignment Endpoints', () => {
    beforeEach(async () => {
      // Create test patient and student if not exists
      if (!testPatient) {
        const patientData = global.testUtils.generateTestPatient();
        const patientResponse = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patientData);
        testPatient = patientResponse.body.data.patient;
      }

      if (!testStudent) {
        const studentData = global.testUtils.generateTestStudent();
        const studentResponse = await request(app)
          .post('/api/students')
          .set('Authorization', `Bearer ${authToken}`)
          .send(studentData);
        testStudent = studentResponse.body.data.student;
      }
    });

    describe('POST /api/assignments', () => {
      test('should create a new assignment', async () => {
        const assignmentData = global.testUtils.generateTestAssignment(
          testPatient.id,
          testStudent.id
        );

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(assignmentData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.assignment).toEqual(
          expect.objectContaining({
            paciente_id: testPatient.id,
            estudiante_id: testStudent.id,
            status: 'pendiente'
          })
        );
      });

      test('should validate foreign key constraints', async () => {
        const invalidData = global.testUtils.generateTestAssignment(
          99999, // Non-existent patient
          testStudent.id
        );

        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/assignments', () => {
      test('should get all assignments', async () => {
        // Create test assignment
        const assignmentData = global.testUtils.generateTestAssignment(
          testPatient.id,
          testStudent.id
        );

        await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(assignmentData);

        const response = await request(app)
          .get('/api/assignments')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.assignments)).toBe(true);
      });

      test('should filter assignments by status', async () => {
        const response = await request(app)
          .get('/api/assignments')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ status: 'pendiente' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        if (response.body.data.assignments.length > 0) {
          expect(response.body.data.assignments).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                status: 'pendiente'
              })
            ])
          );
        }
      });
    });
  });

  describe('AI Matching Endpoints', () => {
    beforeEach(async () => {
      // Ensure test patient exists
      if (!testPatient) {
        const patientData = global.testUtils.generateTestPatient();
        const patientResponse = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patientData);
        testPatient = patientResponse.body.data.patient;
      }
    });

    describe('POST /api/ai/match/:patientId', () => {
      test('should generate AI matching results', async () => {
        const response = await request(app)
          .post(`/api/ai/match/${testPatient.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            algorithm: 'neural_network',
            options: {
              includeExplanation: true
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.matches)).toBe(true);
        
        if (response.body.data.matches.length > 0) {
          expect(response.body.data.matches[0]).toEqual(
            expect.objectContaining({
              estudiante_id: expect.any(Number),
              score: expect.any(Number),
              factores_matching: expect.any(Object),
              confianza: expect.any(Number)
            })
          );
        }
      });

      test('should return 404 for non-existent patient', async () => {
        const response = await request(app)
          .post('/api/ai/match/99999')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ algorithm: 'neural_network' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('PATIENT_NOT_FOUND');
      });
    });

    describe('GET /api/ai/matches/:patientId', () => {
      test('should get cached AI matching results', async () => {
        // First generate matches
        await request(app)
          .post(`/api/ai/match/${testPatient.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ algorithm: 'neural_network' });

        // Then retrieve them
        const response = await request(app)
          .get(`/api/ai/matches/${testPatient.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.matches)).toBe(true);
      });
    });
  });

  describe('Health Check Endpoints', () => {
    describe('GET /health', () => {
      test('should return system health status', async () => {
        const response = await request(app)
          .get('/health');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.status).toBeDefined();
        expect(response.body.checks).toBeDefined();
        expect(response.body.duration).toBeDefined();
      });
    });

    describe('GET /health/detailed', () => {
      test('should return detailed health information', async () => {
        const response = await request(app)
          .get('/health/detailed');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.checks).toBeDefined();
        expect(response.body.summary).toBeDefined();
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const requests = [];
      
      // Make multiple requests quickly to trigger rate limiting
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app)
            .get('/api/patients')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Rate limited responses should have proper headers
      if (rateLimitedResponses.length > 0) {
        const rateLimitedResponse = rateLimitedResponses[0];
        expect(rateLimitedResponse.body.error).toBe('RATE_LIMIT_EXCEEDED');
        expect(rateLimitedResponse.headers['x-ratelimit-limit']).toBeDefined();
        expect(rateLimitedResponse.headers['x-ratelimit-remaining']).toBeDefined();
      }
    }, 30000); // Extended timeout for rate limiting test
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    test('should sanitize error responses in production', async () => {
      // This test would need to be run with NODE_ENV=production
      // to verify that stack traces are not exposed
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    test('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/patients')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});