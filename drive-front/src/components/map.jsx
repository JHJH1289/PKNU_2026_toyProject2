import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps } from "../utils/googlePlaces";

const DEFAULT_CENTER = { latitude: 37.5666103, longitude: 126.9783882 };
const ROUTE_LINE_COLOR = "#1d9bf0";
const ROUTE_LINE_SHADOW = "#ffffff";
const ROUTE_MARKER_STROKE = "#ffffff";
const MARKER_PIN_PATH =
  "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";
const DEFAULT_CATEGORY = "여행";
const DEFAULT_CATEGORY_ORDER = ["여행", "카페", "식사"];
const CATEGORY_MARKER_COLORS = {
  여행: "#1d9bf0",
  카페: "#a855f7",
  식사: "#f97316",
  more: "#10b981",
};
const CATEGORY_LEGEND_ITEMS = [
  { key: "여행", label: "여행", color: CATEGORY_MARKER_COLORS.여행 },
  { key: "카페", label: "카페", color: CATEGORY_MARKER_COLORS.카페 },
  { key: "식사", label: "식사", color: CATEGORY_MARKER_COLORS.식사 },
  { key: "more", label: "More tags", color: CATEGORY_MARKER_COLORS.more },
];

function hasCoordinates(value) {
  return Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude);
}

function toLatLng(position) {
  return { lat: position.latitude, lng: position.longitude };
}

function splitCategoryTags(value) {
  if (!value) return [DEFAULT_CATEGORY];

  const tags = String(value)
    .split(/[,#\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags.length ? tags : [DEFAULT_CATEGORY];
}

function getMarkerCategory(categoryTag) {
  const [primaryTag] = splitCategoryTags(categoryTag);
  return DEFAULT_CATEGORY_ORDER.includes(primaryTag) ? primaryTag : "more";
}

function getMarkerColor(categoryTag) {
  return (
    CATEGORY_MARKER_COLORS[getMarkerCategory(categoryTag)] ||
    CATEGORY_MARKER_COLORS.more
  );
}

function getMarkerCategoryLabel(categoryTag) {
  const category = getMarkerCategory(categoryTag);
  return category === "more" ? "More tags" : category;
}

function getLocationAddress(location) {
  return (
    location?.address ||
    location?.formattedAddress ||
    location?.formatted_address ||
    ""
  );
}

function pickGeocoderAddress(results) {
  if (!Array.isArray(results) || results.length === 0) return "";

  const preferredResult =
    results.find((result) =>
      result.types?.some((type) =>
        ["street_address", "premise", "subpremise", "route"].includes(type),
      ),
    ) || results[0];

  return preferredResult?.formatted_address || "";
}

function buildInfoWindowContent({ title, address, caption }) {
  const addressRow = address
    ? `<span class="travel-map-address">${escapeHtml(address)}</span>`
    : "";
  const captionRow = caption
    ? `<span class="travel-map-caption">${escapeHtml(caption)}</span>`
    : "";

  return `<div class="travel-map-info"><strong>${escapeHtml(title)}</strong>${addressRow}${captionRow}</div>`;
}

export default function Map({
  posts = [],
  selectable = false,
  selectedPosition = null,
  selectedLocations = [],
  locationName = "",
  title,
  markerCategoryTag = DEFAULT_CATEGORY,
  showCategoryLegend = false,
  showMarkerLabels = true,
  showRouteLines = true,
  onLocationSelect,
  onLocationRemove,
  onLocationRename,
  onLocationReorder,
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
  const [draggingLocationIndex, setDraggingLocationIndex] = useState(null);
  const [dragOverLocationIndex, setDragOverLocationIndex] = useState(null);
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
              categoryTag: post.categoryTag,
            }));
        }

        return hasCoordinates(post)
          ? [{ ...post, categoryTag: post.categoryTag }]
          : [];
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
            categoryTag: post.categoryTag,
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
      if (!showRouteLines || path.length < 2) return;

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

    function createRouteMarker(
      location,
      index,
      total,
      titleFallback,
      categoryTag = markerCategoryTag,
    ) {
      const position = toLatLng(location);
      const markerColor = getMarkerColor(location.categoryTag || categoryTag);
      const titleText =
        location.locationName || location.caption || titleFallback;
      const categoryLabel = getMarkerCategoryLabel(
        location.categoryTag || categoryTag,
      );
      const marker = new maps.Marker({
        map: mapRef.current,
        position,
        title: `${titleText} · ${categoryLabel}`,
        label: showMarkerLabels
          ? {
              text: String(index + 1),
              color: "#ffffff",
              fontSize: total > 9 ? "10px" : "11px",
              fontWeight: "800",
            }
          : undefined,
        icon: {
          path: MARKER_PIN_PATH,
          scale: showMarkerLabels ? 1.32 : 1.18,
          fillColor: markerColor,
          fillOpacity: 0.96,
          strokeColor: ROUTE_MARKER_STROKE,
          strokeWeight: 2,
          anchor: new maps.Point(12, 22),
          labelOrigin: new maps.Point(12, 9),
        },
        zIndex: 5,
      });

      marker.addListener("click", () => {
        const title = location.locationName || `Place ${index + 1}`;
        const caption = location.caption || "";
        const address = getLocationAddress(location);

        infoWindowRef.current.setContent(
          buildInfoWindowContent({ title, address, caption }),
        );
        infoWindowRef.current.open({
          anchor: marker,
          map: mapRef.current,
        });

        if (!address && geocoderRef.current) {
          geocoderRef.current.geocode(
            { location: position, region: "KR" },
            (results, responseStatus) => {
              if (responseStatus !== "OK") return;

              const resolvedAddress = pickGeocoderAddress(results);
              if (!resolvedAddress) return;

              location.address = resolvedAddress;
              infoWindowRef.current.setContent(
                buildInfoWindowContent({
                  title,
                  address: resolvedAddress,
                  caption,
                }),
              );
            },
          );
        }
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
      mappedPosts.forEach((post, index) => {
        createRouteMarker(post, index, mappedPosts.length, "Post");
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
    markerCategoryTag,
    maps,
    postRouteGroups,
    selectable,
    showMarkerLabels,
    showRouteLines,
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
          const address =
            responseStatus === "OK" ? pickGeocoderAddress(results) : "";

          onLocationSelect?.({
            latitude: point.lat(),
            longitude: point.lng(),
            locationName: address || "Selected place",
            address,
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
              const address = place.formatted_address || "";
              setStatus("");
              onLocationSelect?.({
                latitude: placePoint.lat(),
                longitude: placePoint.lng(),
                locationName: place.name || address || "Place",
                address,
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
            const address = result.formatted_address || "";
            setStatus("");
            onLocationSelect?.({
              latitude: point.lat(),
              longitude: point.lng(),
              locationName: result.name || address || query,
              address,
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
        const address = pickGeocoderAddress(results);
        setStatus("");
        onLocationSelect?.({
          latitude: point.lat(),
          longitude: point.lng(),
          locationName: address || result.formatted_address || query,
          address: address || result.formatted_address || "",
        });
        setSearchText("");
      },
    );
  }

  function resetLocationDrag() {
    setDraggingLocationIndex(null);
    setDragOverLocationIndex(null);
  }

  function handleLocationDragStart(event, index) {
    if (selectedLocations.length < 2) return;

    setDraggingLocationIndex(index);
    setDragOverLocationIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function handleLocationDragOver(event, index) {
    if (draggingLocationIndex === null) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverLocationIndex(index);
  }

  function handleLocationDrop(event, index) {
    event.preventDefault();

    const dataIndex = Number(event.dataTransfer.getData("text/plain"));
    const fromIndex = Number.isInteger(dataIndex)
      ? dataIndex
      : draggingLocationIndex;

    if (Number.isInteger(fromIndex) && fromIndex >= 0 && fromIndex !== index) {
      onLocationReorder?.(fromIndex, index);
    }

    resetLocationDrag();
  }

  return (
    <section className={selectable ? "travel-map-picker" : "travel-map-slot"}>
      <div className="travel-map-head">
        <strong>{title || (selectable ? "Route Map" : "Travel Route")}</strong>
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
      {showCategoryLegend && !selectable && (
        <div className="travel-map-legend" aria-label="Map marker categories">
          {CATEGORY_LEGEND_ITEMS.map((item) => (
            <span key={item.key}>
              <i style={{ backgroundColor: item.color }} aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      )}
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
              {selectedLocations.map((location, index) => {
                const canDragLocation = selectedLocations.length > 1;
                const isDragging = draggingLocationIndex === index;
                const isDragOver =
                  dragOverLocationIndex === index &&
                  draggingLocationIndex !== index;

                return (
                  <div
                    className={`travel-location-item${
                      isDragging ? " is-dragging" : ""
                    }${isDragOver ? " is-drag-over" : ""}`}
                    key={`${location.latitude}-${location.longitude}-${index}`}
                    draggable={
                      canDragLocation && editingLocationIndex !== index
                    }
                    aria-grabbed={isDragging}
                    title={
                      canDragLocation ? "Drag to reorder places" : undefined
                    }
                    onDragStart={(event) =>
                      handleLocationDragStart(event, index)
                    }
                    onDragOver={(event) => handleLocationDragOver(event, index)}
                    onDrop={(event) => handleLocationDrop(event, index)}
                    onDragEnd={resetLocationDrag}
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
                );
              })}
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
