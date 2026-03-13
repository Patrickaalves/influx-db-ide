import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../services/config.service';
import { InfluxdbService } from '../../services/influxdb.service';
import { InfluxConfig } from '../../models/influx.models';

interface DockerContainer {
  name: string;
  image: string;
  port: string;
  environment: 'windows' | 'wsl';
  status: 'running' | 'stopped';
}

interface DockerSummary {
  running: number;
  stopped: number;
  total: number;
}

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

  wslIps: string[] = [];
  isSearchingIps = false;
  wslSearchStatus = '';

  dockerContainers: DockerContainer[] = [];
  isSearchingContainers = false;
  containerSearchStatus = '';
  showDockerInstructions = false;
  selectedDockerEnvironment: 'windows' | 'wsl' = 'windows';
  dockerSummary: DockerSummary | null = null;

  private readonly API_BASE_URL = 'http://localhost:3001/api';

  constructor(
    private configService: ConfigService,
    private influxService: InfluxdbService,
    private http: HttpClient
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

  async searchWslIps(): Promise<void> {
    this.isSearchingIps = true;
    this.wslSearchStatus = 'Buscando IP do WSL via servidor...';
    this.wslIps = [];

    try {
      // Tenta buscar via API do servidor primeiro
      const response = await this.http.get<{ ip: string }>(`${this.API_BASE_URL}/wsl-ip`).toPromise();

      if (response && response.ip) {
        // Testa se o IP está realmente respondendo na porta padrão do InfluxDB
        const port = '8086';
        const testUrl = `http://${response.ip}:${port}`;
        const isReachable = await this.testIpReachability(testUrl);

        if (isReachable) {
          this.wslIps = [response.ip];
          this.wslSearchStatus = `IP do WSL encontrado: ${response.ip}`;
        } else {
          this.wslSearchStatus = `IP encontrado (${response.ip}) mas InfluxDB não está respondendo na porta ${port}`;
        }
      }
    } catch (error) {
      // Se falhar, usa o método de scanning como fallback
      console.warn('Servidor API não disponível, usando método de scanning...', error);
      await this.searchWslIpsFallback();
    }

    this.isSearchingIps = false;
  }

  private async searchWslIpsFallback(): Promise<void> {
    this.wslSearchStatus = 'Servidor indisponível. Fazendo scanning de IPs...';

    const ipCandidates = this.generateWslIpCandidates();
    const port = '8086';  // Sempre usa porta padrão do InfluxDB
    const foundIps: string[] = [];

    for (const ip of ipCandidates) {
      try {
        const testUrl = `http://${ip}:${port}`;
        const isReachable = await this.testIpReachability(testUrl);
        if (isReachable) {
          foundIps.push(ip);
        }
      } catch (error) {
        // IP not reachable, continue
      }
    }

    this.wslIps = foundIps;

    if (foundIps.length > 0) {
      this.wslSearchStatus = `${foundIps.length} IP(s) encontrado(s) via scanning`;
    } else {
      this.wslSearchStatus = 'Nenhum IP do WSL encontrado';
    }
  }

  async searchAndUseWslIp(): Promise<void> {
    this.isSearchingIps = true;
    this.wslSearchStatus = 'Buscando e configurando IP do WSL...';
    this.wslIps = [];

    try {
      // Tenta buscar via API do servidor primeiro
      const response = await this.http.get<{ ip: string }>(`${this.API_BASE_URL}/wsl-ip`).toPromise();

      if (response && response.ip) {
        const port = '8086';  // Sempre usa porta padrão do InfluxDB
        const testUrl = `http://${response.ip}:${port}`;
        const isReachable = await this.testIpReachability(testUrl);

        if (isReachable) {
          this.config.url = testUrl;
          this.wslIps = [response.ip];
          this.wslSearchStatus = `IP ${response.ip} encontrado e configurado!`;
          this.isSearchingIps = false;
          return;
        } else {
          this.wslSearchStatus = `IP ${response.ip} encontrado mas InfluxDB não está respondendo`;
        }
      }
    } catch (error) {
      console.warn('Servidor API não disponível, usando método de scanning...', error);
      // Fallback para o método de scanning
      await this.searchAndUseWslIpFallback();
      return;
    }

    this.isSearchingIps = false;
  }

  private async searchAndUseWslIpFallback(): Promise<void> {
    const ipCandidates = this.generateWslIpCandidates();
    const port = '8086';  // Sempre usa porta padrão do InfluxDB

    for (const ip of ipCandidates) {
      try {
        const testUrl = `http://${ip}:${port}`;
        const isReachable = await this.testIpReachability(testUrl);
        if (isReachable) {
          this.config.url = testUrl;
          this.wslIps = [ip];
          this.wslSearchStatus = `IP ${ip} encontrado e configurado (via scanning)!`;
          this.isSearchingIps = false;
          return;
        }
      } catch (error) {
        // IP not reachable, continue
      }
    }

    this.isSearchingIps = false;
    this.wslSearchStatus = 'Nenhum IP do WSL respondendo na porta especificada';
  }

  useWslIp(ip: string): void {
    const port = '8086';  // Sempre usa porta padrão do InfluxDB
    this.config.url = `http://${ip}:${port}`;
    this.wslSearchStatus = `IP ${ip} configurado!`;
  }

  private generateWslIpCandidates(): string[] {
    const candidates: string[] = [];

    // WSL2 typically uses 172.x.x.x range
    // Check common WSL IP patterns
    for (let i = 16; i <= 31; i++) {
      for (let j = 0; j <= 255; j += 16) {
        candidates.push(`172.${i}.${j}.1`);
      }
    }

    // Also check localhost and common alternatives
    candidates.unshift('localhost', '127.0.0.1', '172.17.0.1', '172.18.0.1', '172.19.0.1');

    return candidates;
  }

  private extractPortFromUrl(): string | null {
    if (!this.config.url) return null;

    try {
      const urlMatch = this.config.url.match(/:([0-9]+)/);
      return urlMatch ? urlMatch[1] : null;
    } catch {
      return null;
    }
  }

  private testIpReachability(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 1000); // 1 second timeout per IP

      // Create a temporary config to test this IP
      const testConfig: InfluxConfig = { ...this.config, url };
      const originalConfig = this.configService.getConfig();

      this.configService.saveConfig(testConfig);

      this.influxService.testConnection().subscribe({
        next: (success) => {
          clearTimeout(timeout);
          // Restore original config
          if (originalConfig) {
            this.configService.saveConfig(originalConfig);
          }
          resolve(success);
        },
        error: () => {
          clearTimeout(timeout);
          // Restore original config
          if (originalConfig) {
            this.configService.saveConfig(originalConfig);
          }
          resolve(false);
        }
      });
    });
  }

  async searchDockerContainers(): Promise<void> {
    this.isSearchingContainers = true;
    this.dockerContainers = [];
    this.dockerSummary = null;

    const envLabel = this.selectedDockerEnvironment === 'windows' ? 'Docker Windows' : 'Docker WSL';
    this.containerSearchStatus = `Buscando containers no ${envLabel}...`;

    try {
      const response = await this.http.get<{ containers: DockerContainer[], summary: DockerSummary }>(
        `${this.API_BASE_URL}/docker-containers/${this.selectedDockerEnvironment}`
      ).toPromise();

      if (response) {
        this.dockerContainers = response.containers;
        this.dockerSummary = response.summary;

        if (response.summary.total === 0) {
          this.containerSearchStatus = `Nenhum container InfluxDB encontrado no ${envLabel}`;
          this.showDockerInstructions = true;
        } else {
          const runningText = response.summary.running > 0 ? `${response.summary.running} ativo(s)` : '';
          const stoppedText = response.summary.stopped > 0 ? `${response.summary.stopped} parado(s)` : '';
          const separator = runningText && stoppedText ? ', ' : '';
          this.containerSearchStatus = `${response.summary.total} container(s): ${runningText}${separator}${stoppedText}`;
        }
      }
    } catch (error) {
      console.error('Erro ao buscar containers:', error);
      this.containerSearchStatus = `Erro ao buscar containers. Verifique se o servidor está rodando e se o Docker está instalado.`;
    }

    this.isSearchingContainers = false;
  }

  async startDockerContainer(container: DockerContainer): Promise<void> {
    if (container.status !== 'stopped') {
      return;
    }

    this.containerSearchStatus = `Iniciando container ${container.name}...`;

    try {
      const response = await this.http.post<{ success: boolean, message: string }>(
        `${this.API_BASE_URL}/docker-containers/start`,
        { containerName: container.name, environment: container.environment }
      ).toPromise();

      if (response && response.success) {
        this.containerSearchStatus = `${container.name} iniciado com sucesso!`;
        // Atualiza status do container localmente
        container.status = 'running';
        // Recarrega a lista após 1 segundo
        setTimeout(() => this.searchDockerContainers(), 1000);
      }
    } catch (error) {
      console.error('Erro ao iniciar container:', error);
      this.containerSearchStatus = `Erro ao iniciar ${container.name}. Verifique os logs.`;
    }
  }

  async useDockerContainer(container: DockerContainer): Promise<void> {
    // Se o container estiver parado, pergunta se quer iniciar
    if (container.status === 'stopped') {
      if (confirm(`O container "${container.name}" está parado. Deseja iniciá-lo agora?`)) {
        await this.startDockerContainer(container);
        // Aguarda um pouco para o container iniciar
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        return;
      }
    }

    // Determina o host baseado no ambiente
    let host = 'localhost';
    if (container.environment === 'wsl') {
      // Busca o IP do WSL
      try {
        const wslIpResponse = await this.http.get<{ ip: string }>(`${this.API_BASE_URL}/wsl-ip`).toPromise();
        if (wslIpResponse && wslIpResponse.ip) {
          host = wslIpResponse.ip;
        }
      } catch (err) {
        console.warn('Não foi possível obter IP do WSL, usando localhost', err);
      }
    }

    this.config.url = `http://${host}:${container.port}`;
    this.containerSearchStatus = `Container ${container.name} configurado! URL: ${this.config.url}`;
  }

  toggleDockerInstructions(): void {
    this.showDockerInstructions = !this.showDockerInstructions;
  }
}
