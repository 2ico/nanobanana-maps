export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationState extends Coordinates {
  zoom: number;
}

export interface MapTile {
  url: string;
  gridX: number; // grid column index (0, 1, 2...)
  gridY: number; // grid row index (0, 1, 2...)
  key: string;   // unique key for react list
}

export interface MapOffset {
  x: number;
  y: number;
}

export interface MapData {
  tiles: MapTile[];
  offset: MapOffset;
}
