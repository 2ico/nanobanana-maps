
import type { LocationState } from './types';

export const TILE_SIZE = 256; // Standard size for Google Map tiles in pixels

// The number of tiles visible in the viewport's grid (e.g., 3x3).
export const VISIBLE_GRID_DIMENSION = 3;

// The number of tiles to fetch, creating a buffer for panning (e.g., 5x5).
// This should be an odd number and larger than VISIBLE_GRID_DIMENSION.
export const FETCH_GRID_DIMENSION = 5;

// With a positioning factor of 1, tiles are laid out edge-to-edge to create a seamless map.
export const POSITIONING_FACTOR = 1;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 22;

export const DEFAULT_LOCATION: LocationState = {
  lat: 48.8584,
  lng: 2.2945,
  zoom: 17,
};
