# AgentScope Lab

### Entenda sua IA. Sem complicação.

Um laboratório local para conferir respostas de IAs com perguntas e regras que você consegue entender. Conecte uma API ou um modelo no seu computador, execute os testes e veja **o que era esperado, o que a IA respondeu e o que precisa de atenção**.

[![Verificações](https://github.com/Yuriferr/agentscope-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/Yuriferr/agentscope-lab/actions/workflows/ci.yml)
![Node.js 24](https://img.shields.io/badge/Node.js-24-17365e)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-2d507f)
[![Licença MIT](https://img.shields.io/badge/Licença-MIT-0b1f3a)](LICENSE)

![Tela inicial do AgentScope Lab em azul-marinho](docs/images/dashboard.png)

**[Começar](#início-rápido) · [Conectar uma IA](#conecte-sua-ia) · [Entender resultados](#entenda-os-resultados) · [Estrutura do código](#organização-do-projeto) · [Documentação](docs/README.md)**

## Para que serve?

- Conferir se uma IA segue instruções, identifica informações e responde como você espera.
- Criar perguntas próprias por um formulário, sem escrever código ou JSON.
- Revisar cada resposta, consultar o histórico e exportar os resultados.
- Comparar versões com as mesmas perguntas nas ferramentas avançadas.

**Comece sem conta e sem chave:** o exemplo demonstrativo funciona localmente e usa respostas simuladas. Ele explica a ferramenta; seus resultados não são uma avaliação de um modelo real.

## Início rápido

### Requisitos

| Requisito | Quando é necessário |
| --- | --- |
| [Node.js 24.x](https://nodejs.org/) e npm | Para executar o laboratório. O banco SQLite já faz parte desse ambiente. |
| Navegador atualizado | Para abrir a interface. |
| Internet | Na instalação das dependências e ao usar APIs externas. |
| Chave de API **ou** aplicativo de modelo local | Somente para avaliar uma IA real. |

O GitHub hospeda o código. A interface roda no seu computador.

### Windows: iniciar com dois cliques

1. Instale o Node.js 24.x.
2. Baixe **Code → Download ZIP** neste repositório e extraia a pasta.
3. Abra **iniciar-windows.cmd**. Ele instala as dependências, prepara a interface e inicia o laboratório.
4. Quando a janela mostrar o endereço, abra **http://127.0.0.1:4310**.

Mantenha a janela aberta durante o uso. A preparação precisa de internet e pode levar alguns minutos. Para encerrar, pressione `Ctrl+C` nessa janela.

### Terminal: Windows, macOS ou Linux

```bash
git clone https://github.com/Yuriferr/agentscope-lab.git
cd agentscope-lab
npm ci
npm run build
npm start
```

Abra **http://127.0.0.1:4310**. Não é necessário configurar `.env` para experimentar a demonstração.

### Seu primeiro teste

1. Na aba **Começar**, clique em **Experimentar exemplo**.
2. Escolha **Teste rápido do dia a dia** e clique em **Começar teste**.
3. Abra uma pergunta que precise de atenção.
4. Compare a resposta recebida com a esperada e leia a explicação.

O exemplo inicial atende a **3 de 6** perguntas de propósito, para você explorar acertos e diferenças. No modo avançado, há também exemplos de atendimento bancário e comparação de versões.

## Conecte sua IA

| Opção | Preparação | Dentro do laboratório |
| --- | --- | --- |
| **OpenAI** | Crie uma [chave de API](https://platform.openai.com/api-keys). | Cole a chave → **Buscar modelos** → escolha um modelo de conversa → **Testar conexão**. |
| **Gemini** | Crie uma chave no [Google AI Studio](https://aistudio.google.com/apikey). | Cole a chave → busque e selecione um modelo → teste a conexão. |
| **Ollama** | [Instale e abra o aplicativo](https://ollama.com/download) e baixe um modelo. | Clique em **Ollama → Buscar modelos**, selecione o modelo e teste. |
| **LM Studio** | Abra o aplicativo, carregue um modelo e inicie seu servidor local na porta 1234. | Clique em **LM Studio → Buscar modelos**, selecione o modelo e teste. |

O endereço já vem preenchido. **Usar esta IA** é liberado depois que o teste de conexão recebe uma resposta válida. Em seguida, escolha as perguntas e inicie a avaliação.

- A lista pode incluir modelos que não aceitam conversas; o teste confirma a compatibilidade.
- Se a listagem não estiver disponível, digite o nome exato do modelo.
- O primeiro carregamento de um modelo local pode demorar até dois minutos.
- Chamadas de API podem consumir créditos. A assinatura do ChatGPT não substitui créditos da API.
- Outros serviços compatíveis com **Chat Completions** podem usar um endereço personalizado. Protocolos como Claude nativo precisam de um adaptador.

Veja o **[guia completo de conexão](docs/CONNECTING.md)** para instruções, Docker, endereços personalizados e erros comuns.

## Entenda os resultados

![Comparação da resposta esperada com a recebida](docs/images/simple-result.png)

| Resultado | Significado | Próximo passo |
| --- | --- | --- |
| **Como esperado** | A resposta atendeu às regras da pergunta. | Confira outras perguntas representativas do seu uso. |
| **Precisa de atenção** | O conteúdo ou formato foi diferente do esperado. | Compare os textos e revise a instrução ou a regra do teste. |
| **Não avaliado** | A chamada falhou ou retornou um formato inválido. | Confira a conexão. Isso não significa que a IA errou a pergunta. |

O painel mostra a quantidade de respostas como esperado e o tempo médio de espera. Você pode abrir cada pergunta ou baixar um arquivo CSV. O modo avançado oferece também JSON, critérios detalhados e comparação de versões.

**O resultado vale para as perguntas e regras escolhidas.** Não é uma nota geral de inteligência, segurança ou qualidade. As explicações descrevem verificações automáticas explícitas, não a opinião de outra IA. Leia a [metodologia](docs/METHODOLOGY.md) para conhecer os limites.

## Crie suas próprias perguntas

Depois de escolher uma IA, clique em **Criar teste com minhas perguntas**. Dê um nome ao teste e preencha a pergunta, a regra e o texto esperado.

| Regra | Exemplo de uso |
| --- | --- |
| **Deve incluir** | A resposta precisa mencionar `prazo de entrega`. |
| **Exatamente** | “Quanto é 2 + 2? Responda só o número.” → `4`. |
| **Não deve incluir** | A resposta não pode conter uma expressão que você definiu. |

O formulário aceita até 20 perguntas. A comparação de texto ignora maiúsculas e acentos; a regra exata ignora espaços nas extremidades, mas texto adicional e pontuação podem gerar diferença. Não há interpretação automática de sinônimos.

## Seus dados e suas chaves

- O histórico e as conexões ficam em `data/agentscope.sqlite`, fora do Git.
- Chaves digitadas no painel ficam **somente na memória do servidor**. Depois de reiniciá-lo, abra **Minhas IAs → Informar chave**.
- Perguntas e respostas são salvas no histórico. As perguntas são enviadas ao provedor selecionado: use dados adequados ao seu teste.
- O aplicativo é local, de usuário único e sem login. Não foi projetado para exposição direta à internet.
- Para preservar o histórico em uma atualização, mantenha a pasta `data/`. Para fazer uma cópia de segurança consistente, pare o laboratório antes de copiá-la.

## Organização do projeto

```text
agentscope-lab/
├── src/                       # Interface React
│   ├── app/                   # Alternância entre modo simples e avançado
│   ├── components/            # Elementos compartilhados de interface
│   ├── features/
│   │   ├── lab/               # Fluxo principal do laboratório
│   │   ├── connections/       # Configuração e teste de conexão
│   │   ├── suites/            # Formulário de perguntas próprias
│   │   ├── results/           # Resultado explicado pergunta por pergunta
│   │   └── advanced/          # Comparação, inspeção e formulários técnicos
│   ├── lib/                   # Cliente da API e formatação
│   └── styles/                # Paleta, estilos comuns e modo simples
├── server/                    # API, conectores, avaliações e SQLite
├── shared/                    # Contratos e opções usados por cliente e servidor
├── tests/                     # Testes unitários, de integração e de navegador
├── scripts/                   # Avaliação pela linha de comando
├── examples/                  # Configurações de exemplo
├── docs/                      # Guias e capturas reais da interface
└── .github/                   # Verificação automática e modelo de pull request
```

**Fluxo:** interface → API → conector da IA → verificações → SQLite → resultado na interface.

As cores ficam centralizadas em [`src/styles/tokens.css`](src/styles/tokens.css). A identidade visual usa azul-marinho, superfícies claras e cores de estado acompanhadas de texto e ícones. O modo avançado é carregado sob demanda.

## Desenvolvimento e qualidade

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Inicia a interface em `5173` e a API em `4310`. |
| `npm run build` | Verifica TypeScript e prepara a interface de produção. |
| `npm start` | Serve a interface preparada e a API em `4310`. |
| `npm test` | Executa testes unitários e de integração. |
| `npm run check` | Executa testes e compilação. |
| `npm run test:e2e` | Verifica os fluxos completos no navegador. |

Antes do primeiro teste de navegador, execute `npx playwright install chromium`. No PowerShell, use `npm.cmd`/`npx.cmd` se houver problemas com argumentos.

A verificação automática no GitHub executa testes, compilação, avaliação demonstrativa e fluxos de navegador. Os conectores são testados com servidores controlados; isso não substitui a validação com a sua conta ou modelo real. Consulte as [evidências e limitações](docs/VERIFICATION.md).

**Tecnologias:** React, TypeScript estrito, Vite, Express, Zod, SQLite e Playwright.

## Problemas comuns

| Situação | Como resolver |
| --- | --- |
| A janela não inicia | Confirme a versão do Node.js: o projeto requer 24.x. |
| A página não abre | Mantenha o servidor em execução e use o endereço mostrado na janela. |
| Porta 4310 ocupada | Encerre outra instância do laboratório ou configure `PORT` em `.env`. |
| Chave recusada ou limite de uso | Confira a chave, permissões e créditos no provedor. |
| Nenhum modelo local encontrado | Abra o Ollama ou inicie o servidor do LM Studio e carregue/baixe um modelo. |
| Preciso informar a chave de novo | É esperado após reiniciar: a chave não é salva no disco. |

A configuração é opcional: copie `.env.example` para `.env` apenas se precisar mudar a porta, o local do histórico ou permitir outro endereço. Veja [desenvolvimento e configuração](docs/DEVELOPMENT.md).

## Documentação e contribuição

- [Índice dos guias](docs/README.md)
- [Conectar APIs e modelos locais](docs/CONNECTING.md)
- [Metodologia de avaliação](docs/METHODOLOGY.md)
- [API para integrações próprias](docs/API.md)
- [Desenvolvimento, CLI e Docker](docs/DEVELOPMENT.md)
- [Identidade visual e organização do código](docs/DESIGN.md)
- [Como contribuir](CONTRIBUTING.md)
- [Roteiro de demonstração no LinkedIn](docs/LINKEDIN.md)

Encontrou um problema? [Abra uma issue](https://github.com/Yuriferr/agentscope-lab/issues) com os passos para reproduzir, sem incluir chaves ou informações pessoais.

**Autor:** [Yuri Fernandes](https://github.com/Yuriferr) · [LinkedIn](https://www.linkedin.com/in/yuriferr/)

**Licença:** [MIT](LICENSE). Projeto independente, sem afiliação aos provedores de IA citados.
