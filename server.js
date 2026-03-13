const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Habilita CORS para o Angular acessar
app.use(cors());
app.use(express.json());

// Endpoint para buscar IP do WSL
app.get('/api/wsl-ip', (req, res) => {
  const command = '(wsl hostname -I).Trim() -split \' \' | Select-Object -First 1';

  exec(command, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
    if (error) {
      console.error('Erro ao executar comando:', error);
      return res.status(500).json({
        error: 'Erro ao buscar IP do WSL',
        message: error.message
      });
    }

    if (stderr) {
      console.error('stderr:', stderr);
      return res.status(500).json({
        error: 'Erro no comando',
        message: stderr
      });
    }

    const wslIp = stdout.trim();

    if (!wslIp) {
      return res.status(404).json({
        error: 'IP do WSL não encontrado',
        message: 'Verifique se o WSL está rodando'
      });
    }

    console.log('IP do WSL encontrado:', wslIp);
    res.json({ ip: wslIp });
  });
});

// Endpoint para buscar containers Docker (Windows OU WSL)
app.get('/api/docker-containers/:environment', (req, res) => {
  const environment = req.params.environment; // 'windows' ou 'wsl'

  if (!['windows', 'wsl'].includes(environment)) {
    return res.status(400).json({
      error: 'Ambiente inválido',
      message: 'Use "windows" ou "wsl"'
    });
  }

  // Comandos para buscar containers com imagem InfluxDB (qualquer versão)
  // Para WSL, usa aspas simples dentro de bash -c para evitar interpretação do bash
  let runningCmd, stoppedCmd;
  
  if (environment === 'windows') {
    runningCmd = 'docker ps --format "{{.Names}}|{{.Ports}}|{{.Image}}"';
    stoppedCmd = 'docker ps -a --filter "status=exited" --format "{{.Names}}|{{.Ports}}|{{.Image}}"';
  } else {
    // WSL: usa bash -c com aspas simples internas
    runningCmd = "wsl bash -c \"docker ps --format '{{.Names}}|{{.Ports}}|{{.Image}}'\"";
    stoppedCmd = "wsl bash -c \"docker ps -a --filter 'status=exited' --format '{{.Names}}|{{.Ports}}|{{.Image}}'\"";
  }

  const commands = {
    running: runningCmd,
    stopped: stoppedCmd
  };

  const results = {
    running: [],
    stopped: []
  };

  let completed = 0;
  const totalCommands = 2;

  // Busca containers rodando
  exec(commands.running, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
    console.log(`[${environment}] Buscando containers ATIVOS com imagem influxdb...`);
    console.log(`[${environment}] Comando:`, commands.running);
    
    if (error) {
      console.error(`[${environment}] Erro:`, error.message);
    }
    
    if (!error && stdout && stdout.trim()) {
      console.log(`[${environment}] Resposta:`, stdout.trim());
      const containers = stdout.trim().split('\n')
        .filter(line => line.trim() && line.includes('|'))
        .map(line => {
          const [name, ports, image] = line.split('|');
          const portMatch = ports ? ports.match(/0\.0\.0\.0:(\d+)->8086|:::(\d+)->8086/) : null;
          const port = portMatch ? (portMatch[1] || portMatch[2]) : '8086';

          return {
            name: name ? name.trim() : '',
            image: image ? image.trim() : '',
            port: port,
            environment: environment,
            status: 'running'
          };
        })
        .filter(c => c.name && c.image.toLowerCase().includes('influx')); // Filtra apenas imagens influxdb

      results.running = containers;
      console.log(`[${environment}] ${containers.length} container(s) ativo(s) encontrado(s)`);
    } else {
      console.log(`[${environment}] Nenhum container ativo encontrado`);
    }

    completed++;
    checkComplete();
  });

  // Busca containers parados
  exec(commands.stopped, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
    console.log(`[${environment}] Buscando containers PARADOS com imagem influxdb...`);
    console.log(`[${environment}] Comando:`, commands.stopped);
    
    if (error) {
      console.error(`[${environment}] Erro:`, error.message);
    }
    
    if (!error && stdout && stdout.trim()) {
      console.log(`[${environment}] Resposta:`, stdout.trim());
      const containers = stdout.trim().split('\n')
        .filter(line => line.trim() && line.includes('|'))
        .map(line => {
          const [name, ports, image] = line.split('|');

          return {
            name: name ? name.trim() : '',
            image: image ? image.trim() : '',
            port: '8086',
            environment: environment,
            status: 'stopped'
          };
        })
        .filter(c => c.name && c.image.toLowerCase().includes('influx')); // Filtra apenas imagens influxdb

      results.stopped = containers;
      console.log(`[${environment}] ${containers.length} container(s) parado(s) encontrado(s)`);
    } else {
      console.log(`[${environment}] Nenhum container parado encontrado`);
    }

    completed++;
    checkComplete();
  });

  function checkComplete() {
    if (completed === totalCommands) {
      const allContainers = [...results.running, ...results.stopped];
      console.log(`Containers encontrados (${environment}):`, allContainers.length);
      res.json({
        containers: allContainers,
        summary: {
          running: results.running.length,
          stopped: results.stopped.length,
          total: allContainers.length
        }
      });
    }
  }
});

// Endpoint para iniciar um container parado
app.post('/api/docker-containers/start', (req, res) => {
  const { containerName, environment } = req.body;

  if (!containerName || !environment) {
    return res.status(400).json({
      error: 'Parâmetros inválidos',
      message: 'containerName e environment são obrigatórios'
    });
  }

  const baseCommand = environment === 'windows' ? 'docker' : 'wsl docker';
  const command = `${baseCommand} start ${containerName}`;

  exec(command, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
    if (error) {
      console.error('Erro ao iniciar container:', error);
      return res.status(500).json({
        error: 'Erro ao iniciar container',
        message: error.message
      });
    }

    console.log(`Container ${containerName} iniciado com sucesso`);
    res.json({
      success: true,
      message: `Container ${containerName} iniciado`,
      containerName: stdout.trim()
    });
  });
});

// Endpoint de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor rodando' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 Endpoints disponíveis:`);
  console.log(`   - GET /api/wsl-ip - Busca IP do WSL`);
  console.log(`   - GET /api/docker-containers - Lista containers InfluxDB`);
  console.log(`   - GET /api/health - Status do servidor`);
});
