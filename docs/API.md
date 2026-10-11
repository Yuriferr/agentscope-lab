# API local

Base padrão: `http://127.0.0.1:4310/api`. Respostas JSON, salvo exportação CSV. Escritas exigem `Content-Type: application/json`. Erros retornam `{ "error": "mensagem" }`.

| Método | Rota | Função |
| --- | --- | --- |
| GET | `/health` | Status e versão. |
| GET | `/agents` | Configurações de agentes. |
| POST | `/agents` | Nova configuração imutável. |
| POST | `/connections/models` | Descobre modelos de Ollama ou API compatível com Chat Completions. |
| POST | `/connections/test` | Testa a configuração com uma mensagem curta, sem salvar. |
| POST | `/agents/:id/key` | Testa e restaura uma chave de sessão após reiniciar. |
| GET | `/suites` | Suítes e cenários. |
| POST | `/suites` | Valida e cria suíte. |
| GET | `/runs` | Resumos de execuções, mais recentes primeiro. |
| POST | `/runs` | Inicia execução; HTTP 202 com snapshot inicial. |
| GET | `/runs/:id` | Snapshot completo com resultados e progresso. |
| POST | `/runs/:id/cancel` | Solicita cancelamento; envie `{}`. |
| GET | `/runs/:id/export?format=json` | Relatório completo JSON. |
| GET | `/runs/:id/export?format=csv` | Tabela CSV por resultado. |
| GET | `/compare?baseline=ID&candidate=ID` | Deltas, regressões e melhorias. |

## Iniciar execução

```json
{
  "name": "Experimento de roteamento",
  "agentId": "demo-candidate",
  "suiteId": "suite-banco",
  "repetitions": 1
}
```

Consulte `/runs/:id` até `status` sair de `running`. Estados finais: `completed`, `cancelled`, `interrupted` e `failed`. Uma execução `completed` pode ter cenários reprovados ou erros de provedor: o status significa que toda a suíte foi percorrida, não aprovação do agente.

## Agente HTTP

```json
{
  "name": "Meu agente",
  "version": "prompt-v2",
  "provider": "http",
  "endpoint": "http://127.0.0.1:8000/evaluate",
  "tokenEnv": "MY_AGENT_TOKEN",
  "timeoutMs": 30000
}
```

Remova `tokenEnv` para serviços sem autenticação. A criação valida a origem permitida, mas não chama o agente: a primeira avaliação verifica conectividade. Limite de resposta por chamada: 1 MB antes de parsear JSON; `response` suporta até 100 mil caracteres.

## Ollama

No modo simples, use `responseMode: "plain"` para receber texto normal. O conector `openai-compatible` aceita a resposta Chat Completions em `choices[0].message.content`; usa `model`, `messages` e `stream: false`, sem exigir um JSON bancário do modelo.

Os endpoints de conexão aceitam `apiKey` temporária. `/agents` retira esse campo antes de persistir e marca apenas `sessionKeyRequired`; `/agents` GET informa `needsKey` quando o servidor precisa receber a chave novamente. `/connections/models` recebe `provider`, `endpoint` e `apiKey` opcional. `/connections/test` recebe uma configuração de agente completa e a chave opcional. A restauração recebe `{ "apiKey": "..." }`.

Use `provider: "ollama"`, `model` e o endpoint completo `/api/chat`. `systemPrompt` é opcional; os padrões estão em `server/providers.ts`. `stream: false` e `temperature: 0` são enviados pelo conector; `format: "json"` só é usado no modo estruturado. `tokenEnv` pode ser usado quando existir um proxy autenticado.

## Operação

O servidor escuta loopback por padrão. Esta versão não implementa login nem autorização multiusuário. O Compose também restringe a porta publicada ao loopback. Configure autenticação em um proxy e revisão de exposição antes de hospedar para outras pessoas.

Somente origens explicitamente permitidas podem receber chamadas do runner; redirecionamentos são rejeitados. Não configure domínios ou endpoints que você não controla. Endpoints permitidos recebem prompts e, se configurado, o Bearer token.
