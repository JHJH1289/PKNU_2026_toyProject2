import { useEffect, useMemo, useState } from "react";
import { addPostComment, createPost, deletePost, fetchAdminPosts, fetchFeed, fetchMyPosts, fetchMyStats, togglePostLike } from "../api/postApi";
import AuthImage from "../components/AuthImage";

const TABS = {
  feed: "feed",
  me: "me",
  admin: "admin",
};

export default function GalleryPage({ username, role, onLogout }) {
  const [tab, setTab] = useState(TABS.feed);
  const [posts, setPosts] = useState([]);
  const [myStats, setMyStats] = useState({ postCount: 0, totalViewCount: 0 });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const isAdmin = role === "ADMIN";
  const title = useMemo(() => {
    if (tab === TABS.me) return "My Page";
    if (tab === TABS.admin) return "Admin Mode";
    return "Travel Feed";
  }, [tab]);

  async function load(nextTab = tab) {
    try {
      setLoading(true);
      setStatus("");

      if (nextTab === TABS.me) {
        const [myPosts, stats] = await Promise.all([fetchMyPosts(), fetchMyStats()]);
        setPosts(myPosts);
        setMyStats(stats || { postCount: 0, totalViewCount: 0 });
        return;
      }

      if (nextTab === TABS.admin) {
        setPosts(await fetchAdminPosts());
        return;
      }

      setPosts(await fetchFeed());
    } catch (error) {
      setStatus(error.message || "Failed to load posts.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  function changeTab(nextTab) {
    setTab(nextTab);
    setComposerOpen(false);
    load(nextTab);
  }

  async function handleCreatePost(form) {
    try {
      setStatus("");
      await createPost(form);
      setComposerOpen(false);
      await load(tab);
    } catch (error) {
      setStatus(error.message || "Failed to create post.");
    }
  }

  async function handleLike(postId) {
    try {
      replacePost(await togglePostLike(postId));
    } catch (error) {
      setStatus(error.message || "Failed to update like.");
    }
  }

  async function handleComment(postId, content) {
    try {
      replacePost(await addPostComment(postId, content));
    } catch (error) {
      setStatus(error.message || "Failed to add comment.");
    }
  }

  async function handleDelete(postId) {
    if (!window.confirm("Delete this post?")) return;

    try {
      await deletePost(postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
      if (tab === TABS.me) {
        setMyStats(await fetchMyStats());
      }
    } catch (error) {
      setStatus(error.message || "Failed to delete post.");
    }
  }

  function replacePost(updated) {
    setPosts((current) => current.map((post) => (post.id === updated.id ? updated : post)));
  }

  function handleLogoutClick() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    onLogout();
  }

  useEffect(() => {
    load(TABS.feed);
  }, []);

  return (
    <div className="travel-app">
      <aside className="travel-sidebar">
        <div className="travel-brand">
          <span>T</span>
          <div>
            <strong>Travelog</strong>
            <small>{username}</small>
          </div>
        </div>

        <nav className="travel-nav" aria-label="main navigation">
          <button className={tab === TABS.feed ? "active" : ""} type="button" onClick={() => changeTab(TABS.feed)}>
            Home
          </button>
          <button className={tab === TABS.me ? "active" : ""} type="button" onClick={() => changeTab(TABS.me)}>
            My Page
          </button>
          {isAdmin && (
            <button className={tab === TABS.admin ? "active" : ""} type="button" onClick={() => changeTab(TABS.admin)}>
              Admin
            </button>
          )}
        </nav>

        <button className="travel-primary-btn" type="button" onClick={() => setComposerOpen(true)}>
          New Post
        </button>
        <button className="travel-logout-btn" type="button" onClick={handleLogoutClick}>
          Log out
        </button>
      </aside>

      <main className="travel-main">
        <header className="travel-topbar">
          <div>
            <h1>{title}</h1>
            <p>Share travel photos, places, and moments.</p>
          </div>
          <button type="button" onClick={() => setComposerOpen(true)}>
            Create
          </button>
        </header>

        {tab === TABS.me && (
          <section className="travel-stats">
            <div>
              <span>Posts</span>
              <strong>{myStats.postCount || 0}</strong>
            </div>
            <div>
              <span>Total views</span>
              <strong>{myStats.totalViewCount || 0}</strong>
            </div>
          </section>
        )}

        {status && <div className="travel-status">{status}</div>}
        {loading && <div className="travel-status">Loading...</div>}

        <section className="travel-feed">
          {!loading && posts.length === 0 && (
            <div className="travel-empty">No posts yet.</div>
          )}

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUsername={username}
              adminMode={tab === TABS.admin}
              canDelete={isAdmin || post.ownerId === username}
              onLike={handleLike}
              onComment={handleComment}
              onDelete={handleDelete}
            />
          ))}
        </section>
      </main>

      {composerOpen && (
        <PostComposer
          onClose={() => setComposerOpen(false)}
          onSubmit={handleCreatePost}
        />
      )}
    </div>
  );
}

function PostCard({ post, currentUsername, adminMode, canDelete, onLike, onComment, onDelete }) {
  const [comment, setComment] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);

  async function submitComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    await onComment(post.id, comment.trim());
    setComment("");
    setCommentsOpen(true);
  }

  return (
    <article className="travel-post-card">
      <header className="travel-post-header">
        <div className="travel-profile">
          <span>{post.ownerId.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{post.ownerId}</strong>
            {post.locationName && <small>{post.locationName}</small>}
          </div>
        </div>
        {(canDelete || adminMode) && (
          <button className="travel-danger-btn" type="button" onClick={() => onDelete(post.id)}>
            Delete
          </button>
        )}
      </header>

      <AuthImage className="travel-post-image" src={post.imageUrl} alt="travel post" />

      <div className="travel-post-body">
        <div className="travel-actions">
          <div className="travel-action-left">
            <button
              className={post.likedByMe ? "travel-icon-btn liked" : "travel-icon-btn"}
              type="button"
              onClick={() => onLike(post.id)}
              aria-label="like"
            >
              {post.likedByMe ? "♥" : "♡"}
            </button>
            <span className="travel-action-count">{post.likeCount}</span>
            <button
              className="travel-icon-btn comment"
              type="button"
              onClick={() => setCommentsOpen((value) => !value)}
              aria-label="comments"
            >
              💬
            </button>
            <span className="travel-action-count">{post.comments.length}</span>
          </div>
          <span>Views {post.viewCount}</span>
        </div>

        {post.caption && (
          <p className="travel-caption">
            <strong>{post.ownerId}</strong> {post.caption}
          </p>
        )}

        {commentsOpen && (
          <div className="travel-comment-panel">
            <div className="travel-comments">
              {post.comments.length === 0 ? (
                <p className="travel-muted">No comments yet.</p>
              ) : (
                post.comments.map((item) => (
                  <p key={item.id}>
                    <strong>{item.ownerId}</strong> {item.content}
                  </p>
                ))
              )}
            </div>

            <form className="travel-comment-form" onSubmit={submitComment}>
              <input
                type="text"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={`${currentUsername}, add a comment`}
              />
              <button type="submit">Post</button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

function PostComposer({ onClose, onSubmit }) {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [locationName, setLocationName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleImageChange(event) {
    const file = event.target.files?.[0] || null;
    setImage(file);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return file ? URL.createObjectURL(file) : "";
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!image || submitting) return;

    try {
      setSubmitting(true);
      await onSubmit({ image, caption, locationName });
    } finally {
      setSubmitting(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  }

  return (
    <div className="travel-modal-backdrop" onClick={onClose}>
      <form className="travel-composer" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <div className="travel-composer-top">
          <h2>New Travel Post</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>

        <input type="file" accept="image/*" onChange={handleImageChange} />
        {previewUrl && <img className="travel-preview" src={previewUrl} alt="preview" />}

        <input
          type="text"
          value={locationName}
          onChange={(event) => setLocationName(event.target.value)}
          placeholder="Place, e.g. Jeju Aewol"
        />
        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Write your travel story."
          rows={4}
        />
        <button type="submit" disabled={!image || submitting}>
          {submitting ? "Posting..." : "Share"}
        </button>
      </form>
    </div>
  );
}
