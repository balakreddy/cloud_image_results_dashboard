/**
 * Main service for fetching and parsing test results
 * Simple, focused interface - extensible for future enhancements
 */

import { downloadBlob } from '../azure/client';
import { getBlobUrl } from '../azure/config';
import { getAvailableComposes, getJunitPath, getHtmlReportPath, getArchitecturesForCompose, getComposeEntries, composeIdFromEntry } from '../azure/manifest';
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
    const result = parseJunitXml(xml, composeId, architecture);

    // Add HTML report URL from manifest
    const htmlPath = await getHtmlReportPath(composeId, architecture);
    if (result && htmlPath) {
      result.htmlReportUrl = getBlobUrl(htmlPath);
    }

    return result;
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
 * Get latest test results across all versions
 * Returns results for all filtered composes (Rawhide, top 2 Fedora versions, ELN)
 * @param limitPerVersion - Max composes per version (default: 30 for ~monthly data)
 */
export async function getLatestResults(limitPerVersion: number = 30): Promise<TestResult[]> {
  const entries = await getAllComposeEntries();

  // Group by version and limit each
  const versionGroups = new Map<string, ComposeEntry[]>();
  for (const entry of entries) {
    const group = versionGroups.get(entry.version) || [];
    if (group.length < limitPerVersion) {
      group.push(entry);
      versionGroups.set(entry.version, group);
    }
  }

  // Flatten back to array
  const limitedEntries = Array.from(versionGroups.values()).flat();

  // Convert to compose IDs (use already-imported function)
  const composeIds = limitedEntries.map(e => composeIdFromEntry(e));

  console.log(`[Results] Fetching results for ${composeIds.length} composes across ${versionGroups.size} versions`);

  const allResults = await Promise.all(
    composeIds.map(id => getComposeResults(id))
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
