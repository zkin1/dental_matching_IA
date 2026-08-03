/**
 * DENTAL MATCHING - VALIDATION TESTS
 * Unit tests for input validation and schemas
 */

const { Validator } = require('../../infrastructure/validation/validator');
const { authSchemas, patientSchemas, studentSchemas } = require('../../infrastructure/validation/schemas');

describe('Validator', () => {
  describe('validate method', () => {
    test('should validate correct login data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'ValidPassword123!'
      };

      const result = await Validator.validate(validData, authSchemas.login);
      expect(result.email).toBe(validData.email);
    });

    test('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: ''
      };

      await expect(
        Validator.validate(invalidData, authSchemas.login)
      ).rejects.toThrow();
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
        password: 'ValidPassword123!'
      };

      const middleware = Validator.validateBody(authSchemas.login);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should call next with error for invalid data', async () => {
      req.body = {
        email: 'invalid-email',
        password: ''
      };

      const middleware = Validator.validateBody(authSchemas.login);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

describe('Authentication Schemas', () => {
  describe('register schema', () => {
    test('should validate correct registration data', async () => {
      const validData = {
        email: 'user@example.com',
        password: 'SecurePassword123!',
        confirm_password: 'SecurePassword123!',
        nombre_completo: 'John Doe Smith',
        role: 'coordinator'
      };

      const result = await Validator.validate(validData, authSchemas.register);
      expect(result.email).toBe(validData.email);
      expect(result.nombre_completo).toBe(validData.nombre_completo);
    });

    test('should reject weak passwords', async () => {
      const weakPasswords = ['123456', 'password', 'Password', 'Password123', '12345678'];

      for (const password of weakPasswords) {
        const data = {
          email: 'user@example.com',
          password,
          confirm_password: password,
          nombre_completo: 'John Doe'
        };

        await expect(
          Validator.validate(data, authSchemas.register)
        ).rejects.toThrow();
      }
    });

    test('should reject mismatched passwords', async () => {
      const data = {
        email: 'user@example.com',
        password: 'SecurePassword123!',
        confirm_password: 'DifferentPassword456!',
        nombre_completo: 'John Doe'
      };

      await expect(
        Validator.validate(data, authSchemas.register)
      ).rejects.toThrow();
    });
  });

  describe('login schema', () => {
    test('should validate login credentials', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'MyPassword123!'
      };

      const result = await Validator.validate(loginData, authSchemas.login);
      expect(result.email).toBe(loginData.email);
    });

    test('should require email and password', async () => {
      await expect(Validator.validate({}, authSchemas.login)).rejects.toThrow();
      await expect(Validator.validate({ email: 'test@example.com' }, authSchemas.login)).rejects.toThrow();
      await expect(Validator.validate({ password: 'password' }, authSchemas.login)).rejects.toThrow();
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
      expect(result.current_password).toBe(changeData.current_password);
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
        edad: 25,
        genero: 'femenino',
        email: 'maria.gonzalez@example.com',
        motivo_consulta: 'Paciente con maloclusión clase II necesita ortodoncia',
        consentimiento: true,
        prioridad: 'media',
        especialidad_requerida: 'ortodoncia'
      };

      const result = await Validator.validate(patientData, patientSchemas.create);
      expect(result.nombre_completo).toBe(patientData.nombre_completo);
      expect(result.edad).toBe(patientData.edad);
    });

    test('should reject missing required fields', async () => {
      const invalidData = {
        nombre_completo: 'Test Patient'
      };

      await expect(
        Validator.validate(invalidData, patientSchemas.create)
      ).rejects.toThrow();
    });

    test('should validate age constraints', async () => {
      const baseData = {
        nombre_completo: 'Test Patient',
        genero: 'masculino',
        motivo_consulta: 'Necesita revision dental completa',
        consentimiento: true
      };

      await expect(
        Validator.validate({ ...baseData, edad: 0 }, patientSchemas.create)
      ).rejects.toThrow();

      await expect(
        Validator.validate({ ...baseData, edad: 121 }, patientSchemas.create)
      ).rejects.toThrow();
    });
  });

  describe('update schema', () => {
    test('should validate partial updates', async () => {
      const partialUpdate = {
        prioridad: 'alta'
      };

      const result = await Validator.validate(partialUpdate, patientSchemas.update);
      expect(result.prioridad).toBe('alta');
    });
  });
});

describe('Student Schemas', () => {
  describe('create schema', () => {
    test('should validate complete student data', async () => {
      const studentData = {
        nombre_completo: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@dental.edu',
        numero_estudiante: 'EST2024001',
        ano_academico: 4,
        especialidades: ['ortodoncia', 'endodoncia'],
        disponibilidad: {
          dias: ['lunes', 'martes', 'miercoles'],
          horario_inicio: '08:00',
          horario_fin: '14:00'
        }
      };

      const result = await Validator.validate(studentData, studentSchemas.create);
      expect(result.nombre_completo).toBe(studentData.nombre_completo);
      expect(result.especialidades).toEqual(studentData.especialidades);
    });

    test('should validate ano_academico constraints', async () => {
      const invalidData = {
        nombre_completo: 'Student Test',
        email: 'student@test.com',
        numero_estudiante: 'EST001',
        ano_academico: 7,
        especialidades: ['general'],
        disponibilidad: {
          dias: ['lunes'],
          horario_inicio: '08:00',
          horario_fin: '14:00'
        }
      };

      await expect(
        Validator.validate(invalidData, studentSchemas.create)
      ).rejects.toThrow();
    });
  });
});

describe('Error Handling', () => {
  test('should provide detailed error messages', async () => {
    const invalidData = {
      email: 'invalid-email',
      password: ''
    };

    try {
      await Validator.validate(invalidData, authSchemas.login);
    } catch (error) {
      expect(error.message).toBeDefined();
      expect(error.details).toBeDefined();
      expect(Array.isArray(error.details)).toBe(true);
      expect(error.details.length).toBeGreaterThan(0);
    }
  });

  test('should handle null schema', async () => {
    await expect(
      Validator.validate({ test: 'data' }, null)
    ).rejects.toThrow();
  });
});
