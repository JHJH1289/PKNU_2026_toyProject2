import { useEffect, useMemo, useRef, useState } from "react";

const NAVER_MAP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID || "";
const DEFAULT_CENTER = { latitude: 37.5666103, longitude: 126.9783882 };
let naverMapsPromise;

function loadNaverMaps() {
  if (window.naver?.maps) {
    return Promise.resolve(window.naver.maps);
  }

  if (!NAVER_MAP_CLIENT_ID) {
    return Promise.reject(new Error("NAVER_MAP_CLIENT_ID_EMPTY"));
  }

  if (!naverMapsPromise) {
    naverMapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const params = new URLSearchParams({
        ncpKeyId: NAVER_MAP_CLIENT_ID,
        submodules: "geocoder",
      });
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?${params}`;
      script.async = true;
      script.onload = () => resolve(window.naver.maps);
      script.onerror = () => reject(new Error("NAVER_MAP_LOAD_FAILED"));
      document.head.appendChild(script);
    });
  }

  return naverMapsPromise;
}

function hasCoordinates(value) {
  return Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude);
}

export default function Map({
  posts = [],
  selectable = false,
  selectedPosition = null,
  locationName = "",
  onLocationSelect,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const clickListenerRef = useRef(null);
  const [maps, setMaps] = useState(null);
  const [status, setStatus] = useState("");

  const mappedPosts = useMemo(
    () => posts.filter((post) => hasCoordinates(post)),
    [posts],
  );

  useEffect(() => {
    let cancelled = false;

    loadNaverMaps()
      .then((nextMaps) => {
        if (!cancelled) setMaps(nextMaps);
      })
      .catch((error) => {
        if (error.message === "NAVER_MAP_CLIENT_ID_EMPTY") {
          setStatus("Naver map key is empty. Set VITE_NAVER_MAP_CLIENT_ID.");
          return;
        }

        setStatus("Failed to load Naver map.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!maps || !mapElementRef.current || mapRef.current) return;

    const center = hasCoordinates(selectedPosition)
      ? selectedPosition
      : mappedPosts[0] || DEFAULT_CENTER;

    mapRef.current = new maps.Map(mapElementRef.current, {
      center: new maps.LatLng(center.latitude, center.longitude),
      zoom: mappedPosts.length > 1 ? 9 : 13,
    });
  }, [mappedPosts, maps, selectedPosition]);

  useEffect(() => {
    if (!maps || !mapRef.current) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new maps.LatLngBounds();
    const points = [];

    mappedPosts.forEach((post) => {
      const position = new maps.LatLng(post.latitude, post.longitude);
      points.push(position);
      bounds.extend(position);

      const marker = new maps.Marker({
        map: mapRef.current,
        position,
        title: post.locationName || post.caption || "Post",
      });

      const infoWindow = new maps.InfoWindow({
        content: `<div class="travel-map-info"><strong>${escapeHtml(post.locationName || "Place")}</strong><span>${escapeHtml(post.caption || "")}</span></div>`,
      });

      maps.Event.addListener(marker, "click", () => {
        infoWindow.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    if (hasCoordinates(selectedPosition)) {
      const selected = new maps.LatLng(
        selectedPosition.latitude,
        selectedPosition.longitude,
      );
      points.push(selected);
      bounds.extend(selected);
      markersRef.current.push(
        new maps.Marker({
          map: mapRef.current,
          position: selected,
          title: locationName || "Selected place",
        }),
      );
    }

    if (points.length > 1) {
      mapRef.current.fitBounds(bounds);
    } else if (points.length === 1) {
      mapRef.current.setCenter(points[0]);
    }
  }, [locationName, mappedPosts, maps, selectedPosition]);

  useEffect(() => {
    if (!maps || !mapRef.current) return;

    if (clickListenerRef.current) {
      maps.Event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }

    if (selectable) {
      clickListenerRef.current = maps.Event.addListener(
        mapRef.current,
        "click",
        (event) => {
          const point = event.coord;
          onLocationSelect?.({
            latitude: point.lat(),
            longitude: point.lng(),
            locationName,
          });
        },
      );
    }

    return () => {
      if (clickListenerRef.current) {
        maps.Event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [locationName, maps, onLocationSelect, selectable]);

  function searchLocation() {
    if (!maps?.Service?.geocode || !locationName.trim()) return;

    maps.Service.geocode({ query: locationName.trim() }, (responseStatus, response) => {
      if (responseStatus !== maps.Service.Status.OK) {
        setStatus("Place search failed.");
        return;
      }

      const address = response.v2.addresses[0];
      if (!address) {
        setStatus("No matching place found.");
        return;
      }

      const nextPosition = {
        latitude: Number(address.y),
        longitude: Number(address.x),
        locationName: address.roadAddress || address.jibunAddress || locationName,
      };
      setStatus("");
      onLocationSelect?.(nextPosition);
    });
  }

  return (
    <section className={selectable ? "travel-map-picker" : "travel-map-slot"}>
      <div className="travel-map-head">
        <strong>Map API Area</strong>
        {selectable && (
          <button
            type="button"
            onClick={searchLocation}
            disabled={!maps || !locationName.trim()}
          >
            Search
          </button>
        )}
      </div>
      <div className="travel-map-canvas" ref={mapElementRef}>
        {status && <span>{status}</span>}
        {!status && !mappedPosts.length && !selectable && (
          <span>No post locations yet.</span>
        )}
      </div>
      {selectable && (
        <small>
          {hasCoordinates(selectedPosition)
            ? `${selectedPosition.latitude.toFixed(6)}, ${selectedPosition.longitude.toFixed(6)}`
            : "Search a place or click the map."}
        </small>
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
