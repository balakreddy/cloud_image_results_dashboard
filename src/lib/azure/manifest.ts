/**
 * Compose manifest utilities
 * Fetches and parses the composes.json manifest from blob storage
 */

import { downloadBlob } from './client';
import type { ComposesManifest, ComposeEntry } from '@/types';

// Cache manifest for 5 minutes
let manifestCache: { data: ComposesManifest; expires: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Fetch and parse the composes.json manifest
 */
export async function getComposesManifest(): Promise<ComposesManifest> {
  // Check cache first
  if (manifestCache && manifestCache.expires > Date.now()) {
    return manifestCache.data;
  }

  try {
    const content = await downloadBlob('composes.json');
    const manifest = JSON.parse(content) as ComposesManifest;
    
    // Update cache
    manifestCache = {
      data: manifest,
      expires: Date.now() + CACHE_TTL
    };
    
    return manifest;
  } catch (error) {
    console.error('Failed to fetch composes.json manifest:', error);
    // Return empty manifest on error
    return {
      last_updated: new Date().toISOString(),
      composes: []
    };
  }
}

/**
 * Get all compose entries from the manifest
 * Filtered to Rawhide, top 2 Fedora versions, and ELN
 * Sorted: Rawhide → Fedora (desc) → ELN, then by date
 */
export async function getComposeEntries(): Promise<ComposeEntry[]> {
  const manifest = await getComposesManifest();
  
  // Get top 3 numeric versions
  const numericVersions = [...new Set(
    manifest.composes.map(c => c.version).filter(v => !isNaN(Number(v)))
  )].sort((a, b) => Number(b) - Number(a)).slice(0, 2);
  
  const allowed = ['Rawhide',...numericVersions, 'ELN'];
  
  return manifest.composes
    .filter(e => allowed.includes(e.version))
    .sort((a, b) => 
      allowed.indexOf(a.version) - allowed.indexOf(b.version) || 
      b.date.localeCompare(a.date)
    );
}

/**
 * Get available compose IDs (for backwards compatibility)
 * Reconstructs compose ID from manifest entry metadata
 */
export async function getAvailableComposes(_useDiscovery?: boolean): Promise<string[]> {
  const entries = await getComposeEntries();
  return entries.map(entry => composeIdFromEntry(entry));
}

/**
 * Reconstruct compose ID from manifest entry
 * E.g., { distro: "Fedora", version: "43", date: "2026-02-12", build: "0" }
 *       -> "Fedora-Cloud-43-20260212.0"
 */
export function composeIdFromEntry(entry: ComposeEntry): string {
  const dateCompact = entry.date.replace(/-/g, '');
  
  if (entry.version === 'Rawhide') {
    return `Fedora-Rawhide-${dateCompact}.${entry.build}`;
  }
  if (entry.version === 'ELN') {
    return `Fedora-eln-${dateCompact}.${entry.build}`;
  }
  // Standard Fedora release
  return `Fedora-Cloud-${entry.version}-${dateCompact}.${entry.build}`;
}

/**
 * Find a compose entry by its ID
 */
export async function findComposeEntry(composeId: string): Promise<ComposeEntry | null> {
  const entries = await getComposeEntries();
  return entries.find(entry => composeIdFromEntry(entry) === composeId) || null;
}

/**
 * Get the junit.xml blob path for a compose and architecture
 */
export async function getJunitPath(composeId: string, architecture: string): Promise<string | null> {
  const entry = await findComposeEntry(composeId);
  if (!entry || !entry.results[architecture]) {
    return null;
  }
  return entry.results[architecture].junit_xml;
}

/**
 * Get the HTML report path for a compose and architecture
 */
export async function getHtmlReportPath(composeId: string, architecture: string): Promise<string | null> {
  const entry = await findComposeEntry(composeId);
  if (!entry || !entry.results[architecture]) {
    return null;
  }
  return entry.results[architecture].html_report;
}

/**
 * Get all architectures available for a compose
 */
export async function getArchitecturesForCompose(composeId: string): Promise<string[]> {
  const entry = await findComposeEntry(composeId);
  if (!entry) {
    return [];
  }
  return Object.keys(entry.results);
}
