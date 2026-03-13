import { Component, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { MetricsMonitorService, MetricEntry } from '../../services/query-history.service';
import { InfluxConfig } from '../../models/influx.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnDestroy {
  isConnected = false;
  currentConfig: InfluxConfig | null = null;
  liveMetrics: MetricEntry[] = [];
  showMonitor = true;
  isMonitoring = false;
  isFullscreen = false;
  expandedCards: Set<string> = new Set();
  isCollapsed = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private configService: ConfigService,
    private metricsMonitorService: MetricsMonitorService
  ) {
    this.subscriptions.push(
      this.configService.config$.subscribe(config => {
        this.currentConfig = config;
        this.isConnected = config !== null && config.url !== '';

        // Se conectado, iniciar monitoramento
        if (this.isConnected && config?.database) {
          this.startMonitoring();
        } else {
          this.stopMonitoring();
        }
      })
    );

    this.subscriptions.push(
      this.metricsMonitorService.metrics$.subscribe(metrics => {
        this.liveMetrics = metrics;
      })
    );

    this.subscriptions.push(
      this.metricsMonitorService.isMonitoring$.subscribe(monitoring => {
        this.isMonitoring = monitoring;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopMonitoring();
  }

  toggleMonitor(): void {
    this.showMonitor = !this.showMonitor;
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  startMonitoring(): void {
    this.metricsMonitorService.startMonitoring();
  }

  stopMonitoring(): void {
    this.metricsMonitorService.stopMonitoring();
  }

  clearMetrics(): void {
    this.metricsMonitorService.clearMetrics();
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    // Limpar expansões ao fechar
    if (!this.isFullscreen) {
      this.expandedCards.clear();
    }
  }

  toggleCardExpansion(metricId: string): void {
    if (this.expandedCards.has(metricId)) {
      this.expandedCards.delete(metricId);
    } else {
      this.expandedCards.add(metricId);
    }
  }

  isCardExpanded(metricId: string): boolean {
    return this.expandedCards.has(metricId);
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    if (this.isFullscreen) {
      this.isFullscreen = false;
      event.preventDefault();
    }
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}min atrás`;
    if (seconds > 5) return `${seconds}s atrás`;
    return 'agora';
  }

  formatDateTimeBrasilia(date: Date): string {
    const d = new Date(date);
    const brasiliaOffset = -180;
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    const brasiliaTime = new Date(utcTime + (brasiliaOffset * 60000));

    const day = String(brasiliaTime.getDate()).padStart(2, '0');
    const month = String(brasiliaTime.getMonth() + 1).padStart(2, '0');
    const year = brasiliaTime.getFullYear();
    const hours = String(brasiliaTime.getHours()).padStart(2, '0');
    const minutes = String(brasiliaTime.getMinutes()).padStart(2, '0');
    const seconds = String(brasiliaTime.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  getFieldKeys(metric: MetricEntry): string[] {
    return Object.keys(metric.fields);
  }

  getTagKeys(metric: MetricEntry): string[] {
    return Object.keys(metric.tags);
  }
}
