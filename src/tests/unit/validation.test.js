/**
 * DENTAL MATCHING - VALIDATION TESTS
 * Unit tests for input validation and schemas
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { Validator } = require('../../infrastructure/validation/validator');
const { authSchemas, patientSchemas, studentSchemas } = require('../../infrastructure/validation/schemas');

describe('Validator', () => {
  describe('validate method', () => {
    test('should validate correct data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        nombre_completo: 'John Doe'
      };

      const result = await Validator.validate(validData, authSchemas.register);
      expect(result).toEqual(validData);
    });

    test('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        nombre_completo: '' // Empty
      };

      await expect(
        Validator.validate(invalidData, authSchemas.register)
      ).rejects.toThrow('Validation failed');
    });

    test('should sanitize input data', async () => {
      const dataWithHtml = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        nombre_completo: 'John <script>alert("xss")</script> Doe'
      };

      const result = await Validator.validate(dataWithHtml, authSchemas.register);
      expect(result.nombre_completo).not.toContain('<script>');
      expect(result.nombre_completo).toBe('John  Doe');
    });
  });

  describe('validateMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = global.testUtils.mockRequest();
      res = global.testUtils.mockResponse();
      next = global.testUtils.mockNext();
    });

    test('should validate request body and call next', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        nombre_completo: 'John Doe'
      };

      const middleware = Validator.validateMiddleware(authSchemas.register);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 400 for invalid data', async () => {
      req.body = {
        email: 'invalid-email',
        password: '123',
        nombre_completo: ''
      };

      const middleware = Validator.validateMiddleware(authSchemas.register);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'VALIDATION_ERROR'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('Authentication Schemas', () => {
  describe('register schema', () => {
    test('should validate correct registration data', async () => {
      const validData = {
        email: 'user@example.com',
        password: 'SecurePassword123!',
        nombre_completo: 'John Doe Smith',
        role: 'coordinator'
      };

      const result = await Validator.validate(validData, authSchemas.register);
      expect(result).toEqual(expect.objectContaining(validData));
    });

    test('should reject weak passwords', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'Password',
        'Password123',
        '12345678'
      ];

      for (const password of weakPasswords) {
        const data = {
          email: 'user@example.com',
          password,
          nombre_completo: 'John Doe'
        };

        await expect(
          Validator.validate(data, authSchemas.register)
        ).rejects.toThrow();
      }
    });

    test('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user.example.com',
        'user@.com'
      ];

      for (const email of invalidEmails) {
        const data = {
          email,
          password: 'ValidPassword123!',
          nombre_completo: 'John Doe'
        };

        await expect(
          Validator.validate(data, authSchemas.register)
        ).rejects.toThrow();
      }
    });

    test('should validate optional permissions array', async () => {
      const dataWithPermissions = {
        email: 'user@example.com',
        password: 'SecurePassword123!',
        nombre_completo: 'John Doe',
        permissions: ['read', 'write', 'delete']
      };

      const result = await Validator.validate(dataWithPermissions, authSchemas.register);
      expect(result.permissions).toEqual(['read', 'write', 'delete']);
    });
  });

  describe('login schema', () => {
    test('should validate login credentials', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'MyPassword123!'
      };

      const result = await Validator.validate(loginData, authSchemas.login);
      expect(result).toEqual(loginData);
    });

    test('should require email and password', async () => {
      await expect(
        Validator.validate({}, authSchemas.login)
      ).rejects.toThrow();

      await expect(
        Validator.validate({ email: 'test@example.com' }, authSchemas.login)
      ).rejects.toThrow();

      await expect(
        Validator.validate({ password: 'password' }, authSchemas.login)
      ).rejects.toThrow();
    });
  });

  describe('changePassword schema', () => {
    test('should validate password change data', async () => {
      const changeData = {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword456!',
        confirm_password: 'NewPassword456!'
      };

      const result = await Validator.validate(changeData, authSchemas.changePassword);
      expect(result).toEqual(changeData);
    });

    test('should reject mismatched passwords', async () => {
      const mismatchedData = {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword456!',
        confirm_password: 'DifferentPassword789!'
      };

      await expect(
        Validator.validate(mismatchedData, authSchemas.changePassword)
      ).rejects.toThrow();
    });
  });
});

describe('Patient Schemas', () => {
  describe('create schema', () => {
    test('should validate complete patient data', async () => {
      const patientData = {
        nombre_completo: 'María González',
        email: 'maria.gonzalez@example.com',
        telefono: '+1234567890',
        edad: 25,
        tipo_tratamiento: 'ortodoncia',
        descripcion_caso: 'Paciente con maloclusión clase II',
        urgencia: 'media',
        historial_medico: {
          alergias: ['penicilina', 'látex'],
          medicamentos: ['ibuprofeno'],
          condiciones: ['hipertensión']
        }
      };

      const result = await Validator.validate(patientData, patientSchemas.create);
      expect(result).toEqual(expect.objectContaining(patientData));
    });

    test('should validate minimal required patient data', async () => {
      const minimalData = {
        nombre_completo: 'Juan Pérez',
        email: 'juan.perez@example.com',
        tipo_tratamiento: 'limpieza'
      };

      const result = await Validator.validate(minimalData, patientSchemas.create);
      expect(result).toEqual(expect.objectContaining(minimalData));
    });

    test('should reject invalid treatment types', async () => {
      const invalidData = {
        nombre_completo: 'Test Patient',
        email: 'test@example.com',
        tipo_tratamiento: 'invalid_treatment'
      };

      await expect(
        Validator.validate(invalidData, patientSchemas.create)
      ).rejects.toThrow();
    });

    test('should validate age constraints', async () => {
      const tooYoung = {
        nombre_completo: 'Child Patient',
        email: 'child@example.com',
        edad: 0,
        tipo_tratamiento: 'ortodoncia'
      };

      const tooOld = {
        nombre_completo: 'Elderly Patient',
        email: 'elderly@example.com',
        edad: 151,
        tipo_tratamiento: 'ortodoncia'
      };

      await expect(
        Validator.validate(tooYoung, patientSchemas.create)
      ).rejects.toThrow();

      await expect(
        Validator.validate(tooOld, patientSchemas.create)
      ).rejects.toThrow();
    });
  });

  describe('update schema', () => {
    test('should validate partial updates', async () => {
      const partialUpdate = {
        telefono: '+9876543210',
        urgencia: 'alta'
      };

      const result = await Validator.validate(partialUpdate, patientSchemas.update);
      expect(result).toEqual(partialUpdate);
    });

    test('should not allow ID updates', async () => {
      const withId = {
        id: 123,
        nombre_completo: 'Updated Name'
      };

      const result = await Validator.validate(withId, patientSchemas.update);
      expect(result.id).toBeUndefined();
    });
  });
});

describe('Student Schemas', () => {
  describe('create schema', () => {
    test('should validate complete student data', async () => {
      const studentData = {
        nombre_completo: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@dental.edu',
        telefono: '+1234567890',
        semestre: 8,
        especialidades: ['ortodoncia', 'endodoncia'],
        experiencia_previa: {
          casos_completados: 15,
          especialidades_practicadas: ['ortodoncia']
        },
        disponibilidad: {
          dias: ['lunes', 'martes', 'miércoles'],
          horarios: ['mañana', 'tarde']
        }
      };

      const result = await Validator.validate(studentData, studentSchemas.create);
      expect(result).toEqual(expect.objectContaining(studentData));
    });

    test('should validate semester constraints', async () => {
      const invalidSemester = {
        nombre_completo: 'Student Test',
        email: 'student@test.com',
        semestre: 15 // Too high
      };

      await expect(
        Validator.validate(invalidSemester, studentSchemas.create)
      ).rejects.toThrow();
    });

    test('should validate specialties array', async () => {
      const validSpecialties = {
        nombre_completo: 'Student Test',
        email: 'student@test.com',
        semestre: 6,
        especialidades: ['ortodoncia', 'endodoncia', 'periodoncia']
      };

      const result = await Validator.validate(validSpecialties, studentSchemas.create);
      expect(result.especialidades).toEqual(['ortodoncia', 'endodoncia', 'periodoncia']);
    });

    test('should reject invalid availability format', async () => {
      const invalidAvailability = {
        nombre_completo: 'Student Test',
        email: 'student@test.com',
        semestre: 6,
        disponibilidad: {
          dias: ['invalid_day'],
          horarios: ['invalid_time']
        }
      };

      await expect(
        Validator.validate(invalidAvailability, studentSchemas.create)
      ).rejects.toThrow();
    });
  });
});

describe('Custom Validation Rules', () => {
  test('should validate Colombian phone numbers', async () => {
    const validPhones = [
      '+573001234567',
      '3001234567',
      '+57 300 123 4567',
      '300-123-4567'
    ];

    for (const phone of validPhones) {
      const data = {
        nombre_completo: 'Test User',
        email: 'test@example.com',
        telefono: phone,
        tipo_tratamiento: 'limpieza'
      };

      await expect(
        Validator.validate(data, patientSchemas.create)
      ).resolves.toBeDefined();
    }
  });

  test('should validate treatment complexity', async () => {
    const complexTreatments = ['cirugia_oral', 'implantes', 'ortodoncia_avanzada'];
    
    for (const treatment of complexTreatments) {
      const data = {
        nombre_completo: 'Test Patient',
        email: 'test@example.com',
        tipo_tratamiento: treatment
      };

      const result = await Validator.validate(data, patientSchemas.create);
      expect(result.tipo_tratamiento).toBe(treatment);
    }
  });

  test('should sanitize and validate medical history', async () => {
    const dataWithScripts = {
      nombre_completo: 'Test Patient',
      email: 'test@example.com',
      tipo_tratamiento: 'limpieza',
      historial_medico: {
        alergias: ['penicilina<script>alert("xss")</script>'],
        medicamentos: ['ibuprofeno'],
        condiciones: ['<img src=x onerror=alert("xss")>hipertensión']
      }
    };

    const result = await Validator.validate(dataWithScripts, patientSchemas.create);
    expect(result.historial_medico.alergias[0]).not.toContain('<script>');
    expect(result.historial_medico.condiciones[0]).not.toContain('<img');
  });
});

describe('Performance Tests', () => {
  test('should validate large datasets efficiently', async () => {
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      nombre_completo: `Patient ${i}`,
      email: `patient${i}@test.com`,
      tipo_tratamiento: 'limpieza'
    }));

    const startTime = Date.now();
    
    for (const data of largeDataset) {
      await Validator.validate(data, patientSchemas.create);
    }
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
  });

  test('should handle concurrent validations', async () => {
    const concurrentValidations = Array.from({ length: 50 }, (_, i) => 
      Validator.validate({
        nombre_completo: `Concurrent Patient ${i}`,
        email: `concurrent${i}@test.com`,
        tipo_tratamiento: 'limpieza'
      }, patientSchemas.create)
    );

    const startTime = Date.now();
    await Promise.all(concurrentValidations);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(3000); // Should handle concurrency well
  });
});

describe('Error Handling', () => {
  test('should provide detailed error messages', async () => {
    const invalidData = {
      email: 'invalid-email',
      password: '123',
      nombre_completo: ''
    };

    try {
      await Validator.validate(invalidData, authSchemas.register);
    } catch (error) {
      expect(error.message).toContain('Validation failed');
      expect(error.details).toBeDefined();
      expect(Array.isArray(error.details)).toBe(true);
      expect(error.details.length).toBeGreaterThan(0);
    }
  });

  test('should handle schema not found', async () => {
    await expect(
      Validator.validate({ test: 'data' }, null)
    ).rejects.toThrow('Schema is required');
  });

  test('should handle circular references', async () => {
    const circularData = { name: 'test' };
    circularData.self = circularData;

    // Should not crash, might strip circular reference
    await expect(
      Validator.validate(circularData, patientSchemas.create)
    ).resolves.toBeDefined();
  });
});