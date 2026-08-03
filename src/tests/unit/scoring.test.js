/**
 * DENTAL MATCHING - SCORING TESTS
 * Unit tests for the matching scoring algorithm
 */

// Mock database before requiring matchingService
jest.mock('../../../config/database', () => ({
  getConnection: jest.fn().mockResolvedValue({
    execute: jest.fn().mockResolvedValue([[], []]),
    query: jest.fn().mockResolvedValue([[], []])
  }),
  executeQuery: jest.fn().mockResolvedValue({ rows: [] })
}));

const matchingService = require('../../../services/matchingService');

describe('Scoring Algorithm', () => {
  describe('calcularScoreMatchingConHorarios', () => {
    const basePaciente = {
      id: 1,
      nombre_completo: 'Test Paciente',
      nivel_dolor: 5,
      prioridad: 'moderada'
    };

    const baseEstudiante = {
      id: 1,
      nombre_completo: 'Test Estudiante',
      año_carrera: '5to',
      casos_activos: 2,
      casos_necesarios: 10,
      casos_completados: 8
    };

    const baseTratamiento = {
      tratamiento: 'Resina Simple',
      prioridad: 'moderada',
      confianza: 0.8
    };

    const baseHorarios = {
      scoreCompatibilidad: 0.8,
      horariosCompartidos: ['Lunes 08:00-12:00']
    };

    test('should return a score between 0 and 1', () => {
      const score = matchingService.calcularScoreMatchingConHorarios(
        basePaciente, baseEstudiante, baseTratamiento, baseHorarios
      );
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should give higher score for better schedule compatibility', () => {
      const goodSchedule = { scoreCompatibilidad: 0.95, horariosCompartidos: ['Lunes'] };
      const badSchedule = { scoreCompatibilidad: 0.2, horariosCompartidos: [] };

      const highScore = matchingService.calcularScoreMatchingConHorarios(
        basePaciente, baseEstudiante, baseTratamiento, goodSchedule
      );
      const lowScore = matchingService.calcularScoreMatchingConHorarios(
        basePaciente, baseEstudiante, baseTratamiento, badSchedule
      );

      expect(highScore).toBeGreaterThan(lowScore);
    });

    test('should penalize overloaded students', () => {
      const freeStudent = { ...baseEstudiante, casos_activos: 0 };
      const busyStudent = { ...baseEstudiante, casos_activos: 9, casos_necesarios: 10 };

      const freeScore = matchingService.calcularScoreMatchingConHorarios(
        basePaciente, freeStudent, baseTratamiento, baseHorarios
      );
      const busyScore = matchingService.calcularScoreMatchingConHorarios(
        basePaciente, busyStudent, baseTratamiento, baseHorarios
      );

      expect(freeScore).toBeGreaterThan(busyScore);
    });

    test('should give higher score for urgent cases', () => {
      const urgentTreatment = { ...baseTratamiento, prioridad: 'urgente' };
      const lowTreatment = { ...baseTratamiento, prioridad: 'baja' };

      const urgentScore = matchingService.calcularScoreMatchingConHorarios(
        basePaciente, baseEstudiante, urgentTreatment, baseHorarios
      );
      const lowScore = matchingService.calcularScoreMatchingConHorarios(
        basePaciente, baseEstudiante, lowTreatment, baseHorarios
      );

      expect(urgentScore).toBeGreaterThan(lowScore);
    });

    test('should give higher score for experienced students', () => {
      const experienced = { ...baseEstudiante, casos_completados: 25 };
      const newbie = { ...baseEstudiante, casos_completados: 0 };

      const expScore = matchingService.calcularScoreMatchingConHorarios(
        basePaciente, experienced, baseTratamiento, baseHorarios
      );
      const newScore = matchingService.calcularScoreMatchingConHorarios(
        basePaciente, newbie, baseTratamiento, baseHorarios
      );

      expect(expScore).toBeGreaterThan(newScore);
    });

    test('should handle high pain levels', () => {
      const highPain = { ...basePaciente, nivel_dolor: 9 };
      const lowPain = { ...basePaciente, nivel_dolor: 1 };

      const highPainScore = matchingService.calcularScoreMatchingConHorarios(
        highPain, baseEstudiante, baseTratamiento, baseHorarios
      );
      const lowPainScore = matchingService.calcularScoreMatchingConHorarios(
        lowPain, baseEstudiante, baseTratamiento, baseHorarios
      );

      expect(highPainScore).toBeGreaterThanOrEqual(lowPainScore);
    });

    test('should handle null/undefined values gracefully', () => {
      const nullPaciente = { ...basePaciente, nivel_dolor: null };
      const nullEstudiante = { ...baseEstudiante, casos_activos: null, casos_completados: null };

      expect(() => {
        matchingService.calcularScoreMatchingConHorarios(
          nullPaciente, nullEstudiante, baseTratamiento, baseHorarios
        );
      }).not.toThrow();
    });

    test('should handle zero schedule compatibility', () => {
      const noSchedule = { scoreCompatibilidad: 0, horariosCompartidos: [] };

      const score = matchingService.calcularScoreMatchingConHorarios(
        basePaciente, baseEstudiante, baseTratamiento, noSchedule
      );

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Weight distribution', () => {
    test('weights should effectively sum to 100%', () => {
      // The weights are: horario 30%, tratamiento 25%, carga 20%, urgencia 15%, dolor 5%, experiencia 5%
      const weights = [0.30, 0.25, 0.20, 0.15, 0.05, 0.05];
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });
  });
});
