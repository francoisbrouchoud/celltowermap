import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CellTowerService } from './services/cell-tower.service';
import { CellTowerDataset } from './models/cell-tower.model';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  private readonly cellTowerService = inject(CellTowerService);

  ngOnInit(): void {
    this.cellTowerService.getCellTowers().subscribe({
      next: (data: CellTowerDataset) => {
        console.log(`Loaded dataset: ${data.name} with ${data.celltowers.length} cell towers`);
      },
      error: (err) => {
        console.error('Error loading cell tower data:', err);
      }
    });
  }
}
