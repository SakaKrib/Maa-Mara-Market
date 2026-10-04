import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation, Search } from "lucide-react";

export default function GPSLocationInput({
  value,
  onChange,
  label = "Workshop Location",
  placeholder = "Search for your workshop location...",
  required = false,
  error = null,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [usingGPS, setUsingGPS] = useState(false);
  const [searching, setSearching] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    abortControllerRef.current?.abort();
  }, []);

  const updateLocation = (changes) => {
    onChange({ ...value, ...changes });
  };

  const searchLocations = (searchValue) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    abortControllerRef.current?.abort();

    if (searchValue.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(searchValue.trim())}`,
          {
            headers: {
              Accept: "application/json",
              "Accept-Language": "en",
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) throw new Error("Unable to search locations.");

        const data = await response.json();
        if (!controller.signal.aborted && Array.isArray(data)) {
          setSuggestions(data);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Location search failed:", err);
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 500);
  };

  const handleInputChange = (searchValue) => {
    setGpsError(null);
    updateLocation({ locationSearch: searchValue, latitude: null, longitude: null });
    setSuggestions([]);
  };

  const handleSearch = () => {
    setGpsError(null);
    searchLocations(value?.locationSearch || "");
  };

  const handleSelectLocation = (location) => {
    const latitude = Number(location.lat);
    const longitude = Number(location.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    setGpsError(null);
    updateLocation({
      locationSearch: location.display_name,
      latitude,
      longitude,
    });
    setSuggestions([]);
  };

  const handleUseCurrentLocation = () => {
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError("Location services are not available in this browser. Please search for your workshop location instead.");
      return;
    }

    if (!window.isSecureContext) {
      setGpsError("GPS location requires a secure connection (HTTPS). Please use HTTPS or localhost.");
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setSearching(false);
    setUsingGPS(true);
    setSuggestions([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        if (
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          setGpsError("Your device returned an invalid GPS location. Please try again.");
          setUsingGPS(false);
          return;
        }

        updateLocation({ latitude, longitude });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`,
            {
              headers: {
                Accept: "application/json",
                "Accept-Language": "en",
              },
            }
          );

          if (!response.ok) throw new Error("Unable to determine the address.");

          const data = await response.json();
          const detectedLocation =
            typeof data?.display_name === "string" ? data.display_name : "";

          updateLocation({
            locationSearch: detectedLocation,
            latitude,
            longitude,
          });

          if (detectedLocation) {
            setSuggestions([
              {
                display_name: detectedLocation,
                lat: String(latitude),
                lon: String(longitude),
                place_id: data?.place_id,
                type: data?.type,
                address: data?.address,
              },
            ]);
          }

          setGpsError(null);
        } catch (err) {
          console.error("GPS reverse geocoding failed:", err);
          setGpsError(
            "Your GPS location was captured, but we could not determine the address. You can continue with the captured location."
          );
          updateLocation({ latitude, longitude });
        } finally {
          setUsingGPS(false);
        }
      },
      (geoError) => {
        let message = "Unable to get your current location. Please try again.";

        if (geoError.code === geoError.PERMISSION_DENIED) {
          message = "Location permission was denied. Please allow location access for this site and try again.";
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = "Your current location could not be determined. Please make sure location services are enabled and try again.";
        } else if (geoError.code === geoError.TIMEOUT) {
          message = "The request for your current location timed out. Please try again.";
        }

        setGpsError(message);
        setUsingGPS(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div>
      {label && (
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="ml-1 text-error-600">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-500" />

          <input
            type="text"
            value={value?.locationSearch || ""}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
            className="input-field w-full border border-brand-200 bg-brand-50 p-4 pl-11 text-left dark:border-brand-700 dark:bg-brand-900/20"
          />

          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-brand-500" />
          )}

          {!searching && (
            <button type="button" onClick={handleSearch} disabled={(value?.locationSearch || "").trim().length < 3} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50" aria-label="Search location"><Search className="h-4 w-4" /></button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-brand-200 bg-brand-50 shadow-lg dark:border-brand-700 dark:bg-brand-900">
            {suggestions.map((location, index) => (
              <button
                key={`${location.display_name}-${index}`}
                type="button"
                onClick={() => handleSelectLocation(location)}
                className="flex w-full items-start gap-3 border-b border-brand-100 px-3 py-3 text-left text-sm last:border-b-0 hover:bg-brand-100 dark:border-brand-800 dark:hover:bg-brand-800"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span className="text-gray-700 dark:text-gray-200">
                  {location.display_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={usingGPS}
        className="btn-secondary mt-3 flex w-full items-center justify-center gap-2"
      >
        {usingGPS ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Getting your location...
          </>
        ) : (
          <>
            <Navigation className="h-4 w-4" />
            Use My Current Location
          </>
        )}
      </button>

      <p className="mt-2 text-xs text-muted-foreground">Location search provided by OpenStreetMap Nominatim.</p>

      {gpsError && (
        <p className="mt-2 text-sm text-error-600 dark:text-error-400" role="alert">
          {gpsError}
        </p>
      )}

      {value?.latitude != null && value?.longitude != null && (
        <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-gray-500 dark:bg-brand-900/30 dark:text-gray-400">
          <span className="font-medium">GPS:</span>{" "}
          {Number(value.latitude).toFixed(6)}, {Number(value.longitude).toFixed(6)}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-error-600">{error}</p>}
    </div>
  );
}
