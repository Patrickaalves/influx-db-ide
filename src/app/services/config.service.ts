import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { InfluxConfig } from '../models/influx.models';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly CONFIG_KEY = 'influx_config';
  private configSubject = new BehaviorSubject<InfluxConfig | null>(this.loadConfig());

  public config$: Observable<InfluxConfig | null> = this.configSubject.asObservable();

  constructor() {}

  private loadConfig(): InfluxConfig | null {
    const configStr = localStorage.getItem(this.CONFIG_KEY);
    if (configStr) {
      try {
        return JSON.parse(configStr);
      } catch (e) {
        console.error('Error parsing config:', e);
        return null;
      }
    }
    return null;
  }

  saveConfig(config: InfluxConfig): void {
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
    this.configSubject.next(config);
  }

  getConfig(): InfluxConfig | null {
    return this.configSubject.value;
  }

  clearConfig(): void {
    localStorage.removeItem(this.CONFIG_KEY);
    this.configSubject.next(null);
  }
}
