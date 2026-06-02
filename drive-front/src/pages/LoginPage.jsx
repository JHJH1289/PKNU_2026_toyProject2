import { useState } from "react";
import { login, register } from "../api/authApi";

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const submitMode = e.nativeEvent.submitter?.value || mode;
    setMessage("");
    setLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        throw new Error("아이디와 비밀번호를 입력해주세요.");
      }

      if (submitMode === "register") {
        await register(username.trim(), password);
        setMessage("회원가입이 완료되었습니다. 이제 로그인하세요.");
        setMode("login");
      } else {
        const result = await login(username.trim(), password);
        const role = result.role || "USER";
        localStorage.setItem("token", result.token);
        localStorage.setItem("username", result.username);
        localStorage.setItem("role", role);
        onLoginSuccess({ username: result.username, role });
      }
    } catch (error) {
      setMessage(error.message || "요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page travel-auth-page">
      <div className="auth-card travel-auth-card">
        <h1>Travelog</h1>
        <p className="auth-subtitle">
          여행 사진을 올리고, 서로의 여정을 피드에서 만나보세요.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="row">
            <span>아이디</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디 입력"
            />
          </label>

          <label className="row">
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
            />
          </label>

          <div className="auth-tabs">
            <button
              type="submit"
              name="authMode"
              value="login"
              className={mode === "login" ? "tab active" : "tab"}
              onClick={() => setMode("login")}
              disabled={loading}
            >
              {loading && mode === "login" ? "처리 중..." : "로그인"}
            </button>
            <button
              type="submit"
              name="authMode"
              value="register"
              className={mode === "register" ? "tab active" : "tab"}
              onClick={() => setMode("register")}
              disabled={loading}
            >
              {loading && mode === "register" ? "처리 중..." : "회원가입"}
            </button>
          </div>
        </form>

        {message && <div className="status-box">{message}</div>}
      </div>
    </div>
  );
}
