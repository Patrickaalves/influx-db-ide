import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { Database, Measurement, TagKey, TagValue, QueryResult, InfluxConfig } from '../models/influx.models';

@Injectable({
  providedIn: 'root'
})
export class InfluxdbService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  private getHeaders(): HttpHeaders {
    const config = this.configService.getConfig();
    let headers = new HttpHeaders();

    if (config?.username && config?.password) {
      const auth = btoa(`${config.username}:${config.password}`);
      headers = headers.set('Authorization', `Basic ${auth}`);
    }

    return headers;
  }

  private getBaseUrl(): string {
    const config = this.configService.getConfig();
    if (!config || !config.url) {
      throw new Error('InfluxDB configuration not set');
    }
    return config.url;
  }

  testConnection(): Observable<boolean> {
    try {
      const url = `${this.getBaseUrl()}/ping`;
      return this.http.get(url, {
        headers: this.getHeaders(),
        observe: 'response',
        responseType: 'text'
      }).pipe(
        map(response => response.status === 204 || response.status === 200),
        catchError(error => {
          console.error('Connection test failed:', error);
          return throwError(() => error);
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  getDatabases(): Observable<Database[]> {
    try {
      const url = `${this.getBaseUrl()}/query`;
      const params = new HttpParams().set('q', 'SHOW DATABASES');

      return this.http.get<QueryResult>(url, {
        headers: this.getHeaders(),
        params
      }).pipe(
        map(result => {
          if (result.results && result.results[0] && result.results[0].series) {
            const values = result.results[0].series[0].values;
            return values.map(v => ({ name: v[0] }));
          }
          return [];
        }),
        catchError(error => {
          console.error('Error fetching databases:', error);
          return throwError(() => error);
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  getMeasurements(database: string): Observable<Measurement[]> {
    try {
      const url = `${this.getBaseUrl()}/query`;
      const params = new HttpParams()
        .set('db', database)
        .set('q', 'SHOW MEASUREMENTS');

      return this.http.get<QueryResult>(url, {
        headers: this.getHeaders(),
        params
      }).pipe(
        map(result => {
          if (result.results && result.results[0] && result.results[0].series) {
            const values = result.results[0].series[0].values;
            return values.map(v => ({ name: v[0] }));
          }
          return [];
        }),
        catchError(error => {
          console.error('Error fetching measurements:', error);
          return throwError(() => error);
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  getTagKeys(database: string, measurement?: string): Observable<TagKey[]> {
    try {
      const url = `${this.getBaseUrl()}/query`;
      const query = measurement
        ? `SHOW TAG KEYS FROM "${measurement}"`
        : 'SHOW TAG KEYS';

      const params = new HttpParams()
        .set('db', database)
        .set('q', query);

      return this.http.get<QueryResult>(url, {
        headers: this.getHeaders(),
        params
      }).pipe(
        map(result => {
          if (result.results && result.results[0] && result.results[0].series) {
            const allKeys: TagKey[] = [];
            result.results[0].series.forEach(series => {
              if (series.values) {
                series.values.forEach(v => allKeys.push({ key: v[0] }));
              }
            });
            return allKeys;
          }
          return [];
        }),
        catchError(error => {
          console.error('Error fetching tag keys:', error);
          return throwError(() => error);
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  getTagValues(database: string, tagKey: string, measurement?: string): Observable<TagValue[]> {
    try {
      const url = `${this.getBaseUrl()}/query`;
      const query = measurement
        ? `SHOW TAG VALUES FROM "${measurement}" WITH KEY = "${tagKey}"`
        : `SHOW TAG VALUES WITH KEY = "${tagKey}"`;

      const params = new HttpParams()
        .set('db', database)
        .set('q', query);

      return this.http.get<QueryResult>(url, {
        headers: this.getHeaders(),
        params
      }).pipe(
        map(result => {
          if (result.results && result.results[0] && result.results[0].series) {
            const allValues: TagValue[] = [];
            result.results[0].series.forEach(series => {
              if (series.values) {
                series.values.forEach(v => allValues.push({ value: v[1] }));
              }
            });
            return allValues;
          }
          return [];
        }),
        catchError(error => {
          console.error('Error fetching tag values:', error);
          return throwError(() => error);
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  executeQuery(database: string, query: string): Observable<QueryResult> {
    try {
      const url = `${this.getBaseUrl()}/query`;
      const params = new HttpParams()
        .set('db', database)
        .set('q', query);

      return this.http.get<QueryResult>(url, {
        headers: this.getHeaders(),
        params
      }).pipe(
        catchError(error => {
          console.error('Error executing query:', error);
          return throwError(() => error);
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }
}
