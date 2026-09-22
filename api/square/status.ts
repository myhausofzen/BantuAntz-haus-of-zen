import type { VercelRequest, VercelResponse } from '@vercel/node';

function getSquareCredentials() {
  const token = process.env.SQUARE_ACCESS_TOKEN || '';
  const appId = process.env.SQUARE_APPLICATION_ID || process.env.VITE_SQUARE_APP_ID || '';
  const locationId = process.env.SQUARE_LOCATION_ID || process.env.VITE_SQUARE_LOCATION_ID || '';
  const env = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
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
  return res.status(200).json({
    configured: !!creds.token,
    hasToken: !!creds.token,
    hasLocation: !!creds.locationId,
    hasAppId: !!creds.appId,
    readyForCatalogSync: !!creds.token,
    readyForPayments: !!(creds.token && creds.locationId && creds.appId),
    environment: creds.env,
    isProduction: creds.isProduction,
    baseUrl: creds.baseUrl,
    locationId: creds.locationId,
    appId: creds.appId,
    maskedToken: creds.token ? `${creds.token.substring(0, 5)}••••` : 'MISSING',
    maskedLocationId: creds.locationId ? `${creds.locationId.substring(0, 4)}••••` : 'MISSING',
    maskedAppId: creds.appId ? `${creds.appId.substring(0, 6)}••••` : 'MISSING'
  });
}
