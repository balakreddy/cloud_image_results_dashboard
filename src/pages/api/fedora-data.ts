import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

interface TestResult {
  version: string;
  latestResults: {
    timestamp: string;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  };
  weeklyData: Array<{
    date: string;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  }>;
}

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const fedoraVersions = await getFedoraVersionsData();
    return new Response(JSON.stringify(fedoraVersions), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "Failed to fetch data", 
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}

async function getFedoraVersionsData(): Promise<TestResult[]> {
  const lisaTestsPath = path.join(process.env.HOME || '/home/bala', 'lisa_tests');
  
  try {
    const directories = await readdir(lisaTestsPath);
    const fedoraVersions = directories.filter(dir => dir.startsWith('Fedora-Cloud'));
    
    const results: TestResult[] = [];
    
    for (const version of fedoraVersions) {
      const versionPath = path.join(lisaTestsPath, version);
      const versionData = await processFedoraVersion(versionPath, version);
      results.push(versionData);
    }
    
    return results;
  } catch (error) {
    throw new Error(`Failed to read lisa_tests directory: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function processFedoraVersion(versionPath: string, version: string): Promise<TestResult> {
  try {
    const testRuns = await readdir(versionPath);
    const validRuns = testRuns.filter(run => run.match(/^[A-Z]/)); // Filter out non-date directories
    
    // Parse and sort by date
    const runsWithDates = validRuns.map(run => {
      const match = run.match(/^(\w+)(\d{2})-(\d{4})-(\d{4})$/);
      if (match) {
        const [, month, day, year, time] = match;
        const monthNum = getMonthNumber(month);
        const dateStr = `${year}-${monthNum.toString().padStart(2, '0')}-${day} ${time.slice(0,2)}:${time.slice(2)}`;
        return {
          name: run,
          date: new Date(dateStr),
          dateStr
        };
      }
      return null;
    }).filter((run): run is NonNullable<typeof run> => run !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Process multiple runs at once (reusable function)
    const weeklyRuns = runsWithDates.slice(0, 7);
    const weeklyData = await processMultipleRuns(versionPath, weeklyRuns);
    
    // Get latest results from the processed weekly data (reuse the same data)
    const latestResults = weeklyData[0] || {
      timestamp: runsWithDates[0] ? runsWithDates[0].date.toISOString() : new Date().toISOString(),
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      successRate: 0
    };
    
    return {
      version,
      latestResults,
      weeklyData
    };
  } catch (error) {
    throw new Error(`Failed to process version ${version}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Reusable function to process multiple runs
async function processMultipleRuns(versionPath: string, runs: Array<{name: string, date: Date, dateStr: string}>) {
  const results = [];
  
  for (const run of runs) {
    const parsedResults = await parseXMLResults(path.join(versionPath, run.name));
    if (parsedResults) {
      results.push({
        date: run.dateStr,
        timestamp: parsedResults.timestamp,
        total: parsedResults.total,
        passed: parsedResults.passed,
        failed: parsedResults.failed,
        skipped: parsedResults.skipped,
        successRate: parsedResults.successRate
      });
    }
  }
  
  return results;
}

async function parseXMLResults(runPath: string) {
  try {
    const xmlPath = path.join(runPath, 'lisa.junit.xml');
    const xmlContent = await readFile(xmlPath, 'utf8');
    
    // Extract timestamp from XML if available
    let timestamp = new Date().toISOString();
    const timestampMatch = xmlContent.match(/timestamp="([^"]+)"/);
    if (timestampMatch) {
      timestamp = new Date(timestampMatch[1]).toISOString();
    } else {
      // Fallback: extract date from directory name
      const dirName = path.basename(runPath);
      const dateMatch = dirName.match(/^(\w+)(\d{2})-(\d{4})-(\d{4})$/);
      if (dateMatch) {
        const [, month, day, year, time] = dateMatch;
        const monthNum = getMonthNumber(month);
        const dateStr = `${year}-${monthNum.toString().padStart(2, '0')}-${day} ${time.slice(0,2)}:${time.slice(2)}`;
        timestamp = new Date(dateStr).toISOString();
      }
    }
    
    // Simple XML parsing without external dependencies
    const testsuiteMatch = xmlContent.match(/<testsuites[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*errors="(\d+)"[^>]*>/);
    
    if (!testsuiteMatch) {
      return null;
    }
    
    const total = parseInt(testsuiteMatch[1] || '0');
    const failures = parseInt(testsuiteMatch[2] || '0');
    const errors = parseInt(testsuiteMatch[3] || '0');
    
    // Count skipped tests by counting <skipped> tags
    const skippedMatches = xmlContent.match(/<skipped[^>]*>/g);
    const skipped = skippedMatches ? skippedMatches.length : 0;
    
    const failed = failures + errors;
    const passed = total - failed - skipped;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    return {
      timestamp,
      total,
      passed,
      failed,
      skipped,
      successRate
    };
  } catch (error) {
    console.error(`Failed to parse XML for ${runPath}:`, error);
    return null;
  }
}

function getMonthNumber(month: string): number {
  const months: Record<string, number> = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  return months[month] || 1;
}
