import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../utils/firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { initializeApp } from "firebase/app";
import { getAuth as getSecondaryAuth, createUserWithEmailAndPassword as secondaryCreateUser } from "firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setUserData(null);
                setLoading(false);
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!user) return;

        // Real-time listener for user data
        const userDocRef = doc(db, 'users', user.uid);

        const unsubscribeFirestore = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Real-time kick out
                if (data.disabled) {
                    console.log("User account disabled (real-time). Logging out.");
                    await signOut(auth);
                    // Toast will be difficult here as we are unmounting or changing state rapidly, 
                    // but we can try letting component handle it or just alert.
                    // For now, simple sign out is enough.
                    return;
                }

                setUserData(data);
            } else {
                // If doc doesn't exist, create it (bootstrap)
                const defaultData = {
                    email: user.email,
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    disabled: false
                };
                try {
                    await setDoc(userDocRef, defaultData);
                    // The snapshot will fire again with the new data
                } catch (e) {
                    console.error("Error creating user profile:", e);
                }
            }
            setLoading(false);
        }, (error) => {
            console.error("Firestore listener error:", error);
            setLoading(false);
        });

        return () => unsubscribeFirestore();
    }, [user]);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // This is for creating users without logging out the admin
    // We use a secondary app instance
    const createNewUser = async (email, password, role = 'user', name = '') => {
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID
        };

        // Initialize a secondary app with a unique name
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getSecondaryAuth(secondaryApp);

        try {
            const userCredential = await secondaryCreateUser(secondaryAuth, email, password);
            const newUser = userCredential.user;

            // Save extra data to Firestore (using the MAIN app's db)
            await setDoc(doc(db, 'users', newUser.uid), {
                email: email,
                role: role,
                name: name,
                createdAt: new Date().toISOString()
            });

            // Clean up
            // await secondaryApp.delete(); // delete() might not be available in client SDK depending on version, or is handled automatically
            // Actually, client SDK `delete()` is `deleteApp(app)`

            return newUser;
        } catch (error) {
            console.error("Error creating new user:", error);
            throw error;
        }
    };

    const toggleUserStatus = async (uid, currentStatus) => {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                disabled: !currentStatus
            });
            // Note: We can't forcibly sign them out instantly without Cloud Functions, 
            // but the onAuthStateChanged listener will catch it next time they refresh or re-login.
            // Or we could implement a check in every sensitive action, but that's expensive.
        } catch (error) {
            console.error("Error toggling user status:", error);
            throw error;
        }
    };

    // Public signup (removed from UI, but kept here just in case/for legacy)
    const signup = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        user,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        userData, // Contains { role: 'admin' | 'user' }
        createNewUser,
        toggleUserStatus,
        isAdmin: userData?.role === 'admin'
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
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
