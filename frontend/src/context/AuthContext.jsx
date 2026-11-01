import { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService.js";

// Holds "who is signed in" so any page or component can read it with useAuth().
const AuthContext = createContext(null);
const TOKEN_KEY = "shinjukai_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check a saved login

  // When the site opens, check whether a saved token is still valid.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .getMe(token)
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY)) // expired or invalid
      .finally(() => setLoading(false));
  }, []);

  // Saves the token and remembers the user.
  function saveSession({ token, user }) {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
    return user;
  }

  const value = {
    user,
    loading,
    signup: async (details) => saveSession(await authService.signup(details)),
    login: async (details) => saveSession(await authService.login(details)),
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
