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
  private mainClusterGroup!: L.MarkerClusterGroup;

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

    // Initialisation du groupe de clusters global
    // Un seul groupe permet au plugin de regrouper et "spiderfy" les antennes superposées
    // même si elles appartiennent à des opérateurs différents.
    this.mainClusterGroup = L.markerClusterGroup({ 
      chunkedLoading: true,
      maxClusterRadius: 50
    });
    this.map.addLayer(this.mainClusterGroup);
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
    if (this.mainClusterGroup) {
      this.mainClusterGroup.clearLayers();
    }

    let visibleCount = 0;
    const markersToAdd: L.Marker[] = [];

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

      const maxTech = this.getMaxTech(tower.technology);
      const powerProps = this.getMarkerProps(tower.power);
      const operatorClass = this.getOperatorClass(tower.operator);

      const html = `
        <div class="tower-icon-wrapper ${powerProps.cssClass} ${operatorClass}">
          <div class="power-ring"></div>
          <div class="core-dot"><span>${maxTech}</span></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-tower-marker',
        html: html,
        iconSize: [powerProps.size, powerProps.size],
        iconAnchor: [powerProps.size / 2, powerProps.size / 2],
        popupAnchor: [0, -powerProps.size / 2]
      });

      const marker = L.marker([tower.coordinates[0], tower.coordinates[1]], {
        icon: customIcon
      });

      const popupContent = `
        <div style="font-family: Arial, sans-serif; font-size: 13px;">
          <h3 style="margin: 0 0 5px 0;">${tower.operator || 'Inconnu'}</h3>
          <div><strong>Technologie :</strong> ${tower.technology || 'N/A'}</div>
          <div><strong>Puissance :</strong> ${tower.power || 'N/A'}</div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersToAdd.push(marker as any);
    });

    // Ajout en masse au cluster
    if (markersToAdd.length > 0) {
      this.mainClusterGroup.addLayers(markersToAdd);
    }

    this.visibleTowersCount = visibleCount;
  }

  private getOperatorGroup(operator: string): string | null {
    const op = (operator || '').toLowerCase();
    if (op.includes('swisscom')) return 'Swisscom';
    if (op.includes('sunrise')) return 'Sunrise';
    if (op.includes('salt')) return 'Salt';
    return null;
  }

  private getMaxTech(technology: string | undefined): string {
    const tech = (technology || '').toUpperCase();
    if (tech.includes('5G')) return '5';
    if (tech.includes('4G')) return '4';
    if (tech.includes('3G')) return '3';
    if (tech.includes('2G')) return '2';
    return '-';
  }

  private getMarkerProps(power: string | undefined): { size: number, cssClass: string } {
    const p = (power || '').toLowerCase();
    if (p.includes('très faible')) return { size: 28, cssClass: 'power-very-low' };
    if (p.includes('faible')) return { size: 40, cssClass: 'power-low' };
    if (p.includes('moyenne')) return { size: 56, cssClass: 'power-medium' };
    return { size: 28, cssClass: 'power-very-low' };
  }

  private getOperatorClass(operator: string | undefined): string {
    const op = (operator || '').toLowerCase();
    if (op.includes('swisscom')) return 'op-swisscom';
    if (op.includes('sunrise')) return 'op-sunrise';
    if (op.includes('salt')) return 'op-salt';
    return 'op-unknown';
  }
}
