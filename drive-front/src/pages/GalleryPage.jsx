import { useEffect, useMemo, useState } from "react";
import {
  fetchProfile,
  fetchUserProfile,
  updateProfile,
} from "../api/profileApi";
import {
  addPostComment,
  createPost,
  deletePost,
  deletePostComment,
  fetchAdminPosts,
  fetchFeed,
  fetchMyPosts,
  fetchMyStats,
  fetchUserPosts,
  fetchUserStats,
  togglePostLike,
  updatePost,
  updatePostComment,
} from "../api/postApi";
import AuthImage from "../components/AuthImage";
import Map from "../components/map.jsx";

const TABS = {
  feed: "feed",
  me: "me",
  admin: "admin",
};

const DEFAULT_CATEGORIES = ["\uC5EC\uD589", "\uC2DD\uC0AC", "\uCE74\uD398"];
const MAX_POST_IMAGES = 10;

export default function GalleryPage({
  username,
  role,
  onLogout,
  onLoginClick,
}) {
  const [tab, setTab] = useState(TABS.feed);
  const [posts, setPosts] = useState([]);
  const [profile, setProfile] = useState({
    username: username || "Guest",
    bio: "",
    profileImageUrl: "",
  });
  const [profileUsername, setProfileUsername] = useState(username || "");
  const [myStats, setMyStats] = useState({ postCount: 0, totalViewCount: 0 });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoggedIn = Boolean(username);
  const isAdmin = isLoggedIn && role === "ADMIN";
  const title = useMemo(() => {
    if (tab === TABS.me)
      return profileUsername === username ? "My Page" : `${profileUsername}`;
    if (tab === TABS.admin) return "Admin Mode";
    return "Travel Feed";
  }, [profileUsername, tab, username]);

  const categories = useMemo(() => {
    const merged = new Set(DEFAULT_CATEGORIES);
    posts.forEach((post) => {
      splitTags(post.categoryTag).forEach((tag) => merged.add(tag));
    });
    return ["All", ...merged];
  }, [posts]);

  const extraCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category !== "All" && !DEFAULT_CATEGORIES.includes(category),
      ),
    [categories],
  );

  const filteredExtraCategories = useMemo(() => {
    const keyword = categorySearch.trim().toLowerCase();
    if (!keyword) return extraCategories;

    return extraCategories.filter((category) =>
      category.toLowerCase().includes(keyword),
    );
  }, [categorySearch, extraCategories]);

  const visiblePosts = useMemo(() => {
    if (categoryFilter === "All") return posts;
    return posts.filter((post) =>
      splitTags(post.categoryTag).includes(categoryFilter),
    );
  }, [categoryFilter, posts]);

  function selectFeedCategory(category) {
    setTab(TABS.feed);
    setCategoryFilter(category);
    setCategoryDropdownOpen(false);
    setCategorySearch("");
    setSidebarOpen(false);
    load(TABS.feed);
  }

  function requireLogin() {
    setStatus("로그인이 필요한 기능입니다. 먼저 로그인해주세요.");
    setComposerOpen(false);
    onLoginClick?.();
  }

  function openComposer() {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
  }

  async function load(nextTab = tab) {
    try {
      setLoading(true);
      setStatus("");

      if (nextTab === TABS.me) {
        if (!isLoggedIn) {
          requireLogin();
          return;
        }

        const targetUsername = profileUsername || username;
        const ownProfile = isLoggedIn && targetUsername === username;
        const [profilePosts, stats, nextProfile] = await Promise.all([
          ownProfile ? fetchMyPosts() : fetchUserPosts(targetUsername),
          ownProfile ? fetchMyStats() : fetchUserStats(targetUsername),
          ownProfile ? fetchProfile() : fetchUserProfile(targetUsername),
        ]);
        setPosts(profilePosts);
        setMyStats(stats || { postCount: 0, totalViewCount: 0 });
        setProfile(nextProfile || { username, bio: "", profileImageUrl: "" });
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
    if (nextTab === TABS.me) {
      if (!isLoggedIn) {
        requireLogin();
        return;
      }

      openUserProfile(username);
      return;
    }

    setTab(nextTab);
    setComposerOpen(false);
    setCategoryFilter("All");
    setCategoryDropdownOpen(false);
    setCategorySearch("");
    setSidebarOpen(false);
    load(nextTab);
  }

  async function openUserProfile(targetUsername) {
    if (!targetUsername) return;

    try {
      setTab(TABS.me);
      setProfileUsername(targetUsername);
      setCategoryFilter("All");
      setSidebarOpen(false);
      setLoading(true);
      setStatus("");
      const ownProfile = isLoggedIn && targetUsername === username;
      const [profilePosts, stats, nextProfile] = await Promise.all([
        ownProfile ? fetchMyPosts() : fetchUserPosts(targetUsername),
        ownProfile ? fetchMyStats() : fetchUserStats(targetUsername),
        ownProfile ? fetchProfile() : fetchUserProfile(targetUsername),
      ]);
      setPosts(profilePosts);
      setMyStats(stats || { postCount: 0, totalViewCount: 0 });
      setProfile(
        nextProfile || {
          username: targetUsername,
          bio: "",
          profileImageUrl: "",
        },
      );
    } catch (error) {
      setStatus(error.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost(form) {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    try {
      setStatus("");
      await createPost(form);
      setComposerOpen(false);
      await load(tab);
    } catch (error) {
      setStatus(error.message || "Failed to create post.");
    }
  }

  async function handleUpdatePost(postId, form) {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    try {
      replacePost(await updatePost(postId, form));
    } catch (error) {
      setStatus(error.message || "Failed to update post.");
    }
  }

  async function handleUpdateProfile(form) {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    try {
      setProfile(await updateProfile(form));
      await load(TABS.me);
    } catch (error) {
      setStatus(error.message || "Failed to update profile.");
    }
  }

  async function handleLike(postId) {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    try {
      replacePost(await togglePostLike(postId));
    } catch (error) {
      setStatus(error.message || "Failed to update like.");
    }
  }

  async function handleComment(postId, content) {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    try {
      replacePost(await addPostComment(postId, content));
    } catch (error) {
      setStatus(error.message || "Failed to add comment.");
    }
  }

  async function handleUpdateComment(postId, commentId, content) {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    try {
      replacePost(await updatePostComment(postId, commentId, content));
    } catch (error) {
      setStatus(error.message || "Failed to update comment.");
    }
  }

  async function handleDeleteComment(postId, commentId) {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    if (!window.confirm("Delete this comment?")) return;

    try {
      replacePost(await deletePostComment(postId, commentId));
    } catch (error) {
      setStatus(error.message || "Failed to delete comment.");
    }
  }

  async function handleDelete(postId) {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

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
    setPosts((current) =>
      current.map((post) => (post.id === updated.id ? updated : post)),
    );
  }

  function handleLogoutClick() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    onLogout?.();
  }

  useEffect(() => {
    setProfileUsername(username || "");
    setTab(TABS.feed);
    setCategoryFilter("All");
    load(TABS.feed);

    if (isLoggedIn) {
      fetchProfile()
        .then((nextProfile) => {
          if (nextProfile) setProfile(nextProfile);
        })
        .catch(() => {});
    } else {
      setProfile({ username: "Guest", bio: "", profileImageUrl: "" });
    }
  }, [username]);

  useEffect(() => {
    if (!composerOpen) return;

    window.history.pushState({ travelComposerOpen: true }, "");
    function handlePopState() {
      setComposerOpen(false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [composerOpen]);

  return (
    <div className="travel-app">
      {sidebarOpen && (
        <button
          className="travel-sidebar-scrim"
          type="button"
          aria-label="close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={sidebarOpen ? "travel-sidebar open" : "travel-sidebar"}>
        <div className="travel-brand">
          <span>T</span>
          <div>
            <strong>Travelog</strong>
            <small>{username || "Guest"}</small>
          </div>
        </div>

        <nav className="travel-nav" aria-label="main navigation">
          <button
            className={
              tab === TABS.feed && categoryFilter === "All" ? "active" : ""
            }
            type="button"
            onClick={() => changeTab(TABS.feed)}
          >
            Home
          </button>

          <div className="travel-sidebar-categories">
            <span>Categories</span>
            {DEFAULT_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={
                  tab === TABS.feed && categoryFilter === category
                    ? "active"
                    : ""
                }
                onClick={() => selectFeedCategory(category)}
              >
                #{category}
              </button>
            ))}

            {extraCategories.length > 0 && (
              <div className="travel-category-dropdown">
                <button
                  type="button"
                  className={
                    categoryDropdownOpen ||
                    (tab === TABS.feed &&
                      extraCategories.includes(categoryFilter))
                      ? "active"
                      : ""
                  }
                  onClick={() => setCategoryDropdownOpen((current) => !current)}
                  aria-expanded={categoryDropdownOpen}
                >
                  More tags
                </button>
                {categoryDropdownOpen && (
                  <div className="travel-category-dropdown-panel">
                    <input
                      type="search"
                      value={categorySearch}
                      onChange={(event) =>
                        setCategorySearch(event.target.value)
                      }
                      placeholder="태그 검색"
                      autoFocus
                    />
                    <div className="travel-category-dropdown-list">
                      {filteredExtraCategories.length > 0 ? (
                        filteredExtraCategories.map((category) => (
                          <button
                            key={category}
                            type="button"
                            className={
                              tab === TABS.feed && categoryFilter === category
                                ? "active"
                                : ""
                            }
                            onClick={() => selectFeedCategory(category)}
                          >
                            #{category}
                          </button>
                        ))
                      ) : (
                        <p>No tags found.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {isLoggedIn && (
            <button
              className={tab === TABS.me ? "active" : ""}
              type="button"
              onClick={() => changeTab(TABS.me)}
            >
              My Page
            </button>
          )}
          {isAdmin && (
            <button
              className={tab === TABS.admin ? "active" : ""}
              type="button"
              onClick={() => changeTab(TABS.admin)}
            >
              Admin
            </button>
          )}
        </nav>

        <button
          className="travel-primary-btn"
          type="button"
          onClick={openComposer}
        >
          New Post
        </button>
        {isLoggedIn ? (
          <button
            className="travel-logout-btn"
            type="button"
            onClick={handleLogoutClick}
          >
            Log out
          </button>
        ) : (
          <button
            className="travel-logout-btn"
            type="button"
            onClick={onLoginClick}
          >
            Log in
          </button>
        )}
      </aside>

      <main className="travel-main">
        <header className="travel-topbar">
          <div>
            <h1>{title}</h1>
            <p>Share travel photos, places, and moments.</p>
          </div>
          <div className="travel-topbar-actions">
            <button type="button" onClick={openComposer}>
              Create
            </button>
            <button
              className="travel-mobile-menu-btn"
              type="button"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
          </div>
        </header>

        {tab === TABS.me && (
          <ProfileCard
            key={`${profile?.username || ""}-${profile?.bio || ""}-${profile?.profileImageUrl || ""}`}
            profile={profile}
            stats={myStats}
            onSubmit={handleUpdateProfile}
            editable={isLoggedIn && profile.username === username}
          />
        )}

        {tab === TABS.me && <Map posts={posts} />}

        {status && <div className="travel-status">{status}</div>}
        {loading && <div className="travel-status">Loading...</div>}

        <section className="travel-feed">
          {!loading && visiblePosts.length === 0 && (
            <div className="travel-empty">No posts yet.</div>
          )}

          {visiblePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUsername={username || "Guest"}
              isLoggedIn={isLoggedIn}
              adminMode={tab === TABS.admin}
              canEdit={isLoggedIn && post.ownerId === username}
              canDelete={isAdmin || (isLoggedIn && post.ownerId === username)}
              onLike={handleLike}
              onComment={handleComment}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
              onDelete={handleDelete}
              onUpdate={handleUpdatePost}
              onOpenProfile={openUserProfile}
            />
          ))}
        </section>
      </main>

      {composerOpen && (
        <PostComposer onClose={closeComposer} onSubmit={handleCreatePost} />
      )}

      <button
        className="travel-mobile-create-btn"
        type="button"
        onClick={openComposer}
        aria-label="create post"
      >
        +
      </button>
    </div>
  );
}

function ProfileCard({ profile, stats, onSubmit, editable }) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile?.bio || "");
  const [profileImage, setProfileImage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({ bio, profileImage });
    setEditing(false);
  }

  return (
    <section className="travel-profile-card">
      <div className="travel-profile-photo">
        {profile?.profileImageUrl ? (
          <AuthImage src={profile.profileImageUrl} alt="profile" />
        ) : (
          <span>{(profile?.username || "T").slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className="travel-profile-main">
        <div className="travel-profile-head">
          <h2>{profile?.username}</h2>
          {editable && (
            <button type="button" onClick={() => setEditing((value) => !value)}>
              Edit Profile
            </button>
          )}
        </div>
        <div className="travel-profile-stats">
          <span>
            <strong>{stats.postCount || 0}</strong> posts
          </span>
          <span>
            <strong>{stats.totalViewCount || 0}</strong> views
          </span>
        </div>
        <p>{profile?.bio || "No profile text yet."}</p>

        {editing && (
          <form className="travel-profile-form" onSubmit={handleSubmit}>
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setProfileImage(event.target.files?.[0] || null)
              }
            />
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
              placeholder="Profile text"
            />
            <div>
              <button type="submit">Save</button>
              <button type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function PostCard({
  post,
  currentUsername,
  isLoggedIn,
  adminMode,
  canEdit,
  canDelete,
  onLike,
  onComment,
  onUpdateComment,
  onDeleteComment,
  onDelete,
  onUpdate,
  onOpenProfile,
}) {
  const [comment, setComment] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  async function submitComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    await onComment(post.id, comment.trim());
    setComment("");
    setCommentsOpen(true);
  }

  async function handleEditSubmit(form) {
    await onUpdate(post.id, form);
    setEditing(false);
    setMenuOpen(false);
  }

  return (
    <article className="travel-post-card">
      <header className="travel-post-header">
        <button
          className="travel-profile travel-profile-link"
          type="button"
          onClick={() => onOpenProfile(post.ownerId)}
        >
          {post.ownerProfileImageUrl ? (
            <AuthImage
              className="travel-profile-mini-image"
              src={post.ownerProfileImageUrl}
              alt={`${post.ownerId} profile`}
            />
          ) : (
            <span>{post.ownerId.slice(0, 1).toUpperCase()}</span>
          )}
          <div>
            <strong>{post.ownerId}</strong>
            {post.locationName && <small>{post.locationName}</small>}
          </div>
        </button>
        {(canEdit || canDelete || adminMode) && (
          <div className="travel-post-menu">
            <button
              type="button"
              className="travel-menu-btn"
              onClick={() => setMenuOpen((value) => !value)}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="travel-menu-dropdown">
                {canEdit && (
                  <button type="button" onClick={() => setEditing(true)}>
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onDelete(post.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      <PostImageCarousel post={post} />

      <div className="travel-post-body">
        <div className="travel-actions">
          <div className="travel-action-left">
            <button
              className={
                post.likedByMe ? "travel-icon-btn liked" : "travel-icon-btn"
              }
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
              C
            </button>
            <span className="travel-action-count">{post.comments.length}</span>
          </div>
          <span>Views {post.viewCount}</span>
        </div>

        <div className="travel-tag-row">
          {splitTags(post.categoryTag).map((tag) => (
            <span className="travel-category-chip" key={tag}>
              #{tag}
            </span>
          ))}
        </div>

        {post.caption && (
          <p className="travel-caption">
            <strong>{post.ownerId}</strong> {post.caption}
          </p>
        )}

        {editing && (
          <PostEditForm
            post={post}
            onCancel={() => setEditing(false)}
            onSubmit={handleEditSubmit}
          />
        )}

        {commentsOpen && (
          <div className="travel-comment-panel">
            <div className="travel-comments">
              {post.comments.length === 0 ? (
                <p className="travel-muted">No comments yet.</p>
              ) : (
                post.comments.map((item) => (
                  <CommentItem
                    key={item.id}
                    comment={item}
                    canManage={isLoggedIn && item.ownerId === currentUsername}
                    onUpdate={(content) =>
                      onUpdateComment(post.id, item.id, content)
                    }
                    onDelete={() => onDeleteComment(post.id, item.id)}
                  />
                ))
              )}
            </div>

            <form className="travel-comment-form" onSubmit={submitComment}>
              <input
                type="text"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={
                  isLoggedIn
                    ? `${currentUsername}, add a comment`
                    : "로그인 후 댓글을 작성할 수 있습니다."
                }
                disabled={!isLoggedIn}
              />
              <button type="submit" disabled={!isLoggedIn}>
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

function PostImageCarousel({ post }) {
  const images =
    Array.isArray(post.imageUrls) && post.imageUrls.length > 0
      ? post.imageUrls
      : post.imageUrl
        ? [post.imageUrl]
        : [];
  const hasMapSlide =
    Array.isArray(post.locations) && post.locations.length > 0;
  const total = images.length + (hasMapSlide ? 1 : 0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentIndex = Math.min(selectedIndex, Math.max(total - 1, 0));

  if (total === 0) return null;

  function showPrevious() {
    setSelectedIndex((index) => (index === 0 ? total - 1 : index - 1));
  }

  function showNext() {
    setSelectedIndex((index) => (index + 1) % total);
  }

  return (
    <div className="travel-post-image-wrap">
      {currentIndex < images.length ? (
        <AuthImage
          className="travel-post-image"
          src={images[currentIndex]}
          alt={`travel post ${currentIndex + 1}`}
        />
      ) : (
        <div className="travel-post-map-slide">
          <Map posts={[post]} title="Marked Map" />
        </div>
      )}

      {total > 1 && (
        <>
          <button
            className="travel-image-nav prev"
            type="button"
            onClick={showPrevious}
            aria-label="previous image"
          >
            <span aria-hidden="true">&lt;</span>
          </button>
          <button
            className="travel-image-nav next"
            type="button"
            onClick={showNext}
            aria-label="next image"
          >
            <span aria-hidden="true">&gt;</span>
          </button>
          <span className="travel-image-count">
            {currentIndex + 1} / {total}
          </span>
          <div className="travel-image-dots" aria-label="post images">
            {Array.from({ length: total }).map((_, index) => (
              <button
                key={`${post.id}-slide-${index}`}
                className={index === currentIndex ? "active" : ""}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={
                  hasMapSlide && index === images.length
                    ? "show post map"
                    : `show image ${index + 1}`
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CommentItem({ comment, canManage, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content || "");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!content.trim()) return;
    await onUpdate(content.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <form className="travel-comment-edit-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          autoFocus
        />
        <button type="submit">Save</button>
        <button
          type="button"
          onClick={() => {
            setContent(comment.content || "");
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="travel-comment-item">
      <p>
        <strong>{comment.ownerId}</strong> {comment.content}
      </p>
      {canManage && (
        <div className="travel-comment-actions">
          <button type="button" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" className="danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function PostEditForm({ post, onCancel, onSubmit }) {
  const [caption, setCaption] = useState(post.caption || "");
  const [locations, setLocations] = useState(() =>
    Array.isArray(post.locations) ? post.locations : [],
  );
  const [categoryTag, setCategoryTag] = useState(
    post.categoryTag || DEFAULT_CATEGORIES[0],
  );

  function handleSubmit(event) {
    event.preventDefault();
    const primaryLocation = locations[0] || null;
    onSubmit({
      caption,
      locationName: primaryLocation?.locationName || "",
      latitude: primaryLocation?.latitude,
      longitude: primaryLocation?.longitude,
      locations,
      categoryTag,
    });
  }

  function handleLocationSelect(nextLocation) {
    setLocations((current) => [...current, nextLocation]);
  }

  function handleLocationRemove(index) {
    setLocations((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function handleLocationRename(index, nextName) {
    setLocations((current) =>
      current.map((location, itemIndex) =>
        itemIndex === index
          ? { ...location, locationName: nextName }
          : location,
      ),
    );
  }

  function handleLocationReorder(fromIndex, toIndex) {
    setLocations((current) => reorderItems(current, fromIndex, toIndex));
  }

  return (
    <form className="travel-edit-form" onSubmit={handleSubmit}>
      <CategoryTagInput value={categoryTag} onChange={setCategoryTag} />
      <Map
        selectable
        selectedLocations={locations}
        onLocationSelect={handleLocationSelect}
        onLocationRemove={handleLocationRemove}
        onLocationRename={handleLocationRename}
        onLocationReorder={handleLocationReorder}
      />
      <textarea
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        rows={3}
        placeholder="Caption"
      />
      <div>
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function PostComposer({ onClose, onSubmit }) {
  const [images, setImages] = useState([]);
  const [caption, setCaption] = useState("");
  const [locations, setLocations] = useState([]);
  const [categoryTag, setCategoryTag] = useState(DEFAULT_CATEGORIES[0]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [imageNotice, setImageNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function revokePreviewUrls(urls) {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }

  function handleImageChange(event) {
    const selectedFiles = Array.from(event.target.files || []);
    const nextImages = selectedFiles.slice(0, MAX_POST_IMAGES);

    setImageNotice(
      selectedFiles.length > MAX_POST_IMAGES
        ? `사진은 최대 ${MAX_POST_IMAGES}장까지 업로드할 수 있어요.`
        : "",
    );
    setImages(nextImages);
    setPreviewUrls((currentUrls) => {
      revokePreviewUrls(currentUrls);
      return nextImages.map((file) => URL.createObjectURL(file));
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    if (images.length === 0) {
      setImageNotice("사진을 1장 이상 선택해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      const primaryLocation = locations[0] || null;
      await onSubmit({
        images,
        caption,
        locationName: primaryLocation?.locationName || "",
        latitude: primaryLocation?.latitude,
        longitude: primaryLocation?.longitude,
        locations,
        categoryTag,
      });
    } finally {
      setSubmitting(false);
      revokePreviewUrls(previewUrls);
    }
  }

  useEffect(() => {
    return () => {
      revokePreviewUrls(previewUrls);
    };
  }, [previewUrls]);

  function handleLocationSelect(nextLocation) {
    setLocations((current) => [...current, nextLocation]);
  }

  function handleLocationRemove(index) {
    setLocations((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function handleLocationRename(index, nextName) {
    setLocations((current) =>
      current.map((location, itemIndex) =>
        itemIndex === index
          ? { ...location, locationName: nextName }
          : location,
      ),
    );
  }

  function handleLocationReorder(fromIndex, toIndex) {
    setLocations((current) => reorderItems(current, fromIndex, toIndex));
  }

  return (
    <div className="travel-modal-backdrop" onClick={onClose}>
      <form
        className="travel-composer"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="travel-composer-top">
          <h2>New Travel Post</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
        />
        <small className="travel-file-hint">
          사진은 최대 {MAX_POST_IMAGES}장까지 선택할 수 있어요.
        </small>
        {imageNotice && <p className="travel-file-notice">{imageNotice}</p>}
        {previewUrls.length > 0 && (
          <div className="travel-preview-grid">
            {previewUrls.map((url, index) => (
              <div className="travel-preview-item" key={url}>
                <img src={url} alt={`preview ${index + 1}`} />
                <span>{index + 1}</span>
              </div>
            ))}
          </div>
        )}

        <CategoryTagInput value={categoryTag} onChange={setCategoryTag} />
        <Map
          selectable
          selectedLocations={locations}
          onLocationSelect={handleLocationSelect}
          onLocationRemove={handleLocationRemove}
          onLocationRename={handleLocationRename}
          onLocationReorder={handleLocationReorder}
        />
        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Write your travel story."
          rows={4}
        />
        <button type="submit" disabled={images.length === 0 || submitting}>
          {submitting ? "Posting..." : "Share"}
        </button>
      </form>
    </div>
  );
}

function CategoryTagInput({ value, onChange }) {
  return (
    <label className="travel-category-select">
      <span>Category tags</span>
      <input
        list="travel-category-tags"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="여행 식사 카페"
      />
      <datalist id="travel-category-tags">
        {DEFAULT_CATEGORIES.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <small>Separate tags with spaces or commas.</small>
    </label>
  );
}

function reorderItems(items, fromIndex, toIndex) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function splitTags(value) {
  if (!value) return [DEFAULT_CATEGORIES[0]];
  const tags = String(value)
    .split(/[,#\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length ? tags : [DEFAULT_CATEGORIES[0]];
}
