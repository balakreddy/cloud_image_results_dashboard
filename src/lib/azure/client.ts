/**
 * Minimal Azure Blob Storage client
 * Reads directly from public blob storage - no auth needed
 * Uses direct HTTP requests for simplicity with public containers
 */

import { getBlobUrl } from './config';

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { data: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Clean expired cache entries to prevent memory growth
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expires < now) {
      cache.delete(key);
    }
  }
}

/**
 * Download blob content as text (simple HTTP GET)
 */
export async function downloadBlob(blobName: string): Promise<string> {
  cleanExpiredCache();
  const cacheKey = `blob:${blobName}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const url = getBlobUrl(blobName);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download blob ${blobName}: ${response.statusText}`);
  }

  const content = await response.text();

  // Cache with longer TTL for blob content (15 min)
  cache.set(cacheKey, {
    data: content,
    expires: Date.now() + 15 * 60 * 1000
  });

  return content;
}
