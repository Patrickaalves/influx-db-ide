import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InfluxdbService } from '../../services/influxdb.service';
import { Database, Measurement } from '../../models/influx.models';

@Component({
  selector: 'app-database-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './database-list.component.html',
  styleUrls: ['./database-list.component.scss']
})
export class DatabaseListComponent implements OnInit {
  @Output() databaseSelected = new EventEmitter<string>();
  @Output() measurementSelected = new EventEmitter<string>();

  databases: Database[] = [];
  measurements: Measurement[] = [];
  selectedDatabase: string | null = null;
  selectedMeasurement: string | null = null;
  isLoadingDatabases = false;
  isLoadingMeasurements = false;
  error: string | null = null;

  // Filtros
  measurementSearchText = '';
  customFilters: string[] = [];
  newFilterText = '';
  showFilterInput = false;

  constructor(private influxService: InfluxdbService) {}

  ngOnInit(): void {
    this.loadDatabases();
    this.loadFiltersFromStorage();
  }

  loadFiltersFromStorage(): void {
    const saved = localStorage.getItem('influxdb_custom_filters');
    if (saved) {
      try {
        this.customFilters = JSON.parse(saved);
      } catch {
        this.customFilters = [];
      }
    }
  }

  saveFiltersToStorage(): void {
    localStorage.setItem('influxdb_custom_filters', JSON.stringify(this.customFilters));
  }

  loadDatabases(): void {
    this.isLoadingDatabases = true;
    this.error = null;

    this.influxService.getDatabases().subscribe({
      next: (databases) => {
        this.databases = databases;
        this.isLoadingDatabases = false;
      },
      error: (error) => {
        this.error = 'Erro ao carregar databases: ' + (error.message || 'Verifique a configuração');
        this.isLoadingDatabases = false;
      }
    });
  }

  selectDatabase(database: string): void {
    this.selectedDatabase = database;
    this.selectedMeasurement = null;
    this.measurements = [];
    this.databaseSelected.emit(database);
    this.loadMeasurements(database);
  }

  loadMeasurements(database: string): void {
    this.isLoadingMeasurements = true;

    this.influxService.getMeasurements(database).subscribe({
      next: (measurements) => {
        this.measurements = measurements;
        this.isLoadingMeasurements = false;
      },
      error: (error) => {
        console.error('Error loading measurements:', error);
        this.isLoadingMeasurements = false;
      }
    });
  }

  selectMeasurement(measurement: string): void {
    this.selectedMeasurement = measurement;
    this.measurementSelected.emit(measurement);
  }

  refresh(): void {
    this.loadDatabases();
    if (this.selectedDatabase) {
      this.loadMeasurements(this.selectedDatabase);
    }
  }

  get filteredMeasurements(): Measurement[] {
    let filtered = [...this.measurements];

    // Aplicar filtro de busca por texto
    if (this.measurementSearchText.trim()) {
      const searchLower = this.measurementSearchText.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtros customizados (ocultar measurements que começam com o padrão)
    if (this.customFilters.length > 0) {
      filtered = filtered.filter(m => {
        const nameLower = m.name.toLowerCase();
        return !this.customFilters.some(filter => {
          const filterLower = filter.toLowerCase();
          // Suporta * no final como wildcard
          if (filterLower.endsWith('*')) {
            return nameLower.startsWith(filterLower.slice(0, -1));
          }
          return nameLower === filterLower || nameLower.startsWith(filterLower);
        });
      });
    }

    return filtered;
  }

  clearSearch(): void {
    this.measurementSearchText = '';
  }

  toggleFilterInput(): void {
    this.showFilterInput = !this.showFilterInput;
    if (!this.showFilterInput) {
      this.newFilterText = '';
    }
  }

  addFilter(): void {
    const filter = this.newFilterText.trim();
    if (filter && !this.customFilters.includes(filter)) {
      this.customFilters.push(filter);
      this.saveFiltersToStorage();
      this.newFilterText = '';
    }
  }

  removeFilter(filter: string): void {
    this.customFilters = this.customFilters.filter(f => f !== filter);
    this.saveFiltersToStorage();
  }

  clearAllFilters(): void {
    this.customFilters = [];
    this.saveFiltersToStorage();
  }
}
