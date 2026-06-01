const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { latitude: 37.5666103, longitude: 126.9783882 };

let googleMapsPromise;

export function loadGoogleMaps() {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
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

  return googleMapsPromise;
}

export async function searchGooglePlaces({
  region,
  themes = [],
  limit = 12,
  keyword = "관광지",
  location = null,
  radius = 250000,
}) {
  const maps = await loadGoogleMaps();
  const container = document.createElement("div");
  const center = location
    ? { lat: location.latitude, lng: location.longitude }
    : { lat: DEFAULT_CENTER.latitude, lng: DEFAULT_CENTER.longitude };
  const map = new maps.Map(container, {
    center,
    zoom: 11,
  });
  const service = new maps.places.PlacesService(map);
  const query = [region, ...themes, keyword].filter(Boolean).join(" ");

  return new Promise((resolve) => {
    service.textSearch(
      {
        query,
        location: center,
        radius,
        region: "KR",
      },
      (results, status) => {
        if (status !== maps.places.PlacesServiceStatus.OK || !Array.isArray(results)) {
          resolve([]);
          return;
        }

        resolve(
          results.slice(0, limit).map((place) => ({
            id: place.place_id || place.name,
            name: place.name || "Place",
            address: place.formatted_address || "",
            latitude: place.geometry?.location?.lat(),
            longitude: place.geometry?.location?.lng(),
            rating: place.rating || null,
            userRatingsTotal: place.user_ratings_total || 0,
            theme: keyword,
            description: place.formatted_address || "",
          })),
        );
      },
    );
  });
}

export async function searchRestaurantsNearPlaces({ places, region, limit = 10 }) {
  const anchorPlaces = (places || []).filter(
    (place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude),
  );

  if (anchorPlaces.length === 0) {
    return searchGooglePlaces({
      region,
      keyword: "맛집",
      limit,
      radius: 120000,
    });
  }

  const results = await Promise.all(
    anchorPlaces.slice(0, 3).map((place) =>
      searchGooglePlaces({
        region: place.name,
        keyword: "근처 맛집",
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
