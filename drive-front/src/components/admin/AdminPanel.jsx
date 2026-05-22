import { useEffect, useMemo, useState } from "react";
import { deleteAdminFolder, deleteAdminPhoto, fetchAdminFolders, fetchAdminPhotos } from "../../api/photoApi";
import AuthImage from "../AuthImage";
import AdminFolderList from "./AdminFolderList";

const TEXT = {
  account: "\uACC4\uC815",
  backToFolders: "\uD3F4\uB354 \uBAA9\uB85D",
  delete: "\uC0AD\uC81C",
  deleteConfirm: "\uD3F4\uB354\uC640 \uD3F4\uB354 \uC548\uC758 \uC0AC\uC9C4\uC744 \uBAA8\uB450 \uC0AD\uC81C\uD560\uAE4C\uC694?",
  empty: "\uD3F4\uB354\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
  emptyPhotos: "\uC0AC\uC9C4\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  loadError: "\uD3F4\uB354 \uC870\uD68C \uC624\uB958",
  photoLoadError: "\uC0AC\uC9C4 \uC870\uD68C \uC624\uB958",
  title: "\uAD00\uB9AC\uC790 \uD3F4\uB354 \uAD00\uB9AC",
};

export default function AdminPanel({ username, onNotice }) {
  const [folders, setFolders] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [status, setStatus] = useState("");

  const groupedFolders = useMemo(() => {
    return folders.reduce((groups, folder) => {
      const ownerId = folder.ownerId || "\uC18C\uC720\uC790 \uC5C6\uC74C";
      if (!groups[ownerId]) groups[ownerId] = [];
      groups[ownerId].push(folder);
      return groups;
    }, {});
  }, [folders]);

  async function loadFolders() {
    try {
      setStatus("");
      const result = await fetchAdminFolders();
      setFolders(result);
    } catch (error) {
      setStatus(`${TEXT.loadError}: ${error.message}`);
    }
  }

  async function handleDeleteFolder(folder) {
    if (!window.confirm(`'${folder.ownerId}/${folder.folderPath}' ${TEXT.deleteConfirm}`)) return;

    try {
      await deleteAdminFolder(folder.ownerId, folder.folderPath);
      onNotice(`'${folder.ownerId}/${folder.folderPath}' \uD3F4\uB354\uB97C \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.`);
      await loadFolders();
    } catch (error) {
      onNotice(`\uD3F4\uB354 \uC0AD\uC81C \uC2E4\uD328: ${error.message}`, "error");
    }
  }

  async function handleOpenFolder(folder) {
    try {
      setStatus("");
      setSelectedFolder(folder);
      const result = await fetchAdminPhotos();
      setPhotos(result.filter((photo) => (
        photo.ownerId === folder.ownerId && photo.folderPath === folder.folderPath
      )));
    } catch (error) {
      setPhotos([]);
      setStatus(`${TEXT.photoLoadError}: ${error.message}`);
    }
  }

  async function handleDeletePhoto(id) {
    try {
      await deleteAdminPhoto(id);
      onNotice("\uC0AC\uC9C4\uC744 \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.");
      const result = await fetchAdminPhotos();
      const nextPhotos = selectedFolder
        ? result.filter((photo) => (
            photo.ownerId === selectedFolder.ownerId && photo.folderPath === selectedFolder.folderPath
          ))
        : [];
      setPhotos(nextPhotos);
      await loadFolders();
    } catch (error) {
      onNotice(`\uC0AC\uC9C4 \uC0AD\uC81C \uC2E4\uD328: ${error.message}`, "error");
    }
  }

  function closeFolder() {
    setSelectedFolder(null);
    setPhotos([]);
    setStatus("");
  }

  useEffect(() => {
    let cancelled = false;

    async function syncFolders() {
      try {
        setStatus("");
        const result = await fetchAdminFolders();
        if (!cancelled) {
          setFolders(result);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(`${TEXT.loadError}: ${error.message}`);
        }
      }
    }

    syncFolders();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>{TEXT.title}</h2>
          <p>{TEXT.account}: {username}</p>
        </div>
      </div>

      {status && <div className="status-box">{status}</div>}

      {selectedFolder ? (
        <AdminPhotoFolderView
          labels={TEXT}
          folder={selectedFolder}
          photos={photos}
          onBack={closeFolder}
          onDeletePhoto={handleDeletePhoto}
        />
      ) : (
        <AdminFolderList
          labels={TEXT}
          folders={folders}
          groupedFolders={groupedFolders}
          status={status}
          onDeleteFolder={handleDeleteFolder}
          onOpenFolder={handleOpenFolder}
        />
      )}

    </div>
  );
}

function AdminPhotoFolderView({ labels, folder, photos, onBack, onDeletePhoto }) {
  return (
    <div className="admin-photo-folder-view">
      <div className="admin-photo-folder-header">
        <button type="button" className="back-btn" onClick={onBack}>
          {labels.backToFolders}
        </button>
        <div>
          <span>{folder.ownerId}</span>
          <h3>{folder.folderPath}</h3>
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="admin-empty">{labels.emptyPhotos}</p>
      ) : (
        <div className="admin-photo-grid">
          {photos.map((photo, index) => (
            <div className="admin-photo-card" key={photo.id}>
              <AuthImage
                className="admin-photo-image"
                src={photo.thumbnailUrl || photo.imageUrl}
                alt={photo.originalName}
              />
              <span>{photo.originalName}</span>
              <button type="button" className="delete-btn" onClick={() => onDeletePhoto(photo.id)}>
                {labels.delete}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
