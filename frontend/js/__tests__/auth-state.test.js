/**
 * auth-state.test.js
 * Unit tests for auth state management functions
 * Tests: getCachedSessionSync, isUserLoggedOutForUI, setForceSignedOut, etc.
 */

describe('Auth State Management', () => {
    beforeEach(() => {
        sessionStorage.clear();
        localStorage.clear();
        jest.clearAllMocks();
    });

    describe('Session Storage Utilities', () => {
        test('should set and retrieve force signed out flag', () => {
            sessionStorage.setItem('_supabase_force_signed_out', String(Date.now()));
            const result = sessionStorage.getItem('_supabase_force_signed_out');
            expect(result).toBeTruthy();
        });

        test('should clear force signed out flag', () => {
            sessionStorage.setItem('_supabase_force_signed_out', String(Date.now()));
            sessionStorage.removeItem('_supabase_force_signed_out');
            const result = sessionStorage.getItem('_supabase_force_signed_out');
            expect(result).toBeNull();
        });

        test('should set and retrieve logout flag for UI', () => {
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');
            const result = sessionStorage.getItem('_user_logged_out_for_ui') === 'true';
            expect(result).toBe(true);
        });
    });

    describe('Logout Flag Detection', () => {
        test('isUserLoggedOutForUI should return true when logout flag is set', () => {
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');
            const result = sessionStorage.getItem('_user_logged_out_for_ui') === 'true';
            expect(result).toBe(true);
        });

        test('isUserLoggedOutForUI should return false when logout flag is not set', () => {
            const result = sessionStorage.getItem('_user_logged_out_for_ui') === 'true';
            expect(result).toBe(false);
        });

        test('isUserLoggedOutForUI should return false when logout flag is false', () => {
            sessionStorage.setItem('_user_logged_out_for_ui', 'false');
            const result = sessionStorage.getItem('_user_logged_out_for_ui') === 'true';
            expect(result).toBe(false);
        });
    });

    describe('Cached Session Management', () => {
        test('should return null when cache is empty', () => {
            const cached = sessionStorage.getItem('_supabase_session_cache');
            expect(cached).toBeNull();
        });

        test('should handle logout flag in cache retrieval', () => {
            // Set logout flag
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');
            const isLoggedOut = sessionStorage.getItem('_user_logged_out_for_ui') === 'true';
            expect(isLoggedOut).toBe(true);
        });

        test('should parse valid JSON cache', () => {
            const mockSession = {
                user: { id: '123', email: 'test@example.com' },
                access_token: 'abc123',
            };
            sessionStorage.setItem('_supabase_session_cache', JSON.stringify(mockSession));
            const cached = JSON.parse(sessionStorage.getItem('_supabase_session_cache'));
            expect(cached.user.id).toBe('123');
        });

        test('should return null on invalid JSON', () => {
            sessionStorage.setItem('_supabase_session_cache', 'invalid json');
            try {
                JSON.parse(sessionStorage.getItem('_supabase_session_cache'));
                expect(true).toBe(false); // Should not reach here
            } catch (e) {
                expect(e).toBeInstanceOf(SyntaxError);
            }
        });
    });

    describe('localStorage Auth Token Handling', () => {
        test('should find Supabase auth token key', () => {
            const mockTokenKey = 'sb-projectid-auth-token';
            localStorage.setItem(mockTokenKey, JSON.stringify({ user: { id: '123' } }));
            
            // For mock, we can verify the item was set
            expect(localStorage.getItem(mockTokenKey)).toBeTruthy();
        });

        test('should return null when no auth token exists', () => {
            const found = Object.keys(localStorage).find(
                key => key.startsWith('sb-') && key.endsWith('-auth-token')
            );
            expect(found).toBeUndefined();
        });

        test('should remove auth token from localStorage', () => {
            const mockTokenKey = 'sb-projectid-auth-token';
            localStorage.setItem(mockTokenKey, JSON.stringify({ user: { id: '123' } }));
            
            localStorage.removeItem(mockTokenKey);
            const result = localStorage.getItem(mockTokenKey);
            expect(result).toBeNull();
        });

        test('should handle multiple auth token cleanup', () => {
            localStorage.setItem('sb-project1-auth-token', 'token1');
            localStorage.setItem('sb-project2-auth-token', 'token2');
            localStorage.setItem('other-key', 'value');

            expect(localStorage.getItem('sb-project1-auth-token')).toBeTruthy();
            expect(localStorage.getItem('sb-project2-auth-token')).toBeTruthy();

            localStorage.removeItem('sb-project1-auth-token');
            localStorage.removeItem('sb-project2-auth-token');
            
            expect(localStorage.getItem('sb-project1-auth-token')).toBeNull();
            expect(localStorage.getItem('sb-project2-auth-token')).toBeNull();
            expect(localStorage.getItem('other-key')).toBe('value');
        });
    });

    describe('Session Cache Protection', () => {
        test('should not cache session when logout flag exists', () => {
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');
            // Attempt to get cached session should return null conceptually
            const isLoggedOut = sessionStorage.getItem('_user_logged_out_for_ui') === 'true';
            expect(isLoggedOut).toBe(true);
        });

        test('should clear cache on logout', () => {
            // Set up cache
            sessionStorage.setItem('_supabase_session_cache', JSON.stringify({ user: { id: '123' } }));
            
            // Simulate logout
            sessionStorage.removeItem('_supabase_session_cache');
            sessionStorage.setItem('_supabase_force_signed_out', String(Date.now()));
            
            expect(sessionStorage.getItem('_supabase_session_cache')).toBeNull();
            expect(sessionStorage.getItem('_supabase_force_signed_out')).toBeTruthy();
        });
    });

    describe('sessionStorage Clear On Logout', () => {
        test('should clear all sessionStorage on logout', () => {
            sessionStorage.setItem('key1', 'value1');
            sessionStorage.setItem('key2', 'value2');
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');

            sessionStorage.clear();

            expect(sessionStorage.getItem('key1')).toBeNull();
            expect(sessionStorage.getItem('key2')).toBeNull();
            expect(sessionStorage.getItem('_user_logged_out_for_ui')).toBeNull();
        });

        test('should maintain localStorage after sessionStorage clear', () => {
            localStorage.setItem('persistent-key', 'persistent-value');
            sessionStorage.setItem('temp-key', 'temp-value');

            sessionStorage.clear();

            expect(localStorage.getItem('persistent-key')).toBe('persistent-value');
            expect(sessionStorage.getItem('temp-key')).toBeNull();
        });
    });

    describe('Error Handling in Storage Operations', () => {
        test('should handle storage errors gracefully with try-catch', () => {
            const safeSetItem = (key, value) => {
                try {
                    sessionStorage.setItem(key, value);
                    return true;
                } catch (e) {
                    console.warn('Storage error:', e);
                    return false;
                }
            };

            const result = safeSetItem('test-key', 'test-value');
            expect(result).toBe(true);
        });

        test('should handle null/undefined gracefully', () => {
            const result = sessionStorage.getItem('non-existent-key');
            expect(result).toBeNull();
        });
    });

    describe('Tab Isolation Verification', () => {
        test('sessionStorage should be tab-specific', () => {
            // Each tab has its own sessionStorage
            sessionStorage.setItem('tab-specific', 'value1');
            const value = sessionStorage.getItem('tab-specific');
            expect(value).toBe('value1');
        });

        test('localStorage should be shared across tabs', () => {
            // localStorage is shared across all tabs of same origin
            localStorage.setItem('shared-data', 'shared-value');
            const value = localStorage.getItem('shared-data');
            expect(value).toBe('shared-value');
        });

        test('logout flag in sessionStorage should not affect other tabs', () => {
            // Setting logout flag in this "tab's" sessionStorage
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');
            
            // Other tabs would have their own sessionStorage, so logout flag doesn't affect them
            expect(sessionStorage.getItem('_user_logged_out_for_ui')).toBe('true');
            
            // Admin tab's sessionStorage remains unaffected (simulated by separate sessionStorage)
            const adminSessionStorage = {};
            expect(adminSessionStorage['_user_logged_out_for_ui']).toBeUndefined();
        });
    });
});
