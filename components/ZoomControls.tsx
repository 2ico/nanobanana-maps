import React from 'react';
import { MIN_ZOOM, MAX_ZOOM } from '../constants';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ zoom, onZoomIn, onZoomOut }) => {
  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col">
      <button
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM}
        className="flex items-center justify-center w-10 h-10 bg-gray-800 border border-b-0 border-gray-700 rounded-t-md text-white text-xl font-bold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500"
        aria-label="Zoom in"
        title="Zoom in"
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className="flex items-center justify-center w-10 h-10 bg-gray-800 border border-gray-700 rounded-b-md text-white text-xl font-bold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500"
        aria-label="Zoom out"
        title="Zoom out"
      >
        -
      </button>
    </div>
  );
};

export default ZoomControls;
