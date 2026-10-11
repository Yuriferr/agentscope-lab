export const presets = {
  openai: {
    name: 'OpenAI',
    provider: 'openai-compatible',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    local: false,
    keyLink: 'https://platform.openai.com/api-keys',
    description: 'Conecte com a chave da API da OpenAI.',
  },
  gemini: {
    name: 'Gemini',
    provider: 'openai-compatible',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    local: false,
    keyLink: 'https://aistudio.google.com/apikey',
    description: 'Use uma chave criada no Google AI Studio.',
  },
  ollama: {
    name: 'Ollama',
    provider: 'ollama',
    endpoint: 'http://localhost:11434/api/chat',
    local: true,
    keyLink: 'https://ollama.com/download',
    description: 'Use um modelo instalado no seu computador.',
  },
  lmstudio: {
    name: 'LM Studio',
    provider: 'openai-compatible',
    endpoint: 'http://localhost:1234/v1/chat/completions',
    local: true,
    keyLink: 'https://lmstudio.ai/download',
    description: 'Conecte ao servidor local do LM Studio.',
  },
} as const;
export type PresetId = keyof typeof presets;
