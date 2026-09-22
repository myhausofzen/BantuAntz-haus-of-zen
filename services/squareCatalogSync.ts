import { Product } from '../types';
import { INITIAL_PRODUCTS } from './productData';

export interface CatalogCache {
  timestamp: number;
  products: Product[];
}

let catalogCache: CatalogCache | null = null;
const CATALOG_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function invalidateCatalogCache() {
  catalogCache = null;
}

export function getSquareCredentials() {
  const token =
    process.env.SQUARE_ACCESS_TOKEN ||
    process.env.VITE_SQUARE_ACCESS_TOKEN ||
    '';

  const env = (
    process.env.SQUARE_ENVIRONMENT ||
    process.env.VITE_SQUARE_ENVIRONMENT ||
    'production'
  ).toLowerCase();

  const baseUrl =
    env === 'sandbox'
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';

  return { token, env, baseUrl };
}

export async function getSquareLiveCatalog(forceRefresh = false): Promise<{
  products: Product[];
  source: 'live' | 'cache';
  lastSynced: string;
  count: number;
}> {
  const creds = getSquareCredentials();
  const now = Date.now();

  // Return cached products if still valid and not forcing a refresh
  if (!forceRefresh && catalogCache && (now - catalogCache.timestamp < CATALOG_CACHE_TTL_MS)) {
    return {
      products: catalogCache.products,
      source: 'cache',
      lastSynced: new Date(catalogCache.timestamp).toISOString(),
      count: catalogCache.products.length
    };
  }

  // If no Square credentials configured, return INITIAL_PRODUCTS immediately
  if (!creds.token) {
    return {
      products: INITIAL_PRODUCTS,
      source: 'live',
      lastSynced: new Date().toISOString(),
      count: INITIAL_PRODUCTS.length
    };
  }

  try {
    const response = await fetch(`${creds.baseUrl}/v2/catalog/list?types=ITEM,IMAGE,CATEGORY`, {
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${creds.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Square catalog API returned status ${response.status}. Using fallback products.`);
      return {
        products: catalogCache ? catalogCache.products : INITIAL_PRODUCTS,
        source: 'cache',
        lastSynced: new Date().toISOString(),
        count: (catalogCache ? catalogCache.products : INITIAL_PRODUCTS).length
      };
    }

    const data = await response.json();
    const images: Record<string, string> = {};
    const categories: Record<string, string> = {};

    data.objects?.filter((o: any) => o.type === 'IMAGE' && !o.is_deleted).forEach((img: any) => {
      if (img.id && img.image_data?.url) {
        images[img.id] = img.image_data.url;
      }
    });

    data.objects?.filter((o: any) => o.type === 'CATEGORY' && !o.is_deleted).forEach((cat: any) => {
      if (cat.id && cat.category_data?.name) {
        categories[cat.id] = cat.category_data.name;
      }
    });

    const squareItems = data.objects?.filter((o: any) => o.type === 'ITEM' && !o.is_deleted) || [];

    // Map curated products by Square catalog Item ID, standard ID, and lowercase trimmed name
    const curatedById = new Map<string, Product>();
    const curatedByName = new Map<string, Product>();
    INITIAL_PRODUCTS.forEach(p => {
      curatedById.set(p.id, p);
      if (p.squareCatalogItemId) {
        curatedById.set(p.squareCatalogItemId, p);
      }
      curatedByName.set(p.name.toLowerCase().trim(), p);
    });

    const syncedProducts: Product[] = [];
    const matchedCuratedIds = new Set<string>();

    for (const item of squareItems) {
      const itemData = item.item_data || {};
      const itemName = (itemData.name || '').trim();
      const lowerName = itemName.toLowerCase();

      const curated = curatedById.get(item.id) || curatedByName.get(lowerName) || null;
      if (curated) {
        matchedCuratedIds.add(curated.id);
        if (curated.squareCatalogItemId) {
          matchedCuratedIds.add(curated.squareCatalogItemId);
        }
      }

      // Variations
      const rawVariations = (itemData.variations || []).filter((v: any) => !v.is_deleted);
      const variations = rawVariations.map((v: any) => {
        const vData = v.item_variation_data || {};
        const amountCents = vData.price_money?.amount || 0;
        return {
          id: v.id,
          name: vData.name || 'Standard',
          price: Number(amountCents) / 100,
          sku: vData.sku
        };
      });

      const primaryVariation = variations[0] || { id: item.id, name: 'Standard', price: 14.99 };
      const livePrice = primaryVariation.price > 0 ? primaryVariation.price : (curated?.price || 14.99);

      const sizeOptions = variations.length > 1 ? variations.map((v: any) => v.name) : curated?.sizeOptions;
      const sizePrices: Record<string, number> | undefined = variations.length > 1
        ? variations.reduce((acc: any, v: any) => ({ ...acc, [v.name]: v.price }), {})
        : curated?.sizePrices;

      const squareImageUrl = itemData.image_ids?.[0] ? images[itemData.image_ids[0]] : null;
      const finalImage = squareImageUrl || curated?.image || '/vitaaaaality_1.png';
      const finalCategory = categories[itemData.category_id] || curated?.category || 'Herbal Tea Blends';

      const productObj: Product = {
        id: item.id,
        sku: primaryVariation.sku || curated?.sku,
        name: itemName || curated?.name || 'Apothecary Formulation',
        botanicalName: curated?.botanicalName || 'All-Natural Whole-Plant Botanical Infusion',
        subtitle: curated?.subtitle || itemData.abbreviation || 'Handcrafted Herbal Formulation',
        description: (itemData.description || '').trim() || curated?.description || 'Crafted in our sanctuary apothecary with pure whole-plant botanicals for daily vitality.',
        price: livePrice,
        compareAtPrice: curated?.compareAtPrice,
        category: finalCategory,
        intent: curated?.intent || 'Immunity',
        image: finalImage,
        gallery: squareImageUrl ? [squareImageUrl] : (curated?.gallery || [finalImage]),
        volume: curated?.volume || (primaryVariation.name ? `${primaryVariation.name} Selection` : 'Botanical Pouch'),
        sizeOptions,
        sizePrices,
        sizeCompareAtPrices: curated?.sizeCompareAtPrices,
        inStock: true,
        featured: curated?.featured || false,
        rating: curated?.rating || 4.95,
        reviewCount: curated?.reviewCount || 24,
        ingredients: curated?.ingredients || ['Organic Whole-Plant Botanicals'],
        ritualGuide: curated?.ritualGuide || 'Steep 1–2 teaspoons in 8–10 oz of boiling spring water for 10–12 minutes. Sip mindfully.',
        dosage: curated?.dosage || '1 to 2 cups daily',
        scentNotes: curated?.scentNotes || 'Warm earthy notes, crisp botanical steam',
        certifications: curated?.certifications || ['100% Handcrafted', '100% Certified Organic', 'Caffeine Free'],
        tags: curated?.tags || ['Square Synced', 'Apothecary'],
        squareCatalogItemId: item.id,
        squareVariationId: primaryVariation.id,
        squareUpdatedAt: item.updated_at
      };

      syncedProducts.push(productObj);
    }

    // Preserve any flagship curated formulations (like Vitalitea) if not directly returned by Square
    INITIAL_PRODUCTS.forEach(p => {
      if (!matchedCuratedIds.has(p.id) && !syncedProducts.some(sp => sp.id === p.id || sp.name.toLowerCase() === p.name.toLowerCase())) {
        syncedProducts.unshift(p);
      }
    });

    catalogCache = {
      timestamp: now,
      products: syncedProducts
    };

    return {
      products: syncedProducts,
      source: 'live',
      lastSynced: new Date(now).toISOString(),
      count: syncedProducts.length
    };
  } catch (err: any) {
    console.error('Error in Square Live Catalog sync:', err);
    return {
      products: catalogCache ? catalogCache.products : INITIAL_PRODUCTS,
      source: 'cache',
      lastSynced: new Date().toISOString(),
      count: (catalogCache ? catalogCache.products : INITIAL_PRODUCTS).length
    };
  }
}
