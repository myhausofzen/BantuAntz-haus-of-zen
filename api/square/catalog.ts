import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSquareLiveCatalog } from '../../services/squareCatalogSync';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const forceRefresh =
      req.query?.forceRefresh === 'true' ||
      req.url?.includes('refresh') ||
      req.method === 'POST';

    const result = await getSquareLiveCatalog(forceRefresh);

    return res.status(200).json({
      success: true,
      count: result.count,
      products: result.products,
      lastSynced: result.lastSynced,
      source: result.source
    });
  } catch (err: any) {
    console.error('Error handling /api/square/catalog:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error fetching catalog'
    });
  }
}
