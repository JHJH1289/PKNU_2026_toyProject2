import { useEffect, useMemo, useState } from "react";
import {
  fetchProfile,
  fetchUserProfile,
  updateProfile,
} from "../api/profileApi";
import {
  createTravelPlan,
} from "../api/recommendApi";
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
  suggestPostTags,
  togglePostLike,
  updatePost,
  updatePostComment,
} from "../api/postApi";
import AuthImage from "../components/AuthImage";
import Map from "../components/map.jsx";
import {
  searchGooglePlaces,
  searchRestaurantsNearPlaces,
} from "../utils/googlePlaces";

const TABS = {
  feed: "feed",
  me: "me",
  recommend: "recommend",
  admin: "admin",
};

const DEFAULT_CATEGORIES = ["\uC5EC\uD589", "\uCE74\uD398", "\uC2DD\uC0AC"];
const MAX_POST_IMAGES = 10;
const RECOMMEND_THEMES = [
  "\uBC14\uB2E4",
  "\uC2DC\uC7A5",
  "\uC1FC\uD551",
  "\uB9DB\uC9D1",
  "\uCE74\uD398",
  "\uC5ED\uC0AC",
  "\uC790\uC5F0",
  "\uC0B0\uCC45",
  "\uC57C\uACBD",
  "\uAC00\uC871",
];
const RESTAURANT_CUISINES = [
  "\uC804\uCCB4",
  "\uD55C\uC2DD",
  "\uC911\uC2DD",
  "\uC77C\uC2DD",
  "\uC591\uC2DD",
];
const RESTAURANT_PRICE_FILTERS = [
  "\uC804\uCCB4",
  "10000\uC6D0 \uC774\uC0C1",
  "20000\uC6D0 \uC774\uC0C1",
  "30000\uC6D0 \uC774\uC0C1",
  "50000\uC6D0 \uC774\uC0C1",
];
const RECOMMEND_SORT_OPTIONS = [
  { value: "rating", label: "\uBCC4\uC810\uC21C" },
  { value: "reviews", label: "\uD6C4\uAE30 \uB9CE\uC740 \uC21C" },
];
const RECOMMEND_VISIBLE_STEP = 6;
const RECOMMEND_FETCH_STEP = 20;
const RECOMMEND_MAX_RESULTS = 60;

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
    if (tab === TABS.recommend) return "Travel Planner";
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
    setStatus("Login is required. Please sign in first.");
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
    let cancelled = false;

    setProfileUsername(username || "");
    setTab(TABS.feed);
    setCategoryFilter("All");
    setLoading(true);
    setStatus("");

    fetchFeed()
      .then((feedPosts) => {
        if (!cancelled) setPosts(feedPosts);
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error.message || "Failed to load posts.");
          setPosts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    if (isLoggedIn) {
      fetchProfile()
        .then((nextProfile) => {
          if (!cancelled && nextProfile) setProfile(nextProfile);
        })
        .catch(() => {});
    } else {
      setProfile({ username: "Guest", bio: "", profileImageUrl: "" });
    }

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, username]);

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
                    onChange={(event) => setCategorySearch(event.target.value)}
                    placeholder="Search tags"
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
          {isLoggedIn && (
            <button
              className={tab === TABS.recommend ? "active" : ""}
              type="button"
              onClick={() => changeTab(TABS.recommend)}
            >
              Travel Planner
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
              aria-label="Open menu"
            >
              <MenuIcon />
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

        {tab === TABS.recommend && <RecommendPanel />}

        {tab === TABS.me && (
          <Map
            posts={posts}
            showCategoryLegend
            showMarkerLabels={false}
            showRouteLines={false}
          />
        )}

        {tab !== TABS.recommend && (
          <>
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
                  canDelete={
                    isAdmin || (isLoggedIn && post.ownerId === username)
                  }
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
          </>
        )}
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

function RecommendPanel() {
  const [region, setRegion] = useState("");
  const [themes, setThemes] = useState([]);
  const [cuisine, setCuisine] = useState(RESTAURANT_CUISINES[0]);
  const [priceFilter, setPriceFilter] = useState(RESTAURANT_PRICE_FILTERS[0]);
  const [stops, setStops] = useState([]);
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState("");
  const [loadingPlan, setLoadingPlan] = useState(false);
  const working = loadingPlan || stops.some((stop) => stop.loadingAttractions || stop.loadingRestaurants);
  const selectedPlaces = stops.flatMap((stop) => getStopRoutePlaces(stop));
  const routeLocations = selectedPlaces
    .filter(
      (place) =>
        Number.isFinite(place.latitude) && Number.isFinite(place.longitude),
    )
    .map((place) => ({
      latitude: place.latitude,
      longitude: place.longitude,
      locationName: place.name,
      address: place.address,
      categoryTag: place.kind === "restaurant" ? "맛집" : "관광",
    }));

  function updateStop(stopId, updater) {
    setStops((current) =>
      current.map((stop) =>
        stop.id === stopId
          ? typeof updater === "function"
            ? updater(stop)
            : { ...stop, ...updater }
          : stop,
      ),
    );
  }

  function toggleTheme(theme) {
    setThemes((current) =>
      current.includes(theme)
        ? current.filter((item) => item !== theme)
        : [...current, theme],
    );
  }

  function handleAddStop() {
    setStops((current) => [...current, createPlannerStop(region.trim())]);
    setPlan(null);
  }

  function handleRemoveStop(stopId) {
    setStops((current) =>
      current.length > 1
        ? current.filter((stop) => stop.id !== stopId)
        : current,
    );
    setPlan(null);
  }

  function handleSelectAttraction(stopId, attractionId) {
    updateStop(stopId, (stop) => ({
      ...stop,
      selectedAttractionId:
        stop.selectedAttractionId === attractionId ? "" : attractionId,
      restaurants:
        stop.selectedAttractionId === attractionId ? stop.restaurants : [],
      selectedRestaurantIds:
        stop.selectedAttractionId === attractionId
          ? stop.selectedRestaurantIds
          : [],
      status:
        stop.selectedAttractionId === attractionId
          ? "Select a tourist spot."
          : "Tourist spot added to the route.",
    }));
    setPlan(null);
  }

  function handleToggleRestaurant(stopId, restaurantId) {
    updateStop(stopId, (stop) => ({
      ...stop,
      selectedRestaurantIds: stop.selectedRestaurantIds.includes(restaurantId)
        ? stop.selectedRestaurantIds.filter((id) => id !== restaurantId)
        : [...stop.selectedRestaurantIds, restaurantId],
    }));
    setPlan(null);
  }

  async function handleFindAttractions(event, stopId) {
    event.preventDefault();
    const stop = stops.find((item) => item.id === stopId);
    const query = (stop?.attractionQuery || region).trim();
    if (!stop || !query || stop.loadingAttractions) return;

    try {
      updateStop(stopId, {
        loadingAttractions: true,
        status: "Searching tourist spots.",
      });
      setPlan(null);
      let nextAttractions = await searchGooglePlaces({
        region: query,
        themes,
        keyword: "관광지",
        limit: 20,
      });

      if (nextAttractions.length === 0 && themes.length > 0) {
        nextAttractions = await searchGooglePlaces({
          region: query,
          themes: [],
          keyword: "관광지",
          limit: 20,
        });
      }
      const attractionItems = nextAttractions.map((item) => ({
        ...item,
        kind: "attraction",
        theme: "관광",
      }));

      updateStop(stopId, {
        attractions: attractionItems,
        restaurants: [],
        selectedAttractionId: "",
        selectedRestaurantIds: [],
        attractionVisibleCount: RECOMMEND_VISIBLE_STEP,
        restaurantVisibleCount: RECOMMEND_VISIBLE_STEP,
        status:
          attractionItems.length > 0
            ? "Select one tourist spot to add it to the route."
            : "No tourist spots were found. Try another area.",
      });
    } catch (error) {
      updateStop(stopId, {
        status: error.message || "Failed to find tourist spots.",
      });
    } finally {
      updateStop(stopId, { loadingAttractions: false });
    }
  }

  async function handleFindRestaurants(stopId) {
    const stop = stops.find((item) => item.id === stopId);
    const selectedAttraction = stop?.attractions.find(
      (place) => place.id === stop.selectedAttractionId,
    );
    if (!stop || !selectedAttraction || stop.loadingRestaurants) return;

    try {
      updateStop(stopId, {
        loadingRestaurants: true,
        status: "Searching restaurants before the next stop.",
      });
      const restaurantItems = (
        await searchRestaurantsNearPlaces({
          places: [selectedAttraction],
          region: selectedAttraction.name || region.trim(),
          cuisine,
          priceFilter,
          limit: 20,
        })
      ).map((item) => ({
        ...item,
        kind: "restaurant",
        theme: "맛집",
      }));

      updateStop(stopId, {
        restaurants: restaurantItems,
        selectedRestaurantIds: [],
        restaurantVisibleCount: RECOMMEND_VISIBLE_STEP,
        status:
          restaurantItems.length > 0
            ? "Select restaurants to place them before the next tourist spot."
            : "No restaurants were found nearby.",
      });
    } catch (error) {
      updateStop(stopId, {
        status: error.message || "Failed to find restaurants.",
      });
    } finally {
      updateStop(stopId, { loadingRestaurants: false });
    }
  }

  async function handleViewMoreAttractions(stopId) {
    const stop = stops.find((item) => item.id === stopId);
    if (!stop || stop.loadingAttractions) return;

    if (stop.attractionVisibleCount < stop.attractions.length) {
      updateStop(stopId, (currentStop) => ({
        ...currentStop,
        attractionVisibleCount:
          currentStop.attractionVisibleCount + RECOMMEND_VISIBLE_STEP,
      }));
      return;
    }

    if (stop.attractions.length >= RECOMMEND_MAX_RESULTS) return;

    const query = (stop.attractionQuery || region).trim();
    if (!query) return;

    try {
      updateStop(stopId, {
        loadingAttractions: true,
        status: "Searching more tourist spots.",
      });
      const nextLimit = Math.min(
        stop.attractions.length + RECOMMEND_FETCH_STEP,
        RECOMMEND_MAX_RESULTS,
      );
      let nextAttractions = await searchGooglePlaces({
        region: query,
        themes,
        keyword: "관광지",
        limit: nextLimit,
      });

      if (nextAttractions.length === 0 && themes.length > 0) {
        nextAttractions = await searchGooglePlaces({
          region: query,
          themes: [],
          keyword: "관광지",
          limit: nextLimit,
        });
      }

      const attractionItems = nextAttractions.map((item) => ({
        ...item,
        kind: "attraction",
        theme: "관광",
      }));
      const mergedAttractions = mergePlacesById(
        stop.attractions,
        attractionItems,
      );

      updateStop(stopId, {
        attractions: mergedAttractions,
        attractionVisibleCount:
          stop.attractionVisibleCount + RECOMMEND_VISIBLE_STEP,
        status:
          mergedAttractions.length > stop.attractions.length
            ? "More tourist spots were added."
            : "No more new tourist spots were found.",
      });
    } catch (error) {
      updateStop(stopId, {
        status: error.message || "Failed to find more tourist spots.",
      });
    } finally {
      updateStop(stopId, { loadingAttractions: false });
    }
  }

  async function handleViewMoreRestaurants(stopId) {
    const stop = stops.find((item) => item.id === stopId);
    const selectedAttraction = stop?.attractions.find(
      (place) => place.id === stop.selectedAttractionId,
    );
    if (!stop || !selectedAttraction || stop.loadingRestaurants) return;

    if (stop.restaurantVisibleCount < stop.restaurants.length) {
      updateStop(stopId, (currentStop) => ({
        ...currentStop,
        restaurantVisibleCount:
          currentStop.restaurantVisibleCount + RECOMMEND_VISIBLE_STEP,
      }));
      return;
    }

    if (stop.restaurants.length >= RECOMMEND_MAX_RESULTS) return;

    try {
      updateStop(stopId, {
        loadingRestaurants: true,
        status: "Searching more restaurants.",
      });
      const nextLimit = Math.min(
        stop.restaurants.length + RECOMMEND_FETCH_STEP,
        RECOMMEND_MAX_RESULTS,
      );
      const restaurantItems = (
        await searchRestaurantsNearPlaces({
          places: [selectedAttraction],
          region: selectedAttraction.name || region.trim(),
          cuisine,
          priceFilter,
          limit: nextLimit,
        })
      ).map((item) => ({
        ...item,
        kind: "restaurant",
        theme: "맛집",
      }));
      const mergedRestaurants = mergePlacesById(
        stop.restaurants,
        restaurantItems,
      );

      updateStop(stopId, {
        restaurants: mergedRestaurants,
        restaurantVisibleCount:
          stop.restaurantVisibleCount + RECOMMEND_VISIBLE_STEP,
        status:
          mergedRestaurants.length > stop.restaurants.length
            ? "More restaurants were added."
            : "No more new restaurants were found nearby.",
      });
    } catch (error) {
      updateStop(stopId, {
        status: error.message || "Failed to find more restaurants.",
      });
    } finally {
      updateStop(stopId, { loadingRestaurants: false });
    }
  }

  async function handleCreatePlan() {
    if (selectedPlaces.length === 0 || loadingPlan) return;

    try {
      setLoadingPlan(true);
      setStatus("Creating an optimized travel plan.");
      const nextPlan = await createTravelPlan({
        region: region.trim() || selectedPlaces[0]?.name || "Travel route",
        themes,
        attractions: selectedPlaces.map(
          (place) => `${place.kind === "restaurant" ? "맛집" : "관광지"}: ${place.name}`,
        ),
      });
      setPlan(nextPlan);
      setStatus(
        nextPlan.steps.length > 0
          ? "Plan is ready."
          : "A plan could not be generated. Change places and try again.",
      );
    } catch (error) {
      setStatus(error.message || "Failed to create a plan.");
    } finally {
      setLoadingPlan(false);
    }
  }

  return (
    <section className="travel-recommend">
      <div className="travel-recommend-head">
        <div>
          <h2>Travel Planner</h2>
          <p>Add tourist spots one by one, then place restaurants before the next stop.</p>
        </div>
        <span>
          {working ? "Working" : "Ready"}
        </span>
      </div>

      <div className="travel-recommend-map-slot">
        <Map
          posts={[
            {
              id: "recommend-route",
              caption: "Recommended route",
              categoryTag: "관광",
              locations: routeLocations,
            },
          ]}
          title="Recommended Route"
          showMarkerLabels
          showRouteLines
        />
      </div>

      <form className="travel-recommend-search" onSubmit={(event) => event.preventDefault()}>
        <input
          type="text"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          placeholder="Travel region"
        />
        <button type="button" onClick={handleAddStop}>
          Add place
        </button>
      </form>

      <div className="travel-recommend-theme-list">
        {RECOMMEND_THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            className={themes.includes(theme) ? "active" : ""}
            onClick={() => toggleTheme(theme)}
          >
            {theme}
          </button>
        ))}
      </div>

      <div className="travel-recommend-food-controls">
        <label>
          <span>Restaurant price</span>
          <select
            value={priceFilter}
            onChange={(event) => setPriceFilter(event.target.value)}
          >
            {RESTAURANT_PRICE_FILTERS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Cuisine</span>
          <select
            value={cuisine}
            onChange={(event) => setCuisine(event.target.value)}
          >
            {RESTAURANT_CUISINES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {stops.map((stop, index) => (
        <PlannerStop
          key={stop.id}
          stop={stop}
          index={index}
          canRemove={stops.length > 1}
          cuisine={cuisine}
          priceFilter={priceFilter}
          onQueryChange={(value) =>
            updateStop(stop.id, { attractionQuery: value })
          }
          onFindAttractions={(event) => handleFindAttractions(event, stop.id)}
          onSelectAttraction={(id) => handleSelectAttraction(stop.id, id)}
          onFindRestaurants={() => handleFindRestaurants(stop.id)}
          onToggleRestaurant={(id) => handleToggleRestaurant(stop.id, id)}
          onAttractionSortChange={(value) =>
            updateStop(stop.id, { attractionSort: value })
          }
          onRestaurantSortChange={(value) =>
            updateStop(stop.id, { restaurantSort: value })
          }
          onViewMoreAttractions={() => handleViewMoreAttractions(stop.id)}
          onViewMoreRestaurants={() => handleViewMoreRestaurants(stop.id)}
          onRemove={() => handleRemoveStop(stop.id)}
        />
      ))}

      {stops.length > 0 && (
        <button
          className="travel-recommend-add-place"
          type="button"
          onClick={handleAddStop}
        >
          Add next place
        </button>
      )}

      {status && <p className="travel-recommend-status">{status}</p>}

      {selectedPlaces.length > 0 && (
        <button
          className="travel-recommend-plan-btn"
          type="button"
          onClick={handleCreatePlan}
          disabled={selectedPlaces.length === 0 || loadingPlan}
        >
          {loadingPlan ? "Creating plan..." : "Create plan"}
        </button>
      )}

      {plan && plan.steps.length > 0 && (
        <div className="travel-recommend-plan">
          <h3>{plan.title || `${region || "Route"} travel plan`}</h3>
          {plan.summary && <p>{plan.summary}</p>}
          <ol>
            {plan.steps.map((step, index) => (
              <li key={`${step.place || "step"}-${index}`}>
                <time>{step.time || `${index + 1}`}</time>
                <div>
                  <strong>{step.place}</strong>
                  <span>{step.theme}</span>
                  <p>{step.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function PlannerStop({
  stop,
  index,
  canRemove,
  cuisine,
  priceFilter,
  onQueryChange,
  onFindAttractions,
  onSelectAttraction,
  onFindRestaurants,
  onToggleRestaurant,
  onAttractionSortChange,
  onRestaurantSortChange,
  onViewMoreAttractions,
  onViewMoreRestaurants,
  onRemove,
}) {
  const selectedAttraction = stop.attractions.find(
    (place) => place.id === stop.selectedAttractionId,
  );
  const sortedAttractions = sortRecommendPlaces(
    stop.attractions,
    stop.attractionSort,
  );
  const sortedRestaurants = sortRecommendPlaces(
    stop.restaurants,
    stop.restaurantSort,
  );
  const visibleAttractions = sortedAttractions.slice(
    0,
    stop.attractionVisibleCount,
  );
  const visibleRestaurants = sortedRestaurants.slice(
    0,
    stop.restaurantVisibleCount,
  );

  return (
    <section className="travel-planner-stop">
      <div className="travel-planner-stop-head">
        <div>
          <h3>Place {index + 1}</h3>
          {selectedAttraction && <p>{selectedAttraction.name}</p>}
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      <form className="travel-recommend-search" onSubmit={onFindAttractions}>
        <input
          type="text"
          value={stop.attractionQuery}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Tourist spot or area"
        />
        <button
          type="submit"
          disabled={!stop.attractionQuery.trim() || stop.loadingAttractions}
        >
          {stop.loadingAttractions ? "Searching..." : "Find tourist spots"}
        </button>
      </form>

      {stop.status && <p className="travel-recommend-status">{stop.status}</p>}

      {stop.attractions.length > 0 && (
        <PlaceChoiceSection
          title="Tourist spots"
          places={visibleAttractions}
          canViewMore={
            visibleAttractions.length < sortedAttractions.length ||
            sortedAttractions.length < RECOMMEND_MAX_RESULTS
          }
          sortMode={stop.attractionSort}
          onSortChange={onAttractionSortChange}
          onViewMore={onViewMoreAttractions}
          viewMoreDisabled={stop.loadingAttractions}
          selectedPlaceIds={
            stop.selectedAttractionId ? [stop.selectedAttractionId] : []
          }
          onTogglePlace={onSelectAttraction}
        />
      )}

      {selectedAttraction && (
        <div className="travel-planner-restaurant-row">
          <span>
            Restaurants near {selectedAttraction.name} · {priceFilter} · {cuisine}
          </span>
          <button
            type="button"
            onClick={onFindRestaurants}
            disabled={stop.loadingRestaurants}
          >
            {stop.loadingRestaurants ? "Finding..." : "Find restaurants"}
          </button>
        </div>
      )}

      {stop.restaurants.length > 0 && (
        <PlaceChoiceSection
          title="Restaurants before next place"
          places={visibleRestaurants}
          canViewMore={
            visibleRestaurants.length < sortedRestaurants.length ||
            sortedRestaurants.length < RECOMMEND_MAX_RESULTS
          }
          sortMode={stop.restaurantSort}
          onSortChange={onRestaurantSortChange}
          onViewMore={onViewMoreRestaurants}
          viewMoreDisabled={stop.loadingRestaurants}
          selectedPlaceIds={stop.selectedRestaurantIds}
          onTogglePlace={onToggleRestaurant}
        />
      )}
    </section>
  );
}

function PlaceChoiceSection({
  title,
  places,
  canViewMore = false,
  sortMode,
  onSortChange,
  onViewMore,
  viewMoreDisabled = false,
  selectedPlaceIds,
  onTogglePlace,
}) {
  return (
    <div className="travel-recommend-section">
      <div className="travel-recommend-section-head">
        <h3>{title}</h3>
        <select
          value={sortMode}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {RECOMMEND_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="travel-recommend-attractions">
        {places.map((item) => (
          <label key={item.id} className="travel-recommend-attraction">
            <input
              type="checkbox"
              checked={selectedPlaceIds.includes(item.id)}
              onChange={() => onTogglePlace(item.id)}
            />
            <div className="travel-recommend-place-image">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={`${item.name} preview`} />
              ) : (
                <span>No image</span>
              )}
            </div>
            <span>
              <strong>{item.name}</strong>
              <small>
                {formatPlaceMeta(item)}
              </small>
              <p>{item.address || item.description || item.reason}</p>
            </span>
          </label>
        ))}
      </div>
      {canViewMore && (
        <button
          className="travel-recommend-view-more"
          type="button"
          onClick={onViewMore}
          disabled={viewMoreDisabled}
        >
          {viewMoreDisabled ? "Loading..." : "View more"}
        </button>
      )}
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
              aria-label="Post options"
            >
              <MoreIcon />
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
              <HeartIcon filled={post.likedByMe} />
            </button>
            <span className="travel-action-count">{post.likeCount}</span>
            <button
              className="travel-icon-btn comment"
              type="button"
              onClick={() => setCommentsOpen((value) => !value)}
              aria-label="comments"
            >
              <CommentIcon />
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
                    : "Sign in to write a comment."
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

function HeartIcon({ filled = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.8 4.6c-2.1-2-5.4-1.9-7.4.2L12 6.2l-1.4-1.4c-2-2.1-5.3-2.2-7.4-.2-2.3 2.2-2.4 5.8-.2 8.1l9 8.7 9-8.7c2.2-2.3 2.1-5.9-.2-8.1Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.4 18.1A8.3 8.3 0 1 1 12 21H5l.4-2.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
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
  const [imageOrder, setImageOrder] = useState(() =>
    Array.isArray(post.imageUrls)
      ? post.imageUrls.map((_, index) => index)
      : post.imageUrl
        ? [0]
        : [],
  );
  const editImages =
    Array.isArray(post.imageUrls) && post.imageUrls.length > 0
      ? post.imageUrls
      : post.imageUrl
        ? [post.imageUrl]
        : [];
  const orderedEditImages = imageOrder
    .map((originalIndex) => ({
      key: `${post.id}-edit-image-${originalIndex}`,
      url: editImages[originalIndex],
      label: originalIndex + 1,
    }))
    .filter((item) => item.url);

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
      imageOrder,
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

  function handleImageReorder(fromIndex, toIndex) {
    setImageOrder((current) => reorderItems(current, fromIndex, toIndex));
  }

  return (
    <form className="travel-edit-form" onSubmit={handleSubmit}>
      <CategoryTagInput value={categoryTag} onChange={setCategoryTag} />
      {orderedEditImages.length > 1 && (
        <ImageOrderGrid items={orderedEditImages} onReorder={handleImageReorder} />
      )}
      <Map
        selectable
        selectedLocations={locations}
        markerCategoryTag={categoryTag}
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
  const [categoryTags, setCategoryTags] = useState([DEFAULT_CATEGORIES[0]]);
  const [tagInput, setTagInput] = useState("");
  const [tagNotice, setTagNotice] = useState("");
  const [previewUrls, setPreviewUrls] = useState([]);
  const [imageNotice, setImageNotice] = useState("");
  const [generatingTags, setGeneratingTags] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const categoryTag = categoryTags.join(" ");

  function revokePreviewUrls(urls) {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }

  function handleImageChange(event) {
    const selectedFiles = Array.from(event.target.files || []).reverse();
    const nextImages = selectedFiles.slice(0, MAX_POST_IMAGES);

    setImageNotice(
      selectedFiles.length > MAX_POST_IMAGES
        ? `You can upload up to ${MAX_POST_IMAGES} photos.`
        : "",
    );
    setImages(nextImages);
    setCategoryTags([DEFAULT_CATEGORIES[0]]);
    setTagInput("");
    setTagNotice("");
    setPreviewUrls((currentUrls) => {
      revokePreviewUrls(currentUrls);
      return nextImages.map((file) => URL.createObjectURL(file));
    });
  }

  async function handleSuggestTags() {
    if (generatingTags || submitting) return;
    if (images.length === 0) {
      setImageNotice("Select at least one photo.");
      return;
    }

    try {
      setGeneratingTags(true);
      setTagNotice(
        "\uc5c5\ub85c\ub4dc \ud558\uae30\uc804\uc5d0 \uc62c\ub77c\uc628 \uc0ac\uc9c4\uc744 \ubd84\uc11d\ud558\uc5ec \ud0dc\uadf8\ub97c \uc790\ub3d9 \uc0dd\uc131\uc911\uc785\ub2c8\ub2e4",
      );
      const suggestedTags = await suggestPostTags({
        images,
        caption,
        locations,
        categoryTag,
      });
      const nextTags = mergeTagLists(categoryTags, suggestedTags);
      setCategoryTags(nextTags.length > 0 ? nextTags : categoryTags);
      setTagNotice(
        suggestedTags.length > 0
          ? "AI tags are ready. Review them before sharing."
          : "No AI tags were generated. You can add tags manually.",
      );
    } catch (error) {
      setTagNotice(error.message || "AI tags could not be generated.");
    } finally {
      setGeneratingTags(false);
    }
  }

  function handleAddTag(event) {
    event.preventDefault();
    const nextTags = splitTags(tagInput);
    if (nextTags.length === 0) return;
    setCategoryTags((current) => mergeTagLists(current, nextTags));
    setTagInput("");
  }

  function handleRemoveTag(tag) {
    setCategoryTags((current) => {
      const nextTags = current.filter((item) => item !== tag);
      return nextTags.length > 0 ? nextTags : [DEFAULT_CATEGORIES[0]];
    });
  }

  function handleImageReorder(fromIndex, toIndex) {
    setImages((current) => reorderItems(current, fromIndex, toIndex));
    setPreviewUrls((current) => reorderItems(current, fromIndex, toIndex));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || generatingTags) return;
    if (images.length === 0) {
      setImageNotice("Select at least one photo.");
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
          You can select up to {MAX_POST_IMAGES} photos.
        </small>
        {imageNotice && <p className="travel-file-notice">{imageNotice}</p>}
        {previewUrls.length > 0 && (
          <ImageOrderGrid
            items={previewUrls.map((url, index) => ({
              key: url,
              url,
              label: index + 1,
            }))}
            onReorder={handleImageReorder}
          />
        )}

        <TagEditor
          tags={categoryTags}
          value={tagInput}
          notice={tagNotice}
          generating={generatingTags}
          canGenerate={images.length > 0 && !submitting}
          onValueChange={setTagInput}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onSuggestTags={handleSuggestTags}
        />
        <Map
          selectable
          selectedLocations={locations}
          markerCategoryTag={categoryTag}
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
        <button
          type="submit"
          disabled={images.length === 0 || submitting || generatingTags}
        >
          {submitting ? "Posting..." : "Share"}
        </button>
      </form>
    </div>
  );
}

function TagEditor({
  tags,
  value,
  notice,
  generating,
  canGenerate,
  onValueChange,
  onAddTag,
  onRemoveTag,
  onSuggestTags,
}) {
  return (
    <section className="travel-tag-editor">
      <div className="travel-tag-editor-head">
        <span>Category tags</span>
        <button
          type="button"
          onClick={onSuggestTags}
          disabled={!canGenerate || generating}
        >
          {generating ? "Generating..." : "AI tags"}
        </button>
      </div>
      {notice && <p className="travel-tag-notice">{notice}</p>}
      <div className="travel-tag-chip-list">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="travel-tag-chip"
            onClick={() => onRemoveTag(tag)}
            title="Remove tag"
          >
            #{tag}
            <span aria-hidden="true">x</span>
          </button>
        ))}
      </div>
      <form className="travel-tag-add-form" onSubmit={onAddTag}>
        <input
          list="travel-category-tags"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="Add tags"
          disabled={generating}
        />
        <datalist id="travel-category-tags">
          {DEFAULT_CATEGORIES.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <button type="submit" disabled={generating || !value.trim()}>
          Add
        </button>
      </form>
      <small>Separate tags with spaces or commas.</small>
    </section>
  );
}

function ImageOrderGrid({ items, onReorder }) {
  const [dragIndex, setDragIndex] = useState(null);

  function handleDragStart(event, index) {
    setDragIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(event, toIndex) {
    event.preventDefault();
    const fromIndex = dragIndex ?? Number(event.dataTransfer.getData("text/plain"));
    setDragIndex(null);
    if (!Number.isInteger(fromIndex) || fromIndex === toIndex) return;
    onReorder(fromIndex, toIndex);
  }

  return (
    <div className="travel-preview-grid travel-preview-grid-sortable">
      {items.map((item, index) => (
        <div
          className={
            dragIndex === index
              ? "travel-preview-item is-dragging"
              : "travel-preview-item"
          }
          draggable
          key={item.key}
          onDragStart={(event) => handleDragStart(event, index)}
          onDragOver={handleDragOver}
          onDragEnd={() => setDragIndex(null)}
          onDrop={(event) => handleDrop(event, index)}
        >
          <img src={item.url} alt={`preview ${index + 1}`} />
          <span>{index + 1}</span>
        </div>
      ))}
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
        placeholder="travel food cafe"
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

function sortRecommendPlaces(places, sortMode) {
  return [...places].sort((left, right) => {
    if (sortMode === "reviews") {
      return (
        (right.userRatingsTotal || 0) - (left.userRatingsTotal || 0) ||
        (right.rating || 0) - (left.rating || 0)
      );
    }

    return (
      (right.rating || 0) - (left.rating || 0) ||
      (right.userRatingsTotal || 0) - (left.userRatingsTotal || 0)
    );
  });
}

function mergePlacesById(...placeLists) {
  const merged = new Map();
  placeLists.flat().forEach((place) => {
    if (!place?.id || merged.has(place.id)) return;
    merged.set(place.id, place);
  });
  return Array.from(merged.values());
}

function createPlannerStop(defaultQuery = "") {
  return {
    id: `stop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    attractionQuery: defaultQuery,
    attractions: [],
    restaurants: [],
    selectedAttractionId: "",
    selectedRestaurantIds: [],
    attractionVisibleCount: RECOMMEND_VISIBLE_STEP,
    restaurantVisibleCount: RECOMMEND_VISIBLE_STEP,
    attractionSort: "rating",
    restaurantSort: "rating",
    status: "",
    loadingAttractions: false,
    loadingRestaurants: false,
  };
}

function getStopRoutePlaces(stop) {
  const attraction = stop.attractions.find(
    (place) => place.id === stop.selectedAttractionId,
  );
  const restaurants = stop.restaurants.filter((place) =>
    stop.selectedRestaurantIds.includes(place.id),
  );

  return attraction ? [attraction, ...restaurants] : restaurants;
}

function formatPlaceMeta(place) {
  const rating = place.rating ? `Rating ${place.rating}` : "No rating";
  const reviews = Number.isFinite(place.userRatingsTotal)
    ? `${place.userRatingsTotal} reviews`
    : "0 reviews";

  return `${rating} · ${reviews}`;
}

function splitTags(value) {
  if (!value) return [DEFAULT_CATEGORIES[0]];
  const tags = String(value)
    .split(/[,#\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length ? tags : [DEFAULT_CATEGORIES[0]];
}

function mergeTagLists(...tagLists) {
  const merged = new Set();
  tagLists.flat().forEach((tag) => {
    splitTags(tag).forEach((item) => merged.add(item));
  });
  return Array.from(merged).slice(0, 8);
}
