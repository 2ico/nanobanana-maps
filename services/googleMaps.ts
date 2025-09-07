import type { Coordinates, MapTile, MapData } from '../types';
import { TILE_SIZE, POSITIONING_FACTOR, VISIBLE_GRID_DIMENSION } from '../constants';

interface GetTilesParams {
  center: Coordinates;
  zoom: number;
  gridDimension: number;
  sessionToken: string;
  apiKey: string;
}

/**
 * Fetches a session token required for the Google Maps Tiles API.
 * @param apiKey - Your Google Maps API key.
 * @returns A promise that resolves to the session token string.
 */
export const fetchSessionToken = async (apiKey: string): Promise<string> => {
  const url = `https://tile.googleapis.com/v1/createSession?key=${apiKey}`;
  const body = JSON.stringify({
    mapType: 'roadmap',
    language: 'en-US',
    region: 'US',
  });
  console.log('Fetching session token from:', url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Could not parse error JSON' } }));
    console.error('Failed to create session. Status:', response.status, 'Response:', errorData);
    throw new Error(`Failed to create session: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Successfully created session:', data.session);
  return data.session;
};

/**
 * Converts latitude and longitude to precise, floating-point tile coordinates.
 * @param lat - Latitude.
 * @param lng - Longitude.
 * @param zoom - Zoom level.
 * @returns An object with the precise x and y tile coordinates.
 */
export const latLngToPreciseTileXY = (lat: number, lng: number, zoom: number): { x: number; y: number } => {
  const n = Math.pow(2, zoom);
  const latRad = (lat * Math.PI) / 180;
  const xtile = n * ((lng + 180) / 360);
  const ytile = n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  return { x: xtile, y: ytile };
};

/**
 * Generates an array of map tile objects for a specified area.
 * @param params - The parameters for generating the tiles.
 * @returns A promise that resolves to a MapData object containing tiles and a pixel offset.
 */
export const getTilesForArea = async ({
  center,
  zoom,
  gridDimension,
  sessionToken,
  apiKey,
}: GetTilesParams): Promise<MapData> => {
  console.log(`getTilesForArea called with:`, { center, zoom, gridDimension });
  
  const preciseCenter = latLngToPreciseTileXY(center.lat, center.lng, zoom);
  const integerCenter = { x: Math.floor(preciseCenter.x), y: Math.floor(preciseCenter.y) };
  console.log(`Center tile coordinates (precise):`, preciseCenter);
  console.log(`Center tile coordinates (integer):`, integerCenter);

  const halfGrid = Math.floor(gridDimension / 2);
  const startX = integerCenter.x - halfGrid;
  const startY = integerCenter.y - halfGrid;
  console.log(`Grid start coordinates (startX, startY):`, { startX, startY });

  const tiles: MapTile[] = [];

  for (let i = 0; i < gridDimension; i++) {
    for (let j = 0; j < gridDimension; j++) {
      const tileX = startX + j;
      const tileY = startY + i;
      
      const url = `https://tile.googleapis.com/v1/2dtiles/${zoom}/${tileX}/${tileY}?session=${sessionToken}&key=${apiKey}`;
      
      tiles.push({
        url,
        gridX: j,
        gridY: i,
        key: `${zoom}-${tileX}-${tileY}`,
      });
    }
  }

  const step = TILE_SIZE * POSITIONING_FACTOR;
  
  // Calculate the precise pixel coordinate of the target lat/lng within the fetched grid's coordinate space.
  const targetPixelInGridX = (preciseCenter.x - startX) * TILE_SIZE;
  const targetPixelInGridY = (preciseCenter.y - startY) * TILE_SIZE;

  // Calculate the pixel center of the visible viewport.
  const viewportWidth = (VISIBLE_GRID_DIMENSION - 1) * step + TILE_SIZE;
  const viewportHeight = (VISIBLE_GRID_DIMENSION - 1) * step + TILE_SIZE;
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;

  // The final translation is the difference between where the center *should be* (viewport center)
  // and where it *is* (its pixel coordinate in the grid).
  // This value can be used directly in a CSS transform.
  const finalTranslateX = viewportCenterX - targetPixelInGridX;
  const finalTranslateY = viewportCenterY - targetPixelInGridY;

  console.log(`Generated a total of ${tiles.length} tiles.`);
  return {
    tiles,
    offset: { x: finalTranslateX, y: finalTranslateY },
  };
};

/**
 * Converts precise, floating-point tile coordinates to latitude and longitude.
 * @param x - The precise x tile coordinate.
 * @param y - The precise y tile coordinate.
 * @param zoom - Zoom level.
 * @returns An object with latitude and longitude.
 */
export const preciseTileXYToLatLng = (x: number, y: number, zoom: number): { lat: number; lng: number } => {
  const n = Math.pow(2, zoom);
  const lngDeg = (x / n) * 360 - 180;
  // The lat calculation uses the inverse of the Mercator projection formula
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const latDeg = (latRad * 180) / Math.PI;
  return { lat: latDeg, lng: lngDeg };
};