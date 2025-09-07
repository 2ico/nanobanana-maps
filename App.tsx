
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import type { MapTile, LocationState, MapOffset } from './types';
import { getTilesForArea, fetchSessionToken, latLngToPreciseTileXY, preciseTileXYToLatLng } from './services/googleMaps';
import { imageUrlToBase64 } from './services/imageUtils';
import LocationForm from './components/LocationForm';
import MapGrid from './components/MapGrid';
import ZoomControls from './components/ZoomControls';
import { DEFAULT_LOCATION, FETCH_GRID_DIMENSION, TILE_SIZE, MIN_ZOOM, MAX_ZOOM } from './constants';

const App: React.FC = () => {
  const [location, setLocation] = useState<LocationState>(DEFAULT_LOCATION);
  const [tiles, setTiles] = useState<MapTile[]>([]);
  const [mapOffset, setMapOffset] = useState<MapOffset>({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [styledTiles, setStyledTiles] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.MAPS_API_KEY) {
      const errorMsg = "API_KEY environment variable not set. Please provide a valid API key for Google services.";
      console.error(errorMsg);
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    const initSession = async () => {
      console.log('Initializing map session...');
      try {
        const token = await fetchSessionToken(process.env.MAPS_API_KEY as string);
        console.log('Session token received:', token);
        setSessionToken(token);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize map session.';
        console.error('Session initialization failed:', errorMsg, err);
        setError(errorMsg);
        setIsLoading(false);
      }
    };

    initSession();
  }, []);

  const fetchTiles = useCallback(async (currentLocation: LocationState) => {
    console.log('fetchTiles called with location:', currentLocation);
    if (!sessionToken || !process.env.MAPS_API_KEY) {
      const msg = !process.env.MAPS_API_KEY ? "API Key is missing." : "Session token not available.";
      console.error(msg);
      setError(msg);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('Requesting tiles from getTilesForArea...');
      const { tiles: newTiles, offset: newOffset } = await getTilesForArea({
        center: { lat: currentLocation.lat, lng: currentLocation.lng },
        zoom: currentLocation.zoom,
        gridDimension: FETCH_GRID_DIMENSION,
        sessionToken,
        apiKey: process.env.MAPS_API_KEY as string,
      });
      console.log(`Received ${newTiles.length} tiles with offset:`, newOffset);
      setTiles(newTiles);
      setMapOffset(newOffset);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred while fetching tiles.';
      console.error('Error fetching tiles:', errorMsg, err);
      setError(errorMsg);
    } finally {
      console.log('fetchTiles finished.');
      setIsLoading(false);
    }
  }, [sessionToken]);
  
  useEffect(() => {
    if (sessionToken) {
      console.log('Session token is set, fetching initial tiles.');
      fetchTiles(location);
    }
  }, [sessionToken, location, fetchTiles]);

  const handleGenerateStyles = async (stylePrompt: string) => {
    if (!process.env.GEMINI_CUSTOM_API_KEY) {
      setGenerationError("API Key is missing.");
      return;
    }

    const centralGridIndex = Math.floor(FETCH_GRID_DIMENSION / 2);
    const centralTile = tiles.find(t => t.gridX === centralGridIndex && t.gridY === centralGridIndex);

    if (!centralTile) {
      setGenerationError("Could not find the central map tile to apply style to.");
      return;
    }

    console.log(`Starting style generation for central tile (${centralTile.key}) with prompt: "${stylePrompt}"`);
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_CUSTOM_API_KEY as string });

      console.log(`Converting tile image to base64...`);
      const { data: base64ImageData, mimeType } = await imageUrlToBase64(centralTile.url);

      const prompt = `Restyle this map image in the style of ${stylePrompt}. Preserve the geographic features like roads and buildings. The resulting image must be seamless with no borders, vignette, or frame.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: [
            { inlineData: { data: base64ImageData, mimeType } },
            { text: prompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

      if (imagePart?.inlineData) {
        const newBase64 = imagePart.inlineData.data;
        const newMimeType = imagePart.inlineData.mimeType;
        const styledImageUrl = `data:${newMimeType};base64,${newBase64}`;

        console.log(`Successfully generated styled tile. Applying to map...`);
        setStyledTiles(prev => ({
          ...prev,
          [centralTile.key]: styledImageUrl,
        }));

      } else {
        console.warn(`No image part returned for tile ${centralTile.key}.`, response);
        const textPart = response.candidates?.[0]?.content?.parts?.find(part => part.text);
        const reason = response.candidates?.[0]?.finishReason;
        const safety = response.candidates?.[0]?.safetyRatings;
        let errorDetails = `Style generation failed: No image was returned from the API.`;
        if (textPart?.text) errorDetails += `\nResponse Text: "${textPart.text}"`;
        if (reason) errorDetails += `\nFinish Reason: ${reason}`;
        if (safety) errorDetails += `\nSafety Ratings: ${JSON.stringify(safety)}`;
        
        setGenerationError(errorDetails);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred during style generation.';
      console.error(`Failed to generate styled tile:`, err);
      setGenerationError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };


  const handleSubmit = (newLocation: LocationState) => {
    console.log('Form submitted with new location:', newLocation);
    setLocation(newLocation);
    // fetchTiles is called by the useEffect watching location
  };
  
  const handlePanEnd = useCallback((panX: number, panY: number) => {
    if (panX === 0 && panY === 0) return;

    console.log(`Panning ended with offset: dx=${panX}, dy=${panY}`);
    const { lat, lng, zoom } = location;
    const currentTileXY = latLngToPreciseTileXY(lat, lng, zoom);
    const newTileX = currentTileXY.x - panX / TILE_SIZE;
    const newTileY = currentTileXY.y - panY / TILE_SIZE;
    const newLatLng = preciseTileXYToLatLng(newTileX, newTileY, zoom);

    const newLocation: LocationState = {
      ...newLatLng,
      zoom,
    };

    console.log('New location after pan:', newLocation);
    setLocation(newLocation);
    // fetchTiles is called by the useEffect watching location
  }, [location]);

  const handleZoomIn = () => {
    const newZoom = Math.min(location.zoom + 1, MAX_ZOOM);
    if (newZoom !== location.zoom) {
      const newLocation = { ...location, zoom: newZoom };
      setLocation(newLocation);
    }
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(location.zoom - 1, MIN_ZOOM);
     if (newZoom !== location.zoom) {
      const newLocation = { ...location, zoom: newZoom };
      setLocation(newLocation);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl">
        <header className="text-center mb-6">
          <h1 className="text-4xl font-bold text-cyan-400">Google Maps Style Transfer</h1>
          <p className="text-gray-400 mt-2">cuz those graphics are so 2008</p>
        </header>

        <main className="flex flex-col xl:flex-row gap-8">
          <aside className="xl:w-1/4 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <LocationForm
              initialLocation={location}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              isApiKeyMissing={!process.env.API_KEY}
              onGenerate={handleGenerateStyles}
              isGenerating={isGenerating}
            />
          </aside>
          
          <section className="relative flex-1 bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center justify-center min-h-[400px] lg:min-h-0">
            <MapGrid
              tiles={tiles}
              isLoading={isLoading}
              error={error}
              offset={mapOffset}
              onPanEnd={handlePanEnd}
              styledTiles={styledTiles}
              isGenerating={isGenerating}
              generationError={generationError}
            />
            <ZoomControls
              zoom={location.zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
            />
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;
