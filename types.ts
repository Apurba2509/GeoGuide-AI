export enum ChatMode {
  MAPS = 'MAPS',
  SEARCH = 'SEARCH',
  CHAT = 'CHAT'
}

export interface Location {
  lat: number;
  lng: number;
}

export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  markers?: MapMarker[];
  sources?: Array<{ title: string; uri: string }>;
}

export interface GeminiResponse {
  text: string;
  markers?: MapMarker[];
  sources?: Array<{ title: string; uri: string }>;
}