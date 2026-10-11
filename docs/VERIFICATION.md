# Relatório de verificação · 11/10/2026

## Fluxo verificado

Usuário escolhe agente e suíte na interface → API valida a execução → executor chama o provedor → critérios avaliam a resposta → SQLite salva o resultado → interface apresenta histórico, detalhes, comparação e exportação.

## Evidências locais

Ambiente: Windows, Node.js **24.20.0**, Google Chrome em modo headless.

| Verificação | Resultado |
| --- | --- |
| `npm test` | **12 testes aprovados**. |
| `npm run build` | TypeScript estrito e build de produção concluídos. |
| `npm run test:e2e` com `PLAYWRIGHT_CHANNEL=chrome` | **1 cenário ponta a ponta aprovado**, cobrindo os fluxos abaixo. |
| `npm run eval -- --agent demo-candidate --min-pass-rate 100` | Código 0; 16/16 cenários aprovados pela fixture candidata. |
| Capturas desktop e mobile | Inspecionadas visualmente; sem rolagem horizontal da página em viewport de 390 px. |

### O teste do navegador cobre

- Execução da baseline e da candidata pela interface, com resultados persistidos.
- Inspeção de um cenário reprovado e seus critérios.
- Download do relatório JSON.
- Comparação com diferença esperada de 56,25 pontos percentuais (arredondada na tela).
- Criação de suíte por JSON e cadastro de agente HTTP.
- Persistência do cadastro após recarregar a página.
- Interface mobile e ausência de erros JavaScript da página.

### Os testes unitários e de integração cobrem

- Avaliação dos cinco tipos de critério, acentos, tipos estritos e campos ausentes.
- Cálculo de aprovação, erros, média e P95.
- Detecção de mudanças na suíte e rejeição de comparações incompatíveis.
- Validação de IDs únicos e critérios obrigatórios.
- Exportação CSV com escape e neutralização de fórmulas.
- API real, SQLite em memória, persistência em disco e recuperação após reinício.
- Limite de concorrência, cancelamento e falhas do provedor.
- Conectores HTTP/Ollama contra servidor controlado, contrato inválido, HTTP 503, timeout real, limite de resposta e redirecionamentos rejeitados.

## Limites desta verificação

- Nenhum modelo Ollama ou serviço externo de IA foi executado. O contrato Ollama foi testado com uma resposta controlada compatível com sua API.
- As métricas nas capturas são de programas demonstrativos e não constituem benchmark de LLMs.
- Docker/Compose foram fornecidos, mas não executados neste ambiente, onde Docker não estava disponível.
- A pipeline no GitHub reproduz as verificações em Linux. Consulte a aba Actions para o resultado atualizado de cada commit.
