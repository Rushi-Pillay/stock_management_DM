import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../utils/firebase';
import { collection, query, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { UserPlus, Trash2, Shield, User, Lock, Unlock } from 'lucide-react';

export default function UserManagementView() {
    const { createNewUser, user, toggleUserStatus } = useAuth();
    const { showToast } = useToast();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('user');
    const [isCreating, setIsCreating] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const userList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // If the list is empty, at least show current user (self) if not in DB yet
            if (userList.length === 0 && user) {
                // This might happen if 'users' collection is empty
                setUsers([]);
            } else {
                setUsers(userList);
            }
        } catch (error) {
            console.error("Error loading users:", error);
            showToast("Failed to load users", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();

        if (newUserPassword.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }

        setIsCreating(true);
        try {
            await createNewUser(newUserEmail, newUserPassword, newRole, newName);
            showToast("User created successfully", "success");

            // Reset form
            setNewUserEmail('');
            setNewUserPassword('');
            setNewName('');
            setNewRole('user');

            // Refresh list
            loadUsers();
        } catch (error) {
            let msg = "Failed to create user";
            if (error.code === 'auth/email-already-in-use') msg = "Email already in use";
            showToast(msg, "error");
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleStatus = async (uid, isDisabled) => {
        if (!window.confirm(`Are you sure you want to ${isDisabled ? 'enable' : 'disable'} this account?`)) return;

        try {
            await toggleUserStatus(uid, isDisabled);
            showToast(`User ${isDisabled ? 'enabled' : 'disabled'} successfully`, "success");
            loadUsers(); // Refresh list to see change
        } catch (error) {
            showToast("Failed to update user status", "error");
        }
    };

    return (
        <section className="view active">
            <div className="view-header">
                <h2>User Management</h2>
            </div>

            <div className="user-management-container">
                {/* Create User Form */}
                <div className="card create-user-card">
                    <h3><UserPlus size={20} style={{ marginRight: '8px' }} /> Create New User</h3>
                    <form onSubmit={handleCreateUser} className="create-user-form">
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Employee Name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={newUserEmail}
                                onChange={e => setNewUserEmail(e.target.value)}
                                placeholder="email@company.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                value={newUserPassword}
                                onChange={e => setNewUserPassword(e.target.value)}
                                placeholder="Temporary Password"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                                <option value="user">Staff (User)</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isCreating}>
                            {isCreating ? 'Creating...' : 'Create User'}
                        </button>
                    </form>
                </div>

                {/* User List */}
                <div className="card user-list-card">
                    <h3>Existing Users</h3>
                    {loading ? (
                        <p>Loading users...</p>
                    ) : (
                        <ul className="user-list">
                            {users.map(u => (
                                <li key={u.id} className="user-list-item">
                                    <div className="user-info">
                                        <span className="user-name">{u.name || 'Unnamed'}</span>
                                        <span className="user-email">{u.email}</span>
                                        <span className={`user-role ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                                            {u.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                                            {u.role ? u.role.toUpperCase() : 'USER'}
                                        </span>
                                        {u.disabled && <span className="status-badge status-disabled">DISABLED</span>}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="user-actions">
                                        {u.id !== user.uid && (
                                            <button
                                                className={`action-btn ${u.disabled ? 'btn-enable' : 'btn-disable'}`}
                                                onClick={() => handleToggleStatus(u.id, u.disabled)}
                                                title={u.disabled ? "Enable Account" : "Disable Account"}
                                            >
                                                {u.disabled ? <Unlock size={18} /> : <Lock size={18} />}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                            {users.length === 0 && <p className="empty-text">No users found in database.</p>}
                        </ul>
                    )}
                </div>
            </div>

            <style>{`
                .user-management-container {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }
                @media (min-width: 768px) {
                    .user-management-container {
                        grid-template-columns: 1fr 1fr;
                    }
                }
                .card {
                    background: var(--bg-card);
                    padding: 1.5rem;
                    border-radius: 8px;
                    box-shadow: var(--shadow-sm);
                    color: var(--text-primary);
                }
                .card h3 {
                    margin-top: 0;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 0.5rem;
                }
                .create-user-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .user-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .user-list-item {
                    border-bottom: 1px solid var(--border-color);
                    padding: 0.75rem 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .user-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .user-name {
                    font-weight: 600;
                    font-size: 1rem;
                    color: var(--text-primary);
                }
                .user-email {
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                }
                .user-role {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.7rem;
                    padding: 2px 6px;
                    border-radius: 4px;
                    width: fit-content;
                    font-weight: bold;
                }
                .role-admin {
                    background-color: rgba(67, 56, 202, 0.2);
                    color: var(--accent-primary);
                }
                .role-user {
                    background-color: var(--bg-elevated);
                    color: var(--text-secondary);
                }
                .status-badge {
                    font-size: 0.7rem;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: bold;
                    margin-left: 0.5rem;
                }
                .status-disabled {
                    background-color: var(--accent-danger);
                    color: white;
                }
                .user-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                .action-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-disable {
                    color: var(--accent-warning);
                }
                .btn-disable:hover {
                    background-color: rgba(245, 158, 11, 0.1);
                }
                .btn-enable {
                    color: var(--accent-success);
                }
                .btn-enable:hover {
                    background-color: rgba(16, 185, 129, 0.1);
                }
            `}</style>
        </section>
    );
}
