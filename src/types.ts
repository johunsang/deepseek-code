/**
 * OpenManus TypeScript - 타입 정의
 * Python OpenManus를 TypeScript로 변환
 */

// ============================================================
// 열거형 (Enums)
// ============================================================

export enum Role {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

export enum ToolChoice {
  NONE = 'none',
  AUTO = 'auto',
  REQUIRED = 'required',
}

export enum AgentState {
  IDLE = 'idle',
  RUNNING = 'running',
  FINISHED = 'finished',
  ERROR = 'error',
}

// ============================================================
// 기본 인터페이스
// ============================================================

export interface FunctionCall {
  name: string;
  arguments: string; // JSON string
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: FunctionCall;
}

export interface ToolResult {
  output?: string;
  error?: string;
  base64Image?: string;
  system?: string;
}

// ============================================================
// 메시지 타입
// ============================================================

export interface Message {
  role: Role;
  content: string | null;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  images?: string[]; // base64 images
}

export interface MessageCreateParams {
  role: Role;
  content: string | null;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  images?: string[];
}

// ============================================================
// 메모리 (대화 기록)
// ============================================================

export interface Memory {
  messages: Message[];
  maxMessages?: number;
}

// ============================================================
// 도구 스키마
// ============================================================

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  required?: boolean;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required?: string[];
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParameters;
  };
}

// ============================================================
// LLM 관련 타입
// ============================================================

export interface LLMConfig {
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: 'openai' | 'anthropic' | 'google' | 'deepseek';
}

export interface LLMResponse {
  content: string | null;
  toolCalls?: ToolCall[];
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================
// Agent 관련 타입
// ============================================================

export interface AgentConfig {
  name: string;
  description?: string;
  systemPrompt?: string;
  nextStepPrompt?: string;
  maxSteps?: number;
  maxObserve?: number;
  toolChoice?: ToolChoice;
}

export interface StepResult {
  success: boolean;
  message?: string;
  toolResults?: ToolResult[];
  shouldFinish?: boolean;
}

// ============================================================
// 태스크 관련 타입
// ============================================================

export interface TaskLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
}

export interface Task {
  id: string;
  prompt: string;
  projectPath?: string;
  mode: 'single' | 'mcp' | 'flow';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  logs: TaskLog[];
  result?: Record<string, unknown>;
  error?: string;
}

// ============================================================
// 헬퍼 함수
// ============================================================

export function createMessage(params: MessageCreateParams): Message {
  return {
    role: params.role,
    content: params.content,
    name: params.name,
    toolCalls: params.toolCalls,
    toolCallId: params.toolCallId,
    images: params.images,
  };
}

export function userMessage(content: string): Message {
  return createMessage({ role: Role.USER, content });
}

export function systemMessage(content: string): Message {
  return createMessage({ role: Role.SYSTEM, content });
}

export function assistantMessage(
  content: string | null,
  toolCalls?: ToolCall[]
): Message {
  return createMessage({ role: Role.ASSISTANT, content, toolCalls });
}

export function toolMessage(content: string, toolCallId: string): Message {
  return createMessage({ role: Role.TOOL, content, toolCallId });
}

// ============================================================
// 메모리 헬퍼
// ============================================================

export function createMemory(maxMessages?: number): Memory {
  return {
    messages: [],
    maxMessages,
  };
}

export function addToMemory(memory: Memory, message: Message): Memory {
  const messages = [...memory.messages, message];

  // 최대 메시지 수 제한
  if (memory.maxMessages && messages.length > memory.maxMessages) {
    // 시스템 메시지는 보존
    const systemMessages = messages.filter(m => m.role === Role.SYSTEM);
    const otherMessages = messages.filter(m => m.role !== Role.SYSTEM);
    const trimmed = otherMessages.slice(-memory.maxMessages + systemMessages.length);
    return {
      ...memory,
      messages: [...systemMessages, ...trimmed],
    };
  }

  return {
    ...memory,
    messages,
  };
}

export function getLastMessages(memory: Memory, count: number): Message[] {
  return memory.messages.slice(-count);
}

export function clearMemory(memory: Memory): Memory {
  return {
    ...memory,
    messages: [],
  };
}
