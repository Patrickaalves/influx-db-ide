import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseListComponent } from '../database-list/database-list.component';
import { InfluxdbService } from '../../services/influxdb.service';
import { ConfigService } from '../../services/config.service';
import { QueryResult, TagKey, TagValue } from '../../models/influx.models';

interface TagFilter {
  key: string;
  value: string;
}

@Component({
  selector: 'app-query-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, DatabaseListComponent],
  templateUrl: './query-editor.component.html',
  styleUrls: ['./query-editor.component.scss']
})
export class QueryEditorComponent implements OnInit {
  selectedDatabase: string | null = null;
  selectedMeasurement: string | null = null;
  query = '';
  queryResult: QueryResult | null = null;
  isExecuting = false;
  error: string | null = null;

  // Results display
  isResultsFullscreen = false;

  // Tag filtering
  availableTagKeys: TagKey[] = [];
  tagFilters: TagFilter[] = [];
  isLoadingTagKeys = false;
  isLoadingTagValues: { [key: string]: boolean } = {};
  tagValues: { [key: string]: TagValue[] } = {};

  // Query builder
  limitValue = 100;
  timeRange = 'last_7d';
  customTimeStart = '';
  customTimeEnd = '';

  constructor(
    private influxService: InfluxdbService,
    private configService: ConfigService
  ) {}

  ngOnInit(): void {
    const config = this.configService.getConfig();
    if (config?.database) {
      this.selectedDatabase = config.database;
    }
  }

  onDatabaseSelected(database: string): void {
    this.selectedDatabase = database;
    this.selectedMeasurement = null;
    this.tagFilters = [];
    this.availableTagKeys = [];
    this.queryResult = null;
    this.query = '';
  }

  onMeasurementSelected(measurement: string): void {
    this.selectedMeasurement = measurement;
    this.loadTagKeys();
    this.buildQuery();
  }

  loadTagKeys(): void {
    if (!this.selectedDatabase || !this.selectedMeasurement) return;

    this.isLoadingTagKeys = true;
    this.influxService.getTagKeys(this.selectedDatabase, this.selectedMeasurement).subscribe({
      next: (tagKeys) => {
        this.availableTagKeys = tagKeys;
        this.isLoadingTagKeys = false;
      },
      error: (error) => {
        console.error('Error loading tag keys:', error);
        this.isLoadingTagKeys = false;
      }
    });
  }

  addTagFilter(): void {
    if (this.availableTagKeys.length > 0) {
      this.tagFilters.push({ key: '', value: '' });
    }
  }

  removeTagFilter(index: number): void {
    this.tagFilters.splice(index, 1);
    this.buildQuery();
  }

  onTagKeyChange(filter: TagFilter, index: number): void {
    filter.value = '';
    this.loadTagValues(filter.key);
    this.buildQuery();
  }

  loadTagValues(tagKey: string): void {
    if (!this.selectedDatabase || !tagKey) return;

    this.isLoadingTagValues[tagKey] = true;
    this.influxService.getTagValues(this.selectedDatabase, tagKey, this.selectedMeasurement || undefined).subscribe({
      next: (values) => {
        this.tagValues[tagKey] = values;
        this.isLoadingTagValues[tagKey] = false;
      },
      error: (error) => {
        console.error('Error loading tag values:', error);
        this.isLoadingTagValues[tagKey] = false;
      }
    });
  }

  onTagValueChange(): void {
    this.buildQuery();
  }

  buildQuery(): void {
    if (!this.selectedMeasurement) {
      this.query = '';
      return;
    }

    let q = `SELECT * FROM "${this.selectedMeasurement}"`;

    // Add WHERE clause for tag filters and time range
    const conditions: string[] = [];

    // Add tag filters
    this.tagFilters.forEach(filter => {
      if (filter.key && filter.value) {
        conditions.push(`"${filter.key}" = '${filter.value}'`);
      }
    });

    // Add time range
    const timeCondition = this.getTimeCondition();
    if (timeCondition) {
      conditions.push(timeCondition);
    }

    if (conditions.length > 0) {
      q += ' WHERE ' + conditions.join(' AND ');
    }

    // Add LIMIT
    q += ` LIMIT ${this.limitValue}`;

    this.query = q;
  }

  getTimeCondition(): string {
    switch (this.timeRange) {
      case 'last_5m':
        return "time > now() - 5m";
      case 'last_15m':
        return "time > now() - 15m";
      case 'last_1h':
        return "time > now() - 1h";
      case 'last_6h':
        return "time > now() - 6h";
      case 'last_24h':
        return "time > now() - 24h";
      case 'last_7d':
        return "time > now() - 7d";
      case 'custom':
        if (this.customTimeStart && this.customTimeEnd) {
          return `time >= '${this.customTimeStart}' AND time <= '${this.customTimeEnd}'`;
        }
        return '';
      default:
        return '';
    }
  }

  executeQuery(): void {
    if (!this.selectedDatabase || !this.query.trim()) {
      this.error = 'Selecione um database e digite uma consulta';
      return;
    }

    this.isExecuting = true;
    this.error = null;
    this.queryResult = null;

    this.influxService.executeQuery(this.selectedDatabase, this.query).subscribe({
      next: (result) => {
        this.queryResult = result;
        this.isExecuting = false;

        // Check for errors in result
        if (result.results && result.results[0] && result.results[0].error) {
          this.error = result.results[0].error;
        }
      },
      error: (error) => {
        this.error = 'Erro ao executar consulta: ' + (error.message || 'Erro desconhecido');
        this.isExecuting = false;
      }
    });
  }

  clearQuery(): void {
    this.query = '';
    this.queryResult = null;
    this.error = null;
    this.tagFilters = [];
  }

  hasResults(): boolean {
    return !!(
      this.queryResult &&
      this.queryResult.results &&
      this.queryResult.results[0] &&
      this.queryResult.results[0].series &&
      this.queryResult.results[0].series.length > 0
    );
  }

  getColumns(): string[] {
    if (this.hasResults() && this.queryResult!.results[0].series![0].columns) {
      return this.queryResult!.results[0].series![0].columns;
    }
    return [];
  }

  getRows(): any[][] {
    if (this.hasResults() && this.queryResult!.results[0].series![0].values) {
      return this.queryResult!.results[0].series![0].values;
    }
    return [];
  }

  toggleFullscreen(): void {
    this.isResultsFullscreen = !this.isResultsFullscreen;
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    if (this.isResultsFullscreen) {
      this.isResultsFullscreen = false;
      event.preventDefault();
    }
  }

  openInNewWindow(): void {
    if (!this.hasResults()) return;

    const columns = this.getColumns();
    const rows = this.getRows();

    // Criar HTML para a nova janela
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Resultados da Consulta - InfluxDB IDE</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .info {
      color: #666;
      font-size: 0.9rem;
    }
    .info strong {
      color: #2196F3;
    }
    .table-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: auto;
      max-height: calc(100vh - 200px);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    thead {
      position: sticky;
      top: 0;
      background-color: #f5f5f5;
      z-index: 10;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #ddd;
      background-color: #f5f5f5;
    }
    tr {
      border-bottom: 1px solid #f0f0f0;
    }
    tr:hover {
      background-color: #f9f9f9;
    }
    td {
      padding: 12px;
      color: #666;
    }
    .actions {
      margin-top: 20px;
      text-align: center;
    }
    button {
      padding: 10px 20px;
      margin: 0 5px;
      border: none;
      border-radius: 4px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .btn-print {
      background-color: #2196F3;
      color: white;
    }
    .btn-print:hover {
      background-color: #1976D2;
    }
    .btn-csv {
      background-color: #4caf50;
      color: white;
    }
    .btn-csv:hover {
      background-color: #45a049;
    }
    @media print {
      .actions {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Resultados da Consulta InfluxDB</h1>
    <div class="info">
      <p><strong>Database:</strong> ${this.selectedDatabase || 'N/A'}</p>
      <p><strong>Measurement:</strong> ${this.selectedMeasurement || 'N/A'}</p>
      <p><strong>Total de registros:</strong> ${rows.length}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          ${columns.map(col => `<th>${this.escapeHtml(col)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map(cell => `<td>${this.escapeHtml(String(cell))}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="actions">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
    <button class="btn-csv" onclick="exportCSV()">📊 Exportar CSV</button>
  </div>

  <script>
    function exportCSV() {
      const columns = ${JSON.stringify(columns)};
      const rows = ${JSON.stringify(rows)};

      let csv = columns.join(',') + '\\n';
      rows.forEach(row => {
        csv += row.map(cell => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        }).join(',') + '\\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'influxdb_results_' + new Date().getTime() + '.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  </script>
</body>
</html>
    `.trim();

    // Abrir nova janela
    const newWindow = window.open('', '_blank', 'width=1200,height=800');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
