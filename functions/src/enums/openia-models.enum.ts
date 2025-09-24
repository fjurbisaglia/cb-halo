export enum OpeniaModels {
  // Lo que ya tenías
  gpt35 = 'gpt-3.5-turbo', // legado
  gpt4oMini = 'gpt-4o-mini',
  gpt5Nano = 'gpt-5-nano',

  // Serie GPT-5
  gpt5 = 'gpt-5',
  gpt5Mini = 'gpt-5-mini',
  gpt5ChatLatest = 'gpt-5-chat-latest',

  // Serie GPT-4.1
  gpt41 = 'gpt-4.1',
  gpt41Mini = 'gpt-4.1-mini',
  gpt41Nano = 'gpt-4.1-nano',

  // 4o (omni)
  gpt4o = 'gpt-4o',
  gpt4o20240513 = 'gpt-4o-2024-05-13', // snapshot específico

  // Modelos de razonamiento (o-series)
  o1 = 'o1',
  o1Pro = 'o1-pro',
  o3 = 'o3',
  o3DeepResearch = 'o3-deep-research',
  o3Pro20250610 = 'o3-pro-2025-06-10',

  // o4-mini
  o4Mini = 'o4-mini',
  o4MiniDeepResearch = 'o4-mini-deep-research',

  // Realtime
  gptRealtime = 'gpt-realtime',

  // Imágenes
  gptImage1 = 'gpt-image-1',

  // Embeddings
  textEmbedding3Small = 'text-embedding-3-small',
  textEmbedding3Large = 'text-embedding-3-large',
}
