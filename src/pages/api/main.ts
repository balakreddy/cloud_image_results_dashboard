import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

interface TestResult {
  version: string;
  distro: string;
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

interface DistroData {
  distro: string;
  versions: TestResult[];
  summary: {
    totalVersions: number;
    averageSuccessRate: number;
    totalTests: number;
    totalPassed: number;
  };
}

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const url = new URL(request.url);
    const distro = url.searchParams.get('distro') || 'fedora'; // Default to fedora
    const format = url.searchParams.get('format') || 'grouped'; // 'grouped' or 'flat'
    
    if (distro === 'fedora') {
      const fedoraData = await getFedoraData();
      
      if (format === 'flat') {
        // Return flat array for backward compatibility
        return new Response(JSON.stringify(fedoraData.versions), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } else {
        // Return grouped data with summary
        return new Response(JSON.stringify(fedoraData), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      // Future: Add support for other distros
      const allDistros = await getAllDistros();
      const requestedDistro = allDistros.find(d => d.distro.toLowerCase() === distro.toLowerCase());
      
      if (!requestedDistro) {
        return new Response(JSON.stringify({ 
          error: "Distro not found", 
          availableDistros: allDistros.map(d => d.distro)
        }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify(requestedDistro), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "Failed to fetch data", 
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function getFedoraData(): Promise<DistroData> {
  // Note: Change the directory to the user's test result directory
  const lisaTestsPath = path.join(process.env.HOME || '/home/bala', 'lisa_results');
  
  try {
    const directories = await readdir(lisaTestsPath);
    const fedoraVersions = directories.filter(dir => dir.startsWith('Fedora-Cloud'))
      .sort(sortVersionsByVersionDesc); // Apply consistent sorting as pie charts
    
    const versions: TestResult[] = [];
    
    for (const version of fedoraVersions) {
      const versionPath = path.join(lisaTestsPath, version);
      const versionData = await processVersion(versionPath, version, 'fedora');
      versions.push(versionData);
    }
    
    // Calculate summary
    const summary = {
      totalVersions: versions.length,
      averageSuccessRate: versions.length > 0 
        ? Math.round(versions.reduce((sum, v) => sum + v.latestResults.successRate, 0) / versions.length)
        : 0,
      totalTests: versions.reduce((sum, v) => sum + v.latestResults.total, 0),
      totalPassed: versions.reduce((sum, v) => sum + v.latestResults.passed, 0)
    };
    
    return {
      distro: 'fedora',
      versions,
      summary
    };
  } catch (error) {
    throw new Error(`Failed to read lisa_tests directory: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getAllDistros(): Promise<DistroData[]> {
  // Future implementation for multiple distros
  // For now, just return Fedora
  const fedoraData = await getFedoraData();
  return [fedoraData];
}

async function processVersion(versionPath: string, version: string, distro: string): Promise<TestResult> {
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
          dateStr,
          dayOnly: `${year}-${monthNum.toString().padStart(2, '0')}-${day}`
        };
      }
      return null;
    }).filter((run): run is NonNullable<typeof run> => run !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Get latest results (most recent)
    const latestRun = runsWithDates[0];
    const latestResults = latestRun ? await parseXMLResults(path.join(versionPath, latestRun.name)) : null;
    
    // Get last 7 days of data based on calendar days, not test runs
    const today = new Date();
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - i);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      // Find the most recent run for this day
      const dayRuns = runsWithDates.filter(run => run.dayOnly === targetDateStr);
      
      if (dayRuns.length > 0) {
        // Use the most recent run from this day (already sorted by time)
        const dayRun = dayRuns[0];
        const results = await parseXMLResults(path.join(versionPath, dayRun.name));
        if (results) {
          last7Days.push({
            date: targetDateStr,
            total: results.total,
            passed: results.passed,
            failed: results.failed,
            skipped: results.skipped,
            successRate: results.successRate
          });
        }
      }
      // If no data for this day, we don't add anything (will show as "No Data")
    }
    
    return {
      version,
      distro,
      latestResults: latestResults || {
        timestamp: latestRun ? latestRun.date.toISOString() : new Date().toISOString(),
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        successRate: 0
      },
      weeklyData: last7Days
    };
  } catch (error) {
    throw new Error(`Failed to process version ${version}: ${error instanceof Error ? error.message : String(error)}`);
  }
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
    'September': 9, 'October': 10, 'November': 11, 'December': 12,
    // Also handle short forms for robustness
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4,
    'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9,
    'Oct': 10, 'Nov': 11, 'Dec': 12
  };
  return months[month] || 1;
}

// Sort fedora versions with Rawhide first, then by decreasing version numbers
function sortVersionsByVersionDesc(a: string, b: string): number {
  // Helper function to get sort priority
  const getSortPriority = (version: string) => {
    if (version.includes('Rawhide')) {
      return 1000; // Rawhide gets highest priority (appears first)
    }
    
    // Extract version number for numeric sorting
    const match = version.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  
  const priorityA = getSortPriority(a);
  const priorityB = getSortPriority(b);
  
  // Sort by priority (Rawhide first, then higher version numbers first)
  return priorityB - priorityA;
}
