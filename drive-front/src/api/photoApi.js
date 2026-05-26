const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const DEFAULT_FOLDER = "\uAE30\uBCF8";

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

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    clearSavedLogin();
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

export async function fetchPhotos(folderPath = DEFAULT_FOLDER) {
  const params = new URLSearchParams();
  if (folderPath) {
    params.set("folderPath", folderPath);
  }

  const result = await request(`/api/photos?${params.toString()}`, {
    method: "GET",
  });

  return Array.isArray(result) ? result.map(normalizePhoto) : [];
}

export async function fetchAdminPhotos() {
  const result = await request("/api/admin/photos", {
    method: "GET",
  });

  return Array.isArray(result) ? result.map(normalizePhoto) : [];
}

export async function fetchAdminFolders() {
  const result = await request("/api/admin/photos/folders", {
    method: "GET",
  });

  return normalizeFolders(result);
}

export async function fetchFolders() {
  const result = await request("/api/photos/folders", {
    method: "GET",
  });

  return normalizeFolders(result);
}

export async function fetchStorageStatus() {
  return request("/api/photos/storage", {
    method: "GET",
  });
}

export async function createFolder(folderPath) {
  return request("/api/photos/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folderPath }),
  });
}

export async function deleteFolder(folderPath) {
  return request("/api/photos/folders", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folderPath }),
  });
}

export async function renameFolder(currentFolderPath, nextFolderPath) {
  return request("/api/photos/folders/rename", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ currentFolderPath, nextFolderPath }),
  });
}

export async function updateFolderOrder(folderPaths) {
  const result = await request("/api/photos/folders/order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folderPaths }),
  });

  return normalizeFolders(result);
}

export async function createFolderShareLink(folderPath) {
  return request("/api/photos/folders/share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folderPath }),
  });
}

export async function downloadFolderZip(folderPath) {
  const token = getToken();
  const params = new URLSearchParams();
  if (folderPath) {
    params.set("folderPath", folderPath);
  }

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/photos/folders/download?${params.toString()}`,
    {
      method: "GET",
      headers,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const filename =
    getDownloadFilename(response.headers.get("content-disposition")) ||
    `${folderPath || DEFAULT_FOLDER}.zip`;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function uploadPhotos(folderPath, files, tags = "") {
  const formData = new FormData();

  files.forEach((file) => formData.append("files", file));

  if (folderPath) {
    formData.append("folderPath", folderPath);
  }

  if (tags.trim()) {
    formData.append("tags", tags.trim());
  }

  const result = await request("/api/photos/upload", {
    method: "POST",
    body: formData,
  });

  if (result?.items) {
    result.items = result.items.map(normalizePhoto);
  }

  return result;
}

export async function deletePhoto(id) {
  return request(`/api/photos/${id}`, {
    method: "DELETE",
  });
}

export async function fetchTrashPhotos() {
  const result = await request("/api/photos/trash", {
    method: "GET",
  });

  return Array.isArray(result) ? result.map(normalizePhoto) : [];
}

export async function restoreTrashPhoto(id) {
  return request(`/api/photos/trash/${id}/restore`, {
    method: "POST",
  });
}

export async function deleteTrashPhoto(id) {
  return request(`/api/photos/trash/${id}`, {
    method: "DELETE",
  });
}

export async function emptyTrashPhotos() {
  return request("/api/photos/trash", {
    method: "DELETE",
  });
}

export async function addPhotoTags(photoIds, tags) {
  const result = await request("/api/photos/tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ photoIds, tags }),
  });

  return Array.isArray(result) ? result.map(normalizePhoto) : [];
}

export async function removePhotoTags(photoIds, tags) {
  const result = await request("/api/photos/tags/remove", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ photoIds, tags }),
  });

  return Array.isArray(result) ? result.map(normalizePhoto) : [];
}

export async function deleteDuplicatePhotos() {
  return request("/api/photos/duplicates/delete", {
    method: "POST",
  });
}

export async function fetchDuplicatePhotos() {
  const result = await request("/api/photos/duplicates", {
    method: "GET",
  });

  return Array.isArray(result)
    ? result.map((group) => ({
        keepPhoto: normalizePhoto(group.keepPhoto),
        duplicatePhotos: Array.isArray(group.duplicatePhotos)
          ? group.duplicatePhotos.map(normalizePhoto)
          : [],
      }))
    : [];
}

export async function deleteAdminPhoto(id) {
  return request(`/api/admin/photos/${id}`, {
    method: "DELETE",
  });
}

export async function deleteAdminFolder(ownerId, folderPath) {
  return request("/api/admin/photos/folders", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ownerId, folderPath }),
  });
}

function normalizeFolders(result) {
  return Array.isArray(result)
    ? result.map((folder, index) => {
        if (typeof folder === "string") {
          return {
            ownerId: "",
            folderPath: folder,
            updatedAt: null,
            sortOrder: index,
            photoCount: 0,
            tags: [],
            previewImageUrls: [],
          };
        }

        return {
          ownerId: folder.ownerId || "",
          folderPath: folder.folderPath || DEFAULT_FOLDER,
          updatedAt: folder.updatedAt || null,
          sortOrder: folder.sortOrder ?? index,
          photoCount: folder.photoCount ?? 0,
          totalSize: folder.totalSize ?? 0,
          latestPhotoAt: folder.latestPhotoAt || null,
          tags: Array.isArray(folder.tags) ? folder.tags : [],
          previewImageUrls: Array.isArray(folder.previewImageUrls)
            ? folder.previewImageUrls.map(normalizeImageUrl)
            : [],
        };
      })
    : [];
}

function normalizePhoto(photo) {
  return photo
    ? {
        ...photo,
        imageUrl: normalizeImageUrl(photo.imageUrl),
        thumbnailUrl: normalizeImageUrl(photo.thumbnailUrl),
      }
    : null;
}

function getDownloadFilename(contentDisposition) {
  if (!contentDisposition) return "";

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1]);
  }

  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  return filenameMatch ? filenameMatch[1] : "";
}
