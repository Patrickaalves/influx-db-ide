# InfluxDB IDE

Interface web moderna para consultar e gerenciar bancos de dados **InfluxDB 1.11.8**, desenvolvida com **Angular 18** e **TypeScript**.

![Angular](https://img.shields.io/badge/Angular-18.0-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)
![InfluxDB](https://img.shields.io/badge/InfluxDB-1.11.8-22ADF6?logo=influxdb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Como Usar](#como-usar)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Exemplos de Consultas](#exemplos-de-consultas)
- [Troubleshooting](#troubleshooting)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## Funcionalidades

### Configuração e Conexão
- [x] Configuração de URL do servidor InfluxDB
- [x] Autenticação com usuário e senha
- [x] Teste de conexão em tempo real
- [x] Persistência de configurações no navegador
- [x] Indicador visual de status de conexão
- [x] 🆕 **Busca automática de IP do WSL** via API Node.js (PowerShell)
- [x] 🆕 **Detecção inteligente de containers Docker** com escolha de ambiente
- [x] 🆕 **Visualização de containers ativos e parados** (verde/vermelho)
- [x] 🆕 **Iniciar containers parados** direto pela interface
- [x] 🆕 **Comandos Docker reais** (não mais port scanning)

### Gerenciamento de Databases
- [x] Listagem de todos os databases disponíveis
- [x] Visualização de measurements por database
- [x] Seleção rápida via interface gráfica

### Sistema de Filtros
- [x] Busca por texto em measurements
- [x] Filtros por prefixo (`system_*`, `service_*`)
- [x] Filtro para measurements do RabbitMQ
- [x] Contador de resultados filtrados

### Editor de Consultas
- [x] Editor de texto InfluxQL
- [x] Construtor visual de consultas
- [x] Filtros por tags dinâmicos
- [x] Filtros temporais (5min, 15min, 1h, 6h, 24h, 7 dias)
- [x] Período personalizado

### Visualização de Resultados
- [x] Tabela responsiva com scroll
- [x] Modo tela cheia (ESC para sair)
- [x] Abrir em nova janela
- [x] Exportação para CSV
- [x] Impressão de resultados

---

## Pré-requisitos

| Requisito | Versão Mínima |
|-----------|---------------|
| Node.js   | 18.19.x       |
| npm       | 9.x           |
| InfluxDB  | 1.11.8.x         |
| **WSL** (opcional) | 2.x (para detecção automática) |
| **Docker** (opcional) | - (para detecção de containers) |

> [!IMPORTANT]
> Certifique-se de ter o Node.js 18.19 ou superior instalado antes de continuar.

> [!NOTE]
> WSL e Docker são opcionais. Se não estiverem instalados, você pode configurar a URL manualmente.

---

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/idle-influx-db.git
cd idle-influx-db
```

### 2. Instale as dependências
a aplicação

#### Opção A: Com Servidor de API (Recomendado) 🚀
```bash
npm run dev
```
Inicia **Servidor Node.js** (porta 3001) + **Angular** (porta 4200)

**Benefícios:**
- ✅ Busca **instantânea** de IP do WSL usando `wsl hostname -I`
- ✅ Detecção **automática** de containers Docker
- ✅ UI mais rápida e responsiva

#### Opção B: Apenas Angular
```bash
npm start
```
**Nota:** Sem o servidor API, a busca de IPs será feita por scanning (mais lento).

A aplicação estará disponível em `http://localhost:4200`

> [!TIP]
> Para mais detalhes sobre o servidor de API, consulte:
> - [README-SERVER.md](README-SERVER.md) - Documentação completa da API
> - [COMO-USAR.md](COMO-USAR.md) - Guia de uso e troubleshooting
```bash
npm start
```

A aplicação estará disponível em `http://localhost:4200`

---

### Atualizando o Node.js

Se você estiver usando uma versão antiga do Node.js:

**Windows:**
1. Baixe o instalador em https://nodejs.org/
2. Execute e siga as instruções
3. Verifique a versão: `node --version`

**Linux (usando nvm):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**macOS:**

```bash
brew install node@20
```

---

### Configurando CORS no InfluxDB

Edite o arquivo `influxdb.conf`:

```ini
[http]
  enabled = true
  bind-address = ":8086"
  cors-enabled = true
  cors-allowed-origins = ["*"]
```

Reinicie o InfluxDB após a alteração.

---

## Como Usar

### 1. Configurar Conexão

1. Clique em **Configuração** na barra lateral
2. Preencha os dados:
   - **URL:** `http://localhost:8086`
   - **Usuário:** `admin` (se necessário)
   - **Senha:** sua senha
3. Clique em **Testar Conexão**
4. Se bem-sucedido, clique em **Salvar**

### 2. Selecionar Database e Measurement

1. Acesse **Editor de Consultas**
2. Selecione um **Database** na lista
3. Selecione um **Measurement** (use a busca para filtrar)

### 3. Executar Consultas

**Usando o construtor visual:**
- Selecione um intervalo de tempo
- Adicione filtros por tags (opcional)
- Defina o limite de resultados
- Clique em **Executar**

**Escrevendo InfluxQL:**

```sql
SELECT * FROM "cpu_usage" WHERE time > now() - 1h LIMIT 100
```

### 4. Visualizar Resultados

- Clique no ícone de **tela cheia** para expandir
- Pressione **ESC** para sair do modo tela cheia
- Clique em **abrir em nova janela** para exportar/imprimir

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── components/
│   │   ├── sidebar/              # Menu lateral
│   │   ├── configuration/        # Tela de configuração
│   │   ├── database-list/        # Seletor de databases
│   │   └── query-editor/         # Editor de consultas
│   ├── services/
│   │   ├── config.service.ts     # Gerenciamento de configurações
│   │   └── influxdb.service.ts   # Cliente HTTP InfluxDB
│   ├── models/
│   │   └── influx.models.ts      # Interfaces TypeScript
│   └── app.routes.ts             # Rotas da aplicação
├── assets/                       # Recursos estáticos
├── environments/                 # Configurações de ambiente
└── styles.scss                   # Estilos globais
```

---

## Exemplos de Consultas

### Consulta básica

```sql
SELECT * FROM "cpu_usage" LIMIT 100
```

### Com filtro de tempo

```sql
SELECT * FROM "cpu_usage" WHERE time > now() - 1h
```

### Com filtro por tag

```sql
SELECT * FROM "cpu_usage" WHERE "host" = 'server1' AND time > now() - 1h
```

### Agregação

```sql
SELECT MEAN("value") FROM "temperature" WHERE time > now() - 24h GROUP BY time(1h)
```

### Múltiplas agregações

```sql
SELECT MIN("value"), MAX("value"), MEAN("value")
FROM "cpu_usage"
WHERE time > now() - 6h
GROUP BY time(10m)
```

---

## Troubleshooting

### Erro de conexão

> [!TIP]
> Verifique se o InfluxDB está rodando executando:
> ```bash
> curl http://localhost:8086/ping
> ```

**Possíveis causas:**
- InfluxDB não está rodando
- URL ou porta incorreta
- CORS não configurado

---

### Erro 401 Unauthorized

**Causa:** Credenciais incorretas

**Solução:**
1. Verifique usuário e senha
2. Teste via curl:

```bash
curl -G 'http://localhost:8086/query' \
  --data-urlencode "q=SHOW DATABASES" \
  -u usuario:senha
```

---

### Porta 4200 em uso

**Windows:**

```powershell
netstat -ano | findstr :4200
taskkill /PID <PID> /F
```

**Linux/Mac:**

```bash
lsof -ti:4200 | xargs kill -9
```

Ou use outra porta:

```bash
ng serve --port 4300
```

---

### Queries lentas

> [!NOTE]
> Para melhorar a performance:
> - Adicione `LIMIT` nas consultas
> - Reduza o intervalo de tempo
> - Use agregações com `GROUP BY`

---

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature:

```bash
git checkout -b feature/minha-feature
```

3. Commit suas mudanças:

```bash
git commit -m "feat: adiciona nova funcionalidade"
```

4. Push para a branch:

```bash
git push origin feature/minha-feature
```

5. Abra um Pull Request

---

### Padrão de Commits

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

---

## Stack Tecnológica

- **Angular 18** - Framework frontend
- **TypeScript 5.4** - Linguagem
- **RxJS 7.8** - Programação reativa
- **SCSS** - Estilos
- **InfluxDB 1.11.8** - Banco de dados de séries temporais

---

## Licença

Este projeto está sob a licença **MIT**.

```
MIT License

Copyright (c) 2024 InfluxDB IDE

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.
```

---

## Suporte

- [Reportar Bug](https://github.com/seu-usuario/idle-influx-db/issues/new)
- [Sugerir Feature](https://github.com/seu-usuario/idle-influx-db/issues/new)

---

Desenvolvido por **Patrick Alves**
