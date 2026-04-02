/**
 * Client-side API for fetching dashboard data
 * Uses browser's native fetch() - no npm dependencies
 */

import type { ComposeManifest, ComposeEntry, TestResult } from "./types";
import { parseJunitXml } from './parser';

// Azure blob storage endpoint
const ENDPOINT = 'https://fedoratestresults.z5.core.windows.net/';

// Cache for manifest
let manifestCache: {data: ComposeManifest; expires: number} | null = null;
const CACHE_TTL = 5* 60*1000; // 5 minutes

/**
 * Fetch the composes manifest (composes.json) from Azure Blob Storage
 */
export async function fetchManifest(): Promise<ComposeManifest> {
    // check cache first
    if (manifestCache && manifestCache.expires > Date.now()) {
        return manifestCache.data;
    }
    
    const response = await fetch(`${ENDPOINT}composes.json`);

    if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
    }
    
    const manifest = await response.json() as ComposeManifest;

    // Update cache
    manifestCache = {
        data: manifest,
        expires: Date.now() + CACHE_TTL
    };

    return manifest;
}

/**
 * Fetch a single junit.xml file
 */

export async function fetchJunitXml(blobPath: string): Promise<string> {
    const response = await fetch(`${ENDPOINT}${blobPath}`);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch junit XML: ${response.status} ${response.statusText}`);
    }

    return response.text();
}


/**
 * Build HTML report URL from blob path
 */

export function getHtmlReportUrl(htmlPath: string): string {
    return `${ENDPOINT}${htmlPath}`;
}

/**
 * Convert compose entry to compose ID string (e.g. "fedora-43-20260401.n.0")
 */
export function composeIdFromEntry(entry: ComposeEntry): string {

    const dateCompact = entry.date.replace(/-/g, '');

    if (entry.version == 'Rawhide') {
        return `Fedora-Rawhide-${dateCompact}.${entry.build}`;
    }
    if (entry.version == 'ELN') {
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

    return manifest.composes
        .filter(c => allowedVersions.includes(c.version))
        .sort((a,b) =>
            allowedVersions.indexOf(a.version) - allowedVersions.indexOf(b.version) ||
            b.date.localeCompare(a.date)
        );
}

/**
 * Fetch all test results in parallel
 */

export async function fetchAllResults(manifest: ComposeManifest): Promise<TestResult[]> {
    const entries = filterComposeEntries(manifest);

    // Create fetch tasks for all compose and architecture combinations
    const fetchTasks: Promise<TestResult | null>[] = [];

    for (const entry of entries) {
        const composeId = composeIdFromEntry(entry);

        for (const [arch, archResult] of Object.entries(entry.results)) {
            fetchTasks.push(
                fetchJunitXml(archResult.junit_xml)
                .then(xml => parseJunitXml(xml, composeId, arch, getHtmlReportUrl(archResult.html_report)))
                .catch(err => {
                    console.warn(`Failed to fetch ${composeId}/${arch}:`, err);
                    return null;
                })
            );
        }
    }

    // Execute all in parallel
    const fetchedResults = await Promise.all(fetchTasks);

    // Filter out failed fetches
    return fetchedResults.filter((r): r is TestResult => r !== null);
}

/**
 * Entry point to load all data for the dashboard
 */
export async function loadDashboardData(): Promise<TestResult[]> {
    const manifest = await fetchManifest();
    return fetchAllResults(manifest);
}
