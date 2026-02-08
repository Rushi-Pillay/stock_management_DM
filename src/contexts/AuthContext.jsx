import { createContext, useContext, useState, useEffect } from 'react';
import { githubRequest } from '../utils/github';

const AuthContext = createContext(null);
const GIST_FILENAME = 'stock_manager_inventory.json';
const SESSION_TOKEN_KEY = 'github_token';
const SESSION_GIST_ID_KEY = 'gist_id';

export function AuthProvider({ children }) {
    const [token, setToken] = useState(sessionStorage.getItem(SESSION_TOKEN_KEY));
    const [gistId, setGistId] = useState(sessionStorage.getItem(SESSION_GIST_ID_KEY));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (newToken, existingGistId = null) => {
        setLoading(true);
        setError(null);

        try {
            // Verify token
            await githubRequest('/user', newToken);

            let targetGistId = existingGistId;

            if (targetGistId) {
                // Verify Gist exists and check for file
                const response = await githubRequest(`/gists/${targetGistId}`, newToken);
                const data = await response.json();

                if (!data.files[GIST_FILENAME]) {
                    // Add file to Gist if missing
                    await githubRequest(`/gists/${targetGistId}`, newToken, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            files: {
                                [GIST_FILENAME]: {
                                    content: JSON.stringify([], null, 2)
                                }
                            }
                        })
                    });
                }
            } else {
                // Create new Gist
                const response = await githubRequest('/gists', newToken, {
                    method: 'POST',
                    body: JSON.stringify({
                        description: 'Stock Manager Inventory Data',
                        public: false,
                        files: {
                            [GIST_FILENAME]: {
                                content: JSON.stringify([], null, 2)
                            }
                        }
                    })
                });
                const data = await response.json();
                targetGistId = data.id;
            }

            // Success - save to state and session
            setToken(newToken);
            setGistId(targetGistId);
            sessionStorage.setItem(SESSION_TOKEN_KEY, newToken);
            sessionStorage.setItem(SESSION_GIST_ID_KEY, targetGistId);

            return { success: true, gistId: targetGistId };

        } catch (err) {
            console.error('Login failed:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setToken(null);
        setGistId(null);
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        sessionStorage.removeItem(SESSION_GIST_ID_KEY);
    };

    return (
        <AuthContext.Provider value={{ token, gistId, login, logout, loading, error, isAuthenticated: !!token && !!gistId }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
