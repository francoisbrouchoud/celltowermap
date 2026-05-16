import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { CellTowerService } from '../../services/cell-tower.service';
import { CellTower } from '../../models/cell-tower.model';

@Component({
  selector: 'app-cell-tower-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cell-tower-map.component.html',
  styleUrls: ['./cell-tower-map.component.scss']
})
export class CellTowerMapComponent implements AfterViewInit, OnDestroy {
  private map!: L.Map;
  private readonly cellTowerService = inject(CellTowerService);
  
  private allTowers: CellTower[] = [];
  private operatorClusters: { [key: string]: L.MarkerClusterGroup } = {};

  isCollapsed = false;
  totalTowersCount = 0;
  visibleTowersCount = 0;

  operators = ['Swisscom', 'Sunrise', 'Salt'];
  technologies = ['3G', '4G', '5G'];
  powers = [
    { label: 'Très faible (intérieur)', value: 'très faible' },
    { label: 'Faible', value: 'faible' },
    { label: 'Moyenne', value: 'moyenne' }
  ];

  filters = {
    operators: { 'Swisscom': true, 'Sunrise': true, 'Salt': true } as { [key: string]: boolean },
    technologies: { '3G': true, '4G': true, '5G': true } as { [key: string]: boolean },
    powers: { 'très faible': true, 'faible': true, 'moyenne': true } as { [key: string]: boolean }
  };

  ngAfterViewInit(): void {
    this.initMap();
    this.loadTowers();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = L.map('map').setView([46.8182, 8.2275], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Initialisation des groupes de clusters par opérateur
    this.operators.forEach(op => {
      this.operatorClusters[op] = L.markerClusterGroup({ chunkedLoading: true });
      this.map.addLayer(this.operatorClusters[op]);
    });
  }

  private loadTowers(): void {
    this.cellTowerService.getCellTowers().subscribe(dataset => {
      this.allTowers = dataset.celltowers;
      this.totalTowersCount = this.allTowers.length;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    // Vider les marqueurs existants
    this.operators.forEach(op => {
      this.operatorClusters[op].clearLayers();
    });

    let visibleCount = 0;
    const markersToAdd: { [key: string]: L.Marker[] } = {
      'Swisscom': [], 'Sunrise': [], 'Salt': []
    };

    this.allTowers.forEach(tower => {
      const opName = this.getOperatorGroup(tower.operator);

      // Filtre Opérateur
      if (!opName || !this.filters.operators[opName]) return;

      // Filtre Puissance
      const towerPower = tower.power ? tower.power.toLowerCase() : '';
      if (!this.filters.powers[towerPower]) {
        // Tolérance si la puissance de l'antenne n'est pas dans notre liste de base
        // Mais si elle est désactivée explicitement (false), on l'exclut.
        if (this.filters.powers[towerPower] === false || towerPower in this.filters.powers) {
          return;
        }
      }

      // Filtre Technologie
      let techMatch = false;
      const towerTechs = tower.technology ? tower.technology.toUpperCase() : '';
      for (const tech of this.technologies) {
        if (this.filters.technologies[tech] && towerTechs.includes(tech)) {
          techMatch = true;
          break;
        }
      }
      if (!techMatch) return;

      visibleCount++;

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
          <h3 style="margin: 0 0 5px 0;">${tower.operator || 'Inconnu'}</h3>
          <div><strong>Technologie :</strong> ${tower.technology || 'N/A'}</div>
          <div><strong>Puissance :</strong> ${tower.power || 'N/A'}</div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersToAdd[opName].push(marker as any);
    });

    // Ajout en masse aux clusters
    this.operators.forEach(op => {
      if (markersToAdd[op].length > 0) {
        this.operatorClusters[op].addLayers(markersToAdd[op]);
      }
    });

    // Gestion de la visibilité globale de la couche opérateur
    this.operators.forEach(op => {
      if (this.filters.operators[op]) {
        if (!this.map.hasLayer(this.operatorClusters[op])) {
          this.map.addLayer(this.operatorClusters[op]);
        }
      } else {
        if (this.map.hasLayer(this.operatorClusters[op])) {
          this.map.removeLayer(this.operatorClusters[op]);
        }
      }
    });

    this.visibleTowersCount = visibleCount;
  }

  private getOperatorGroup(operator: string): string | null {
    const op = (operator || '').toLowerCase();
    if (op.includes('swisscom')) return 'Swisscom';
    if (op.includes('sunrise')) return 'Sunrise';
    if (op.includes('salt')) return 'Salt';
    return null;
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
