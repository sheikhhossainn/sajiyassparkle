module.exports = {
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
    collectCoverageFrom: [
        'frontend/js/**/*.js',
        '!frontend/js/**/*.temp.js',
        '!frontend/js/supabase.js',
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testTimeout: 10000,
    verbose: true,
    bail: false,
    collectCoverage: false,
};
