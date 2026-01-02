/**
 * Cache Management API
 * View stats, clear cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCacheStats, 
  clearAllCache, 
  clearExpiredCache, 
  deleteCacheByPrefix 
} from '@/lib/cache';

// GET /api/cache - Get cache stats
export async function GET() {
  try {
    const stats = getCacheStats();
    
    return NextResponse.json({
      success: true,
      stats: {
        totalEntries: stats.total,
        expiredEntries: stats.expired,
        activeEntries: stats.total - stats.expired,
        databaseSize: `${(stats.size / 1024).toFixed(2)} KB`,
        databaseSizeBytes: stats.size,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

// POST /api/cache - Clear cache
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, prefix } = body;
    
    switch (action) {
      case 'clear-all':
        clearAllCache();
        return NextResponse.json({ 
          success: true, 
          message: 'All cache cleared' 
        });
      
      case 'clear-expired':
        const cleared = clearExpiredCache();
        return NextResponse.json({ 
          success: true, 
          message: `Cleared ${cleared} expired entries` 
        });
      
      case 'clear-prefix':
        if (!prefix) {
          return NextResponse.json(
            { error: 'Prefix is required for clear-prefix action' },
            { status: 400 }
          );
        }
        deleteCacheByPrefix(prefix);
        return NextResponse.json({ 
          success: true, 
          message: `Cleared cache entries with prefix: ${prefix}` 
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: clear-all, clear-expired, or clear-prefix' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
