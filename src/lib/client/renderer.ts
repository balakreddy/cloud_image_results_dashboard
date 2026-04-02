/**
 * HTML rendering functions for the dashboard
 * Generates HTML strings from the processed data for display in the UI.
 */
import type { GroupedResult } from './types';
import { 
    getRelativeTimeBadge, 
    getComposeDate, 
    formatPercent, 
    createDonutChart 
} from './processor';

/**
 * Render the complete dashboard
 */
export function renderDashboard(groups: GroupedResult[]): void {
    renderLatestSection(groups);
    renderWeeklySection(groups);
    renderMonthlySection(groups);
}

/**
 * Render latest results section
 */
export function renderLatestSection(groups: GroupedResult[]): void {
    const x86Container = document.getElementById('x86_64-latest');
    const aarchContainer = document.getElementById('aarch64-latest');

    if (x86Container) {
        x86Container.innerHTML = groups
            .filter(g => g.arch === 'x86_64' && g.today)
            .map(g => renderTodayCard(g))
            .join('');
    }

    if (aarchContainer) {
        aarchContainer.innerHTML = groups
            .filter(g => g.arch === 'aarch64' && g.today)
            .map(g => renderTodayCard(g))
            .join('');
    }
}

/**
 * Render a single "today" card with donut chart
 */
function renderTodayCard(group: GroupedResult): string {
    const result = group.today!;
    const passed = result.summary.passed;
    const failed = result.summary.failed;
    const skipped = result.summary.skipped;
    const total = passed + failed;

    const passedAngle = total > 0 ? (passed / total) * 360 : 0;
    const badge = getRelativeTimeBadge(getComposeDate(result.composeId));

    return `
    <a href="${escapeAttr(result.htmlReportUrl || '')}" class="today-card" target="_blank" rel="noopener noreferrer">
      <div class="card-header">
        <h3>${group.distro}</h3>
        <span class="time-badge ${badge.colorClass}">${badge.text}</span>
      </div>
      
      <div class="pie-container">
        <svg viewBox="0 0 200 200" class="pie-chart">
          ${passed > 0 ? `<path d="${createDonutChart(0, passedAngle)}" fill="#059669" class="donut-arc"/>` : ''}
          ${failed > 0 ? `<path d="${createDonutChart(passedAngle, 360)}" fill="#dc2626" class="donut-arc"/>` : ''}
          <text x="100" y="95" text-anchor="middle" class="center-percent">${formatPercent(passed, failed)}</text>
          <text x="100" y="115" text-anchor="middle" class="center-label">pass rate</text>
        </svg>
      </div>
      
      <div class="stats-row">
        <div class="stat passed">
          <span class="stat-value">${passed}</span>
          <span class="stat-label">Passed</span>
        </div>
        <div class="stat failed">
          <span class="stat-value">${failed}</span>
          <span class="stat-label">Failed</span>
        </div>
        <div class="stat skipped">
          <span class="stat-value">${skipped}</span>
          <span class="stat-label">Skipped</span>
        </div>
      </div>
    </a>
    `;
}

/**
 * Render weekly trends section
 */
export function renderWeeklySection(groups: GroupedResult[]): void {
    const x86Container = document.getElementById('x86_64-weekly');
    const aarchContainer = document.getElementById('aarch64-weekly');

    if (x86Container) {
        x86Container.innerHTML = groups
            .filter(g => g.arch === 'x86_64' && g.weekly.length > 0)
            .map(g => renderWeeklyCard(g))
            .join('');
    }

    if (aarchContainer) {
        aarchContainer.innerHTML = groups
            .filter(g => g.arch === 'aarch64' && g.weekly.length > 0)
            .map(g => renderWeeklyCard(g))
            .join('');
    }
}

/**
 * Render a weekly trend card with bar chart
 */
function renderWeeklyCard(group: GroupedResult): string {
    const bars = group.weekly.map((result, idx) => {
        const passed = result.summary.passed;
        const failed = result.summary.failed;
        const total = passed + failed;
        const passRate = total > 0 ? (passed / total) * 100 : 0;
        const color = passRate >= 80 ? '#059669' : passRate >= 60 ? '#d97706' : '#dc2626';
        const height = (passRate / 100) * 100;

        return `
      <a href="${escapeAttr(result.htmlReportUrl || '')}" class="bar-link" target="_blank" rel="noopener noreferrer">
        <rect x="${20 + idx * 50}" y="${110 - height}" width="35" height="${height}" fill="${color}" class="bar"/>
        <title>${passRate.toFixed(1)}%</title>
      </a>
        `;
    }).join('');

    return `
    <div class="distro-card">
      <div class="distro-card-header">
        <h4 class="distro-card-title">${group.distro}</h4>
        <span class="distro-card-summary">${group.weekly.length} day${group.weekly.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="distro-card-content">
        <div class="bar-chart">
          <svg viewBox="0 0 400 130" class="chart-svg">
            <line x1="15" y1="110" x2="385" y2="110" stroke="#e5e7eb" stroke-width="1"/>
            ${bars}
          </svg>
        </div>
      </div>
    </div>
    `;
}

/**
 * Render monthly trends section
 */
export function renderMonthlySection(groups: GroupedResult[]): void {
    const x86Container = document.getElementById('x86_64-monthly');
    const aarchContainer = document.getElementById('aarch64-monthly');

    if (x86Container) {
        x86Container.innerHTML = groups
            .filter(g => g.arch === 'x86_64' && g.monthly.length > 0)
            .map(g => renderMonthlyCard(g))
            .join('');
    }

    if (aarchContainer) {
        aarchContainer.innerHTML = groups
            .filter(g => g.arch === 'aarch64' && g.monthly.length > 0)
            .map(g => renderMonthlyCard(g))
            .join('');
    }
}

/**
 * Render a monthly trend card with line chart
 */
function renderMonthlyCard(group: GroupedResult): string {
    const points = group.monthly.map((result, idx) => {
        const total = result.summary.passed + result.summary.failed;
        const passRate = total > 0 ? (result.summary.passed / total) * 100 : 0;
        const x = 30 + (idx / (group.monthly.length - 1 || 1)) * 350;
        const y = 150 - (passRate / 100) * 140;
        return { x, y, passRate, result };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const pointElements = points.map(p => {
        const color = p.passRate >= 80 ? '#059669' : p.passRate >= 60 ? '#d97706' : '#dc2626';
        return `
      <a href="${escapeAttr(p.result.htmlReportUrl || '')}" target="_blank" rel="noopener noreferrer">
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="${color}" class="chart-point"/>
        <title>${p.passRate.toFixed(1)}%</title>
      </a>
        `;
    }).join('');

    return `
    <div class="distro-card">
      <div class="distro-card-header">
        <h4 class="distro-card-title">${group.distro}</h4>
        <span class="distro-card-summary">${group.monthly.length} compose${group.monthly.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="distro-card-content">
        <div class="line-chart">
          <svg viewBox="0 0 400 180" class="chart-svg">
            <line x1="30" y1="10" x2="30" y2="150" stroke="#e5e7eb" stroke-width="1.5"/>
            <line x1="30" y1="150" x2="380" y2="150" stroke="#e5e7eb" stroke-width="1.5"/>
            <text x="25" y="13" text-anchor="end" class="chart-label">100%</text>
            <text x="25" y="83" text-anchor="end" class="chart-label">50%</text>
            <text x="25" y="150" text-anchor="end" class="chart-label">0%</text>
            <path d="${linePath}" fill="none" stroke="#3c6eb4" stroke-width="2"/>
            ${pointElements}
          </svg>
        </div>
      </div>
    </div>
    `;
}

/**
 * Render loading state
 */
export function renderLoadingState(): void {
    const containers = [
        'x86_64-latest', 'aarch64-latest',
        'x86_64-weekly', 'aarch64-weekly',
        'x86_64-monthly', 'aarch64-monthly'
    ];

    for (const id of containers) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading results...</p>
        </div>
            `;
        }
    }
}

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape attribute values to prevent injection
 */
function escapeAttr(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Render error state
 */
export function renderErrorState(error: Error): void {
    const container = document.getElementById('dashboard-content');
    if (container) {
        container.innerHTML = `
      <div class="error-state">
        <h2>Unable to load dashboard</h2>
        <p>${escapeHtml(error.message)}</p>
        <button onclick="location.reload()">Retry</button>
      </div>
        `;
    }
}
