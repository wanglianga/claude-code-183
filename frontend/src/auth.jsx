import { createContext, useContext, useEffect, useState } from 'react';
import { api, clearSession, getStoredUser, getToken, setSession } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [profile, setProfile] = useState(null);

  const isVolunteer = user?.role === 'VOLUNTEER';
  const isCommunity = user?.role === 'COMMUNITY' || user?.role === 'ADMIN';

  async function login(username, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    setSession(data.token, data.user);
    setUser(data.user);
    if (data.user.role === 'VOLUNTEER') {
      try {
        const p = await api('/volunteers/me/profile');
        setProfile(p);
      } catch {
        setProfile(null);
      }
    }
    return data.user;
  }

  function logout() {
    clearSession();
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (getToken() && getStoredUser()?.role === 'VOLUNTEER') {
      const p = await api('/volunteers/me/profile');
      setProfile(p);
      return p;
    }
  }

  useEffect(() => {
    if (user?.role === 'VOLUNTEER') refreshProfile().catch(() => {});
    // eslint-disable-next-line
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, isVolunteer, isCommunity, login, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
