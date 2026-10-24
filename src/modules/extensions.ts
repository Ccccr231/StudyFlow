// 扩展契约，当前不连接 RAG、聊天室、OSS 或天气服务。
export interface RagRetriever { retrieve(userId: string, query: string): Promise<{ text: string; source: string }[]> }
export interface ObjectStorage { put(userId: string, name: string, bytes: Uint8Array): Promise<string> }
export interface ChatTransport { publish(roomId: string, userId: string, message: string): Promise<void> }
export interface WelcomeSceneProvider { scene(): Promise<{ image: string; greeting: string; weather?: string }> }
