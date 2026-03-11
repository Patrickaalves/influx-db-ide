# InfluxDB IDE - Guia de Instalação Rápida

## ⚠️ IMPORTANTE: Atualize o Node.js Primeiro!

Sua versão atual do Node.js (v12.22.12) é muito antiga para o Angular 18.

### Passo 1: Atualizar Node.js

Baixe e instale Node.js v20 ou superior:
👉 https://nodejs.org/

Verifique a instalação:
```bash
node --version
# Deve mostrar v18.19.0 ou superior
```

### Passo 2: Instalar Dependências

```bash
cd c:\Users\patrick.alves\Documents\projetos-pessoais\idle-influx-db
npm install
```

### Passo 3: Executar a Aplicação

```bash
npm start
```

Acesse: http://localhost:4200

## 🎯 Primeira Configuração

1. Clique em "Configurações" no menu lateral
2. Configure sua conexão com o InfluxDB:
   - URL: `http://localhost:8086`
   - Usuário e Senha (se necessário)
3. Teste a conexão
4. Salve as configurações
5. Volte para "Editor de Consultas" e comece a usar!

## 📚 Documentação Completa

Veja o arquivo [README.md](README.md) para documentação completa.
