# Roteiro de demonstração

## Vídeo de aproximadamente 60 segundos

1. **0–10 s:** mostre o painel e explique o problema: mudar um prompt pode melhorar um comportamento e piorar outro.
2. **10–25 s:** execute a baseline demonstrativa. Abra um cenário com erro de digitação e mostre o critério que falhou.
3. **25–40 s:** execute a candidata com a mesma suíte e abra a comparação.
4. **40–50 s:** destaque as melhorias e explique que os resultados mostrados são de fixtures, usadas para demonstrar o laboratório.
5. **50–60 s:** mostre a configuração HTTP/Ollama, o relatório exportado e o repositório.

## Texto sugerido

Como saber se uma mudança no prompt realmente melhorou um agente de IA?

Construí o AgentScope Lab para transformar essa pergunta em experimentos que consigo repetir e inspecionar.

O laboratório executa cenários em português, verifica critérios explícitos, registra respostas e latência e compara versões para encontrar melhorias e regressões.

Nesta primeira versão, implementei conectores HTTP e Ollama, histórico em SQLite, exportação JSON/CSV e avaliações automatizadas no CI. A interface permite abrir cada cenário e entender exatamente por que ele passou ou falhou.

A demonstração usa dois agentes determinísticos, identificados como simulação. Os números do vídeo explicam o funcionamento da ferramenta; avaliações de modelos reais dependem do agente conectado e da suíte escolhida.

Uma decisão importante foi manter os critérios esperados fora da entrada enviada ao agente e guardar os cenários junto aos resultados. Assim, consigo revisar o experimento depois sem perder o contexto.

Código e instruções: https://github.com/Yuriferr/agentscope-lab

Que comportamento você colocaria primeiro em uma suíte de testes para agentes?

#InteligenciaArtificial #LLM #SoftwareEngineering #OpenSource
