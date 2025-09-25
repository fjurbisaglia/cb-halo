
export interface OpenAIResponse<T = any> {
  /** Main response content (can be text, JSON or raw object) */
  response: T;
}
