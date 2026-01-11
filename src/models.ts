/**
 * open-onesaas - 다중 AI 모델 지원
 * DeepSeek, MiniMax 등 다양한 AI 모델 지원
 *
 * 최신 업데이트: 2025-01-10
 */

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'deepseek' | 'minimax';
  model: string;
  description: string;
  maxTokens: number;
  contextWindow: number;
  inputPrice: number;
  outputPrice: number;
  baseUrl: string;
  capabilities: {
    vision?: boolean;
    functionCalling?: boolean;
    streaming?: boolean;
    json?: boolean;
    reasoning?: boolean;
  };
  releaseDate?: string;
}

// ============================================================
// DeepSeek 모델 목록
// ============================================================

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: 'deepseek',
    model: 'deepseek-chat',
    description: 'GPT-5급 성능의 최신 모델. 685B 파라미터, IMO/IOI 금메달 수준.',
    maxTokens: 8192,
    contextWindow: 128000,
    inputPrice: 0.27,
    outputPrice: 1.1,
    baseUrl: 'https://api.deepseek.com',
    capabilities: {
      vision: false,
      functionCalling: true,
      streaming: true,
      json: true,
      reasoning: true,
    },
    releaseDate: '2025-01-10',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    model: 'deepseek-reasoner',
    description: '추론 특화 모델. 복잡한 수학/논리 문제 해결에 최적화.',
    maxTokens: 8192,
    contextWindow: 64000,
    inputPrice: 0.55,
    outputPrice: 2.19,
    baseUrl: 'https://api.deepseek.com',
    capabilities: {
      vision: false,
      functionCalling: true,
      streaming: true,
      json: true,
      reasoning: true,
    },
    releaseDate: '2025-01-20',
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: 'deepseek',
    model: 'deepseek-coder',
    description: '코딩 특화 모델. 코드 생성, 분석, 디버깅에 최적화.',
    maxTokens: 8192,
    contextWindow: 128000,
    inputPrice: 0.14,
    outputPrice: 0.28,
    baseUrl: 'https://api.deepseek.com',
    capabilities: {
      vision: false,
      functionCalling: true,
      streaming: true,
      json: true,
    },
    releaseDate: '2024-11-11',
  },
  // ============================================================
  // MiniMax 모델
  // ============================================================
  {
    id: 'minimax-m2.1',
    name: 'MiniMax M2.1',
    provider: 'minimax',
    model: 'MiniMax-M2.1',
    description: 'Claude Code 대체용. Anthropic 호환 API, 고성능 코딩.',
    maxTokens: 16384,
    contextWindow: 1000000,  // 1M 토큰 컨텍스트
    inputPrice: 0.1,  // 추정치
    outputPrice: 0.4,  // 추정치
    baseUrl: 'https://api.minimax.io/anthropic',  // Anthropic 호환
    capabilities: {
      vision: false,
      functionCalling: true,
      streaming: true,
      json: true,
      reasoning: true,
    },
    releaseDate: '2025-01-01',
  },
];

// ============================================================
// 현재 모델
// ============================================================

let currentModelId = 'deepseek-v3.2';

export function getCurrentModel(): ModelInfo {
  return AVAILABLE_MODELS.find(m => m.id === currentModelId) || AVAILABLE_MODELS[0];
}

export function setCurrentModel(modelId: string): ModelInfo | null {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (model) {
    currentModelId = modelId;
    return model;
  }
  return null;
}

export function getAvailableModels(): ModelInfo[] {
  // 항상 모든 DeepSeek 모델 반환
  return AVAILABLE_MODELS;
}

export function hasApiKey(provider?: 'deepseek' | 'minimax'): boolean {
  if (provider === 'minimax') {
    return !!process.env.MINIMAX_API_KEY;
  }
  return !!process.env.DEEPSEEK_API_KEY;
}

export function getApiKey(provider?: 'deepseek' | 'minimax'): string | undefined {
  if (provider === 'minimax') {
    return process.env.MINIMAX_API_KEY;
  }
  return process.env.DEEPSEEK_API_KEY;
}

// ============================================================
// 모델 헬퍼 함수
// ============================================================

export function getReasoningModel(): ModelInfo {
  return AVAILABLE_MODELS.find(m => m.id === 'deepseek-r1')!;
}

export function getCoderModel(): ModelInfo {
  return AVAILABLE_MODELS.find(m => m.id === 'deepseek-coder')!;
}

export function getDefaultModel(): ModelInfo {
  return AVAILABLE_MODELS[0];
}

export function getModelById(id: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id);
}

// ============================================================
// 멀티세션 지원
// ============================================================

export interface ModelSession {
  id: string;
  modelId: string;
  model: ModelInfo;
  createdAt: Date;
}

const activeSessions: Map<string, ModelSession> = new Map();

export function createSession(modelId?: string): ModelSession {
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const model = modelId
    ? AVAILABLE_MODELS.find(m => m.id === modelId) || AVAILABLE_MODELS[0]
    : AVAILABLE_MODELS[0];

  const session: ModelSession = {
    id,
    modelId: model.id,
    model,
    createdAt: new Date(),
  };

  activeSessions.set(id, session);
  return session;
}

export function getSession(sessionId: string): ModelSession | undefined {
  return activeSessions.get(sessionId);
}

export function closeSession(sessionId: string): boolean {
  return activeSessions.delete(sessionId);
}

export function listSessions(): ModelSession[] {
  return Array.from(activeSessions.values());
}

export function clearAllSessions(): void {
  activeSessions.clear();
}

// ============================================================
// 병렬 실행 지원
// ============================================================

export interface ParallelTask {
  sessionId: string;
  prompt: string;
  modelId?: string;
}

export interface ParallelResult {
  sessionId: string;
  success: boolean;
  result: string;
  error?: string;
}

// 병렬 실행을 위한 세션 풀
export function createSessionPool(count: number, modelId?: string): ModelSession[] {
  const sessions: ModelSession[] = [];
  for (let i = 0; i < count; i++) {
    sessions.push(createSession(modelId));
  }
  return sessions;
}

export function closeSessionPool(sessions: ModelSession[]): void {
  for (const session of sessions) {
    closeSession(session.id);
  }
}
