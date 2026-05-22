import { useState } from "react";
import GalleryPage from "./pages/GalleryPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");
    const role = localStorage.getItem("role") || "USER";
    return token && savedUsername ? { username: savedUsername, role } : null;
  });

  function handleLoginSuccess(nextSession) {
    setSession(nextSession);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setSession(null);
  }

  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <GalleryPage
      username={session.username}
      role={session.role}
      onLogout={handleLogout}
    />
  );
}
