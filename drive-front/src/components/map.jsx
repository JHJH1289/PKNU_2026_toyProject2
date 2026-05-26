import { useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { latitude: 37.5666103, longitude: 126.9783882 };
let googleMapsPromise;

function loadGoogleMaps() {
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

function hasCoordinates(value) {
  return Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude);
}

function toLatLng(position) {
  return { lat: position.latitude, lng: position.longitude };
}

export default function Map({
  posts = [],
  selectable = false,
  selectedPosition = null,
  selectedLocations = [],
  locationName = "",
  onLocationSelect,
  onLocationRemove,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const placesServiceRef = useRef(null);
  const markersRef = useRef([]);
  const clickListenerRef = useRef(null);
  const infoWindowRef = useRef(null);
  const [maps, setMaps] = useState(null);
  const [status, setStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [currentPosition, setCurrentPosition] = useState(null);

  const mappedPosts = useMemo(
    () =>
      posts.flatMap((post) => {
        if (Array.isArray(post.locations) && post.locations.length > 0) {
          return post.locations
            .filter((location) => hasCoordinates(location))
            .map((location) => ({
              ...location,
              caption: post.caption,
            }));
        }

        return hasCoordinates(post) ? [post] : [];
      }),
    [posts],
  );

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((nextMaps) => {
        if (!cancelled) setMaps(nextMaps);
      })
      .catch((error) => {
        if (error.message === "GOOGLE_MAPS_API_KEY_EMPTY") {
          setStatus("Google Maps API key is empty. Set VITE_GOOGLE_MAPS_API_KEY.");
          return;
        }

        setStatus("Failed to load Google Maps.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectable || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationName: "Current location",
        });
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 8000,
      },
    );
  }, [selectable]);

  useEffect(() => {
    if (!maps || !mapElementRef.current || mapRef.current) return;

    const center = hasCoordinates(selectedPosition)
      ? selectedPosition
      : currentPosition || mappedPosts[0] || DEFAULT_CENTER;

    mapRef.current = new maps.Map(mapElementRef.current, {
      center: toLatLng(center),
      zoom: mappedPosts.length > 1 ? 9 : 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    geocoderRef.current = new maps.Geocoder();
    if (maps.places?.PlacesService) {
      placesServiceRef.current = new maps.places.PlacesService(mapRef.current);
    }
    infoWindowRef.current = new maps.InfoWindow();
  }, [currentPosition, mappedPosts, maps, selectedPosition]);

  useEffect(() => {
    if (!maps || !mapRef.current) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new maps.LatLngBounds();
    const points = [];

    mappedPosts.forEach((post) => {
      const position = toLatLng(post);
      points.push(position);
      bounds.extend(position);

      const marker = new maps.Marker({
        map: mapRef.current,
        position,
        title: post.locationName || post.caption || "Post",
      });

      marker.addListener("click", () => {
        infoWindowRef.current.setContent(
          `<div class="travel-map-info"><strong>${escapeHtml(post.locationName || "Place")}</strong><span>${escapeHtml(post.caption || "")}</span></div>`,
        );
        infoWindowRef.current.open({
          anchor: marker,
          map: mapRef.current,
        });
      });

      markersRef.current.push(marker);
    });

    const activeLocations = selectedLocations.length > 0
      ? selectedLocations
      : hasCoordinates(selectedPosition)
        ? [selectedPosition]
        : [];

    activeLocations.forEach((selectedLocation) => {
      const selected = toLatLng(selectedLocation);
      points.push(selected);
      bounds.extend(selected);
      markersRef.current.push(
        new maps.Marker({
          map: mapRef.current,
          position: selected,
          title: selectedLocation.locationName || locationName || "Selected place",
        }),
      );
    });

    if (selectable && activeLocations.length === 0 && hasCoordinates(currentPosition)) {
      const current = toLatLng(currentPosition);
      points.push(current);
      bounds.extend(current);
      markersRef.current.push(
        new maps.Marker({
          map: mapRef.current,
          position: current,
          title: "Current location",
          label: "You",
        }),
      );
    }

    if (points.length > 1) {
      mapRef.current.fitBounds(bounds);
    } else if (points.length === 1) {
      mapRef.current.setCenter(points[0]);
    }
  }, [currentPosition, locationName, mappedPosts, maps, selectable, selectedLocations, selectedPosition]);

  useEffect(() => {
    if (!maps || !mapRef.current) return;

    if (clickListenerRef.current) {
      clickListenerRef.current.remove();
      clickListenerRef.current = null;
    }

    if (selectable) {
      clickListenerRef.current = mapRef.current.addListener(
        "click",
        (event) => {
          const point = event.latLng;
          onLocationSelect?.({
            latitude: point.lat(),
            longitude: point.lng(),
            locationName: searchText.trim() || locationName || "Pinned place",
          });
        },
      );
    }

    return () => {
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
    };
  }, [locationName, maps, onLocationSelect, searchText, selectable]);

  function searchLocation() {
    const query = searchText.trim();
    if (!query) return;
    setStatus("Searching place...");

    if (placesServiceRef.current) {
      placesServiceRef.current.textSearch(
        {
          query,
          location: toLatLng(currentPosition || DEFAULT_CENTER),
          radius: 250000,
          region: "KR",
        },
        (results, responseStatus) => {
          if (responseStatus === "OK" && results?.[0]) {
            const result = results[0];
            const point = result.geometry.location;
            setStatus("");
            onLocationSelect?.({
              latitude: point.lat(),
              longitude: point.lng(),
              locationName: result.name || result.formatted_address || query,
            });
            setSearchText("");
            return;
          }

          searchAddress(query, responseStatus);
        },
      );
      return;
    }

    searchAddress(query);
  }

  function searchAddress(query, placeStatus = "") {
    if (!geocoderRef.current) return;

    geocoderRef.current.geocode(
      { address: query, region: "KR" },
      (results, responseStatus) => {
        if (responseStatus !== "OK" || !results?.[0]) {
          setStatus(
            placeStatus
              ? `Place search failed. Places: ${placeStatus}, Geocoder: ${responseStatus}.`
              : `Place search failed. Geocoder: ${responseStatus}.`,
          );
          return;
        }

        const result = results[0];
        const point = result.geometry.location;
        setStatus("");
        onLocationSelect?.({
          latitude: point.lat(),
          longitude: point.lng(),
          locationName: result.formatted_address || query,
        });
        setSearchText("");
      },
    );
  }

  return (
    <section className={selectable ? "travel-map-picker" : "travel-map-slot"}>
      <div className="travel-map-head">
        <strong>Map API Area</strong>
        {selectable && (
          <div className="travel-map-search">
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  searchLocation();
                }
              }}
              placeholder="Search place"
            />
            <button
              type="button"
              onClick={searchLocation}
              disabled={!maps || !searchText.trim()}
            >
              Search
            </button>
          </div>
        )}
      </div>
      <div className="travel-map-canvas" ref={mapElementRef}>
        {status && <span>{status}</span>}
        {!status && !mappedPosts.length && !selectable && (
          <span>No post locations yet.</span>
        )}
      </div>
      {selectable && (
        <div className="travel-location-list">
          {selectedLocations.length === 0 ? (
            <small>Search places or click the map.</small>
          ) : (
            selectedLocations.map((location, index) => (
              <span key={`${location.locationName}-${location.latitude}-${location.longitude}`}>
                {location.locationName || `Place ${index + 1}`}
                <button type="button" onClick={() => onLocationRemove?.(index)}>
                  Remove
                </button>
              </span>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
