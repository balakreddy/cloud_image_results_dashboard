/**
 * API endpoint: GET /api/composes.json
 * Returns list of available compose IDs
 */

import type { APIRoute } from 'astro';
import { getComposeIds } from '@/lib/services/results';

export const GET: APIRoute = async () => {
  try {
    const composes = await getComposeIds();
    
    return new Response(
      JSON.stringify({
        success: true,
        count: composes.length,
        composes
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
    console.error('Error fetching composes:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch compose IDs'
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
