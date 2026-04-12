// jest.setup.js - Mock browser APIs and Supabase
let localStorageData = {};
let sessionStorageData = {};

const mockLocalStorage = {
    getItem: jest.fn((key) => localStorageData[key] || null),
    setItem: jest.fn((key, value) => {
        localStorageData[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
        delete localStorageData[key];
    }),
    clear: jest.fn(() => {
        localStorageData = {};
    }),
    key: jest.fn((index) => Object.keys(localStorageData)[index] || null),
    get length() {
        return Object.keys(localStorageData).length;
    },
};

const mockSessionStorage = {
    getItem: jest.fn((key) => sessionStorageData[key] || null),
    setItem: jest.fn((key, value) => {
        sessionStorageData[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
        delete sessionStorageData[key];
    }),
    clear: jest.fn(() => {
        sessionStorageData = {};
    }),
    key: jest.fn((index) => Object.keys(sessionStorageData)[index] || null),
    get length() {
        return Object.keys(sessionStorageData).length;
    },
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
});

// Mock Supabase
jest.mock('./frontend/js/supabase.js', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(() =>
                Promise.resolve({
                    data: { session: null },
                })
            ),
            signOut: jest.fn(() =>
                Promise.resolve({
                    error: null,
                })
            ),
            signUp: jest.fn(),
            signInWithPassword: jest.fn(),
        },
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() =>
                    Promise.resolve({
                        data: [],
                        error: null,
                    })
                ),
            })),
            update: jest.fn(() => ({
                eq: jest.fn(() =>
                    Promise.resolve({
                        error: null,
                    })
                ),
            })),
            insert: jest.fn(() =>
                Promise.resolve({
                    data: [],
                    error: null,
                })
            ),
        })),
    },
}));

// Mock console to reduce test output clutter
global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
};

// Clean up mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    localStorageData = {};
    sessionStorageData = {};
});
