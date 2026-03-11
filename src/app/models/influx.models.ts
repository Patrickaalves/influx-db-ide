export interface InfluxConfig {
  url: string;
  username?: string;
  password?: string;
  database?: string;
}

export interface Database {
  name: string;
}

export interface Measurement {
  name: string;
}

export interface TagKey {
  key: string;
}

export interface TagValue {
  value: string;
}

export interface QueryResult {
  results: Array<{
    statement_id: number;
    series?: Array<{
      name: string;
      columns: string[];
      values: any[][];
      tags?: { [key: string]: string };
    }>;
    error?: string;
  }>;
}
