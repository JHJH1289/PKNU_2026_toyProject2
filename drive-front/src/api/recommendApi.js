const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function getToken() {
  return localStorage.getItem("token") || "";
}

function clearSavedLogin() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
  window.dispatchEvent(new Event("auth-expired"));
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    clearSavedLogin();
    throw new Error("Login is required.");
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text;

    try {
      const body = JSON.parse(text);
      message = body.message || text;
    } catch {
      message = text;
    }

    throw new Error(message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function createTravelPlan({ region, themes, attractions }) {
  const response = await request("/api/recommend/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ region, themes, attractions }),
  });

  return {
    title: response?.title || "",
    summary: response?.summary || "",
    steps: Array.isArray(response?.steps) ? response.steps : [],
  };
}
