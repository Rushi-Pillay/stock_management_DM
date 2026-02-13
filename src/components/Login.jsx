import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Package, Lock, Mail, UserPlus } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const { showToast } = useToast();

    // const [isLogin, setIsLogin] = useState(true); // Always login now
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            showToast('Please enter both email and password', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            showToast('Welcome back!', 'success');
        } catch (err) {
            console.error("Auth Error:", err);
            // Firebase error messages are often "Firebase: Error (auth/wrong-password)."
            // We can clean this up or just show a generic message for now
            let msg = "Authentication failed";
            if (err.code === 'auth/wrong-password') msg = 'Incorrect password';
            if (err.code === 'auth/user-not-found') msg = 'No account found with this email';
            if (err.code === 'auth/email-already-in-use') msg = 'Email already in use';

            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    // const toggleMode = () => {
    //     setIsLogin(!isLogin);
    //     setEmail('');
    //     setPassword('');
    // };

    return (
        <div className="login-overlay active">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-icon">
                        <Package size={48} />
                    </div>
                    <h1>Stock Manager</h1>
                    <p>
                        Enter your credentials to access inventory
                    </p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-with-icon">
                            <Mail size={16} className="input-icon" />
                            <input
                                type="email"
                                id="email"
                                placeholder="name@company.com"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-with-icon">
                            <Lock size={16} className="input-icon" />
                            <input
                                type="password"
                                id="password"
                                placeholder="Enter your password"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`btn btn-primary btn-large login-btn ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner">⏳</span> Signing in...
                            </>
                        ) : (
                            <>
                                <span className="btn-icon">🔓</span>
                                Sign In
                            </>
                        )}
                    </button>

                    {/* <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="btn-link"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontSize: '0.9rem'
                            }}
                        >
                            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                        </button>
                    </div> */}
                    <div style={{ marginTop: '1rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                        Contact administrator for account access.
                    </div>
                </form>
            </div>
        </div>
    );
}
