import type { VercelRequest, VercelResponse } from '@vercel/node';

function getSquareCredentials() {
  const token = process.env.SQUARE_ACCESS_TOKEN || process.env.VITE_SQUARE_ACCESS_TOKEN || '';
  const appId = process.env.SQUARE_APPLICATION_ID || process.env.VITE_SQUARE_APP_ID || '';
  const locationId = process.env.SQUARE_LOCATION_ID || process.env.VITE_SQUARE_LOCATION_ID || '';
  const env = (process.env.SQUARE_ENVIRONMENT || process.env.VITE_SQUARE_ENVIRONMENT || 'production').toLowerCase();
  const isProduction = env !== 'sandbox';
  const baseUrl = isProduction ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';

  return {
    token,
    appId,
    locationId,
    env: isProduction ? 'production' : 'sandbox',
    isProduction,
    baseUrl
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const creds = getSquareCredentials();
  if (!creds.token) {
    return res.status(401).json({
      success: false,
      error: 'SQUARE_ACCESS_TOKEN is missing in environment variables.'
    });
  }

  try {
    const response = await fetch(`${creds.baseUrl}/v2/locations`, {
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${creds.token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.errors?.[0]?.detail || 'Failed to fetch Square locations',
        rawErrors: data.errors
      });
    }

    return res.status(200).json({
      success: true,
      locations: data.locations || [],
      environment: creds.env
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Error communicating with Square API'
    });
  }
}
