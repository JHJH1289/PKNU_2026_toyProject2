const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function getToken() {
  return localStorage.getItem("token") || "";
}

function normalizeImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export async function fetchProfile() {
  return normalizeProfile(await request("/api/me"));
}

export async function fetchUserProfile(username) {
  return normalizeProfile(await request(`/api/users/${encodeURIComponent(username)}`));
}

export async function updateProfile({ bio, profileImage }) {
  const formData = new FormData();
  formData.append("bio", bio || "");
  if (profileImage) {
    formData.append("profileImage", profileImage);
  }

  return normalizeProfile(await request("/api/me/profile", {
    method: "POST",
    body: formData,
  }));
}

function normalizeProfile(profile) {
  return profile
    ? {
        ...profile,
        profileImageUrl: normalizeImageUrl(profile.profileImageUrl),
      }
    : null;
}
