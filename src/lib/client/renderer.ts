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

    // Set up click handlers for expandable details
    setupClickHandlers();
}

/**
 * Set up click handlers for weekly and monthly expandable details
 * Uses event delegation to avoid memory leaks on re-renders
 */
let dashboardClickHandler: ((e: Event) => void) | null = null;

function setupClickHandlers(): void {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    // Remove old listener if exists (prevents leak on re-render)
    if (dashboardClickHandler) {
        container.removeEventListener('click', dashboardClickHandler);
    }

    dashboardClickHandler = (e: Event) => {
        const target = e.target as HTMLElement;

        // Weekly date labels
        if (target.classList.contains('weekly-date-label')) {
            e.preventDefault();
            e.stopPropagation();
            const barId = target.getAttribute('data-weekly-bar');
            const details = document.querySelector(`[data-weekly-details="${barId}"]`);
            if (details) {
                const cont = target.closest('.weekly-histogram-container');
                cont?.querySelectorAll('.weekly-bar-details').forEach(d => {
                    if (d !== details) d.classList.remove('expanded');
                });
                details.classList.toggle('expanded');
            }
            return;
        }

        // Weekly bars
        if (target.classList.contains('weekly-histogram-bar')) {
            e.preventDefault();
            e.stopPropagation();
            const group = target.closest('.weekly-bar-group');
            const barId = group?.getAttribute('data-bar-id');
            if (barId) {
                const details = document.querySelector(`[data-weekly-details="${barId}"]`);
                if (details) {
                    const cont = target.closest('.weekly-histogram-container');
                    cont?.querySelectorAll('.weekly-bar-details').forEach(d => {
                        if (d !== details) d.classList.remove('expanded');
                    });
                    details.classList.toggle('expanded');
                }
            }
            return;
        }

        // Monthly chart points
        const pointGroup = target.closest('.monthly-point-group');
        if (pointGroup) {
            e.preventDefault();
            e.stopPropagation();
            const pointId = pointGroup.getAttribute('data-monthly-point');
            const details = document.querySelector(`[data-monthly-details="${pointId}"]`);
            if (details) {
                const cont = pointGroup.closest('.monthly-chart-container');
                cont?.querySelectorAll('.monthly-point-details').forEach(d => {
                    if (d !== details) d.classList.remove('expanded');
                });
                details.classList.toggle('expanded');
            }
        }
    };

    container.addEventListener('click', dashboardClickHandler);
}

/**
 * Render latest results section
 */
function renderLatestSection(groups: GroupedResult[]): void {
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
        <h3>${escapeHtml(group.distro)}</h3>
        <span class="time-badge ${badge.colorClass}">${escapeHtml(badge.text)}</span>
      </div>

      <div class="pie-container">
        <svg viewBox="0 0 200 200" class="pie-chart">
          ${passed > 0 ? `<path d="${createDonutChart(0, passedAngle)}" fill="#059669" class="donut-arc"/>` : ''}
          ${failed > 0 ? `<path d="${createDonutChart(passedAngle, 360)}" fill="#dc2626" class="donut-arc"/>` : ''}
          <text x="100" y="95" text-anchor="middle" dominant-baseline="middle" class="donut-percentage">${formatPercent(passed, failed)}</text>
          <text x="100" y="118" text-anchor="middle" dominant-baseline="middle" class="donut-label">Pass Rate</text>
        </svg>
      </div>

      <div class="card-legend">
        <div class="legend-item">
          <span class="legend-color passed"></span>
          <span class="legend-text">Passed: ${passed}</span>
        </div>
        <div class="legend-item">
          <span class="legend-color failed"></span>
          <span class="legend-text">Failed: ${failed}</span>
        </div>
        <div class="legend-item">
          <span class="legend-color skipped"></span>
          <span class="legend-text">Skipped: ${skipped}</span>
        </div>
      </div>
    </a>
    `;
}

/**
 * Render weekly trends section
 */
function renderWeeklySection(groups: GroupedResult[]): void {
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
 * Render a weekly trend card with histogram and expandable details
 */
function renderWeeklyCard(group: GroupedResult): string {
    const barWidth = 340 / group.weekly.length;
    const cardId = `weekly-${group.distro.replace(/\s+/g, '-')}-${group.arch}`;

    const bars = group.weekly.map((result, idx) => {
        const passed = result.summary.passed;
        const failed = result.summary.failed;
        const total = passed + failed;
        const passRate = total > 0 ? (passed / total) * 100 : 0;
        const color = passRate >= 80 ? '#059669' : passRate >= 60 ? '#d97706' : '#dc2626';
        const height = (passRate / 100) * 100;
        const x = 30 + (idx * barWidth) + (barWidth * 0.15);
        const barActualWidth = barWidth * 0.7;
        const y = 115 - height;

        const date = getComposeDate(result.composeId);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `
          <g class="weekly-bar-group" data-bar-id="${cardId}-${idx}">
            <rect
              x="${x}"
              y="${y}"
              width="${barActualWidth}"
              height="${height}"
              fill="${color}"
              class="weekly-histogram-bar"
            />
            <text
              x="${x + barActualWidth / 2}"
              y="${y - 5}"
              text-anchor="middle"
              class="weekly-bar-percentage"
            >${passRate.toFixed(0)}%</text>
            <text
              x="${x + barActualWidth / 2}"
              y="130"
              text-anchor="middle"
              class="weekly-date-label"
              data-weekly-bar="${cardId}-${idx}"
            >${dateStr}</text>
          </g>
        `;
    }).join('');

    const details = group.weekly.map((result, idx) => {
        const passed = result.summary.passed;
        const failed = result.summary.failed;
        const skipped = result.summary.skipped;
        const date = getComposeDate(result.composeId);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return `
          <div class="weekly-bar-details" data-weekly-details="${cardId}-${idx}">
            <div class="weekly-details-header">${dateStr}</div>
            <div class="weekly-details-grid">
              <div class="detail-item">
                <span class="detail-color passed"></span>
                <span class="detail-text">Passed: ${passed}</span>
              </div>
              <div class="detail-item">
                <span class="detail-color failed"></span>
                <span class="detail-text">Failed: ${failed}</span>
              </div>
              <div class="detail-item">
                <span class="detail-color skipped"></span>
                <span class="detail-text">Skipped: ${skipped}</span>
              </div>
            </div>
            <a href="${escapeAttr(result.htmlReportUrl || '')}" class="detail-link" target="_blank" rel="noopener noreferrer">
              View Full Results →
            </a>
            <div class="detail-compose">${escapeHtml(result.composeId)}</div>
          </div>
        `;
    }).join('');

    return `
    <div class="distro-card">
      <div class="distro-card-header">
        <h4 class="distro-card-title">${escapeHtml(group.distro)}</h4>
        <span class="distro-card-summary">${group.weekly.length} day${group.weekly.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="distro-card-content">
        <div class="weekly-histogram-container">
          <svg viewBox="0 0 400 150" class="weekly-histogram-svg">
            <!-- Y-axis labels -->
            <text x="25" y="18" text-anchor="end" class="weekly-axis-label">100%</text>
            <text x="25" y="68" text-anchor="end" class="weekly-axis-label">50%</text>
            <text x="25" y="115" text-anchor="end" class="weekly-axis-label">0%</text>

            <!-- Grid lines -->
            <line x1="30" y1="15" x2="380" y2="15" stroke="#f3f4f6" stroke-width="1" stroke-dasharray="2 2"/>
            <line x1="30" y1="65" x2="380" y2="65" stroke="#f3f4f6" stroke-width="1" stroke-dasharray="2 2"/>
            <line x1="30" y1="115" x2="380" y2="115" stroke="#e5e7eb" stroke-width="1"/>

            ${bars}
          </svg>
          ${details}
        </div>
      </div>
    </div>
    `;
}

/**
 * Render monthly trends section
 */
function renderMonthlySection(groups: GroupedResult[]): void {
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
 * Render a monthly trend card with line chart and clickable points
 */
function renderMonthlyCard(group: GroupedResult): string {
    const cardId = `monthly-${group.distro.replace(/\s+/g, '-')}-${group.arch}`;

    const points = group.monthly.map((result, idx) => {
        const total = result.summary.passed + result.summary.failed;
        const passRate = total > 0 ? (result.summary.passed / total) * 100 : 0;
        const x = 30 + (idx / (group.monthly.length - 1 || 1)) * 350;
        const y = 150 - (passRate / 100) * 140;
        const date = getComposeDate(result.composeId);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { x, y, passRate, result, dateStr, idx };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const pointElements = points.map(p => {
        const color = p.passRate >= 80 ? '#059669' : p.passRate >= 60 ? '#d97706' : '#dc2626';
        const passed = p.result.summary.passed;
        const failed = p.result.summary.failed;
        const skipped = p.result.summary.skipped;
        return `
      <g class="monthly-point-group" data-monthly-point="${cardId}-${p.idx}">
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="${color}" class="chart-point"/>
        <title>${p.dateStr}: ${p.passRate.toFixed(1)}% (${passed}/${passed + failed})</title>
      </g>
        `;
    }).join('');

    // Create expandable details for each point
    const details = points.map(p => {
        const passed = p.result.summary.passed;
        const failed = p.result.summary.failed;
        const skipped = p.result.summary.skipped;
        const fullDateStr = getComposeDate(p.result.composeId).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });

        return `
          <div class="monthly-point-details" data-monthly-details="${cardId}-${p.idx}">
            <div class="monthly-details-header">${fullDateStr} - ${p.passRate.toFixed(1)}%</div>
            <div class="monthly-details-grid">
              <div class="detail-item">
                <span class="detail-color passed"></span>
                <span class="detail-text">Passed: ${passed}</span>
              </div>
              <div class="detail-item">
                <span class="detail-color failed"></span>
                <span class="detail-text">Failed: ${failed}</span>
              </div>
              <div class="detail-item">
                <span class="detail-color skipped"></span>
                <span class="detail-text">Skipped: ${skipped}</span>
              </div>
            </div>
            <a href="${escapeAttr(p.result.htmlReportUrl || '')}" class="detail-link" target="_blank" rel="noopener noreferrer">
              View Full Results →
            </a>
            <div class="detail-compose">${escapeHtml(p.result.composeId)}</div>
          </div>
        `;
    }).join('');

    // X-axis date labels (show first, middle, last)
    const xLabels = [];
    if (points.length > 0) {
        xLabels.push(`<text x="${points[0].x}" y="168" text-anchor="start" class="chart-label">${points[0].dateStr}</text>`);
        if (points.length > 2) {
            const mid = Math.floor(points.length / 2);
            xLabels.push(`<text x="${points[mid].x}" y="168" text-anchor="middle" class="chart-label">${points[mid].dateStr}</text>`);
        }
        if (points.length > 1) {
            xLabels.push(`<text x="${points[points.length - 1].x}" y="168" text-anchor="end" class="chart-label">${points[points.length - 1].dateStr}</text>`);
        }
    }

    return `
    <div class="distro-card">
      <div class="distro-card-header">
        <h4 class="distro-card-title">${escapeHtml(group.distro)}</h4>
        <span class="distro-card-summary">${group.monthly.length} day${group.monthly.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="distro-card-content">
        <div class="monthly-chart-container">
          <svg viewBox="0 0 400 180" class="chart-svg">
            <line x1="30" y1="10" x2="30" y2="150" stroke="#e5e7eb" stroke-width="1.5"/>
            <line x1="30" y1="150" x2="380" y2="150" stroke="#e5e7eb" stroke-width="1.5"/>
            <text x="25" y="13" text-anchor="end" class="chart-label">100%</text>
            <text x="25" y="83" text-anchor="end" class="chart-label">50%</text>
            <text x="25" y="150" text-anchor="end" class="chart-label">0%</text>
            <!-- Grid lines -->
            <line x1="30" y1="10" x2="380" y2="10" stroke="#f3f4f6" stroke-width="1" stroke-dasharray="2 2"/>
            <line x1="30" y1="80" x2="380" y2="80" stroke="#f3f4f6" stroke-width="1" stroke-dasharray="2 2"/>
            <path d="${linePath}" fill="none" stroke="#3c6eb4" stroke-width="2"/>
            ${pointElements}
            ${xLabels.join('')}
          </svg>
          ${details}
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
