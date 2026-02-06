/**
 * Main service for fetching and parsing test results
 * Simple, focused interface - extensible for future enhancements
 */

import { downloadBlob, blobExists } from '../azure/client';
import { getAvailableComposes } from '../azure/discovery';
import { parseJunitXml } from '../parsers/junit';
import type { TestResult } from '@/types';

/**
 * Get all available compose IDs
 * @param useDiscovery - If true, actively discover composes; otherwise use known list
 */
export async function getComposeIds(useDiscovery: boolean = false): Promise<string[]> {
  return getAvailableComposes(useDiscovery);
}

/**
 * Get test results for a specific compose and architecture
 */
export async function getTestResult(
  composeId: string,
  architecture: string
): Promise<TestResult | null> {
  const blobPath = `${composeId}/${architecture}/junit.xml`;
  
  try {
    const xml = await downloadBlob(blobPath);
    return parseJunitXml(xml, composeId, architecture);
  } catch (error) {
    console.error(`Failed to fetch test result for ${composeId}/${architecture}:`, error);
    return null;
  }
}

/**
 * Get all test results for a compose (both architectures)
 */
export async function getComposeResults(composeId: string): Promise<TestResult[]> {
  const architectures = ['x86_64', 'aarch64'];
  
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
 * Check if a compose has test results
 */
export async function composeExists(composeId: string): Promise<boolean> {
  // Check if at least one architecture has results
  const x86Exists = await blobExists(`${composeId}/x86_64/junit.xml`);
  if (x86Exists) return true;
  
  const aarch64Exists = await blobExists(`${composeId}/aarch64/junit.xml`);
  return aarch64Exists;
}
