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

  if (response.status === 204) {
    return null;
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

function normalizeSavedPlan(plan) {
  return {
    id: plan?.id,
    title: plan?.title || "",
    summary: plan?.summary || "",
    region: plan?.region || "",
    status: plan?.status || "DRAFT",
    savedAt: plan?.savedAt || "",
    generatedAt: plan?.generatedAt || "",
    routePlaces: Array.isArray(plan?.routePlaces) ? plan.routePlaces : [],
    steps: Array.isArray(plan?.steps) ? plan.steps : [],
  };
}

export async function fetchSavedTravelPlans() {
  const response = await request("/api/recommend/plans");
  return Array.isArray(response) ? response.map(normalizeSavedPlan) : [];
}

export async function saveTravelPlan(plan) {
  const response = await request("/api/recommend/plans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(plan),
  });

  return normalizeSavedPlan(response);
}

export async function generateSavedTravelPlan(planId) {
  const response = await request(`/api/recommend/plans/${planId}/generate`, {
    method: "POST",
  });

  return normalizeSavedPlan(response);
}

export async function deleteTravelPlan(planId) {
  await request(`/api/recommend/plans/${planId}`, {
    method: "DELETE",
  });

  return true;
}
