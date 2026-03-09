/**
 * Main service for fetching and parsing test results
 * Simple, focused interface - extensible for future enhancements
 */

import { downloadBlob } from '../azure/client';
import { getAvailableComposes, getJunitPath, getArchitecturesForCompose, getComposeEntries, composeIdFromEntry } from '../azure/manifest';
import { parseJunitXml } from '../parsers/junit';
import type { TestResult, ComposeEntry } from '@/types';

/**
 * Get all available compose IDs
 * @param useDiscovery - Ignored, kept for backwards compatibility
 */
export async function getComposeIds(_useDiscovery: boolean = false): Promise<string[]> {
  return getAvailableComposes();
}

/**
 * Get all compose entries with full metadata
 */
export async function getAllComposeEntries(): Promise<ComposeEntry[]> {
  return getComposeEntries();
}

/**
 * Get test results for a specific compose and architecture
 */
export async function getTestResult(
  composeId: string,
  architecture: string
): Promise<TestResult | null> {
  // Get the junit path from the manifest
  const blobPath = await getJunitPath(composeId, architecture);
  
  if (!blobPath) {
    console.error(`No junit path found in manifest for ${composeId}/${architecture}`);
    return null;
  }
  
  try {
    const xml = await downloadBlob(blobPath);
    return parseJunitXml(xml, composeId, architecture);
  } catch (error) {
    console.error(`Failed to fetch test result for ${composeId}/${architecture}:`, error);
    return null;
  }
}

/**
 * Get all test results for a compose (all available architectures)
 */
export async function getComposeResults(composeId: string): Promise<TestResult[]> {
  // Get available architectures from manifest
  const architectures = await getArchitecturesForCompose(composeId);
  
  if (architectures.length === 0) {
    return [];
  }
  
  const results = await Promise.all(
    architectures.map(arch => getTestResult(composeId, arch))
  );

  return results.filter((r): r is TestResult => r !== null);
}

/**
 * Get latest test results across multiple composes
 */
export async function getLatestResults(limit: number = 10): Promise<TestResult[]> {
  const composeIds = await getComposeIds();
  const latest = composeIds.slice(0, limit);
  
  const allResults = await Promise.all(
    latest.map(id => getComposeResults(id))
  );

  return allResults.flat();
}

/**
 * Check if a compose has test results (in manifest)
 */
export async function composeExists(composeId: string): Promise<boolean> {
  const architectures = await getArchitecturesForCompose(composeId);
  return architectures.length > 0;
}
