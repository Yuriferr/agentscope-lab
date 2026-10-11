# Metodologia de avaliação

## Unidade de avaliação

Um resultado corresponde a um cenário em uma repetição. As chamadas são sequenciais dentro de uma execução. Cada cenário HTTP recebe um novo `sessionId`. Não há retentativas automáticas nem estado compartilhado entre casos.

O agente recebe somente entradas. As expectativas permanecem no avaliador. O snapshot armazena o prompt, nome do cenário, categoria, critérios, configuração, resposta, duração e erro quando houver.

## Critérios

| Tipo | Avaliação |
| --- | --- |
| `route_equals` | Igualdade exata entre `output.route` e `value`. |
| `contains` | Substring na resposta após minúsculas e remoção de diacríticos. |
| `response_equals` | Texto completo igual após remover espaços nas extremidades, normalizar caixa e acentos. Texto extra e pontuação continuam significativos. |
| `not_contains` | Ausência da substring usando a mesma normalização. |
| `data_equals` | Campo próprio de `output.data`, com tipo e valor exatamente iguais. Sem caminhos aninhados. |
| `max_latency` | Tempo de parede observado menor ou igual ao limite em milissegundos. |

Todas as verificações devem passar para aprovar um cenário. Na ausência de resposta válida, todos os seus critérios são marcados como reprovados/não avaliados por falha de execução. Isso mantém erros de infraestrutura visíveis no denominador.

Uma checagem de palavra é uma heurística. A frase “não está aprovado” contém “aprovado” e reprova um `not_contains` desse termo; a ferramenta mostra esse resultado explicitamente. Para comportamento semântico, defina saídas estruturadas, amplie a suíte e faça revisão humana.

## Métricas

- **Taxa de aprovação:** resultados aprovados / resultados concluídos × 100.
- **Critérios atendidos:** verificações aprovadas / verificações de resultados concluídos × 100.
- **Latência média:** soma das durações / resultados concluídos.
- **P95:** durações em ordem crescente, elemento de índice `ceil(0,95 × N) - 1`.
- **Erros:** quantidade de resultados sem resposta válida por falha do conector.
- **Dimensões:** taxa de aprovação calculada sobre resultados da categoria.

Durante execução ou cancelamento, métricas referem-se apenas às chamadas concluídas. Uma chamada abortada por cancelamento não gera resultado. Reiniciar o processo marca trabalhos em execução como `interrupted`; eles não são retomados automaticamente.

## Comparação

Comparações exigem duas execuções diferentes, ambas concluídas, com o mesmo número de repetições e fingerprint da suíte. O fingerprint SHA-256 cobre IDs, categorias, prompts e critérios; ignora nomes de apresentação e a ordem dos cenários.

Um cenário melhorou se sua taxa de aprovação nas repetições aumentou. Regrediu se diminuiu. O delta geral é apresentado em **pontos percentuais**, e o delta de latência é candidato menos baseline.

Os agentes podem ser diferentes e a comparação pode conter dados demonstrativos, sempre sinalizados. Não há inferência de significância estatística, comparação de custo ou atribuição causal. Para experimentar prompts, mantenha modelo, parâmetros, hardware e condições de execução constantes e descreva isso no relatório.

## Casos demonstrativos

No modo simples, o conjunto de seis perguntas usa `response_equals`. A fixture baseline passa em 3/6 perguntas; a candidata, em 6/6. Isso demonstra respostas incorretas, explicações extras e informação inventada, sem utilizar um modelo real.

As duas fixtures usam regras sobre o texto de entrada. A baseline deliberadamente não reconhece algumas variações de linguagem; a candidata cobre os 16 casos do conjunto fornecido. Elas não consultam os critérios esperados. Contudo, a candidata foi construída com conhecimento da suíte: **a aprovação total é didática e não representa generalização**.

A espera artificial de 45/65 ms facilita visualizar o progresso. Ela torna a comparação de latência inadequada para avaliar modelos; não apresente esses números como resultados de Ollama ou de outro provedor.

## Próximos experimentos possíveis

Conversas de múltiplos turnos, cenários de ferramentas com injeção real de falhas, exportação de traces e avaliação semântica calibrada com exemplos humanos podem ser extensões futuras. Não fazem parte das métricas da versão 1.0.
