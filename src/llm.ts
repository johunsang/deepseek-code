/**
 * open-onesaas - DeepSeek 전용 LLM 모듈
 */

import {
  type LLMConfig,
  type LLMResponse,
  type Message,
  type ToolCall,
  type ToolSchema,
  ToolChoice,
  Role,
} from './types';

// ============================================================
// LLM 클래스 (DeepSeek 전용)
// ============================================================

export class LLM {
  private config: LLMConfig;

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = {
      model: config.model || 'deepseek-chat',
      apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY || '',
      baseUrl: config.baseUrl || 'https://api.deepseek.com',
      maxTokens: config.maxTokens || 8192,
      temperature: config.temperature ?? 0.7,
      provider: 'deepseek',
    };
  }

  /**
   * 기본 텍스트 대화
   */
  async ask(
    messages: Message[],
    systemMessages?: Message[]
  ): Promise<LLMResponse> {
    const allMessages = this.prepareMessages(messages, systemMessages);
    return this.callDeepSeek(allMessages);
  }

  /**
   * 도구 호출 포함 대화
   */
  async askTool(
    messages: Message[],
    tools: ToolSchema[],
    toolChoice: ToolChoice = ToolChoice.AUTO,
    systemMessages?: Message[]
  ): Promise<LLMResponse> {
    const allMessages = this.prepareMessages(messages, systemMessages);
    return this.callDeepSeekWithTools(allMessages, tools, toolChoice);
  }

  // ============================================================
  // DeepSeek API 호출
  // ============================================================

  private async callDeepSeek(messages: Message[]): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: this.toOpenAIMessages(messages),
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      throw new Error(error.error?.message || `DeepSeek API Error: ${response.status}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string | null }; finish_reason: string }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      finishReason: choice.finish_reason,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  private async callDeepSeekWithTools(
    messages: Message[],
    tools: ToolSchema[],
    toolChoice: ToolChoice
  ): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: this.toOpenAIMessages(messages),
        tools: tools,
        tool_choice: toolChoice,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      throw new Error(error.error?.message || `DeepSeek API Error: ${response.status}`);
    }

    interface DeepSeekToolCall {
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string | null;
          tool_calls?: DeepSeekToolCall[];
        };
        finish_reason: string;
      }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    const choice = data.choices[0];
    const message = choice.message;

    const toolCalls: ToolCall[] | undefined = message.tool_calls?.map(
      (tc: DeepSeekToolCall) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })
    );

    return {
      content: message.content,
      toolCalls,
      finishReason: choice.finish_reason,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  // ============================================================
  // 메시지 변환
  // ============================================================

  private prepareMessages(
    messages: Message[],
    systemMessages?: Message[]
  ): Message[] {
    const allMessages: Message[] = [];

    if (systemMessages) {
      allMessages.push(...systemMessages);
    }

    allMessages.push(...messages);

    return allMessages;
  }

  private toOpenAIMessages(
    messages: Message[]
  ): Array<{
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }>;
    tool_call_id?: string;
    name?: string;
  }> {
    return messages.map(m => {
      const msg: {
        role: string;
        content: string | null;
        tool_calls?: Array<{
          id: string;
          type: string;
          function: { name: string; arguments: string };
        }>;
        tool_call_id?: string;
        name?: string;
      } = {
        role: m.role,
        content: m.content,
      };

      if (m.toolCalls) {
        msg.tool_calls = m.toolCalls;
      }
      if (m.toolCallId) {
        msg.tool_call_id = m.toolCallId;
      }
      if (m.name) {
        msg.name = m.name;
      }

      return msg;
    });
  }
}

// ============================================================
// 기본 인스턴스
// ============================================================

import { getCurrentModel, getApiKey, type ModelInfo } from './models';

let defaultLLM: LLM | null = null;

export function getDefaultLLM(): LLM {
  if (!defaultLLM) {
    const model = getCurrentModel();
    const apiKey = getApiKey();

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY가 필요합니다');
    }

    defaultLLM = new LLM({
      model: model.model,
      apiKey,
      maxTokens: model.maxTokens,
      baseUrl: model.baseUrl,
    });
  }
  return defaultLLM;
}

export function switchModel(modelId: string): ModelInfo | null {
  const { setCurrentModel } = require('./models');
  const model = setCurrentModel(modelId);
  if (model) {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('DEEPSEEK_API_KEY가 없습니다.');
      return null;
    }
    defaultLLM = new LLM({
      model: model.model,
      apiKey,
      maxTokens: model.maxTokens,
      baseUrl: model.baseUrl,
    });
    return model;
  }
  return null;
}

export { getAvailableModels, getCurrentModel } from './models';

export function createLLM(config: Partial<LLMConfig>): LLM {
  return new LLM(config);
}
