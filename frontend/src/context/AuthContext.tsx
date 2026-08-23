import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'RESIDENT' | 'ADMIN';
  flat_number: string;
  phone?: string;
  occupancy_type?: 'OWNER' | 'TENANT';
  is_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('orqen_token');
    if (!savedToken) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('orqen_user', JSON.stringify(data.user));
        }
      }
    } catch (e) {
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('orqen_token');
    const savedUser = localStorage.getItem('orqen_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        refreshUser();
      } catch (e) {
        localStorage.removeItem('orqen_token');
        localStorage.removeItem('orqen_user');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token || !user || user.is_verified) return;
    const heartbeat = setInterval(() => {
      refreshUser();
    }, 2500);
    return () => clearInterval(heartbeat);
  }, [token, user?.is_verified]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('orqen_token', newToken);
    localStorage.setItem('orqen_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('orqen_token');
    localStorage.removeItem('orqen_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
