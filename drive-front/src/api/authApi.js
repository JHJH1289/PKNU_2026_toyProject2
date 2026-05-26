const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function makeErrorMessage(data, fallbackMessage) {
  if (!data) {
    return fallbackMessage;
  }

  const messages = [];

  if (data.message) {
    messages.push(data.message);
  }

  if (data.fields) {
    const fieldOrder = ["username", "password"];

    fieldOrder.forEach((field) => {
      if (data.fields[field]) {
        messages.push(data.fields[field]);
      }
    });

    Object.keys(data.fields).forEach((field) => {
      if (!fieldOrder.includes(field)) {
        messages.push(data.fields[field]);
      }
    });
  }

  return messages.join("\n") || fallbackMessage;
}

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, options);

  if (!response.ok) {
    let data = null;
    let text = "";

    try {
      text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      // JSON 응답이 아닐 때 대비
    }

    throw new Error(makeErrorMessage(data, text || `HTTP ${response.status}`));
  }

  return response.json();
}

export async function login(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
}

export async function register(username, password) {
  return request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
}
