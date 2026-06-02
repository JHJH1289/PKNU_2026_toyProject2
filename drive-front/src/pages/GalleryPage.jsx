import { Component, useEffect, useMemo, useState } from "react";
import {
  fetchProfile,
  fetchUserProfile,
  updateProfile,
} from "../api/profileApi";
import {
  deleteTravelPlan,
  fetchSavedTravelPlans,
  generateSavedTravelPlan,
  saveTravelPlan,
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
import TravelMap from "../components/map.jsx";
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
const MY_PAGE_VIEWS = {
  posts: "posts",
  plans: "plans",
};

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
  const [myPageView, setMyPageView] = useState(MY_PAGE_VIEWS.posts);
  const [savedPlans, setSavedPlans] = useState([]);

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

  function openMyPageView(nextView) {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    setMyPageView(nextView);
    openUserProfile(username);
  }

  useEffect(() => {
    let cancelled = false;

    setProfileUsername(username || "");
    setTab(TABS.feed);
    setMyPageView(MY_PAGE_VIEWS.posts);
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

      fetchSavedTravelPlans()
        .then((plans) => {
          if (!cancelled) setSavedPlans(plans);
        })
        .catch((error) => {
          if (!cancelled) {
            setSavedPlans([]);
            setStatus(error.message || "Failed to load saved plans.");
          }
        });
    } else {
      setProfile({ username: "Guest", bio: "", profileImageUrl: "" });
      setSavedPlans([]);
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

  async function handlePlanSave(plan) {
    if (!isLoggedIn) {
      requireLogin();
      return false;
    }

    try {
      const savedPlan = await saveTravelPlan(plan);
      setSavedPlans((current) => [
        savedPlan,
        ...current.filter((item) => item.id !== savedPlan.id),
      ]);
      return true;
    } catch (error) {
      setStatus(error.message || "Failed to save plan.");
      return false;
    }
  }

  async function handleDeleteSavedPlan(planId) {
    if (!username) return;

    try {
      await deleteTravelPlan(planId);
      setSavedPlans((current) => current.filter((plan) => plan.id !== planId));
    } catch (error) {
      setStatus(error.message || "Failed to delete plan.");
    }
  }

  async function handleGenerateSavedPlan(planId) {
    if (!username) return null;

    try {
      const generatedPlan = await generateSavedTravelPlan(planId);
      setSavedPlans((current) =>
        current.map((plan) => (plan.id === generatedPlan.id ? generatedPlan : plan)),
      );
      return generatedPlan;
    } catch (error) {
      setStatus(error.message || "Failed to create plan.");
      return null;
    }
  }

  const showingMyPlans = tab === TABS.me && myPageView === MY_PAGE_VIEWS.plans;

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
            <>
              <button
                className={tab === TABS.me ? "active" : ""}
                type="button"
                onClick={() => openMyPageView(MY_PAGE_VIEWS.posts)}
              >
                My Page
              </button>
              <div className="travel-sidebar-subnav">
                <span>My Page</span>
                <button
                  type="button"
                  className={
                    tab === TABS.me && myPageView === MY_PAGE_VIEWS.posts
                      ? "active"
                      : ""
                  }
                  onClick={() => openMyPageView(MY_PAGE_VIEWS.posts)}
                >
                  My posts
                </button>
                <button
                  type="button"
                  className={
                    tab === TABS.me && myPageView === MY_PAGE_VIEWS.plans
                      ? "active"
                      : ""
                  }
                  onClick={() => openMyPageView(MY_PAGE_VIEWS.plans)}
                >
                  My plan
                  {savedPlans.length > 0 && <small>{savedPlans.length}</small>}
                </button>
              </div>
            </>
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

        {tab === TABS.recommend && (
          <PlannerErrorBoundary>
            <RecommendPanel onSavePlan={handlePlanSave} />
          </PlannerErrorBoundary>
        )}

        {tab === TABS.me && myPageView === MY_PAGE_VIEWS.posts && (
          <TravelMap
            posts={posts}
            showCategoryLegend
            showMarkerLabels={false}
            showRouteLines={false}
          />
        )}

        {showingMyPlans && (
          <MyPlansPanel
            plans={savedPlans}
            onDelete={handleDeleteSavedPlan}
            onGenerate={handleGenerateSavedPlan}
          />
        )}

        {tab !== TABS.recommend && !showingMyPlans && (
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

class PlannerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <section className="travel-recommend">
          <p className="travel-recommend-status">
            Planner error: {this.state.error.message || "Unknown error"}
          </p>
        </section>
      );
    }

    return this.props.children;
  }
}

function RecommendPanel({ onSavePlan }) {
  const [stops, setStops] = useState(() => [createPlannerStop()]);
  const [routeOrder, setRouteOrder] = useState([]);
  const [, setPlan] = useState(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [status, setStatus] = useState("");
  const working = stops.some(
    (stop) => stop.loadingAttractions || stop.loadingRestaurants,
  );
  const selectedRoutePlaces = useMemo(
    () => stops.flatMap((stop) => getStopRoutePlaces(stop)),
    [stops],
  );
  const selectedRouteKeys = useMemo(
    () => selectedRoutePlaces.map(getPlaceRouteKey),
    [selectedRoutePlaces],
  );
  const effectiveRouteOrder = useMemo(
    () => [
      ...routeOrder.filter((key) => selectedRouteKeys.includes(key)),
      ...selectedRouteKeys.filter((key) => !routeOrder.includes(key)),
    ],
    [routeOrder, selectedRouteKeys],
  );
  const selectedPlaces = useMemo(
    () => orderPlacesByRouteOrder(selectedRoutePlaces, effectiveRouteOrder),
    [effectiveRouteOrder, selectedRoutePlaces],
  );
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

  function handleAddStop() {
    setStops((current) => [
      ...current.map((stop) => ({ ...stop, isExpanded: false })),
      createPlannerStop(),
    ]);
    setPlan(null);
    setPlanSaved(false);
  }

  function handleRemoveStop(stopId) {
    setStops((current) =>
      current.length > 1
        ? current.filter((stop) => stop.id !== stopId)
        : current,
    );
    setPlan(null);
    setPlanSaved(false);
  }

  function handleToggleStopExpanded(stopId) {
    updateStop(stopId, (stop) => ({ ...stop, isExpanded: !stop.isExpanded }));
  }

  function handleSelectAttraction(stopId, attractionId) {
    updateStop(stopId, (stop) => ({
      ...stop,
      selectedAttractionIds: getSelectedAttractionIds(stop).includes(
        attractionId,
      )
        ? getSelectedAttractionIds(stop).filter((id) => id !== attractionId)
        : [...getSelectedAttractionIds(stop), attractionId],
      restaurants: [],
      selectedRestaurantIds: [],
      status:
        getSelectedAttractionIds(stop).includes(attractionId)
          ? "Tourist spot removed from the route."
          : "Tourist spot added to the route.",
    }));
    setPlan(null);
    setPlanSaved(false);
  }

  function handleToggleRestaurant(stopId, restaurantId) {
    updateStop(stopId, (stop) => ({
      ...stop,
      selectedRestaurantIds: stop.selectedRestaurantIds.includes(restaurantId)
        ? stop.selectedRestaurantIds.filter((id) => id !== restaurantId)
        : [...stop.selectedRestaurantIds, restaurantId],
    }));
    setPlan(null);
    setPlanSaved(false);
  }

  async function handleFindAttractions(event, stopId) {
    event.preventDefault();
    const stop = stops.find((item) => item.id === stopId);
    const query = (stop?.attractionQuery || "").trim();
    if (!stop || !query || stop.loadingAttractions) return;

    try {
      updateStop(stopId, {
        loadingAttractions: true,
        status: "Searching tourist spots.",
      });
      setPlan(null);
    setPlanSaved(false);
      let nextAttractions = await searchGooglePlaces({
        region: query,
        keyword: "관광지",
        limit: 20,
      });

      if (nextAttractions.length === 0) {
        nextAttractions = await searchGooglePlaces({
          region: query,
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
        selectedAttractionIds: [],
        selectedRestaurantIds: [],
        attractionVisibleCount: RECOMMEND_VISIBLE_STEP,
        restaurantVisibleCount: RECOMMEND_VISIBLE_STEP,
        attractionCanLoadMore: true,
        restaurantCanLoadMore: true,
        status:
          attractionItems.length > 0
            ? "Select tourist spots to add them to the route."
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
    const selectedAttractions = stop?.attractions.filter((place) =>
      getSelectedAttractionIds(stop).includes(place.id),
    );
    if (
      !stop ||
      !selectedAttractions ||
      selectedAttractions.length === 0 ||
      stop.loadingRestaurants
    ) {
      return;
    }

    try {
      updateStop(stopId, {
        loadingRestaurants: true,
        status: "Searching restaurants before the next stop.",
      });
      const restaurantItems = (
        await searchRestaurantsNearPlaces({
          places: selectedAttractions,
          region: selectedAttractions[0]?.name || "맛집",
          cuisine: stop.cuisine,
          priceFilter: stop.priceFilter,
          restaurantQuery: stop.restaurantQuery,
          limit: 20,
        })
      ).map((item) => ({
        ...item,
        kind: "restaurant",
        theme: "맛집",
        cuisine: stop.cuisine,
        priceFilter: stop.priceFilter,
      }));

      updateStop(stopId, {
        restaurants: restaurantItems,
        selectedRestaurantIds: [],
        restaurantVisibleCount: RECOMMEND_VISIBLE_STEP,
        restaurantCanLoadMore: true,
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

    const query = (stop.attractionQuery || "").trim();
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
        keyword: "관광지",
        limit: nextLimit,
      });

      if (nextAttractions.length === 0) {
        nextAttractions = await searchGooglePlaces({
          region: query,
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
        attractionCanLoadMore:
          mergedAttractions.length > stop.attractions.length &&
          mergedAttractions.length < RECOMMEND_MAX_RESULTS,
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
    const selectedAttractions = stop?.attractions.filter((place) =>
      getSelectedAttractionIds(stop).includes(place.id),
    );
    if (
      !stop ||
      !selectedAttractions ||
      selectedAttractions.length === 0 ||
      stop.loadingRestaurants
    ) {
      return;
    }

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
          places: selectedAttractions,
          region: selectedAttractions[0]?.name || "맛집",
          cuisine: stop.cuisine,
          priceFilter: stop.priceFilter,
          restaurantQuery: stop.restaurantQuery,
          limit: nextLimit,
        })
      ).map((item) => ({
        ...item,
        kind: "restaurant",
        theme: "맛집",
        cuisine: stop.cuisine,
        priceFilter: stop.priceFilter,
      }));
      const mergedRestaurants = mergePlacesById(
        stop.restaurants,
        restaurantItems,
      );

      updateStop(stopId, {
        restaurants: mergedRestaurants,
        restaurantVisibleCount:
          stop.restaurantVisibleCount + RECOMMEND_VISIBLE_STEP,
        restaurantCanLoadMore:
          mergedRestaurants.length > stop.restaurants.length &&
          mergedRestaurants.length < RECOMMEND_MAX_RESULTS,
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

  function handleRouteReorder(fromIndex, toIndex) {
    setRouteOrder(() =>
      reorderItems(selectedPlaces.map(getPlaceRouteKey), fromIndex, toIndex),
    );
    setPlan(null);
    setPlanSaved(false);
  }

  async function handleSavePlan() {
    if (selectedPlaces.length === 0 || savingPlan) return;

    setSavingPlan(true);
    try {
      const saved = await onSavePlan?.({
        title: `${selectedPlaces[0]?.name || "Travel"} route`,
        summary: `${selectedPlaces.length} selected places saved from the planner map.`,
        region: selectedPlaces[0]?.name || "Travel route",
        routePlaces: selectedPlaces.map((place, index) => ({
          orderIndex: index,
          name: place.name,
          kind: place.kind,
          address: place.address || "",
          latitude: place.latitude,
          longitude: place.longitude,
        })),
        steps: [],
      });

      if (saved) {
        setPlanSaved(true);
        setStatus("Route saved to My plan.");
      } else {
        setStatus("Plan could not be saved.");
      }
    } finally {
      setSavingPlan(false);
    }
  }

  return (
    <section className="travel-recommend bg-white/95 p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <div className="travel-recommend-head rounded-lg bg-slate-50 p-4">
        <div>
          <h2>Travel Planner</h2>
          <p>
            Add multiple places, fold each place, and build a route from the
            selected results.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs text-sky-700">
          {working ? "Working" : "Ready"}
        </span>
      </div>

      <div className="travel-recommend-map-slot overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3">
        <TravelMap
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

      {selectedPlaces.length > 0 && (
        <RouteOrderList places={selectedPlaces} onReorder={handleRouteReorder} />
      )}

      {stops.map((stop, index) => (
        <PlannerStop
          key={stop.id}
          stop={stop}
          index={index}
          canRemove={stops.length > 1}
          onQueryChange={(value) =>
            updateStop(stop.id, { attractionQuery: value })
          }
          onCuisineChange={(value) => updateStop(stop.id, { cuisine: value })}
          onPriceFilterChange={(value) =>
            updateStop(stop.id, { priceFilter: value })
          }
          onRestaurantQueryChange={(value) =>
            updateStop(stop.id, { restaurantQuery: value })
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
          onToggleExpanded={() => handleToggleStopExpanded(stop.id)}
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
          onClick={handleSavePlan}
          disabled={planSaved || savingPlan}
        >
          {planSaved ? "Saved to My plan" : savingPlan ? "Saving..." : "Save plan"}
        </button>
      )}
    </section>
  );
}

function RouteOrderList({ places, onReorder }) {
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
    <section className="travel-route-order">
      <div className="travel-route-order-head">
        <h3>Pin order</h3>
        <span>{places.length} selected</span>
      </div>
      <ol>
        {places.map((place, index) => (
          <li
            key={`${getPlaceRouteKey(place)}-${index}`}
            className={dragIndex === index ? "is-dragging" : ""}
            draggable
            onDragStart={(event) => handleDragStart(event, index)}
            onDragOver={handleDragOver}
            onDragEnd={() => setDragIndex(null)}
            onDrop={(event) => handleDrop(event, index)}
          >
            <b>{index + 1}</b>
            <span>
              <strong>{place.name}</strong>
              <small>{place.kind === "restaurant" ? "Restaurant" : "Tourist spot"}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PlannerStop({
  stop,
  index,
  canRemove,
  onQueryChange,
  onCuisineChange,
  onPriceFilterChange,
  onRestaurantQueryChange,
  onFindAttractions,
  onSelectAttraction,
  onFindRestaurants,
  onToggleRestaurant,
  onAttractionSortChange,
  onRestaurantSortChange,
  onViewMoreAttractions,
  onViewMoreRestaurants,
  onToggleExpanded,
  onRemove,
}) {
  const selectedAttractionIds = getSelectedAttractionIds(stop);
  const selectedAttractions = stop.attractions.filter((place) =>
    selectedAttractionIds.includes(place.id),
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
  const selectedRestaurantCount = stop.selectedRestaurantIds.length;
  const selectedAttractionSummary =
    selectedAttractions.length === 0
      ? stop.attractionQuery || "Not selected"
      : selectedAttractions.length === 1
        ? selectedAttractions[0].name
        : `${selectedAttractions[0].name} +${selectedAttractions.length - 1}`;

  return (
    <section className="travel-planner-stop rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="travel-planner-stop-head">
        <div>
          <h3>Place {index + 1}</h3>
          <p>
            {selectedAttractionSummary}
            {selectedRestaurantCount > 0
              ? ` · ${selectedRestaurantCount} restaurants`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canRemove && (
            <button type="button" onClick={onRemove}>
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={stop.isExpanded}
          >
            {stop.isExpanded ? "Fold" : "Open"}
          </button>
        </div>
      </div>

      {stop.isExpanded && (
        <>
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

          {stop.status && (
            <p className="travel-recommend-status">{stop.status}</p>
          )}

          {stop.attractions.length > 0 && (
            <PlaceChoiceSection
              title="Tourist spots"
              places={visibleAttractions}
              canViewMore={
                visibleAttractions.length < sortedAttractions.length ||
                (stop.attractionCanLoadMore &&
                  sortedAttractions.length < RECOMMEND_MAX_RESULTS)
              }
              sortMode={stop.attractionSort}
              onSortChange={onAttractionSortChange}
              onViewMore={onViewMoreAttractions}
              viewMoreDisabled={stop.loadingAttractions}
              selectedPlaceIds={selectedAttractionIds}
              onTogglePlace={onSelectAttraction}
            />
          )}

          {selectedAttractions.length > 0 && (
            <div className="travel-planner-restaurant-row grid gap-3 rounded-lg bg-sky-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <span>
                  Restaurants near {selectedAttractions.length} selected tourist
                  spot{selectedAttractions.length > 1 ? "s" : ""}
                </span>
                <div className="mt-2 grid gap-2">
                  <label>
                    <span>Restaurant search</span>
                    <input
                      type="text"
                      value={stop.restaurantQuery}
                      onChange={(event) =>
                        onRestaurantQueryChange(event.target.value)
                      }
                      placeholder="Restaurant name or keyword"
                    />
                  </label>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label>
                    <span>Restaurant price</span>
                    <select
                      value={stop.priceFilter}
                      onChange={(event) =>
                        onPriceFilterChange(event.target.value)
                      }
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
                      value={stop.cuisine}
                      onChange={(event) => onCuisineChange(event.target.value)}
                    >
                      {RESTAURANT_CUISINES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
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
                (stop.restaurantCanLoadMore &&
                  sortedRestaurants.length < RECOMMEND_MAX_RESULTS)
              }
              sortMode={stop.restaurantSort}
              onSortChange={onRestaurantSortChange}
              onViewMore={onViewMoreRestaurants}
              viewMoreDisabled={stop.loadingRestaurants}
              selectedPlaceIds={stop.selectedRestaurantIds}
              onTogglePlace={onToggleRestaurant}
            />
          )}
        </>
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
    <div className="travel-recommend-section rounded-lg border border-slate-200 bg-slate-50 p-3">
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
          <label
            key={item.id}
            className="travel-recommend-attraction bg-white transition hover:border-sky-300 hover:shadow-sm"
          >
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
              {item.kind === "restaurant" && (
                <span className="mt-2 flex flex-wrap gap-1.5">
                  <em className="rounded-full bg-emerald-50 px-2 py-1 text-xs not-italic text-emerald-700">
                    {item.priceFilter || RESTAURANT_PRICE_FILTERS[0]}
                  </em>
                  <em className="rounded-full bg-amber-50 px-2 py-1 text-xs not-italic text-amber-700">
                    {item.cuisine || RESTAURANT_CUISINES[0]}
                  </em>
                </span>
              )}
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

function MyPlansPanel({ plans, onDelete, onGenerate }) {
  const [generatingPlanId, setGeneratingPlanId] = useState(null);

  async function handleGenerate(planId) {
    if (generatingPlanId) return;

    setGeneratingPlanId(planId);
    try {
      await onGenerate?.(planId);
    } finally {
      setGeneratingPlanId(null);
    }
  }

  if (plans.length === 0) {
    return (
      <section className="travel-plan-empty">
        <h3>No saved plans yet.</h3>
        <p>Save a route in Travel Planner, then create the AI plan here.</p>
      </section>
    );
  }

  return (
    <section className="travel-my-plan-list">
      {plans.map((plan) => {
        const routePlaces = Array.isArray(plan.routePlaces)
          ? [...plan.routePlaces].sort(
              (left, right) => (left.orderIndex ?? 0) - (right.orderIndex ?? 0),
            )
          : [];
        const hasGeneratedSteps = Array.isArray(plan.steps) && plan.steps.length > 0;
        const generating = generatingPlanId === plan.id;
        const routeLocations = routePlaces
          .filter(
            (place) =>
              Number.isFinite(place.latitude) && Number.isFinite(place.longitude),
          )
          .map((place) => ({
            latitude: place.latitude,
            longitude: place.longitude,
            locationName: place.name,
            address: place.address,
            categoryTag:
              place.kind === "RESTAURANT" || place.kind === "restaurant"
                ? "맛집"
                : "관광",
          }));

        return (
          <article key={plan.id} className="travel-my-plan-card">
            <div className="travel-my-plan-head">
              <div>
                <span className="travel-my-plan-status">
                  {hasGeneratedSteps ? "Generated" : "Route saved"}
                </span>
                <h3>{plan.title || "Route travel plan"}</h3>
                <p>
                  Saved {formatSavedPlanDate(plan.savedAt)}
                  {plan.generatedAt ? ` · Created ${formatSavedPlanDate(plan.generatedAt)}` : ""}
                </p>
              </div>
              <div className="travel-my-plan-actions">
                <button
                  type="button"
                  onClick={() => handleGenerate(plan.id)}
                  disabled={generating || routePlaces.length === 0}
                >
                  {generating
                    ? "Creating..."
                    : hasGeneratedSteps
                      ? "Recreate plan"
                      : "Create plan"}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => onDelete(plan.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="travel-my-plan-map">
              <TravelMap
                posts={[
                  {
                    id: `saved-plan-${plan.id}`,
                    caption: plan.title || "Saved route",
                    categoryTag: "여행",
                    locations: routeLocations,
                  },
                ]}
                title="Saved Route"
                showMarkerLabels
                showRouteLines
              />
            </div>

            <div className="travel-my-plan-route">
              {routePlaces.map((place, index) => (
                <span key={`${plan.id}-route-${index}`}>
                  {index + 1}. {place.name}
                </span>
              ))}
            </div>

            {plan.summary && <p>{plan.summary}</p>}

            {hasGeneratedSteps ? (
              <ol>
                {plan.steps.map((step, index) => (
                  <li key={`${plan.id}-step-${index}`}>
                    <time>{step.time || index + 1}</time>
                    <div>
                      <strong>{step.place || "Place"}</strong>
                      <span>{step.theme || ""}</span>
                      <p>{step.note || ""}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="travel-my-plan-pending">
                Save complete. Create the detailed AI route from this saved order.
              </div>
            )}
          </article>
        );
      })}
    </section>
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
          <TravelMap posts={[post]} title="Marked Map" />
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
      <TravelMap
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
        <TravelMap
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

function getPlaceRouteKey(place) {
  const id = place?.id || place?.placeId || place?.name;
  const latitude = Number.isFinite(place?.latitude) ? place.latitude : "";
  const longitude = Number.isFinite(place?.longitude) ? place.longitude : "";
  return `${place?.kind || "place"}:${id || `${latitude},${longitude}`}`;
}

function orderPlacesByRouteOrder(places, routeOrder) {
  if (!Array.isArray(routeOrder) || routeOrder.length === 0) return places;

  const placeMap = new Map();
  places.forEach((place) => {
    const key = getPlaceRouteKey(place);
    if (!placeMap.has(key)) {
      placeMap.set(key, place);
    }
  });

  return [
    ...routeOrder.map((key) => placeMap.get(key)).filter(Boolean),
    ...places.filter((place) => {
      const key = getPlaceRouteKey(place);
      return !routeOrder.includes(key) || !placeMap.has(key);
    }),
  ];
}

function createPlannerStop(defaultQuery = "") {
  return {
    id: `stop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    attractionQuery: defaultQuery,
    attractions: [],
    restaurants: [],
    restaurantQuery: "",
    selectedAttractionIds: [],
    selectedRestaurantIds: [],
    attractionVisibleCount: RECOMMEND_VISIBLE_STEP,
    restaurantVisibleCount: RECOMMEND_VISIBLE_STEP,
    attractionCanLoadMore: true,
    restaurantCanLoadMore: true,
    attractionSort: "rating",
    restaurantSort: "rating",
    cuisine: RESTAURANT_CUISINES[0],
    priceFilter: RESTAURANT_PRICE_FILTERS[0],
    isExpanded: true,
    status: "",
    loadingAttractions: false,
    loadingRestaurants: false,
  };
}

function getStopRoutePlaces(stop) {
  const selectedAttractionIds = getSelectedAttractionIds(stop);
  const attractions = stop.attractions.filter((place) =>
    selectedAttractionIds.includes(place.id),
  );
  const restaurants = stop.restaurants.filter((place) =>
    stop.selectedRestaurantIds.includes(place.id),
  );

  return [...attractions, ...restaurants];
}

function getSelectedAttractionIds(stop) {
  if (Array.isArray(stop?.selectedAttractionIds)) {
    return stop.selectedAttractionIds;
  }

  return stop?.selectedAttractionId ? [stop.selectedAttractionId] : [];
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

function formatSavedPlanDate(value) {
  if (!value) return "Saved plan";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved plan";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
