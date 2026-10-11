# Relatório de verificação · 11/10/2026

Revisão **1.2.0**: identidade visual em azul-marinho, paleta centralizada, organização por funcionalidade e telas avançadas separadas. As capturas foram regeneradas com esta interface.

## Fluxo verificado

Usuário escolhe agente e suíte na interface → API valida a execução → executor chama o provedor → critérios avaliam a resposta → SQLite salva o resultado → interface apresenta histórico, detalhes, comparação e exportação.

## Evidências locais

Ambiente: Windows, Node.js **24.20.0**, Google Chrome em modo headless.

| Verificação | Resultado |
| --- | --- |
| `npm test` | **14 testes aprovados**. |
| `npm run build` | TypeScript estrito e build de produção concluídos. |
| `npm run test:e2e` com `PLAYWRIGHT_CHANNEL=chrome` | **4 cenários ponta a ponta aprovados**, cobrindo os fluxos abaixo. |
| `npm run eval -- --agent demo-candidate --min-pass-rate 100` | Código 0; 16/16 cenários aprovados pela fixture candidata. |
| Capturas desktop e mobile | Inspecionadas visualmente; sem rolagem horizontal da página em viewport de 390 px. |

### O teste do navegador cobre

- Modo simples: exemplo sem chave, leitura de resposta incorreta, criação de teste por formulário e execução das perguntas próprias.
- Conexão por API: listar modelos, rejeitar chave inválida, testar a resposta, exigir novo teste após alteração e executar perguntas com a conexão salva.
- Conexão Ollama: listar modelos, testar, salvar e avaliar respostas normais em texto.
- Execução da baseline e da candidata pela interface, com resultados persistidos.
- Inspeção de um cenário reprovado e seus critérios.
- Download do relatório JSON.
- Comparação com diferença esperada de 56,25 pontos percentuais (arredondada na tela).
- Criação de suíte por JSON e cadastro de agente HTTP.
- Persistência do cadastro após recarregar a página.
- Interface mobile e ausência de erros JavaScript da página.

### Os testes unitários e de integração cobrem

- Avaliação dos seis tipos de critério, acentos, tipos estritos e campos ausentes.
- Cálculo de aprovação, erros, média e P95.
- Detecção de mudanças na suíte e rejeição de comparações incompatíveis.
- Validação de IDs únicos e critérios obrigatórios.
- Exportação CSV com escape e neutralização de fórmulas.
- API real, SQLite em memória, persistência em disco e recuperação após reinício.
- Limite de concorrência, cancelamento e falhas do provedor.
- Conectores HTTP/Ollama contra servidor controlado, contrato inválido, HTTP 503, timeout real, limite de resposta e redirecionamentos rejeitados.
- Contrato Chat Completions, descoberta de modelos, chaves ausentes após reinício e reconexão. A chave de teste não aparece nos cadastros, relatórios nem arquivo SQLite.

## Limites desta verificação

- Nenhum modelo local ou serviço externo de IA foi executado. Os conectores Ollama e Chat Completions foram testados com servidores HTTP controlados compatíveis com seus contratos. OpenAI, Gemini e LM Studio ainda precisam de validação com uma conta/modelo real do usuário.
- As métricas nas capturas são de programas demonstrativos e não constituem benchmark de LLMs.
- Docker/Compose foram fornecidos, mas não executados neste ambiente, onde Docker não estava disponível.
- O atalho Windows reúne a instalação, a compilação e a inicialização já verificadas individualmente; a interação por duplo clique não foi automatizada.
- A pipeline no GitHub reproduz as verificações em Linux. Consulte a aba Actions para o resultado atualizado de cada commit.
