/**
 * Simple JUnit XML parser
 * Converts XML to structured TypeScript objects
 */

import { XMLParser } from 'fast-xml-parser';
import type { TestResult, TestSuite, TestCase } from '@/types';

// Configure XML parser (minimal options)
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true
});

/**
 * Parse JUnit XML content into TestResult
 */
export function parseJunitXml(
  xml: string,
  composeId: string,
  architecture: string
): TestResult {
  const parsed = parser.parse(xml);
  
  // Handle both <testsuites> and single <testsuite> root
  const root = parsed.testsuites || parsed.testsuite;
  const suitesArray = Array.isArray(root.testsuite) 
    ? root.testsuite 
    : [root.testsuite || root];

  const suites: TestSuite[] = suitesArray.map(parseSuite).filter(Boolean);
  
  // Calculate summary
  const summary = {
    total: suites.reduce((sum, s) => sum + s.tests, 0),
    passed: 0,
    failed: suites.reduce((sum, s) => sum + s.failures, 0),
    skipped: suites.reduce((sum, s) => sum + s.skipped, 0),
    errors: suites.reduce((sum, s) => sum + s.errors, 0),
    duration: suites.reduce((sum, s) => sum + s.time, 0)
  };
  summary.passed = summary.total - summary.failed - summary.skipped - summary.errors;

  return {
    composeId,
    architecture,
    timestamp: new Date(),
    suites,
    summary
  };
}

function parseSuite(suite: any): TestSuite {
  if (!suite) return null as any;

  const testcases = parseTestCases(suite.testcase);

  // Calculate actual counts from test cases (XML attributes may be missing or incorrect)
  const actualCounts = {
    passed: testcases.filter(tc => tc.status === 'passed').length,
    failed: testcases.filter(tc => tc.status === 'failed').length,
    errors: testcases.filter(tc => tc.status === 'error').length,
    skipped: testcases.filter(tc => tc.status === 'skipped').length
  };

  return {
    name: suite['@_name'] || 'Unknown Suite',
    tests: testcases.length,
    failures: actualCounts.failed,
    errors: actualCounts.errors,
    skipped: actualCounts.skipped,
    time: parseFloat(suite['@_time'] || '0'),
    testcases
  };
}

function parseTestCases(cases: any): TestCase[] {
  if (!cases) return [];
  const casesArray = Array.isArray(cases) ? cases : [cases];

  return casesArray.map((tc): TestCase => {
    let status: TestCase['status'] = 'passed';
    let error: string | undefined;
    let failure: string | undefined;

    // Check for test status - order matters!
    // First check for skipped (has <skipped> element)
    if (tc.skipped !== undefined) {
      status = 'skipped';
    } else if (tc.error) {
      status = 'error';
      error = typeof tc.error === 'string' ? tc.error : tc.error['#text'] || tc.error['@_message'];
    } else if (tc.failure) {
      status = 'failed';
      failure = typeof tc.failure === 'string' ? tc.failure : tc.failure['#text'] || tc.failure['@_message'];
    }
    // If none of the above, status remains 'passed'

    return {
      name: tc['@_name'] || 'Unknown Test',
      classname: tc['@_classname'] || '',
      time: parseFloat(tc['@_time'] || '0'),
      status,
      error,
      failure
    };
  });
}
