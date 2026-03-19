// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("conecte_token");
    const saved  = localStorage.getItem("conecte_user");
    if (token && saved) {
      setUser(JSON.parse(saved));
      // Valida token com o servidor
      api.get("/auth/me")
        .then(r => { setUser(r.data.user); localStorage.setItem("conecte_user", JSON.stringify(r.data.user)); })
        .catch(() => { localStorage.removeItem("conecte_token"); localStorage.removeItem("conecte_user"); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("conecte_token", data.token);
    localStorage.setItem("conecte_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("conecte_token");
    localStorage.removeItem("conecte_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === "ADMIN" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
