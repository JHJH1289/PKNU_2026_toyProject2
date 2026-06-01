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
    clearSavedLogin();
    throw new Error("로그인이 필요한 기능입니다.");
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
  return normalizePosts(await request("/api/posts"));
}

export async function fetchMyPosts() {
  return normalizePosts(await request("/api/posts/me"));
}

export async function fetchUserPosts(username) {
  return normalizePosts(
    await request(`/api/posts/users/${encodeURIComponent(username)}`),
  );
}

export async function fetchMyStats() {
  return request("/api/posts/me/stats");
}

export async function fetchUserStats(username) {
  return request(`/api/posts/users/${encodeURIComponent(username)}/stats`);
}

export async function fetchAdminPosts() {
  return normalizePosts(await request("/api/posts/admin"));
}

export async function suggestPostTags({
  images,
  image,
  caption,
  locations,
  categoryTag,
}) {
  const formData = new FormData();
  const uploadImages =
    Array.isArray(images) && images.length > 0 ? images : image ? [image] : [];

  if (uploadImages.length === 0) {
    throw new Error("At least one image is required.");
  }

  uploadImages.forEach((file) => {
    formData.append("images", file);
  });

  if (caption?.trim()) {
    formData.append("caption", caption.trim());
  }

  if (Array.isArray(locations) && locations.length > 0) {
    formData.append("locations", JSON.stringify(locations));
  }

  if (categoryTag?.trim()) {
    formData.append("categoryTag", categoryTag.trim());
  }

  const response = await request("/api/posts/tags/suggest", {
    method: "POST",
    body: formData,
  });

  return Array.isArray(response?.tags)
    ? response.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
}

export async function createPost({
  images,
  image,
  caption,
  locationName,
  latitude,
  longitude,
  locations,
  categoryTag,
}) {
  const formData = new FormData();
  const uploadImages =
    Array.isArray(images) && images.length > 0 ? images : image ? [image] : [];

  if (uploadImages.length === 0) {
    throw new Error("At least one image is required.");
  }

  uploadImages.forEach((file) => {
    formData.append("images", file);
  });

  if (caption?.trim()) {
    formData.append("caption", caption.trim());
  }

  if (locationName?.trim()) {
    formData.append("locationName", locationName.trim());
  }

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
  }

  if (Array.isArray(locations) && locations.length > 0) {
    formData.append("locations", JSON.stringify(locations));
  }

  if (categoryTag?.trim()) {
    formData.append("categoryTag", categoryTag.trim());
  }

  return normalizePost(
    await request("/api/posts", {
      method: "POST",
      body: formData,
    }),
  );
}

export async function updatePost(
  id,
  {
    caption,
    locationName,
    latitude,
    longitude,
    locations,
    categoryTag,
    imageOrder,
  },
) {
  return normalizePost(
    await request(`/api/posts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        caption,
        locationName,
        latitude,
        longitude,
        locations,
        categoryTag,
        imageOrder,
      }),
    }),
  );
}

export async function togglePostLike(id) {
  return normalizePost(
    await request(`/api/posts/${id}/like`, {
      method: "POST",
    }),
  );
}

export async function addPostComment(id, content) {
  return normalizePost(
    await request(`/api/posts/${id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    }),
  );
}

export async function updatePostComment(postId, commentId, content) {
  return normalizePost(
    await request(`/api/posts/${postId}/comments/${commentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    }),
  );
}

export async function deletePostComment(postId, commentId) {
  return normalizePost(
    await request(`/api/posts/${postId}/comments/${commentId}`, {
      method: "DELETE",
    }),
  );
}

export async function deletePost(id) {
  return request(`/api/posts/${id}`, {
    method: "DELETE",
  });
}

function normalizePosts(posts) {
  return Array.isArray(posts) ? posts.map(normalizePost).filter(Boolean) : [];
}

function normalizePost(post) {
  if (!post) return null;

  const imageUrls = Array.isArray(post.imageUrls)
    ? post.imageUrls.map(normalizeImageUrl).filter(Boolean)
    : [];
  const imageUrl = normalizeImageUrl(post.imageUrl || imageUrls[0]);

  return {
    ...post,
    categoryTag: post.categoryTag || "여행",
    ownerProfileImageUrl: normalizeImageUrl(post.ownerProfileImageUrl),
    imageUrl,
    imageUrls: imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [],
    comments: Array.isArray(post.comments) ? post.comments : [],
    locations: normalizeLocations(post),
  };
}

function normalizeLocations(post) {
  if (Array.isArray(post.locations) && post.locations.length > 0) {
    return post.locations.filter(
      (location) =>
        Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude),
    );
  }

  if (Number.isFinite(post.latitude) && Number.isFinite(post.longitude)) {
    return [
      {
        id: null,
        locationName: post.locationName || "Place",
        latitude: post.latitude,
        longitude: post.longitude,
      },
    ];
  }

  return [];
}
