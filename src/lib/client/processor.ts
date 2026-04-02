/**
 * Data processing utilities for the dashboard
 * Groups, filters, and sorts test results.
 */
import type { TestResult, GroupedResult} from './types';

/**
 * Extracts the distro type from the compose ID.
*/
export function getDistroType(composeId: string): string {

    if (composeId.includes('Rawhide')) return 'Rawhide';
    if (composeId.includes('eln')) return 'ELN';

    // Extract distro version from the composeID
    const match = composeId.match(/Fedora-Cloud-(\d+)/);
    if (match) {
        return `Fedora ${match[1]}`;
    }
    return 'Unknown';
}

/**
 * Extract date from composeID
 */
export function getComposeDate(composeId: string): Date {
    const match = composeId.match(/(\d{8})/);
    if (match) {
        const dateStr = match[1];
        const year = parseInt(dateStr.substring(0, 4), 10);
        const month = parseInt(dateStr.substring(4, 6), 10) - 1;
        const day = parseInt(dateStr.substring(6, 8), 10);
        return new Date(year, month, day);
    }
    return new Date();
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

/**
 * Get relative time badge (Today, Yesterday, X days ago) from date
 */
export function getRelativeTimeBadge(date: Date): { text: string; colorClass: string} {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const resultDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = today.getTime() - resultDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return {text: 'Today', colorClass: 'badge-today'};
    } else if (diffDays === 1) {
        return {text: 'Yesterday', colorClass: 'badge-recent'};
    } else if (diffDays <= 3) {
        return {text: `${diffDays} days ago`, colorClass: 'badge-recent'};
    } else {
        return {text: `${diffDays} days ago`, colorClass: 'badge-old'};
    }
}

/**
 * Format percentage
 */
export function formatPercent(passed: number, failed: number): string {
    const total = passed + failed;
    if (total === 0) return '0%';
    return `${((passed/total) * 100).toFixed(1)}%`;
}

/**
 * Process all results into grouped structure for dashboard display
 */
export function processResults(allResults: TestResult[]): GroupedResult[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const groupMap = new Map<string, GroupedResult>();

    for (const result of allResults) {
        const distro = getDistroType(result.composeId);
        const arch = result.architecture;
        const key = `${distro}-${arch}`;
        const resultDate = getComposeDate(result.composeId);

        if (!groupMap.has(key)) {
            groupMap.set(key, {
                distro,
                arch,
                weekly: [],
                monthly: []
            });
        }

        const group = groupMap.get(key)!;

        // Track most recent result
        if (!group.today || result.composeId > group.today.composeId) {
            group.today = result;
        }

        // Add to weekly if within 7 days
        if (resultDate >= sevenDaysAgo && resultDate <= today) {
            group.weekly.push(result);
        }

        // Add to monthly if within 30 days
        if (resultDate >= thirtyDaysAgo && resultDate <= today) {
            group.monthly.push(result);
        }
    }

    // Process: keep only latest per day, limit counts
    for (const group of groupMap.values()) {
        group.weekly = deduplicateByDate(group.weekly, 7);
        group.monthly = deduplicateByDate(group.monthly, 30);
    }

    return sortGroups(Array.from(groupMap.values()), allResults);
}

/**
 * Keep only latest result per day, limit to maxDays
 */

function deduplicateByDate(results: TestResult[], maxDays: number): TestResult[] {
    const byDate = new Map<string, TestResult>();

    for (const result of results) {
        const dateKey = getComposeDate(result.composeId).toISOString().slice(0, 10);
        const existing = byDate.get(dateKey);
        if (!existing || result.composeId > existing.composeId) {
            byDate.set(dateKey, result);
        }
    }
    return Array.from(byDate.values())
        .sort((a, b) => getComposeDate(a.composeId).getTime() - getComposeDate(b.composeId).getTime())
        .slice(-maxDays);
}

/**
 * Sort groups: x86_64 first, then by distro order 
 */
function sortGroups(groups: GroupedResult[], allResults: TestResult[]): GroupedResult[] {
    // Compute distro order
    const numericDistros = [...new Set(allResults.map(r => getDistroType(r.composeId)))]
        .filter(d => d.startsWith('Fedora ') && !isNaN(Number(d.replace('Fedora ', ''))))
        .sort((a, b) => Number(b.replace('Fedora ', '')) - Number(a.replace('Fedora ', '')));
    
    const distroOrder = ['Rawhide', ...numericDistros, 'ELN'];
    const archOrder = ['x86_64', 'aarch64'];

    return groups.sort((a, b) => {
        const archCompare = archOrder.indexOf(a.arch) - archOrder.indexOf(b.arch);
        if (archCompare !== 0) return archCompare;
        return distroOrder.indexOf(a.distro) - distroOrder.indexOf(b.distro);
    });
}

/**
 * Create Donut chart
 */
export function createDonutChart(
    startAngle: number,
    endAngle: number,
    cx = 100,
    cy = 100,
    outerRadius = 75,
    innerRadius = 50
): string {
    const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
        const rad = (angle - 90) * Math.PI / 180.0;
        return {
            x: cx + (r * Math.cos(rad)),
            y: cy + (r * Math.sin(rad))
        };
    };

    const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
    const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
    const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);
    
    const largeArcFlag = (endAngle - startAngle) <= 180 ? '0' : '1';

    return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
        'Z'
    ].join(' ');
}