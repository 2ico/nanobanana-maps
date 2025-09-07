
import React, { useState } from 'react';
import type { LocationState } from '../types';
import { MIN_ZOOM, MAX_ZOOM } from '../constants';

interface LocationFormProps {
  initialLocation: LocationState;
  onSubmit: (location: LocationState) => void;
  isLoading: boolean;
  isApiKeyMissing: boolean;
  onGenerate: (stylePrompt: string) => void;
  isGenerating: boolean;
}

const LocationForm: React.FC<LocationFormProps> = ({ 
  initialLocation, 
  onSubmit, 
  isLoading, 
  isApiKeyMissing, 
  onGenerate, 
  isGenerating 
}) => {
  const [location, setLocation] = useState<LocationState>(initialLocation);
  const [stylePrompt, setStylePrompt] = useState<string>('cyberpunk');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocation(prev => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(location);
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stylePrompt.trim()) {
      onGenerate(stylePrompt);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleLocationSubmit} className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400 mb-4">Location Controls</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="lat" className="block text-sm font-medium text-gray-300">Latitude</label>
              <input
                type="number"
                id="lat"
                name="lat"
                value={location.lat}
                onChange={handleChange}
                step="0.0001"
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                disabled={isLoading || isApiKeyMissing || isGenerating}
              />
            </div>
            <div>
              <label htmlFor="lng" className="block text-sm font-medium text-gray-300">Longitude</label>
              <input
                type="number"
                id="lng"
                name="lng"
                value={location.lng}
                onChange={handleChange}
                step="0.0001"
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                disabled={isLoading || isApiKeyMissing || isGenerating}
              />
            </div>
            <div>
              <label htmlFor="zoom" className="block text-sm font-medium text-gray-300">Zoom Level ({location.zoom})</label>
              <input
                type="range"
                id="zoom"
                name="zoom"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                value={location.zoom}
                onChange={handleChange}
                className="mt-1 block w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                disabled={isLoading || isApiKeyMissing || isGenerating}
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || isApiKeyMissing || isGenerating}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Loading...' : 'Update Location'}
        </button>
      </form>
      
      <div className="my-6 border-t border-gray-700"></div>

      <form onSubmit={handleGenerateSubmit} className="space-y-4">
        <h2 className="text-xl font-semibold text-teal-400">Style Controls</h2>
        <div>
          <label htmlFor="stylePrompt" className="block text-sm font-medium text-gray-300">Style Prompt</label>
          <input
            type="text"
            id="stylePrompt"
            name="stylePrompt"
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            placeholder="e.g., Japanese ukiyo-e woodblock"
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            disabled={isLoading || isApiKeyMissing || isGenerating}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || isApiKeyMissing || isGenerating || !stylePrompt.trim()}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Style'}
        </button>
      </form>
      {isApiKeyMissing && (
        <p className="mt-4 text-sm text-red-400 text-center">API Key is missing. The application is disabled.</p>
      )}
    </div>
  );
};

export default LocationForm;
