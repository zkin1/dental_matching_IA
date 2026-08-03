module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  testMatch: [
    '<rootDir>/src/tests/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/logs/',
    '<rootDir>/public/',
    '<rootDir>/uploads/',
    '<rootDir>/client/'
  ],
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**/*.js',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'text-summary'],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  transform: {},
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: '50%',
  moduleNameMapper: {},
  moduleFileExtensions: ['js', 'json', 'node']
};
