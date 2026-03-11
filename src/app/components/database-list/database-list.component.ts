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
  hideSystemMeasurements = true;
  hideServiceMeasurements = true;
  showOnlyRabbitMeasurements = false; // Mudado para mostrar apenas rabbit quando ativo
  prefixFilters = {
    system: true,
    service: true,
    rabbit: false // rabbit começa desativado
  };

  constructor(private influxService: InfluxdbService) {}

  ngOnInit(): void {
    this.loadDatabases();
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

    // Aplicar filtros de prefixo
    filtered = filtered.filter(m => {
      // Se o filtro rabbit está ativo, mostrar APENAS measurements rabbit
      if (this.prefixFilters.rabbit) {
        return m.name.startsWith('rabbit') || m.name.startsWith('rabbitmq');
      }
      
      // Caso contrário, ocultar system_ e service_ se estiverem ativos
      if (this.prefixFilters.system && m.name.startsWith('system_')) {
        return false;
      }
      if (this.prefixFilters.service && m.name.startsWith('service_')) {
        return false;
      }
      
      return true;
    });

    return filtered;
  }

  clearSearch(): void {
    this.measurementSearchText = '';
  }

  toggleFilter(filter: 'system' | 'service' | 'rabbit'): void {
    this.prefixFilters[filter] = !this.prefixFilters[filter];
  }
}
