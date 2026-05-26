import { useEffect, useState } from "react";
import GalleryPage from "./pages/GalleryPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");
    const role = localStorage.getItem("role") || "USER";
    return token && savedUsername ? { username: savedUsername, role } : null;
  });
  const [loginOpen, setLoginOpen] = useState(false);

  function handleLoginSuccess(nextSession) {
    setSession(nextSession);
    setLoginOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setSession(null);
    setLoginOpen(false);
  }

  useEffect(() => {
    function handleAuthExpired() {
      setSession(null);
      setLoginOpen(false);
    }

    window.addEventListener("auth-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, []);

  if (!session && loginOpen) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackHome={() => setLoginOpen(false)}
      />
    );
  }

  return (
    <GalleryPage
      username={session?.username || null}
      role={session?.role || "GUEST"}
      onLogout={handleLogout}
      onLoginClick={() => setLoginOpen(true)}
    />
  );
}
