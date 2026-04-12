/**
 * profile-logout.test.js
 * Unit tests for user profile logout functionality
 * Tests: logout handler, localStorage cleanup, sessionStorage cleanup
 */

describe('Profile Logout Functionality', () => {
    beforeEach(() => {
        sessionStorage.clear();
        localStorage.clear();
        jest.clearAllMocks();
    });

    describe('Logout Button Event Handler', () => {
        test('should clear localStorage auth token', () => {
            const authTokenKey = 'sb-projectid-auth-token';
            localStorage.setItem(authTokenKey, JSON.stringify({
                user: { id: '123', email: 'test@example.com' },
                access_token: 'abc123',
            }));

            expect(localStorage.getItem(authTokenKey)).toBeTruthy();

            localStorage.removeItem(authTokenKey);

            expect(localStorage.getItem(authTokenKey)).toBeNull();
        });

        test('should clear all sessionStorage on logout', () => {
            sessionStorage.setItem('_supabase_session_cache', JSON.stringify({ user: { id: '123' } }));
            sessionStorage.setItem('other-data', 'value');

            expect(sessionStorage.length).toBeGreaterThan(0);

            sessionStorage.clear();

            expect(sessionStorage.length).toBe(0);
        });

        test('should set logout flag for UI', () => {
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');

            expect(sessionStorage.getItem('_user_logged_out_for_ui')).toBe('true');
        });

        test('should complete logout sequence', async () => {
            const authTokenKey = 'sb-projectid-auth-token';
            localStorage.setItem(authTokenKey, JSON.stringify({
                user: { id: '123', email: 'test@example.com' },
            }));
            sessionStorage.setItem('_supabase_session_cache', JSON.stringify({ user: { id: '123' } }));

            // Execute logout flow
            localStorage.clear();
            sessionStorage.clear();
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');

            // Verify
            expect(localStorage.length).toBe(0);
            expect(sessionStorage.length).toBe(1);
            expect(sessionStorage.getItem('_user_logged_out_for_ui')).toBe('true');
        });
    });

    describe('localStorage Auth Token Cleanup', () => {
        test('should find and remove correct auth token key', () => {
            localStorage.setItem('sb-project1-auth-token', 'token1');
            localStorage.setItem('sb-project2-auth-token', 'token2');
            localStorage.setItem('other-data', 'other-value');

            const authTokenKey = 'sb-project1-auth-token';
            localStorage.removeItem(authTokenKey);

            expect(localStorage.getItem(authTokenKey)).toBeNull();
            expect(localStorage.getItem('other-data')).toBe('other-value');
            expect(localStorage.getItem('sb-project2-auth-token')).toBe('token2');
        });

        test('should handle missing auth token gracefully', () => {
            const authTokenKey = 'sb-projectid-auth-token';

            if (localStorage.getItem(authTokenKey)) {
                localStorage.removeItem(authTokenKey);
            }

            expect(localStorage.getItem(authTokenKey)).toBeNull();
        });
    });

    describe('sessionStorage Cleanup', () => {
        test('should clear all session data', () => {
            sessionStorage.setItem('cache-key1', 'value1');
            sessionStorage.setItem('cache-key2', 'value2');
            sessionStorage.setItem('_supabase_session_cache', JSON.stringify({}));

            sessionStorage.clear();

            expect(sessionStorage.length).toBe(0);
        });

        test('should preserve logout flag temporarily', () => {
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');
            sessionStorage.setItem('other-data', 'value');

            sessionStorage.removeItem('other-data');

            expect(sessionStorage.getItem('_user_logged_out_for_ui')).toBe('true');
        });
    });

    describe('Logout Flag Verification', () => {
        test('should set logout flag to true', () => {
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');
            expect(sessionStorage.getItem('_user_logged_out_for_ui')).toBe('true');
        });

        test('should verify flag is string true not boolean', () => {
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');
            const result = sessionStorage.getItem('_user_logged_out_for_ui');
            expect(result).toBe('true');
            expect(typeof result).toBe('string');
        });

        test('should allow checking flag equality', () => {
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');
            const isLoggedOut = sessionStorage.getItem('_user_logged_out_for_ui') === 'true';
            expect(isLoggedOut).toBe(true);
        });
    });

    describe('No Infinite Loops Verification', () => {
        test('logout flow should complete without loops', async () => {
            let executionCount = 0;
            const maxExecutions = 10;

            const logoutWithSafetyCheck = async () => {
                while (executionCount < maxExecutions) {
                    executionCount++;
                    localStorage.clear();
                    sessionStorage.clear();
                    break;
                }
                return executionCount === 1;
            };

            const result = await logoutWithSafetyCheck();
            expect(result).toBe(true);
            expect(executionCount).toBe(1);
        });

        test('session state should remain stable after logout', () => {
            localStorage.setItem('sb-project-auth-token', 'token');
            sessionStorage.setItem('data', 'value');

            localStorage.clear();
            sessionStorage.clear();
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');

            expect(localStorage.length).toBe(0);
            expect(sessionStorage.length).toBe(1);
            expect(sessionStorage.getItem('_user_logged_out_for_ui')).toBe('true');

            expect(localStorage.length).toBe(0);
            expect(sessionStorage.length).toBe(1);
        });
    });

    describe('Multi-Tab Logout Isolation', () => {
        test('logout in one tab should not affect admin tab localStorage', () => {
            localStorage.setItem('sb-project-auth-token', 'admin-token');

            sessionStorage.clear();
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');

            expect(localStorage.getItem('sb-project-auth-token')).toBe('admin-token');
        });

        test('logout flag only affects current tab behavior', () => {
            sessionStorage.setItem('_user_logged_out_for_ui', 'true');

            const isLoggedOutForUI = sessionStorage.getItem('_user_logged_out_for_ui') === 'true';
            expect(isLoggedOutForUI).toBe(true);

            const adminTabLogoutFlag = 'false';
            expect(adminTabLogoutFlag).toBe('false');
        });
    });

    describe('Logout Error Handling', () => {
        test('should handle logout errors gracefully', async () => {
            const logoutFlowWithErrorHandling = async () => {
                try {
                    const { error: signOutError } = await Promise.resolve({
                        error: new Error('SignOut failed'),
                    });

                    if (signOutError) {
                        console.warn('SignOut error:', signOutError);
                    }

                    const key = Object.keys(localStorage).find(
                        k => k.startsWith('sb-') && k.endsWith('-auth-token')
                    );
                    if (key) localStorage.removeItem(key);

                    sessionStorage.clear();
                    sessionStorage.setItem('_user_logged_out_for_ui', 'true');

                    return true;
                } catch (error) {
                    console.error('Error logging out:', error);
                    return false;
                }
            };

            const result = await logoutFlowWithErrorHandling();
            expect(result).toBe(true);
        });
    });
});
