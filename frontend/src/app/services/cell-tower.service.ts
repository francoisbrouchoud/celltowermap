import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';

import { CellTowerDataset } from '../models/cell-tower.model';

@Injectable({
  providedIn: 'root',
})
export class CellTowerService {
  private readonly http = inject(HttpClient);

  private readonly dataUrl = 'data/swiss-cell-tower-sites.json';

  getCellTowers(): Observable<CellTowerDataset> {
    console.log('Loading data from:', this.dataUrl);

    return this.http.get<CellTowerDataset>(this.dataUrl).pipe(
      tap((dataset) => {
        console.log('Dataset loaded:', dataset);
        console.log('Cell towers:', dataset.celltowers);
        console.log('Count:', dataset.celltowers?.length);
      }),
      catchError((error) => {
        console.error('Error loading dataset:', error);
        return throwError(() => error);
      }),
    );
  }
}