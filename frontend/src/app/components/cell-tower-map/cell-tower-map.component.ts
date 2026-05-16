import { AfterViewInit, Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import * as L from 'leaflet';

import { CellTowerService } from '../../services/cell-tower.service';
import {
  CellTower,
  CellTowerDataset,
  CellTowerPower,
  CellTowerTechnology,
  CellTowerType,
} from '../../models/cell-tower.model';

type TechnologyKey = keyof CellTowerTechnology;
type OperatorFilter = 'swisscom' | 'sunrise' | 'salt' | 'other';
type FilterablePower = Exclude<CellTowerPower, 'unknown'>;
type FilterableType = Exclude<CellTowerType, 'unknown'>;

interface FilterOption<T extends string> {
  label: string;
  value: T;
  cssClass?: string;
}

interface CellTowerFilters {
  operators: Record<OperatorFilter, boolean>;
  technologies: Record<TechnologyKey, boolean>;
  powers: Record<FilterablePower, boolean>;
  types: Record<FilterableType, boolean>;
}

interface MarkerDisplayOptions {
  size: number;
  cssClass: string;
}

interface TypeDisplayInfo {
  label: string;
  svg: string;
}

@Component({
  selector: 'app-cell-tower-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cell-tower-map.component.html',
  styleUrls: ['./cell-tower-map.component.scss'],
})
export class CellTowerMapComponent implements AfterViewInit, OnDestroy {
  private readonly cellTowerService = inject(CellTowerService);
  private readonly subscriptions = new Subscription();

  private readonly mapCenter: L.LatLngExpression = [46.8182, 8.2275];
  private readonly highPowerRadiusMeters = 150;

  private map!: L.Map;
  private markerClusterGroup!: L.MarkerClusterGroup;
  private highPowerRadiusLayer!: L.LayerGroup;

  private allTowers: CellTower[] = [];

  isCollapsed = false;
  totalTowersCount = 0;
  visibleTowersCount = 0;

  pageTitle = 'Swiss Cell Tower Map';

  ofcomUrl =
    'https://data.geo.admin.ch/browser/index.html#/collections/ch.bakom.standorte-mobilfunkanlagen/items/standorte-mobilfunkanlagen?.asset=asset-standorte-mobilfunkanlagen_2056-json';

  githubUrl = 'https://github.com/francoisbrouchoud/celltowermap';
  licenseLabel = 'MIT';

  sourceUpdatedLabel = '';

  readonly operatorOptions: FilterOption<OperatorFilter>[] = [
    { label: 'Swisscom', value: 'swisscom', cssClass: 'swisscom' },
    { label: 'Sunrise', value: 'sunrise', cssClass: 'sunrise' },
    { label: 'Salt', value: 'salt', cssClass: 'salt' },
    { label: 'Others / SBB (GSM-R)', value: 'other', cssClass: 'other' },
  ];

  readonly technologyOptions: FilterOption<TechnologyKey>[] = [
    { label: '2G', value: '2g' },
    { label: '3G', value: '3g' },
    { label: '4G', value: '4g' },
    { label: '5G', value: '5g' },
  ];

  readonly powerOptions: FilterOption<FilterablePower>[] = [
    { label: 'Very low', value: 'very_low' },
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
  ];

  readonly typeOptions: FilterOption<FilterableType>[] = [
    { label: 'Outdoor', value: 'outdoor' },
    { label: 'Indoor', value: 'indoor' },
    { label: 'Tunnel', value: 'tunnel' },
  ];

  filters: CellTowerFilters = this.createDefaultFilters();

  ngAfterViewInit(): void {
  this.isCollapsed = window.matchMedia('(max-width: 640px)').matches;
  void this.bootstrapMap();
  }

  private async bootstrapMap(): Promise<void> {
    (window as any).L = L;

    await import('leaflet.markercluster');

    console.log('markerClusterGroup:', typeof (L as any).markerClusterGroup);

    this.initMap();
    this.loadTowers();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    if (this.map) {
      this.map.remove();
    }
  }

  toggleFilters(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  resetFilters(): void {
    this.filters = this.createDefaultFilters();
    this.applyFilters();
  }

  applyFilters(): void {
    this.markerClusterGroup.clearLayers();
    this.highPowerRadiusLayer.clearLayers();

    const visibleMarkers: L.Marker[] = [];
    let visibleCount = 0;

    for (const tower of this.allTowers) {
      if (!this.isTowerVisible(tower)) {
        continue;
      }

      visibleCount++;
      visibleMarkers.push(this.createMarker(tower));

      if (tower.power === 'high') {
        this.highPowerRadiusLayer.addLayer(this.createHighPowerRadius(tower));
      }
    }

    if (visibleMarkers.length > 0) {
      this.markerClusterGroup.addLayers(visibleMarkers);
    }

    this.visibleTowersCount = visibleCount;
  }

  private createDefaultFilters(): CellTowerFilters {
    return {
      operators: {
        swisscom: true,
        sunrise: true,
        salt: true,
        other: true,
      },
      technologies: {
        '2g': true,
        '3g': true,
        '4g': true,
        '5g': true,
      },
      powers: {
        very_low: true,
        low: true,
        medium: true,
        high: true,
      },
      types: {
        outdoor: true,
        indoor: true,
        tunnel: true,
      },
    };
  }

  private initMap(): void {
    this.map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
    }).setView(this.mapCenter, 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.highPowerRadiusLayer = L.layerGroup().addTo(this.map);

    this.markerClusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
    }).addTo(this.map);
  }

  private loadTowers(): void {
  fetch('data/swiss-cell-tower-sites.json')
    .then(res => {
      console.log('status', res.status);
      return res.json();
    })
    .then((dataset: CellTowerDataset) => {
      console.log('data loaded', dataset);
      console.log('celltowers', dataset.celltowers);
      console.log('count', dataset.celltowers?.length);

      this.allTowers = dataset.celltowers;
      this.totalTowersCount = this.allTowers.length;
      this.applyDatasetMetadata(dataset);
      this.applyFilters();
    })
    .catch(err => {
      console.error('data loading error:', err);
    });
}

  private applyDatasetMetadata(dataset: CellTowerDataset): void {
  const ofcomUrl = dataset.source?.furtherInformationUrl;

  if (ofcomUrl?.trim()) {
    this.ofcomUrl = ofcomUrl;
  }

  const updatedAt = dataset.source?.updatedAt ?? dataset.source?.dataDateStart;

  if (updatedAt) {
    this.sourceUpdatedLabel = this.formatDate(updatedAt);
  }
}

  private isTowerVisible(tower: CellTower): boolean {
    return (
      this.isOperatorVisible(tower.operator) &&
      this.isTechnologyVisible(tower.technology) &&
      this.isPowerVisible(tower.power) &&
      this.isTypeVisible(tower.type)
    );
  }

  private isOperatorVisible(operator: string): boolean {
    const operatorFilter = this.getOperatorFilter(operator);
    return this.filters.operators[operatorFilter];
  }

  private isTechnologyVisible(technology: CellTowerTechnology): boolean {
    return this.technologyOptions.some(
      (option) =>
        this.filters.technologies[option.value] === true &&
        technology[option.value] === true,
    );
  }

  private isPowerVisible(power: CellTowerPower): boolean {
    if (power === 'unknown') {
      return true;
    }

    return this.filters.powers[power];
  }

  private isTypeVisible(type: CellTowerType): boolean {
    if (type === 'unknown') {
      return true;
    }

    return this.filters.types[type];
  }

  private createMarker(tower: CellTower): L.Marker {
    const markerDisplay = this.getMarkerDisplayOptions(tower.power);
    const operatorClass = this.getOperatorClass(tower.operator);
    const maxTechnology = this.getMaxTechnology(tower.technology);

    const icon = L.divIcon({
      className: 'custom-tower-marker',
      html: `
        <div class="tower-icon-wrapper ${markerDisplay.cssClass} ${operatorClass}">
          <div class="power-ring"></div>
          <div class="core-dot"><span>${maxTechnology}</span></div>
        </div>
      `,
      iconSize: [markerDisplay.size, markerDisplay.size],
      iconAnchor: [markerDisplay.size / 2, markerDisplay.size / 2],
      popupAnchor: [0, -markerDisplay.size / 2],
    });

    const marker = L.marker([tower.coordinates[0], tower.coordinates[1]], { icon });
    marker.bindPopup(this.createPopupContent(tower));

    return marker;
  }

  private createHighPowerRadius(tower: CellTower): L.Circle {
    const operatorColor = this.getOperatorColor(tower.operator);

    return L.circle([tower.coordinates[0], tower.coordinates[1]], {
      radius: this.highPowerRadiusMeters,
      color: operatorColor,
      weight: 1,
      opacity: 0.22,
      fillColor: operatorColor,
      fillOpacity: 0.04,
      interactive: false,
    });
  }

  private createPopupContent(tower: CellTower): string {
    const typeInfo = this.getTypeInfo(tower.type);

    return `
      <div style="font-family: Arial, sans-serif; font-size: 13px; min-width: 180px;">
        <h3 style="margin: 0 0 8px 0; border-bottom: 1px solid #ccc; padding-bottom: 4px;">
          ${this.escapeHtml(tower.operator || 'Inconnu')}
        </h3>

        <div style="margin-bottom: 4px;">
          <strong>Site :</strong> ${this.escapeHtml(tower.stationName || 'Unknown')}
        </div>

        <div style="margin-bottom: 4px;">
          <strong>Technologie :</strong> ${this.getTechnologyLabel(tower.technology)}
        </div>

        <div style="margin-bottom: 4px;">
          <strong>Puissance :</strong> ${this.getPowerLabel(tower.power)}
        </div>

        <div style="margin-bottom: 4px; display: flex; align-items: center;">
          <strong>Type :</strong>
          <span style="display: flex; align-items: center; margin-left: 4px;">
            ${typeInfo.svg} ${typeInfo.label}
          </span>
        </div>
      </div>
    `;
  }

  private getOperatorFilter(operator: string): OperatorFilter {
    const normalizedOperator = operator.toLowerCase();

    if (normalizedOperator.includes('swisscom')) {
      return 'swisscom';
    }

    if (normalizedOperator.includes('sunrise')) {
      return 'sunrise';
    }

    if (normalizedOperator.includes('salt')) {
      return 'salt';
    }

    return 'other';
  }

  private getOperatorClass(operator: string): string {
    return `op-${this.getOperatorFilter(operator)}`;
  }

  private getOperatorColor(operator: string): string {
    const operatorFilter = this.getOperatorFilter(operator);

    switch (operatorFilter) {
      case 'swisscom':
        return '#2563eb';
      case 'sunrise':
        return '#dc2626';
      case 'salt':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  }

  private getTechnologyLabel(technology: CellTowerTechnology): string {
    const labels: string[] = [];

    if (technology['2g']) labels.push('2G');
    if (technology['3g']) labels.push('3G');
    if (technology['4g']) labels.push('4G');
    if (technology['5g']) labels.push('5G');

    return labels.length > 0 ? labels.join(', ') : 'Unknown';
  }

  private getMaxTechnology(technology: CellTowerTechnology): string {
    if (technology['5g']) return '5';
    if (technology['4g']) return '4';
    if (technology['3g']) return '3';
    if (technology['2g']) return '2';

    return '-';
  }

  private getMarkerDisplayOptions(power: CellTowerPower): MarkerDisplayOptions {
    switch (power) {
      case 'high':
        return { size: 64, cssClass: 'power-high' };
      case 'medium':
        return { size: 56, cssClass: 'power-medium' };
      case 'low':
        return { size: 40, cssClass: 'power-low' };
      case 'very_low':
        return { size: 28, cssClass: 'power-very-low' };
      default:
        return { size: 28, cssClass: 'power-unknown' };
    }
  }

  private getPowerLabel(power: CellTowerPower): string {
    switch (power) {
      case 'very_low':
        return 'Very low';
      case 'low':
        return 'Low';
      case 'medium':
        return 'Medium';
      case 'high':
        return 'High';
      default:
        return 'Unknown';
    }
  }

  private getTypeInfo(type: CellTowerType): TypeDisplayInfo {
    const svgStyles = 'width: 16px; height: 16px; margin-right: 4px;';

    switch (type) {
      case 'indoor':
        return {
          label: 'Indoor',
          svg: `<svg style="${svgStyles}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
        };

      case 'tunnel':
        return {
          label: 'Tunnel',
          svg: `<svg style="${svgStyles}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 13V11A10 10 0 0 0 2 11v2"></path><path d="M22 21v-4a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v4"></path><path d="M2 13h20"></path><circle cx="8" cy="17" r="1"></circle><circle cx="16" cy="17" r="1"></circle></svg>`,
        };

      case 'outdoor':
        return {
          label: 'Outdoor',
          svg: `<svg style="${svgStyles}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="m19 13-7-7-7 7"></path><path d="m19 17-7-7-7 7"></path></svg>`,
        };

      default:
        return {
          label: 'Unknown',
          svg: `<svg style="${svgStyles}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>`,
        };
    }
  }

  private formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}