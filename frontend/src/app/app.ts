import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CellTowerMapComponent } from './components/cell-tower-map/cell-tower-map.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CellTowerMapComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
