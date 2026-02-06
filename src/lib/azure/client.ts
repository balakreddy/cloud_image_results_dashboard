/**
 * Minimal Azure Blob Storage client
 * Reads directly from public blob storage - no auth needed
 * Uses direct HTTP requests for simplicity with public containers
 */

import { getBlobUrl } from './config';
import type { BlobMetadata } from '@/types';

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * List blobs with a prefix using Azure REST API
 * For public containers, we'll fetch and parse the XML listing
 */
export async function listBlobs(prefix?: string): Promise<BlobMetadata[]> {
  const cacheKey = `list:${prefix || 'all'}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // For now, return empty array - we'll implement proper listing later
  // This is a minimalistic approach to get started
  const blobs: BlobMetadata[] = [];
  
  cache.set(cacheKey, {
    data: blobs,
    expires: Date.now() + CACHE_TTL
  });

  return blobs;
}

/**
 * Download blob content as text (simple HTTP GET)
 */
export async function downloadBlob(blobName: string): Promise<string> {
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

/**
 * Check if a blob exists
 */
export async function blobExists(blobName: string): Promise<boolean> {
  try {
    const url = getBlobUrl(blobName);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
