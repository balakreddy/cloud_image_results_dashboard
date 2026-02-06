/**
 * Core type definitions for the Fedora Image Dashboard
 * Keep types minimal and focused on actual data structures
 */

// Test result types from JUnit XML
export interface TestCase {
  name: string;
  classname: string;
  time: number;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  error?: string;
  failure?: string;
}

export interface TestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  time: number;
  testcases: TestCase[];
}

export interface TestResult {
  composeId: string;
  architecture: string;
  timestamp: Date;
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

// Azure Blob metadata
export interface BlobMetadata {
  name: string;
  lastModified: Date;
  size: number;
  contentType?: string;
}

// Parsed blob path structure
export interface ParsedBlobPath {
  composeId: string;
  architecture: string;
  filename: string;
  isJunit: boolean;
  isHtml: boolean;
}
