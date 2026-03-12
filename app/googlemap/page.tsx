"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, X, Navigation, RefreshCw, Locate } from "lucide-react";
import { Task } from "@/lib/types/task";
import { getOpenJobs } from "@/lib/api/jobs";
import dynamic from "next/dynamic";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Component to handle map operations
function MapController({ 
  jobs, 
  userLocation,
  centerOnUser 
}: { 
  jobs: Task[]; 
  userLocation: { lat: number; lng: number } | null;
  centerOnUser: boolean;
}) {
  // Import useMap hook directly (hooks can't be dynamically imported)
  const { useMap } = require("react-leaflet");
  const map = useMap();

  useEffect(() => {
    if (centerOnUser && userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 14);
      return;
    }

    // Fit bounds to show all job markers
    const jobsWithCoords = jobs.filter(job => job.lat && job.lng);
    if (jobsWithCoords.length > 0) {
      const L = require("leaflet");
      const bounds = L.latLngBounds(
        jobsWithCoords.map(job => [job.lat, job.lng])
      );
      
      // Add user location to bounds if available
      if (userLocation) {
        bounds.extend([userLocation.lat, userLocation.lng]);
      }
      
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 12);
    }
  }, [jobs, userLocation, centerOnUser, map]);

  return null;
}

export default function GoogleMapPage() {
  const [jobs, setJobs] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Task | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [centerOnUser, setCenterOnUser] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customIcon, setCustomIcon] = useState<any>(null);
  const [userIcon, setUserIcon] = useState<any>(null);

  // Default center (Toronto, Canada)
  const defaultCenter: [number, number] = [43.6532, -79.3832];

  // Load jobs from Firebase
  useEffect(() => {
    loadJobs();
    getUserLocation();
  }, []);

  // Load Leaflet CSS and icons
  useEffect(() => {
    // Import Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    // Fix for default marker icon and create custom icons
    const setupLeaflet = async () => {
      const L = await import("leaflet");
      
      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Create custom red icon for jobs
      const redIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      setCustomIcon(redIcon);

      // Create blue icon for user location
      const blueIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      setUserIcon(blueIcon);

      setMapReady(true);
    };

    setupLeaflet();

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Could not get user location:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      console.log("[GoogleMapPage] loadJobs: Starting to fetch jobs...");
      const openJobs = await getOpenJobs();
      console.log("[GoogleMapPage] loadJobs: Received jobs from getOpenJobs:", openJobs.length);
      
      // Process jobs - geocode any that don't have coordinates
      const processedJobs = await Promise.all(
        openJobs.map(async (job) => {
          // If job already has valid coordinates, use them
          if (job.lat && job.lng && job.lat !== 0 && job.lng !== 0) {
            return job;
          }
          
          // Try to geocode the address if no coordinates
          if (job.address) {
            try {
              const coords = await geocodeAddress(job.address);
              if (coords) {
                return { ...job, lat: coords.lat, lng: coords.lng };
              }
            } catch (error) {
              console.warn(`[GoogleMapPage] Could not geocode address for job ${job.jobId}:`, error);
            }
          }
          
          return job;
        })
      );
      
      console.log("[GoogleMapPage] loadJobs: Processed jobs:", processedJobs.length);
      setJobs(processedJobs);
    } catch (error) {
      console.error("[GoogleMapPage] loadJobs: Error loading jobs:", error);
      console.error("[GoogleMapPage] loadJobs: Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsLoading(false);
      console.log("[GoogleMapPage] loadJobs: Loading complete");
    }
  };

  // Geocode address using Nominatim (OpenStreetMap)
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            "User-Agent": "TaskZing/1.0",
          },
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadJobs();
    setIsRefreshing(false);
  };

  const handleCenterOnUser = () => {
    if (userLocation) {
      setCenterOnUser(true);
      setTimeout(() => setCenterOnUser(false), 100);
    } else {
      getUserLocation();
    }
  };

  const formatPrice = (task: Task) => {
    if (task.jobType === "fixed") {
      return `$${task.fixedPrice || task.price} FIXED`;
    }
    return `$${task.hourlyRate || task.price}/hr`;
  };

  // Get center based on jobs or user location
  const getMapCenter = (): [number, number] => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lng];
    }
    const jobsWithCoords = jobs.filter(j => j.lat && j.lng);
    if (jobsWithCoords.length > 0) {
      return [jobsWithCoords[0].lat, jobsWithCoords[0].lng];
    }
    return defaultCenter;
  };

  // Count jobs with valid coordinates
  const jobsWithLocation = jobs.filter(j => j.lat && j.lng);

  return (
    <div className="h-screen bg-gray-50 dark:bg-darkBlue-013 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-darkBlue-003 border-b border-gray-200 dark:border-gray-700 px-4 py-3 z-50">
        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Map View</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Refresh jobs"
            >
              <RefreshCw className={`h-5 w-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {jobsWithLocation.length} {jobsWithLocation.length === 1 ? "job" : "jobs"}
            </span>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden">
        {(isLoading || !mapReady) ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                {isLoading ? "Loading jobs..." : "Initializing map..."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <MapContainer
              center={getMapCenter()}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapController 
                jobs={jobs} 
                userLocation={userLocation}
                centerOnUser={centerOnUser}
              />
              
              {/* User location marker */}
              {userLocation && userIcon && (
                <Marker 
                  position={[userLocation.lat, userLocation.lng]}
                  icon={userIcon}
                >
                  <Popup>
                    <div className="text-center p-1">
                      <div className="flex items-center gap-1 justify-center mb-1">
                        <Navigation className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-sm">Your Location</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Job markers */}
              {jobs.map((job) => {
                if (!job.lat || !job.lng) return null;
                return (
                  <Marker
                    key={job.jobId}
                    position={[job.lat, job.lng]}
                    icon={customIcon}
                    eventHandlers={{
                      click: () => setSelectedJob(job),
                    }}
                  >
                    <Popup>
                      <div className="min-w-[220px] p-1">
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm">{job.title}</h3>
                        <p className="text-red-500 font-bold text-sm mb-1">{formatPrice(job)}</p>
                        <div className="flex items-start gap-1 text-xs text-gray-600 mb-2">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{job.address}</span>
                        </div>
                        {job.category && (
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs mb-2">
                            {job.category}
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="block w-full text-center px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Locate me button */}
            <button
              onClick={handleCenterOnUser}
              className="absolute bottom-24 right-4 z-[1000] p-3 bg-white dark:bg-darkBlue-203 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Center on my location"
            >
              <Locate className="h-5 w-5 text-blue-500" />
            </button>
          </>
        )}

        {/* Job Info Panel */}
        {selectedJob && !isLoading && mapReady && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white dark:bg-darkBlue-203 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[1000]">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 pr-2">
                  {selectedJob.title}
                </h3>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {selectedJob.photos && selectedJob.photos.length > 0 && (
                <div className="mb-3">
                  <img
                    src={selectedJob.photos[0]}
                    alt={selectedJob.title}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{selectedJob.address}</span>
                </div>
                <div className="text-red-500 font-bold text-lg">
                  {formatPrice(selectedJob)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.category && (
                    <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                      {selectedJob.category}
                    </span>
                  )}
                  {selectedJob.urgency && selectedJob.urgency !== "normal" && (
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      selectedJob.urgency === "urgent" ? "bg-red-100 text-red-700" :
                      selectedJob.urgency === "high" ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {selectedJob.urgency.charAt(0).toUpperCase() + selectedJob.urgency.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                {selectedJob.description}
              </p>

              <div className="flex gap-2">
                <Link
                  href={`/job-details/${selectedJob.jobId}`}
                  className="flex-1 text-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  View Details
                </Link>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Jobs count overlay (Mobile) */}
        {!isLoading && mapReady && (
          <div className="absolute top-4 left-4 right-4 sm:hidden z-[1000]">
            <div className="bg-white dark:bg-darkBlue-203 rounded-lg shadow-lg p-2 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {jobsWithLocation.length} {jobsWithLocation.length === 1 ? "job" : "jobs"} on map
                {jobs.length !== jobsWithLocation.length && (
                  <span className="text-xs text-gray-400 ml-1">
                    ({jobs.length - jobsWithLocation.length} without location)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
