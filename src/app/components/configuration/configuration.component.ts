import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../services/config.service';
import { InfluxdbService } from '../../services/influxdb.service';
import { InfluxConfig } from '../../models/influx.models';

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit {
  config: InfluxConfig = {
    url: '',
    username: '',
    password: '',
    database: ''
  };

  testStatus: 'idle' | 'testing' | 'success' | 'error' = 'idle';
  testMessage = '';
  isSaving = false;

  constructor(
    private configService: ConfigService,
    private influxService: InfluxdbService
  ) {}

  ngOnInit(): void {
    const savedConfig = this.configService.getConfig();
    if (savedConfig) {
      this.config = { ...savedConfig };
    }
  }

  testConnection(): void {
    this.testStatus = 'testing';
    this.testMessage = 'Testando conexão...';

    // Temporarily save config for testing
    this.configService.saveConfig(this.config);

    this.influxService.testConnection().subscribe({
      next: (success) => {
        if (success) {
          this.testStatus = 'success';
          this.testMessage = 'Conexão estabelecida com sucesso!';
        } else {
          this.testStatus = 'error';
          this.testMessage = 'Falha ao conectar ao InfluxDB';
        }
      },
      error: (error) => {
        this.testStatus = 'error';
        this.testMessage = `Erro: ${error.message || 'Não foi possível conectar ao servidor'}`;
      }
    });
  }

  saveConfiguration(): void {
    this.isSaving = true;
    this.configService.saveConfig(this.config);

    setTimeout(() => {
      this.isSaving = false;
      alert('Configurações salvas com sucesso!');
    }, 500);
  }

  clearConfiguration(): void {
    if (confirm('Deseja realmente limpar todas as configurações?')) {
      this.configService.clearConfig();
      this.config = {
        url: '',
        username: '',
        password: '',
        database: ''
      };
      this.testStatus = 'idle';
      this.testMessage = '';
    }
  }
}
