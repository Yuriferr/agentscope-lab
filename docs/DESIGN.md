# Design e organização do código

## Identidade visual

A interface usa azul-marinho como cor principal, com fundos claros para leitura. Cores não são o único sinal: os resultados também têm ícones e rótulos escritos.

| Token em `src/styles/tokens.css` | Cor | Responsabilidade |
| --- | --- | --- |
| `--color-ink` | `#0b1f3a` | Cabeçalho, superfícies escuras e títulos |
| `--color-navy` | `#17365e` | Marca e ações principais |
| `--color-mid` | `#2d507f` | Ênfase e estados de interação |
| `--color-muted` | `#526785` | Texto secundário em superfícies claras |
| `--color-line` | `#d2dff0` | Bordas e separadores |
| `--color-canvas` | `#f4f7fc` | Fundo da aplicação |
| `--color-success` | `#23634d` | Confirmação, acompanhada de texto e ícone |
| `--color-warning` | `#86571a` | Atenção, acompanhada de texto e ícone |

O arquivo `base.css` contém os estilos compartilhados e do modo avançado. `lab.css` organiza o modo simples e suas adaptações para telas menores. Evite duplicar a paleta em componentes; use os tokens existentes. Os estilos de feedback podem usar cores semânticas diferentes da marca.

## Onde fazer cada alteração

| Alteração | Local |
| --- | --- |
| Navegação entre os modos | `src/app/App.tsx` |
| Tela inicial, IAs salvas e histórico simples | `src/features/lab/SimpleApp.tsx` |
| Assistente de conexão | `src/features/connections/ConnectForm.tsx` |
| Formulário de perguntas | `src/features/suites/SimpleSuiteForm.tsx` |
| Explicações dos resultados | `src/features/results/SimpleReport.tsx` |
| Navegação avançada | `src/features/advanced/AdvancedApp.tsx` |
| Comparação, detalhes, suítes e guia avançado | `src/features/advanced/views/` |
| Diálogos, indicadores e tabela compartilhada | `src/components/ui.tsx` |
| Chamadas do navegador à API e formatação | `src/lib/api.ts` |
| Contratos validados | `shared/schema.ts` |
| Opções de provedores na interface | `shared/presets.ts` |
| Protocolos de conexão e descoberta | `server/providers.ts` e `server/connections.ts` |
| Regras, execução e persistência | `server/evaluation.ts`, `server/runner.ts` e `server/store.ts` |

## Diretrizes para manutenção

- Coloque comportamentos específicos dentro da funcionalidade correspondente em `features/`.
- Mantenha componentes compartilhados independentes das páginas e das chaves de API.
- O navegador importa contratos de `shared/`, nunca módulos de `server/`.
- Use imports diretos; o modo avançado permanece carregado sob demanda.
- Preserve o descarte das respostas assíncronas antigas e a limpeza de intervalos ao trocar de tela.
- A interface deve explicar erros em português e permitir recuperação sem exigir leitura do código.
- Confira navegação por teclado, foco visível, rótulos de campos e ausência de rolagem horizontal no celular.

Após mudanças visuais, execute os fluxos de navegador e confira as capturas em `docs/images/`. O teste verifica o comportamento; a inspeção das imagens verifica hierarquia, contraste e legibilidade.
