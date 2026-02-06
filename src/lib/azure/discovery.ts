/**
 * Blob discovery utilities
 * Simple approach: try known patterns to discover available composes
 */

import { blobExists } from './client';
import { sortComposesByDate } from '../utils/formatters';

/**
 * Generate potential compose IDs based on known patterns
 * Fedora-Cloud-{version}-{YYYYMMDD}.{build}
 */
function generatePotentialComposes(daysBack: number = 30): string[] {
  const composes: string[] = [];
  const today = new Date();
  const versions = [43, 42, 41]; // Active Fedora versions
  const specialDistros = ['Rawhide', 'ELN']; // Special distributions
  const buildNumbers = [0, 1, 2]; // Common build numbers

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Add Rawhide (uses .n. format)
    for (const build of buildNumbers) {
      composes.push(`Fedora-Rawhide-${dateStr}.n.${build}`);
    }
    
    // Add ELN (lowercase, uses .n. format)
    for (const build of buildNumbers) {
      composes.push(`Fedora-eln-${dateStr}.n.${build}`);
    }

    // Add versioned releases
    for (const version of versions) {
      for (const build of buildNumbers) {
        composes.push(`Fedora-Cloud-${version}-${dateStr}.${build}`);
      }
    }
  }

  return composes;
}

/**
 * Discover available composes by checking which ones exist
 * Simple but effective approach for public containers
 */
export async function discoverComposes(daysBack: number = 30): Promise<string[]> {
  const candidates = generatePotentialComposes(daysBack);
  const found: string[] = [];

  // Check in batches to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (compose) => {
        // Check if x86_64 exists (most common)
        const exists = await blobExists(`${compose}/x86_64/junit.xml`);
        return exists ? compose : null;
      })
    );

    found.push(...results.filter((c): c is string => c !== null));
  }

  return sortComposesByDate(found);
}

/**
 * Manually curated list of known composes
 * Use this as fallback or for specific testing
 */
export const KNOWN_COMPOSES = [
  'Fedora-Rawhide-20260122.n.0',
  'Fedora-Rawhide-20260121.n.1',
  'Fedora-eln-20260122.n.3',
  'Fedora-eln-20260121.n.2',
  'Fedora-Cloud-43-20260122.0',
  'Fedora-Cloud-43-20260121.0',
  'Fedora-Cloud-42-20260122.0',
  'Fedora-Cloud-42-20260121.0',
];

/**
 * Get available compose IDs (tries discovery, falls back to known list)
 */
export async function getAvailableComposes(useDiscovery: boolean = false): Promise<string[]> {
  if (useDiscovery) {
    try {
      const discovered = await discoverComposes();
      return discovered.length > 0 ? discovered : KNOWN_COMPOSES;
    } catch (error) {
      console.error('Discovery failed, using known composes:', error);
      return KNOWN_COMPOSES;
    }
  }

  return KNOWN_COMPOSES;
}
