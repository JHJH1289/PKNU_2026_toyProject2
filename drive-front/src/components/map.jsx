import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { latitude: 37.5666103, longitude: 126.9783882 };
const ROUTE_LINE_COLOR = "#1d9bf0";
const ROUTE_LINE_SHADOW = "#ffffff";
const ROUTE_MARKER_FILL = "#1d9bf0";
const ROUTE_MARKER_STROKE = "#ffffff";
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
  onLocationRename,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const placesServiceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLinesRef = useRef([]);
  const clickListenerRef = useRef(null);
  const infoWindowRef = useRef(null);
  const [maps, setMaps] = useState(null);
  const [status, setStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [editingLocationIndex, setEditingLocationIndex] = useState(null);
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

  const postRouteGroups = useMemo(
    () =>
      posts
        .map((post) => {
          const locations = Array.isArray(post.locations)
            ? post.locations.filter((location) => hasCoordinates(location))
            : hasCoordinates(post)
              ? [post]
              : [];

          return locations.map((location) => ({
            ...location,
            caption: post.caption,
          }));
        })
        .filter((locations) => locations.length > 1),
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
          setStatus(
            "Google Maps API key is empty. Set VITE_GOOGLE_MAPS_API_KEY.",
          );
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
    routeLinesRef.current.forEach((line) => line.setMap(null));
    routeLinesRef.current = [];

    const bounds = new maps.LatLngBounds();
    const points = [];

    function addPointToBounds(point) {
      points.push(point);
      bounds.extend(point);
    }

    function createRouteLine(path) {
      if (path.length < 2) return;

      const shadowLine = new maps.Polyline({
        path,
        geodesic: true,
        strokeColor: ROUTE_LINE_SHADOW,
        strokeOpacity: 0.95,
        strokeWeight: 8,
        zIndex: 1,
      });

      const routeLine = new maps.Polyline({
        path,
        geodesic: true,
        strokeColor: ROUTE_LINE_COLOR,
        strokeOpacity: 0.78,
        strokeWeight: 4,
        zIndex: 2,
      });

      shadowLine.setMap(mapRef.current);
      routeLine.setMap(mapRef.current);
      routeLinesRef.current.push(shadowLine, routeLine);
    }

    function createRouteMarker(location, index, total, titleFallback) {
      const position = toLatLng(location);
      const marker = new maps.Marker({
        map: mapRef.current,
        position,
        title: location.locationName || location.caption || titleFallback,
        label: {
          text: String(index + 1),
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: "800",
        },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: total > 9 ? 13 : 12,
          fillColor: ROUTE_MARKER_FILL,
          fillOpacity: 0.95,
          strokeColor: ROUTE_MARKER_STROKE,
          strokeWeight: 3,
        },
        zIndex: 5,
      });

      marker.addListener("click", () => {
        infoWindowRef.current.setContent(
          `<div class="travel-map-info"><strong>${escapeHtml(location.locationName || `Place ${index + 1}`)}</strong><span>${escapeHtml(location.caption || "")}</span></div>`,
        );
        infoWindowRef.current.open({
          anchor: marker,
          map: mapRef.current,
        });
      });

      markersRef.current.push(marker);
      addPointToBounds(position);
    }

    const activeLocations =
      selectedLocations.length > 0
        ? selectedLocations.filter((location) => hasCoordinates(location))
        : hasCoordinates(selectedPosition)
          ? [selectedPosition]
          : [];

    if (selectable) {
      activeLocations.forEach((selectedLocation, index) => {
        createRouteMarker(
          selectedLocation,
          index,
          activeLocations.length,
          locationName || "Selected place",
        );
      });
      createRouteLine(activeLocations.map((location) => toLatLng(location)));
    } else {
      mappedPosts.forEach((post) => {
        const position = toLatLng(post);
        addPointToBounds(position);

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

      postRouteGroups.forEach((locations) => {
        createRouteLine(locations.map((location) => toLatLng(location)));
      });
    }

    if (
      selectable &&
      activeLocations.length === 0 &&
      hasCoordinates(currentPosition)
    ) {
      const current = toLatLng(currentPosition);
      addPointToBounds(current);
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
  }, [
    currentPosition,
    locationName,
    mappedPosts,
    maps,
    postRouteGroups,
    selectable,
    selectedLocations,
    selectedPosition,
  ]);

  const reverseGeocodePoint = useCallback(
    (point) => {
      if (!geocoderRef.current) {
        onLocationSelect?.({
          latitude: point.lat(),
          longitude: point.lng(),
          locationName: "Selected place",
        });
        return;
      }

      setStatus("Loading place...");
      geocoderRef.current.geocode(
        { location: point, region: "KR" },
        (results, responseStatus) => {
          setStatus("");
          onLocationSelect?.({
            latitude: point.lat(),
            longitude: point.lng(),
            locationName:
              responseStatus === "OK" && results?.[0]?.formatted_address
                ? results[0].formatted_address
                : "Selected place",
          });
        },
      );
    },
    [onLocationSelect],
  );

  const selectClickedLocation = useCallback(
    (event) => {
      const point = event.latLng;
      if (!point) return;

      if (event.placeId && placesServiceRef.current) {
        event.stop?.();
        setStatus("Loading place...");
        placesServiceRef.current.getDetails(
          {
            placeId: event.placeId,
            fields: ["name", "formatted_address", "geometry"],
          },
          (place, responseStatus) => {
            if (responseStatus === "OK" && place) {
              const placePoint = place.geometry?.location || point;
              setStatus("");
              onLocationSelect?.({
                latitude: placePoint.lat(),
                longitude: placePoint.lng(),
                locationName: place.name || place.formatted_address || "Place",
              });
              return;
            }

            reverseGeocodePoint(point);
          },
        );
        return;
      }

      reverseGeocodePoint(point);
    },
    [onLocationSelect, reverseGeocodePoint],
  );

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
          selectClickedLocation(event);
        },
      );
    }

    return () => {
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
    };
  }, [maps, selectable, selectClickedLocation]);

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
        <strong>{selectable ? "Route Map" : "Travel Route"}</strong>
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
            <>
              {selectedLocations.length > 1 && (
                <small className="travel-route-hint">
                  {selectedLocations.length}
                </small>
              )}
              {selectedLocations.map((location, index) => (
                <div
                  className="travel-location-item"
                  key={`${location.latitude}-${location.longitude}-${index}`}
                >
                  <b>{index + 1}</b>
                  {editingLocationIndex === index ? (
                    <input
                      className="travel-location-name-input"
                      type="text"
                      value={location.locationName || ""}
                      placeholder="장소 이름 입력"
                      aria-label={`Place ${index + 1} name`}
                      autoFocus
                      onChange={(event) =>
                        onLocationRename?.(index, event.target.value)
                      }
                      onBlur={() => setEditingLocationIndex(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          setEditingLocationIndex(null);
                        }
                      }}
                    />
                  ) : (
                    <button
                      className="travel-location-name-button"
                      type="button"
                      onClick={() => setEditingLocationIndex(index)}
                      title="클릭해서 장소 이름 수정"
                    >
                      {location.locationName || `Place ${index + 1}`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onLocationRemove?.(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </>
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
