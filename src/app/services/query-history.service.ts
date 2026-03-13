import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { InfluxdbService } from './influxdb.service';
import { ConfigService } from './config.service';

export interface MetricEntry {
  id: string;
  measurement: string;
  database: string;
  timestamp: Date;
  fields: { [key: string]: any };
  tags: { [key: string]: any };
  allData: any;
}

@Injectable({
  providedIn: 'root'
})
export class MetricsMonitorService {
  private metricsSubject = new BehaviorSubject<MetricEntry[]>([]);
  private pollingSubscription?: Subscription;
  private isMonitoring = false;
  private pollingInterval = 5000; // 5 segundos
  private maxMetricsToShow = 20;

  metrics$ = this.metricsSubject.asObservable();
  isMonitoring$ = new BehaviorSubject<boolean>(false);

  constructor(
    private influxService: InfluxdbService,
    private configService: ConfigService
  ) {}

  startMonitoring(): void {
    if (this.isMonitoring) return;

    const config = this.configService.getConfig();
    if (!config?.database) {
      console.warn('No database configured for monitoring');
      return;
    }

    this.isMonitoring = true;
    this.isMonitoring$.next(true);

    // Buscar imediatamente
    this.fetchLatestMetrics(config.database);

    // Iniciar polling
    this.pollingSubscription = interval(this.pollingInterval)
      .subscribe(() => {
        const currentConfig = this.configService.getConfig();
        if (currentConfig?.database) {
          console.log('Polling metrics...');
          this.fetchLatestMetrics(currentConfig.database);
        }
      });
  }

  stopMonitoring(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
    this.isMonitoring = false;
    this.isMonitoring$.next(false);
  }

  clearMetrics(): void {
    this.metricsSubject.next([]);
  }

  setPollingInterval(milliseconds: number): void {
    this.pollingInterval = milliseconds;
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  private fetchLatestMetrics(database: string): void {
    // Buscar diretamente os últimos registros de todos os measurements
    // Usando uma query que retorna os últimos dados ordenados por tempo
    const query = `SELECT * FROM /.*/ ORDER BY time DESC LIMIT 20`;

    this.influxService
      .executeQuery(database, query)
      .subscribe({
        next: result => {
          console.log('Query result:', result);
          this.processMetricsResult(result, database);
        },
        error: error => {
          console.error('Error fetching metrics:', error);
          // Tentar abordagem alternativa: buscar measurements primeiro
          this.tryAlternativeApproach(database);
        }
      });
  }

  private tryAlternativeApproach(database: string): void {
    // Tenta buscar measurements de forma diferente
    this.influxService
      .executeQuery(database, 'SHOW MEASUREMENTS')
      .subscribe({
        next: result => {
          console.log('SHOW MEASUREMENTS result:', result);

          // Verificar diferentes estruturas de resposta
          let measurements: string[] = [];

          if (result?.results?.[0]?.series?.[0]?.values) {
            measurements = result.results[0].series[0].values.map((v: any) => v[0]);
          } else if (result?.results?.[0]?.series) {
            // Tentar extrair de outra forma
            const series = result.results[0].series;
            measurements = series.map((s: any) => s.name);
          }

          console.log('Found measurements via alternative:', measurements);

          if (measurements.length > 0) {
            this.fetchMetricsForMeasurements(database, measurements.slice(0, 10));
          }
        },
        error: error => console.error('Error in alternative approach:', error)
      });
  }

  private processMetricsResult(result: any, database: string): void {
    console.log('Processing result...');
    const allMetrics: MetricEntry[] = [];

    if (result?.results?.[0]?.series) {
      const seriesList = result.results[0].series;
      console.log('Found series:', seriesList.length);

      seriesList.forEach((series: any) => {
        const measurement = series.name;
        const columns = series.columns || [];
        const values = series.values || [];
        const tags = series.tags || {};

        console.log(`Processing ${measurement}: ${values.length} rows`);

        values.forEach((row: any[]) => {
          const entry: any = {};
          columns.forEach((col: string, colIdx: number) => {
            entry[col] = row[colIdx];
          });

          const metric: MetricEntry = {
            id: `${measurement}-${entry.time}-${Math.random().toString(36).substr(2, 9)}`,
            measurement: measurement,
            database: database,
            timestamp: new Date(entry.time),
            fields: {},
            tags: tags,
            allData: entry
          };

          // Separar fields do time
          Object.keys(entry).forEach(key => {
            if (key !== 'time') {
              metric.fields[key] = entry[key];
            }
          });

          allMetrics.push(metric);
        });
      });

      // Ordenar por timestamp decrescente
      allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Manter apenas as últimas N métricas
      const limitedMetrics = allMetrics.slice(0, this.maxMetricsToShow);
      console.log('Setting metrics:', limitedMetrics.length);
      this.metricsSubject.next(limitedMetrics);
    } else {
      console.warn('No series in result');
    }
  }

  private fetchMetricsForMeasurements(database: string, measurements: string[]): void {
    if (measurements.length === 0) {
      console.log('No measurements to fetch');
      return;
    }

    const allMetrics: MetricEntry[] = [];
    let completed = 0;

    measurements.forEach((measurement: string) => {
      const query = `SELECT * FROM "${measurement}" ORDER BY time DESC LIMIT 3`;

      this.influxService.executeQuery(database, query).subscribe({
        next: (res) => {
          completed++;

          if (res?.results?.[0]?.series?.[0]) {
            const series = res.results[0].series[0];
            const columns = series.columns || [];
            const values = series.values || [];

            values.forEach((row: any[]) => {
              const entry: any = {};
              columns.forEach((col: string, colIdx: number) => {
                entry[col] = row[colIdx];
              });

              const metric: MetricEntry = {
                id: `${measurement}-${entry.time}-${Math.random().toString(36).substr(2, 9)}`,
                measurement: measurement,
                database: database,
                timestamp: new Date(entry.time),
                fields: {},
                tags: series.tags || {},
                allData: entry
              };

              // Separar fields do time
              Object.keys(entry).forEach(key => {
                if (key !== 'time') {
                  metric.fields[key] = entry[key];
                }
              });

              allMetrics.push(metric);
            });
          }

          // Quando todas as consultas completarem, atualizar as métricas
          if (completed === measurements.length) {
            console.log('All metrics fetched:', allMetrics.length);
            allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            const limitedMetrics = allMetrics.slice(0, this.maxMetricsToShow);
            this.metricsSubject.next(limitedMetrics);
          }
        },
        error: (error) => {
          completed++;
          console.error(`Error fetching metrics for ${measurement}:`, error);

          // Mesmo com erro, verificar se todas completaram
          if (completed === measurements.length && allMetrics.length > 0) {
            allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            const limitedMetrics = allMetrics.slice(0, this.maxMetricsToShow);
            this.metricsSubject.next(limitedMetrics);
          }
        }
      });
    });
  }
}
