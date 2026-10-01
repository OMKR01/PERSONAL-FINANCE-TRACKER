import { apiClient } from "./apiClient";

export const login = (data) => apiClient.post("/auth/login", data);
export const register = (data) => apiClient.post("/auth/register", data);
export const logout = () => apiClient.post("/auth/logout");
export const checkAuth = () => apiClient.get("/auth/me");
