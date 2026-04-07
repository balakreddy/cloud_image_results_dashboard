/**
 * API endpoint: GET /api/results.json
 * Returns all test results for the dashboard (pre-filtered and parsed)
 * This avoids CORS issues by proxying Azure requests server-side
 */

import type { APIRoute } from 'astro';
import { getLatestResults } from '@/lib/services/results';

export const GET: APIRoute = async ({ url }) => {
  try {
    // Get limit per version from query params (default: 30 for ~monthly data per version)
    const limitParam = url.searchParams.get('limitPerVersion');
    const limitPerVersion = limitParam ? parseInt(limitParam, 10) : 30;

    const results = await getLatestResults(limitPerVersion);
    
    return new Response(
      JSON.stringify({
        success: true,
        count: results.length,
        results,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // 5 minutes
        }
      }
    );
  } catch (error) {
    console.error('Error fetching all results:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch test results'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
