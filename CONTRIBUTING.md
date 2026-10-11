# Como contribuir

Obrigado por ajudar a tornar os testes de IA mais fáceis de entender.

## Preparação

1. Use Node.js 24.x e instale as dependências com `npm ci`.
2. Crie uma branch para a mudança.
3. Execute `npm run dev` e abra `http://127.0.0.1:5173`.
4. Faça mudanças na pasta da funcionalidade correspondente. Consulte o [mapa do código](docs/DESIGN.md).

## Antes de abrir um pull request

- Execute `npm run check`.
- Para mudanças na interface, instale o Chromium com `npx playwright install chromium` e execute `npm run test:e2e`. Confira também as capturas desktop e mobile.
- Formate os arquivos alterados com `npx prettier --write caminho/do/arquivo`.
- Atualize as instruções quando alterar um comportamento público.
- Descreva o problema, a solução e como verificou a mudança. Não apresente resultados simulados como benchmarks de modelos reais.

Não inclua `.env`, chaves de API, bancos locais ou dados pessoais. Prefira exemplos artificiais e servidores de teste. As chaves usadas pela interface permanecem apenas na memória do servidor.

## Relatar problemas

Informe sistema operacional, versão do Node.js, os passos realizados, o resultado esperado e o resultado recebido. Capturas ajudam, mas remova dados pessoais e credenciais antes de compartilhar.

O aplicativo é local e de usuário único. Funcionalidades que envolvam hospedagem pública, autenticação ou novas formas de persistir chaves exigem uma proposta específica de arquitetura.
