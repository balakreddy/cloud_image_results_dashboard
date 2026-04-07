/**
 * Client-side API for fetching dashboard data
 * Uses browser's native fetch() - no npm dependencies
 * Fetches from local API proxy to avoid CORS issues
 */

import type { TestResult } from "./types";

// Use local API proxy (server handles Azure requests, avoiding CORS)
const API_BASE = '/api';

/**
 * Fetch all test results from the server API (pre-parsed, no CORS issues)
 */
export async function fetchAllResults(): Promise<TestResult[]> {
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
