/**
 * Client-side API for fetching dashboard data
 * - Development: Uses /azure-data proxy (Vite proxies to Azure)
 * - Production: Direct Azure fetch (same origin - no CORS)
 */

import type { TestResult, ComposeEntry, ComposeManifest, TestSuite, TestCase } from "./types";

// Use Vite proxy in dev, direct Azure URL in production
const isDev = import.meta.env.DEV;
const AZURE_BASE = isDev
    ? '/azure-data'  // Vite proxy (configured in astro.config.mjs)
    : 'https://fedoratestresults.z5.web.core.windows.net';

/**
 * Fetch the composes manifest
 */
async function fetchManifest(): Promise<ComposeManifest> {
    const response = await fetch(`${AZURE_BASE}/composes.json`);
    if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status}`);
    }
    const data = await response.json();
    return {
        lastUpdated: data.last_updated || new Date().toISOString(),
        composes: data.composes || []
    };
}

/**
 * Parse JUnit XML to TestResult (client-side, uses DOMParser)
 */
function parseJunitXml(xml: string, composeId: string, architecture: string, htmlReportUrl: string): TestResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const suites: TestSuite[] = [];
    const testsuiteElements = doc.querySelectorAll('testsuite');

    testsuiteElements.forEach(suite => {
        const testcases: TestCase[] = [];
        suite.querySelectorAll('testcase').forEach(tc => {
            let status: TestCase['status'] = 'passed';
            let error: string | undefined;
            let failure: string | undefined;

            if (tc.querySelector('skipped')) {
                status = 'skipped';
            } else if (tc.querySelector('error')) {
                status = 'error';
                error = tc.querySelector('error')?.textContent || tc.querySelector('error')?.getAttribute('message') || '';
            } else if (tc.querySelector('failure')) {
                status = 'failed';
                failure = tc.querySelector('failure')?.textContent || tc.querySelector('failure')?.getAttribute('message') || '';
            }

            testcases.push({
                name: tc.getAttribute('name') || 'Unknown',
                classname: tc.getAttribute('classname') || '',
                time: parseFloat(tc.getAttribute('time') || '0'),
                status,
                error,
                failure
            });
        });

        suites.push({
            name: suite.getAttribute('name') || 'Unknown Suite',
            tests: testcases.length,
            failures: testcases.filter(t => t.status === 'failed').length,
            errors: testcases.filter(t => t.status === 'error').length,
            skipped: testcases.filter(t => t.status === 'skipped').length,
            time: parseFloat(suite.getAttribute('time') || '0'),
            testcases
        });
    });

    const summary = {
        total: suites.reduce((sum, s) => sum + s.tests, 0),
        passed: suites.reduce((sum, s) => sum + s.testcases.filter(t => t.status === 'passed').length, 0),
        failed: suites.reduce((sum, s) => sum + s.failures, 0),
        skipped: suites.reduce((sum, s) => sum + s.skipped, 0),
        errors: suites.reduce((sum, s) => sum + s.errors, 0),
        duration: suites.reduce((sum, s) => sum + s.time, 0)
    };

    return {
        composeId,
        architecture,
        timestamp: new Date(),
        htmlReportUrl,
        suites,
        summary
    };
}

/**
 * Build compose ID from manifest entry
 */
function composeIdFromEntry(entry: ComposeEntry): string {
    const dateCompact = entry.date.replace(/-/g, '');
    if (entry.version === 'Rawhide') return `Fedora-Rawhide-${dateCompact}.${entry.build}`;
    if (entry.version === 'ELN') return `Fedora-eln-${dateCompact}.${entry.build}`;
    return `Fedora-Cloud-${entry.version}-${dateCompact}.${entry.build}`;
}

/**
 * Normalize date to YYYYMMDD format for consistent sorting
 * Handles: "2026-04-03" → "20260403", "20260309" → "20260309"
 */
function normalizeDate(date: string): string {
    return date.replace(/-/g, '');
}

/**
 * Filter to relevant composes (Rawhide, latest 2 Fedora versions, ELN)
 */
function filterEntries(entries: ComposeEntry[]): ComposeEntry[] {
    const numericVersions = [...new Set(
        entries.map(c => c.version).filter(v => !isNaN(Number(v)))
    )].sort((a, b) => Number(b) - Number(a)).slice(0, 2);

    const allowed = ['Rawhide', ...numericVersions, 'ELN'];
    return entries.filter(e => allowed.includes(e.version));
}

/**
 * Fetch and parse a single result
 */
async function fetchResult(entry: ComposeEntry, arch: string): Promise<TestResult | null> {
    const archResult = entry.results[arch];
    if (!archResult?.junit_xml) return null;

    try {
        const response = await fetch(`${AZURE_BASE}/${archResult.junit_xml}`);
        if (!response.ok) return null;

        const xml = await response.text();
        const composeId = composeIdFromEntry(entry);
        const htmlReportUrl = archResult.html_report ? `${AZURE_BASE}/${archResult.html_report}` : '';

        return parseJunitXml(xml, composeId, arch, htmlReportUrl);
    } catch (err) {
        console.warn(`Failed to fetch ${entry.version}/${entry.date}/${arch}:`, err);
        return null;
    }
}

/**
 * Entry point - load all dashboard data directly from Azure
 */
export async function loadDashboardData(): Promise<TestResult[]> {
    const manifest = await fetchManifest();
    const filtered = filterEntries(manifest.composes);

    // Sort by date (newest first) using normalized dates for correct ordering
    const sortedByDate = [...filtered].sort((a, b) => {
        const dateA = normalizeDate(a.date);
        const dateB = normalizeDate(b.date);
        return dateB.localeCompare(dateA); // Descending (newest first)
    });

    // Limit to last 30 entries per version for performance
    const versionGroups = new Map<string, ComposeEntry[]>();
    for (const entry of sortedByDate) {
        const group = versionGroups.get(entry.version) || [];
        if (group.length < 30) {
            group.push(entry);
            versionGroups.set(entry.version, group);
        }
    }
    const limitedEntries = Array.from(versionGroups.values()).flat();

    // Fetch all results in parallel (both architectures)
    const promises: Promise<TestResult | null>[] = [];
    for (const entry of limitedEntries) {
        for (const arch of ['x86_64', 'aarch64']) {
            if (entry.results[arch]) {
                promises.push(fetchResult(entry, arch));
            }
        }
    }

    const results = await Promise.all(promises);
    const validResults = results.filter((r): r is TestResult => r !== null);
    return validResults;
}
