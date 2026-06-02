const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { latitude: 37.5666103, longitude: 126.9783882 };
const GOOGLE_PLACES_PAGE_SIZE = 20;
const GOOGLE_PLACES_MAX_RESULTS = 60;

let googleMapsPromise;

async function ensurePlacesLibrary(maps) {
  if (maps.places?.PlacesService) {
    return maps.places;
  }

  if (typeof maps.importLibrary === "function") {
    const placesLibrary = await maps.importLibrary("places");
    if (placesLibrary?.PlacesService) {
      return placesLibrary;
    }
  }

  throw new Error("GOOGLE_PLACES_NOT_AVAILABLE");
}

export function loadGoogleMaps({ requirePlaces = false } = {}) {
  if (window.google?.maps) {
    return requirePlaces
      ? ensurePlacesLibrary(window.google.maps).then(() => window.google.maps)
      : Promise.resolve(window.google.maps);
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("GOOGLE_MAPS_API_KEY_EMPTY"));
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const callbackName = `initGoogleMaps${Date.now()}`;
      const script = document.createElement("script");
      const params = new URLSearchParams({
        key: GOOGLE_MAPS_API_KEY,
        callback: callbackName,
        libraries: "places",
        language: "ko",
        region: "KR",
      });

      window[callbackName] = () => {
        delete window[callbackName];
        resolve(window.google.maps);
      };

      script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete window[callbackName];
        reject(new Error("GOOGLE_MAPS_LOAD_FAILED"));
      };
      document.head.appendChild(script);
    });
  }

  return requirePlaces
    ? googleMapsPromise.then((maps) =>
        ensurePlacesLibrary(maps).then(() => maps),
      )
    : googleMapsPromise;
}

export async function searchGooglePlaces({
  region,
  themes = [],
  limit = 12,
  keyword = "\uAD00\uAD11\uC9C0",
  location = null,
  radius = 250000,
}) {
  const maps = await loadGoogleMaps({ requirePlaces: true });
  const placesApi = await ensurePlacesLibrary(maps);
  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;left:-10000px;top:-10000px;width:320px;height:240px;";
  document.body.appendChild(container);
  const center = location
    ? { lat: location.latitude, lng: location.longitude }
    : { lat: DEFAULT_CENTER.latitude, lng: DEFAULT_CENTER.longitude };
  const map = new maps.Map(container, {
    center,
    zoom: 11,
  });
  const service = new placesApi.PlacesService(map);
  const placesStatus = placesApi.PlacesServiceStatus ||
    maps.places?.PlacesServiceStatus || {
      OK: "OK",
    };
  const query = [region, ...themes, keyword].filter(Boolean).join(" ");
  const targetLimit = Math.min(limit, GOOGLE_PLACES_MAX_RESULTS);

  return new Promise((resolve, reject) => {
    const collected = [];

    function finish() {
      container.remove();
      resolve(
        collected
          .slice(0, targetLimit)
          .map((place) => mapGooglePlaceResult(place, keyword)),
      );
    }

    function handlePage(results, status, pagination) {
      if (status !== placesStatus.OK || !Array.isArray(results)) {
        finish();
        return;
      }

      collected.push(...results);

      if (
        collected.length < targetLimit &&
        pagination?.hasNextPage &&
        collected.length < GOOGLE_PLACES_MAX_RESULTS
      ) {
        window.setTimeout(() => pagination.nextPage(), 1200);
        return;
      }

      finish();
    }

    try {
      service.textSearch(
        {
          query,
          location: center,
          radius,
          region: "KR",
        },
        handlePage,
      );
    } catch (error) {
      container.remove();
      reject(error);
    }
  });
}

function mapGooglePlaceResult(place, keyword) {
  return {
    id: place.place_id || place.name,
    name: place.name || "Place",
    address: place.formatted_address || "",
    latitude: place.geometry?.location?.lat(),
    longitude: place.geometry?.location?.lng(),
    rating: place.rating || null,
    userRatingsTotal: place.user_ratings_total || 0,
    imageUrl:
      place.photos?.[0]?.getUrl({
        maxWidth: 520,
        maxHeight: 340,
      }) || "",
    theme: keyword,
    description: place.formatted_address || "",
  };
}

export async function searchRestaurantsNearPlaces({
  places,
  region,
  cuisine,
  priceFilter,
  restaurantQuery = "",
  limit = 10,
}) {
  const anchorPlaces = (places || []).filter(
    (place) =>
      Number.isFinite(place.latitude) && Number.isFinite(place.longitude),
  );
  const keyword = [
    restaurantQuery ? restaurantQuery.trim() : "",
    cuisine && cuisine !== "\uC804\uCCB4" ? cuisine : "",
    priceFilter && priceFilter !== "\uC804\uCCB4" ? priceFilter : "",
    "\uB9DB\uC9D1",
  ]
    .filter(Boolean)
    .join(" ");

  if (anchorPlaces.length === 0) {
    return searchGooglePlaces({
      region,
      keyword,
      limit,
      radius: 120000,
    });
  }

  const results = await Promise.all(
    anchorPlaces.slice(0, 3).map((place) =>
      searchGooglePlaces({
        region: place.name,
        keyword: `\uADFC\uCC98 ${keyword}`,
        limit: Math.ceil(limit / Math.min(anchorPlaces.length, 3)),
        location: place,
        radius: 3000,
      }),
    ),
  );

  const merged = new Map();
  results.flat().forEach((place) => {
    if (!merged.has(place.id)) {
      merged.set(place.id, place);
    }
  });

  return Array.from(merged.values()).slice(0, limit);
}
