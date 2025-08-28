/**
 * DENTAL MATCHING - JEST CONFIGURATION
 * Test configuration for unit and integration tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],

  // Test file patterns
  testMatch: [
    '<rootDir>/src/tests/**/*.test.js',
    '<rootDir>/src/**/__tests__/**/*.js',
    '<rootDir>/src/**/?(*.)+(spec|test).js'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/logs/',
    '<rootDir>/public/',
    '<rootDir>/uploads/'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/tests/setup.js',
    '!**/node_modules/**',
    '!**/migrations/**',
    '!server.js' // Exclude server entry point
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/infrastructure/validation/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/infrastructure/security/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/infrastructure/cache/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Module paths
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],

  // Transform files
  transform: {},

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Timeout for tests
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Test categories using projects
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
      testTimeout: 60000 // Longer timeout for integration tests
    }
  ],

  // Global setup and teardown
  // globalSetup: '<rootDir>/src/tests/globalSetup.js',
  // globalTeardown: '<rootDir>/src/tests/globalTeardown.js',

  // Report slow tests
  slowTestThreshold: 5,

  // Error handling
  bail: 0, // Don't stop on first failure
  errorOnDeprecated: true,

  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/logs/',
    '<rootDir>/coverage/',
    '<rootDir>/uploads/'
  ],

  // Mock configuration
  moduleNameMapping: {
    // Add any module name mappings if needed
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(supertest)/)'
  ],

  // Extensions to consider
  moduleFileExtensions: [
    'js',
    'json',
    'node'
  ],

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'junit.xml',
      suiteName: 'Dental Matching Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Custom environment variables for tests
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};