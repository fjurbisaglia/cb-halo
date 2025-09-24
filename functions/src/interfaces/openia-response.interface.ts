
export interface OpenAIResponse<T = any> {
  /** Contenido principal de la respuesta (puede ser texto, JSON u objeto raw) */
  response: T;
}
