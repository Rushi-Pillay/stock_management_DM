import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Package, Lock, Key } from 'lucide-react';

export default function Login() {
    const { login, loading } = useAuth();
    const { showToast } = useToast();

    const [token, setToken] = useState('');
    const [gistId, setGistId] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            showToast('Please enter the team password', 'error');
            return;
        }

        const result = await login(token, gistId || null);
        if (!result.success) {
            showToast(result.error || 'Authentication failed', 'error');
        } else {
            showToast('Welcome back!', 'success');
        }
    };

    return (
        <div className="login-overlay active">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-icon">
                        <Package size={48} />
                    </div>
                    <h1>Stock Manager</h1>
                    <p>Enter the team password to access shared inventory</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="github-token">Team Password</label>
                        <div className="input-with-icon">
                            <Lock size={16} className="input-icon" />
                            <input
                                type="password"
                                id="github-token"
                                placeholder="Enter team password"
                                required
                                autoComplete="off"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                            />
                        </div>
                        <small className="token-hint">Ask your team admin for the password</small>
                    </div>

                    {showAdvanced && (
                        <div className="form-group slide-down">
                            <label htmlFor="gist-id">Inventory ID (first-time setup only)</label>
                            <div className="input-with-icon">
                                <Key size={16} className="input-icon" />
                                <input
                                    type="text"
                                    id="gist-id"
                                    placeholder="Leave empty to create new shared inventory"
                                    autoComplete="off"
                                    value={gistId}
                                    onChange={(e) => setGistId(e.target.value)}
                                />
                            </div>
                            <small className="token-hint">Only needed for first-time setup</small>
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`btn btn-primary btn-large login-btn ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner">⏳</span> Connecting...
                            </>
                        ) : (
                            <>
                                <span className="btn-icon">🔓</span> Access Inventory
                            </>
                        )}
                    </button>
                </form>

                <div className="login-help">
                    <details>
                        <summary>First-time setup (Admin only)</summary>
                        <ol>
                            <li>Go to GitHub → Settings → Developer settings</li>
                            <li>Click "Personal access tokens" → "Tokens (classic)"</li>
                            <li>Generate new token with "gist" scope</li>
                            <li>Use the token as your team password</li>
                            <li>Share it with your team members</li>
                        </ol>
                    </details>

                    <div className="advanced-toggle">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
