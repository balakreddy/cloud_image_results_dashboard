/**
 * Client side type definitions for the Fedora Image Dashboard
 * 
 */

// Test case from JUnit XML
export interface TestCase {
    name: string;
    classname: string;
    time: number;
    status: 'passed' | 'failed' | 'skipped' | 'error';
    error?: string;
    failure?: string;
    }

// Test suite containg test cases
export interface TestSuite {
    composeId: string;
    architecture: string;
    name: string;
    tests: number;
    failures: number;
    errors: number;
    skipped: number;
    time: number;
    testcases: TestCase[];
}

// Overall test result for a compose + architecture
export interface TestResult {
    composeId: string;
    architecture: string;
    timestamp: Date;
    htmlReportUrl?: string;
    suites: TestSuite[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        errors: number;
        duration: number;
    };
}

// Architecture result from the composes.json manifest
export interface ArchResult {
    junit_xml: string;
    html_report: string;
}

// Compose entry from the composes.json manifest
export interface ComposeEntry {
    distro: string;
    version: string;
    date: string;
    build: string;
    results: Record<string, ArchResult>;
}

// Full manifest structure from composes.json
export interface ComposeManifest {
    lastUpdated: string;
    composes: ComposeEntry[];
}


// Grouped result for dashboard display
export interface GroupedResult {
    distro: string;
    arch: string;
    today?: TestResult;
    weekly:TestResult[];
    monthly: TestResult[];
}

export type LoadingState = 'loading' | 'success' | 'error';