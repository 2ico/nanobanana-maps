
import React, { useState, useEffect, useCallback } from 'react';
import type { MapTile, MapOffset } from '../types';
import { TILE_SIZE, VISIBLE_GRID_DIMENSION, FETCH_GRID_DIMENSION, POSITIONING_FACTOR } from '../constants';

interface MapGridProps {
  tiles: MapTile[];
  isLoading: boolean;
  error: string | null;
  offset: MapOffset;
  onPanEnd: (panX: number, panY: number) => void;
  styledTiles: Record<string, string>;
  isGenerating: boolean;
  generationError: string | null;
}

const Spinner: React.FC = () => (
  <div className="border-4 border-gray-600 border-t-cyan-400 rounded-full w-12 h-12 animate-spin" aria-hidden="true"></div>
);

interface MemoizedTileProps {
  tile: MapTile;
  styledUrl?: string;
  onLoad: () => void;
  onError: () => void;
}

const MemoizedTile: React.FC<MemoizedTileProps> = React.memo(({ tile, styledUrl, onLoad, onError }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [styledStatus, setStyledStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const stepDistance = TILE_SIZE * POSITIONING_FACTOR;
  const left = tile.gridX * stepDistance;
  const top = tile.gridY * stepDistance;

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${TILE_SIZE}px`,
    height: `${TILE_SIZE}px`,
    top: `${top}px`,
    left: `${left}px`,
  };

  const handleLoad = useCallback(() => {
    setStatus('loaded');
    onLoad();
  }, [onLoad]);

  const handleError = useCallback(() => {
    console.error(
      `Tile Loading Error for ${tile.key}: The browser failed to load this image. This is often due to an API key configuration issue (like HTTP referrer restrictions).`,
      {
        "Recommendation": "For the full error, open the 'Network' tab in your browser's developer tools, find the failing image request, and check its status.",
        "Technical Note": "The specific HTTP error code (e.g., 403 Forbidden) is not accessible to this application's code due to browser security policies.",
        "Tile Details": tile
      }
    );
    setStatus('error');
    onError();
  }, [onError, tile]);
  
  useEffect(() => {
    setStatus('loading');
  }, [tile.url]);

  useEffect(() => {
    if (styledUrl) {
      setStyledStatus('loading');
    }
  }, [styledUrl]);

  return (
    <div style={commonStyle}>
      {status === 'loading' && (
        <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center">
          <div className="border-2 border-gray-500 border-t-cyan-400 rounded-full w-6 h-6 animate-spin"></div>
        </div>
      )}
      {status === 'error' && (
        <div 
          className="absolute inset-0 bg-red-900/30 border border-red-700 flex items-center justify-center"
          title={`Error loading tile ${tile.key}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
      <img
        src={tile.url}
        alt={`Map tile at ${tile.gridX}, ${tile.gridY}`}
        onLoad={handleLoad}
        onError={handleError}
        className="absolute transition-opacity duration-300"
        style={{ opacity: status === 'loaded' ? 1 : 0 }}
      />
      {styledUrl && (
        <img
          src={styledUrl}
          alt={`Styled map tile at ${tile.gridX}, ${tile.gridY}`}
          onLoad={() => setStyledStatus('loaded')}
          onError={() => setStyledStatus('error')}
          className="absolute transition-opacity duration-500"
          style={{ opacity: styledStatus === 'loaded' ? 1 : 0 }}
        />
      )}
    </div>
  );
});

const MapGrid: React.FC<MapGridProps> = ({ tiles, isLoading, error, offset, onPanEnd, styledTiles, isGenerating, generationError }) => {
  const [errorTiles, setErrorTiles] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setErrorTiles(0);
    setPanOffset({ x: 0, y: 0 });
  }, [tiles]);

  const handleTileLoad = useCallback(() => {}, []);

  const handleTileError = useCallback(() => {
    setErrorTiles(count => count + 1);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !panStart) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setPanOffset({ x: dx, y: dy });
  }, [isPanning, panStart]);

  const endPan = useCallback(() => {
    if (!isPanning) return;
    onPanEnd(panOffset.x, panOffset.y);
    setIsPanning(false);
    setPanStart(null);
  }, [isPanning, onPanEnd, panOffset]);

  const handleMouseUp = useCallback(() => {
    endPan();
  }, [endPan]);

  const handleMouseLeave = useCallback(() => {
    endPan();
  }, [endPan]);


  if (isLoading && tiles.length === 0) {
    return (
      <div role="status" className="flex flex-col items-center justify-center text-gray-400">
        <Spinner />
        <p className="mt-4">Fetching map tiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 bg-red-900/20 p-4 rounded-lg">
        <h3 className="font-bold text-lg">An Error Occurred</h3>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }
  
  if (tiles.length === 0 && !isLoading) {
    return (
        <div className="text-center text-gray-500">
            <h3 className="font-bold text-lg">No Tiles to Display</h3>
            <p className="mt-2 text-sm">Use the form to fetch map tiles for a location.</p>
        </div>
    );
  }

  const stepDistance = TILE_SIZE * POSITIONING_FACTOR;
  
  const viewportWidth = (VISIBLE_GRID_DIMENSION - 1) * stepDistance + TILE_SIZE;
  const viewportHeight = (VISIBLE_GRID_DIMENSION - 1) * stepDistance + TILE_SIZE;
  
  const gridContainerWidth = (FETCH_GRID_DIMENSION - 1) * stepDistance + TILE_SIZE;
  const gridContainerHeight = (FETCH_GRID_DIMENSION - 1) * stepDistance + TILE_SIZE;

  const totalTiles = tiles.length;
  const showMassFailureError = !isLoading && totalTiles > 0 && errorTiles / totalTiles > 0.5;

  return (
    <div
      className={`relative overflow-hidden bg-black select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      role="application"
      aria-roledescription="interactive map"
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: `${gridContainerWidth}px`,
          height: `${gridContainerHeight}px`,
          transform: `translate(${offset.x + panOffset.x}px, ${offset.y + panOffset.y}px)`,
          transition: isPanning ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {tiles.map(tile => (
          <MemoizedTile 
            tile={tile} 
            key={tile.key}
            styledUrl={styledTiles[tile.key]}
            onLoad={handleTileLoad} 
            onError={handleTileError} 
          />
        ))}
      </div>

      {(isLoading || isGenerating) && (
         <div role="status" className="absolute inset-0 bg-black/60 z-10 flex flex-col items-center justify-center">
            <Spinner />
            <p className="mt-4 font-medium text-gray-200">
              {isGenerating ? 'Applying new style...' : 'Loading new map area...'}
            </p>
         </div>
      )}
      {showMassFailureError && (
        <div className="absolute inset-0 bg-black/75 z-20 flex items-center justify-center p-4">
            <div className="text-center text-red-400 bg-red-900/30 p-6 rounded-lg border border-red-700 max-w-lg">
                <h3 className="font-bold text-lg">Multiple Tiles Failed to Load</h3>
                <p className="mt-2 text-sm">
                    This is often caused by API key restrictions. Please check your Google Cloud Console and ensure:
                </p>
                <ul className="text-xs text-left list-disc list-inside mt-3 space-y-1 text-gray-300">
                    <li>The <strong>Map Tiles API</strong> is enabled for your project.</li>
                    <li>Your API key has the correct <strong>HTTP referrer</strong> permissions for this website.</li>
                </ul>
            </div>
        </div>
      )}
      {generationError && !isGenerating && (
        <div className="absolute inset-0 bg-black/75 z-20 flex items-center justify-center p-4">
            <div className="text-center text-red-400 bg-red-900/30 p-6 rounded-lg border border-red-700 max-w-lg">
                <h3 className="font-bold text-lg">Style Generation Failed</h3>
                <p className="mt-2 text-sm">{generationError}</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default MapGrid;
