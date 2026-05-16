export interface CellTowerTechnology {
  '2g': boolean;
  '3g': boolean;
  '4g': boolean;
  '5g': boolean;
}

export type CellTowerPower = 'very_low' | 'low' | 'medium' | 'high' | 'unknown';

export type CellTowerType = 'indoor' | 'outdoor' | 'tunnel' | 'unknown';

export interface CellTower {
  coordinates: [number, number];
  operator: string;
  stationName: string;
  technology: CellTowerTechnology;
  power: CellTowerPower;
  type: CellTowerType;
  mergedCount: number;
}

export interface CellTowerDataset {
  name: string;
  title?: string;
  source?: unknown;
  processing?: unknown;
  celltowers: CellTower[];
}