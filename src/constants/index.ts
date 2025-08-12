// API Configuration
export const API_BASE = "https://instagram-api-672383441505.europe-west1.run.app";

// Default Values
export const DEFAULT_FOLLOWER_COUNT = 50;
export const MAX_FOLLOWER_COUNT = 500;
export const MIN_FOLLOWER_COUNT = 1;

// Bio Agents Configuration
export const DEFAULT_BIO_AGENTS = 3;
export const MAX_BIO_AGENTS = 10;
export const MIN_BIO_AGENTS = 1;

// Batch Size Configuration
export const DEFAULT_BATCH_SIZE = 30;
export const MAX_BATCH_SIZE = 100;
export const MIN_BATCH_SIZE = 10;

// Polling Configuration
export const POLLING_INTERVAL = 5000; // 5 seconds

// File Download Configuration
export const DOWNLOAD_FILENAME_PREFIX = "instagram_profiles";
export const CSV_HEADERS = ["Username", "Profile URL"];

// Status Messages
export const STATUS_MESSAGES = {
  LOADING: "Loading...",
  CHECKING: "Checking...",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  INITIALIZING: "Loading Instagram Scraper",
  INITIALIZING_DESCRIPTION: "Checking for saved operations and login status...",
} as const;

// Operation Status Colors
export const STATUS_COLORS = {
  running: {
    background: "#fef3c7",
    color: "#92400e"
  },
  completed: {
    background: "#dcfce7",
    color: "#166534"
  },
  failed: {
    background: "#fee2e2",
    color: "#dc2626"
  }
} as const; 