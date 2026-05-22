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

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.reload();
    throw new Error("로그인이 필요합니다.");
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

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function fetchFeed() {
  const result = await request("/api/posts");
  return normalizePosts(result);
}

export async function fetchMyPosts() {
  const result = await request("/api/posts/me");
  return normalizePosts(result);
}

export async function fetchMyStats() {
  return request("/api/posts/me/stats");
}

export async function fetchAdminPosts() {
  const result = await request("/api/posts/admin");
  return normalizePosts(result);
}

export async function createPost({ image, caption, locationName }) {
  const formData = new FormData();
  formData.append("image", image);
  if (caption?.trim()) formData.append("caption", caption.trim());
  if (locationName?.trim()) formData.append("locationName", locationName.trim());

  return normalizePost(await request("/api/posts", {
    method: "POST",
    body: formData,
  }));
}

export async function togglePostLike(id) {
  return normalizePost(await request(`/api/posts/${id}/like`, {
    method: "POST",
  }));
}

export async function addPostComment(id, content) {
  return normalizePost(await request(`/api/posts/${id}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  }));
}

export async function deletePost(id) {
  return request(`/api/posts/${id}`, {
    method: "DELETE",
  });
}

function normalizePosts(posts) {
  return Array.isArray(posts) ? posts.map(normalizePost) : [];
}

function normalizePost(post) {
  return post
    ? {
        ...post,
        imageUrl: normalizeImageUrl(post.imageUrl),
        comments: Array.isArray(post.comments) ? post.comments : [],
      }
    : null;
}
