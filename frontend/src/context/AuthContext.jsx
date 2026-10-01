import { createContext, useState, useEffect } from "react";
import {
  checkAuth,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
} from "../api/authApi";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user has an active httpOnly session cookie on refresh
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await checkAuth();
        if (response.data?.success) {
          setUser(response.data.user);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginUser = async (credentials) => {
    const response = await apiLogin(credentials);
    if (response.data?.success) {
      setUser(response.data.user);
    }
    return response.data;
  };

  const registerUser = async (formData) => {
    const response = await apiRegister(formData);
    if (response.data?.success) {
      setUser(response.data.user);
    }
    return response.data;
  };

  const logoutUser = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, loginUser, registerUser, logoutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
