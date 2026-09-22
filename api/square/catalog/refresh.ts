import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSquareLiveCatalog } from '../../../services/squareCatalogSync';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Always force refresh when hitting /refresh
    const result = await getSquareLiveCatalog(true);

    return res.status(200).json({
      success: true,
      count: result.count,
      products: result.products,
      lastSynced: result.lastSynced,
      source: result.source
    });
  } catch (err: any) {
    console.error('Error handling /api/square/catalog/refresh:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error refreshing catalog'
    });
  }
}
