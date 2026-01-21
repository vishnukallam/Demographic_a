import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // "User" is now just the guest profile: { name: string, interests: [] }
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for existing guest session
        const storedUser = localStorage.getItem('guest_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse guest user", e);
            }
        }
        setLoading(false);
    }, []);

    const loginGuest = (userData) => {
        setUser(userData);
        localStorage.setItem('guest_user', JSON.stringify(userData));
    };

    const logoutGuest = () => {
        setUser(null);
        localStorage.removeItem('guest_user');
    };

    const value = {
        user,
        setUser: loginGuest,
        logout: logoutGuest,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
