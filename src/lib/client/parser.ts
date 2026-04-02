/**
 * Browser parser for the image results dashboard.
 */

import type { TestResult, TestSuite, TestCase } from "./types";


/**
 * Parse a junit XML string into a TestResult object
 */
export function parseJunitXml(
    xml: string,
    composeId: string,
    architecture: string,
    htmlReportUrl: string
): TestResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");

    // Check for parsing errors
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
        throw new Error(`Failed to parse XML: ${parseError.textContent}`);
    }

    // Get all test suites
    const suiteElements = doc.querySelectorAll('testsuite');
    const suites: TestSuite[] = Array.from(suiteElements).map(parseSuite);

    // Calculate summary
    const summary = {
        total: suites.reduce((sum, s) => sum + s.tests, 0),
        passed:0,
        failed: suites.reduce((sum, s) => sum + s.failures, 0),
        skipped: suites.reduce((sum, s) => sum + s.skipped, 0),
        errors: suites.reduce((sum, s) => sum + s.errors, 0),
        duration: suites.reduce((sum, s) => sum + s.time, 0),
    };
    summary.passed = summary.total - summary.failed - summary.skipped - summary.errors;

    return {composeId, architecture, timestamp: new Date(), htmlReportUrl, suites, summary};
}

/**
 * Parse a single testsuite element into a TestSuite object
 */
function parseSuite(element: Element): TestSuite {
    const testcaseElements = element.querySelectorAll(':scope > testcase');
    const testcases = Array.from(testcaseElements).map(parseTestCase);

    // Calculate the counts from test cases
    const actualCounts = {
        passed: testcases.filter(tc => tc.status === 'passed').length,
        failed: testcases.filter(tc => tc.status === 'failed').length,
        skipped: testcases.filter(tc => tc.status === 'skipped').length,
        errors: testcases.filter(tc => tc.status === 'error').length,
    };

    return {
        name:element.getAttribute('name') || 'Unknown Suite',
        tests: testcases.length,
        failures: actualCounts.failed,
        errors: actualCounts.errors,
        skipped: actualCounts.skipped,
        time: parseFloat(element.getAttribute('time') || '0'),
        testcases
    };
}

/**
 * Parse a single testcase element
 */
function parseTestCase(element: Element): TestCase {
    let status: TestCase['status'] = 'passed';
    let error: string | undefined;
    let failure: string | undefined;

    // Check for skipped
    if (element.querySelector('skipped')) {
        status = 'skipped';
    }

    // Check for error
    else if (element.querySelector('error')) {
        status = 'error';
        const errorE1 = element.querySelector('error');
        error = errorE1?.textContent || errorE1?.getAttribute('message') || undefined;
    }
    
    // Check for failure
    else if (element.querySelector('failure')) {
        status = 'failed';
        const failureE1 = element.querySelector('failure');
        failure = failureE1?.textContent || failureE1?.getAttribute('message') || undefined;
    }
    
    return {
        name: element.getAttribute('name') || 'Unknown Test',
        classname: element.getAttribute('classname') || '',
        time: parseFloat(element.getAttribute('time') || '0'),
        status,
        error,
        failure
    };
}