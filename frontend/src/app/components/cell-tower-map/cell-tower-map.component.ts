import { Component, AfterViewInit, inject } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { CellTowerService } from '../../services/cell-tower.service';

@Component({
  selector: 'app-cell-tower-map',
  standalone: true,
  templateUrl: './cell-tower-map.component.html',
  styleUrls: ['./cell-tower-map.component.scss']
})
export class CellTowerMapComponent implements AfterViewInit {
  private map!: L.Map;
  private readonly cellTowerService = inject(CellTowerService);

  ngAfterViewInit(): void {
    this.initMap();
    this.loadTowers();
  }

  private initMap(): void {
    this.map = L.map('map').setView([46.8182, 8.2275], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
  }

  private loadTowers(): void {
    this.cellTowerService.getCellTowers().subscribe(dataset => {
      const markers = L.markerClusterGroup({
        chunkedLoading: true
      });

      dataset.celltowers.forEach(tower => {
        const color = this.getColor(tower.operator);

        const marker = L.circleMarker([tower.coordinates[0], tower.coordinates[1]], {
          radius: 6,
          color: color,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 1
        });

        const popupContent = `
          <div style="font-family: Arial, sans-serif; font-size: 13px;">
            <h3 style="margin: 0 0 5px 0;">${tower.operator}</h3>
            <div><strong>Technologie :</strong> ${tower.technology}</div>
            <div><strong>Puissance :</strong> ${tower.power}</div>
          </div>
        `;

        marker.bindPopup(popupContent);
        markers.addLayer(marker);
      });

      this.map.addLayer(markers);
    });
  }

  private getColor(operator: string): string {
    if (!operator) return 'gray';
    const op = operator.toLowerCase();
    if (op.includes('swisscom')) return 'blue';
    if (op.includes('sunrise')) return 'red';
    if (op.includes('salt')) return 'green';
    return 'gray';
  }
}