import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CellTowerDataset } from '../models/cell-tower.model';

@Injectable({
  providedIn: 'root',
})
export class CellTowerService {
  private readonly http = inject(HttpClient);

  private readonly dataUrl = '/data/swiss-cell-tower-sites.json';

  getCellTowers(): Observable<CellTowerDataset> {
    return this.http.get<CellTowerDataset>(this.dataUrl);
  }
}