import { InstagramProfile } from '../types';
import { DOWNLOAD_FILENAME_PREFIX, CSV_HEADERS } from '../constants';
import { invoke } from '@tauri-apps/api/core';

/**
 * Downloads results as a JSON file using Tauri's file dialog
 */
export const downloadJSON = async (results: InstagramProfile[]): Promise<void> => {
  if (results.length === 0) {
    alert("No results to download");
    return;
  }

  try {
    console.log("🔍 [DEBUG] Preparing JSON download for", results.length, "profiles");
    
    const jsonContent = JSON.stringify(results, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${DOWNLOAD_FILENAME_PREFIX}_${timestamp}.json`;
    
    await invoke('save_file_dialog', {
      content: jsonContent,
      filename: filename,
      fileType: 'JSON Files'
    });
    
    console.log("✅ [DEBUG] JSON download completed:", filename);
  } catch (error) {
    console.error("❌ [DEBUG] JSON download failed:", error);
    if (error === "File save cancelled") {
      console.log("ℹ️ User cancelled file save");
    } else {
    alert("Failed to download JSON file. Please try again.");
    }
  }
};

/**
 * Downloads results as a CSV file using Tauri's file dialog
 */
export const downloadCSV = async (results: InstagramProfile[]): Promise<void> => {
  if (results.length === 0) {
    alert("No results to download");
    return;
  }

  try {
    console.log("🔍 [DEBUG] Preparing CSV download for", results.length, "profiles");
    
    const csvRows = results.map((profile: InstagramProfile) => {
      const row = [
        profile.username || "",
        profile.url || ""
      ];
      
      // Properly escape CSV values (handle commas, quotes, newlines)
      return row.map(value => {
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",");
    });

    const csvContent = [CSV_HEADERS.join(","), ...csvRows].join("\n");
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${DOWNLOAD_FILENAME_PREFIX}_${timestamp}.csv`;
    
    await invoke('save_file_dialog', {
      content: csvContent,
      filename: filename,
      fileType: 'CSV Files'
    });
    
    console.log("✅ [DEBUG] CSV download completed:", filename);
  } catch (error) {
    console.error("❌ [DEBUG] CSV download failed:", error);
    if (error === "File save cancelled") {
      console.log("ℹ️ User cancelled file save");
    } else {
    alert("Failed to download CSV file. Please try again.");
    }
  }
}; 