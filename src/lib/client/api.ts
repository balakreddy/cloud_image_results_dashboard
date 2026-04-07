/**
 * Client-side API for fetching dashboard data
 * Uses browser's native fetch() - no npm dependencies
 * Fetches from local API proxy to avoid CORS issues
 */

import type { ComposeManifest, ComposeEntry, TestResult } from "./types";

// Use local API proxy (server handles Azure requests, avoiding CORS)
const API_BASE = '/api';

// Azure blob storage endpoint (for direct HTML report links only)
const AZURE_ENDPOINT = 'https://fedoratestresults.z5.web.core.windows.net/';

// Cache for manifest
let manifestCache: {data: ComposeManifest; expires: number} | null = null;
const CACHE_TTL = 5* 60*1000; // 5 minutes

/**
 * Fetch the composes manifest via local API proxy
 */
export async function fetchManifest(): Promise<ComposeManifest> {
    // check cache first
    if (manifestCache && manifestCache.expires > Date.now()) {
        return manifestCache.data;
    }

    const response = await fetch(`${API_BASE}/composes.json`);

    if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // API returns { success, count, composes } - convert to ComposeManifest format
    const manifest: ComposeManifest = {
        lastUpdated: new Date().toISOString(),
        composes: data.composes || []
    };

    // Update cache
    manifestCache = {
        data: manifest,
        expires: Date.now() + CACHE_TTL
    };

    return manifest;
}

/**
 * Fetch a single junit.xml file via local API proxy
 */

export async function fetchJunitXml(blobPath: string): Promise<string> {
    // Note: This function is kept for backwards compatibility but the results API
    // is preferred as it returns pre-parsed data and avoids CORS issues
    console.warn('fetchJunitXml called but results API should be used instead');

    const response = await fetch(`${AZURE_ENDPOINT}${blobPath}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch junit XML: ${response.status} ${response.statusText}`);
    }

    return response.text();
}


/**
 * Build HTML report URL from blob path (direct Azure link - opened in new tab, no CORS issue)
 */

export function getHtmlReportUrl(htmlPath: string): string {
    return `${AZURE_ENDPOINT}${htmlPath}`;
}

/**
 * Convert compose entry to compose ID string (e.g. "fedora-43-20260401.n.0")
 */
export function composeIdFromEntry(entry: ComposeEntry): string {

    const dateCompact = entry.date.replace(/-/g, '');

    if (entry.version === 'Rawhide') {
        return `Fedora-Rawhide-${dateCompact}.${entry.build}`;
    }
    if (entry.version === 'ELN') {
        return `Fedora-eln-${dateCompact}.${entry.build}`;
    }
    return `Fedora-Cloud-${entry.version}-${dateCompact}.${entry.build}`;
}

/**
 * Filter manifest to relevant composes (Rawhide, ELN, latest 2 releases)
 */
export function filterComposeEntries(manifest: ComposeManifest): ComposeEntry[] {
    const numericVersions = [...new Set(
        manifest.composes.map(c => c.version).filter(v => !isNaN(Number(v)))
    )].sort((a, b) => Number(b) - Number(a)).slice(0, 2); // Get latest 2 numeric versions

    const allowedVersions = ['Rawhide', ...numericVersions, 'ELN'];

    // Limit to last 30 days - format as YYYYMMDD to match manifest format
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().slice(0, 10).replace(/-/g, '');

    return manifest.composes
        .filter(c => allowedVersions.includes(c.version) && c.date >= cutoffDate)
        .sort((a,b) =>
            allowedVersions.indexOf(a.version) - allowedVersions.indexOf(b.version) ||
            b.date.localeCompare(a.date)
        );
}

/**
 * Fetch all test results from the server API (pre-parsed, no CORS issues)
 */
export async function fetchAllResults(_manifest?: ComposeManifest): Promise<TestResult[]> {
    console.log(`[API] Fetching all results from server API...`);

    const response = await fetch(`${API_BASE}/results.json`);

    if (!response.ok) {
        throw new Error(`Failed to fetch results: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Failed to fetch results');
    }

    console.log(`[API] Received ${data.count} results from server`);

    // Convert timestamp strings back to Date objects
    return data.results.map((r: TestResult) => ({
        ...r,
        timestamp: new Date(r.timestamp)
    }));
}

/**
 * Entry point to load all data for the dashboard
 */
export async function loadDashboardData(): Promise<TestResult[]> {
    // Use the server API which handles all Azure requests server-side
    return fetchAllResults();
}
