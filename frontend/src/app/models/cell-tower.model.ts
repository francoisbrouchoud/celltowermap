export interface CellTower {
  coordinates: [number, number];
  operator: string;
  technology: string;
  power: string;
}

export interface CellTowerDataset {
  name: string;
  celltowers: CellTower[];
}
