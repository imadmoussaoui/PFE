import { createContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
    id: string;
    name: string;
    nom?: string;
    prenom?: string;
    sexe?: string;
    adresse?: string;
    ville?: string;
    telephone?: string;
    email: string;
    userType: 'utilisateur' | 'artisan';
    role?: 'user' | 'admin';
    moderationStatus?: 'pending' | 'approved' | 'suspended';
    cni?: string;
    cnie?: string;
    profilePhoto?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (userData: User, token: string) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
            try {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error('Failed to parse saved user', e);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (userData: User, newToken: string) => {
        setUser(userData);
        setToken(newToken);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const updateUser = (updatedData: Partial<User>) => {
        if (user) {
            const newUser = { ...user, ...updatedData };
            setUser(newUser);
            localStorage.setItem('user', JSON.stringify(newUser));
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}
