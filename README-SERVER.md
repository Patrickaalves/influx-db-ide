# Servidor de API para Busca de IP do WSL e Containers Docker

Este servidor Node.js fornece endpoints para buscar automaticamente o IP do WSL e listar containers Docker com InfluxDB.

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
npm install
```

Isso instalará:
- `express` - Web framework
- `cors` - Para permitir requisições do Angular
- `concurrently` - Para rodar servidor + Angular simultaneamente

### 2. Iniciar o Servidor

#### Opção A: Apenas o Servidor de API
```bash
npm run server
```

O servidor rodará em `http://localhost:3001`

#### Opção B: Servidor + Angular (Recomendado)
```bash
npm run dev
```

Isso inicia:
- Servidor de API na porta `3001`
- Angular na porta `4200`

### 3. Endpoints Disponíveis

#### GET /api/wsl-ip
Retorna o IP do WSL usando o comando PowerShell `wsl hostname -I`.

**Resposta de sucesso:**
```json
{
  "ip": "172.17.208.1"
}
```

**Resposta de erro:**
```json
{
  "error": "Erro ao buscar IP do WSL",
  "message": "Detalhes do erro..."
}
```

#### GET /api/docker-containers/:environment
Lista containers Docker com InfluxDB (ativos e parados).

**Parâmetros:**
- `environment`: `windows` ou `wsl`

**Exemplo:**
```
GET /api/docker-containers/windows
GET /api/docker-containers/wsl
```

**Resposta de sucesso:**
```json
{
  "containers": [
    {
      "name": "influxdb",
      "image": "influxdb:1.11.8",
      "port": "8086",
      "environment": "windows",
      "status": "running"
    },
    {
      "name": "influxdb-old",
      "image": "influxdb:1.11.8",
      "port": "8086",
      "environment": "windows",
      "status": "stopped"
    }
  ],
  "summary": {
    "running": 1,
    "stopped": 1,
    "total": 2
  }
}
```

#### POST /api/docker-containers/start
Inicia um container Docker parado.

**Body (JSON):**
```json
{
  "containerName": "influxdb",
  "environment": "windows"
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Container influxdb iniciado",
  "containerName": "influxdb"
}
```

#### GET /api/health
Verifica se o servidor está rodando.

**Resposta:**
```json
{
  "status": "ok",
  "message": "Servidor rodando"
}
```

## 📋 Pré-requisitos

- **Node.js** (v14 ou superior)
- **WSL** instalado e configurado (para funcionalidades do WSL)
- **Docker** (opcional, para detecção de containers)
- **PowerShell** (para execução de comandos do sistema)

## 🔧 Funcionamento

### Busca de IP do WSL
O servidor executa o comando PowerShell:
```powershell
(wsl hostname -I).Trim() -split ' ' | Select-Object -First 1
```

Este comando:
1. Executa `hostname -I` dentro do WSL
2. Remove espaços em branco
3. Divide por espaços (caso haja múltiplos IPs)
4. Retorna o primeiro IP encontrado

### Detecção de Containers Docker
O servidor executa:
```powershell
# Docker no Windows
docker ps --filter "ancestor=influxdb" --format "{{.Names}}|{{.Ports}}"

# Docker no WSL
wsl docker ps --filter "ancestor=influxdb" --format "{{.Names}}|{{.Ports}}"
```

Extrai informações de nome, porta e ambiente de cada container encontrado.

## ⚡ Fallback no Angular

Se o servidor da API **não estiver rodando**, o componente Angular automaticamente usa o método de **scanning de IPs** como fallback:

- Testa IPs na faixa 172.16.x.x a 172.31.x.x
- Testa portas 8086-8089
- Usa timeout de 1 segundo por IP

## 🎯 Vantagens da API vs Scanning

| Característica | Com API | Sem API (Scanning) |
|----------------|---------|-------------------|
| **Busca de IP do WSL** | ⚡ Instantâneo | 🐌 Vários segundos |
| **Precisão** | ✅ 100% | ⚠️ Pode errar |
| **Containers Docker** | ✅ Ativos E parados | ❌ Apenas portas abertas |
| **Iniciar Containers** | ✅ Direto pela UI | ❌ Manual via terminal |
| **Facilidade** | ✅ Automático | ⚠️ Manual |

## 🐛 Troubleshooting

### Erro: "Servidor API não disponível"
- Verifique se o servidor está rodando (`npm run server`)
- Confirme que a porta 3000 está disponível
- O Angular usará scanning como fallback automaticamente

### Erro: "IP do WSL não encontrado"
- Verifique se o WSL está instalado: `wsl --status`
- Inicie o WSL: `wsl`
- Teste no PowerShell: `wsl hostname -I`

### Erro: "Nenhum container encontrado"
- Verifique se o Docker está rodando
- Liste containers: `docker ps`
- Para WSL: `wsl docker ps`

## 📝 Logs

O servidor exibe logs úteis no console:
```
🚀 Servidor rodando em http://localhost:3001
📡 Endpoints disponíveis:
   - GET /api/wsl-ip - Busca IP do WSL
   - GET /api/docker-containers - Lista containers InfluxDB
   - GET /api/health - Status do servidor
IP do WSL encontrado: 172.17.208.1
```

## 🔐 Segurança

- O servidor aceita requisições CORS apenas do localhost
- Não expõe informações sensíveis do sistema
- Executa apenas comandos específicos e seguros
- Não aceita input do usuário diretamente nos comandos

## 📦 Estrutura de Arquivos

```
idle-influx-db/
├── server.js               # Servidor Node.js
├── package.json           # Dependências e scripts
├── src/
│   └── app/
│       └── components/
│           └── configuration/
│               └── configuration.component.ts  # Usa a API
└── README-SERVER.md       # Este arquivo
```

## 🚧 Desenvolvimento

Para contribuir ou modificar:

1. O código do servidor está em `server.js`
2. Teste mudanças rodando: `npm run server`
3. Verifique logs no console
4. Teste endpoints com Postman ou `curl`:

```bash
curl http://localhost:3001/api/wsl-ip
curl http://localhost:3001/api/docker-containers
curl http://localhost:3001/api/health
```
