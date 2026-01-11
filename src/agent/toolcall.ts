/**
 * OpenManus TypeScript - ToolCall Agent
 * 도구를 사용하여 작업을 수행하는 에이전트
 */

import { BaseAgent } from './base';
import { LLM, createLLM } from '../llm';
import { ToolCollection, createDefaultTools } from '../tools';
import {
  type Message,
  type StepResult,
  type ToolCall,
  type ToolResult,
  type AgentConfig,
  type LLMConfig,
  ToolChoice,
  Role,
  assistantMessage,
  toolMessage,
} from '../types';

// ============================================================
// ToolCallAgent 설정
// ============================================================

export interface ToolCallAgentConfig extends AgentConfig {
  tools?: ToolCollection;
  toolChoice?: ToolChoice;
  maxObserve?: number; // 도구 결과 최대 길이
  llmConfig?: Partial<LLMConfig>;
}

// ============================================================
// ToolCallAgent 클래스
// ============================================================

// 토큰 사용량 타입
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class ToolCallAgent extends BaseAgent {
  protected tools: ToolCollection;
  protected toolChoice: ToolChoice;
  protected maxObserve: number;

  // 토큰 사용량 추적
  protected tokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // 마지막 응답 사용량
  protected lastUsage: TokenUsage | null = null;

  constructor(config: ToolCallAgentConfig = { name: 'ToolCallAgent' }) {
    super(config);

    this.tools = config.tools || createDefaultTools();
    this.toolChoice = config.toolChoice || ToolChoice.AUTO;
    this.maxObserve = config.maxObserve || 10000;

    // LLM 설정
    if (config.llmConfig) {
      this.llm = createLLM(config.llmConfig);
    }
  }

  /**
   * 총 토큰 사용량 반환
   */
  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  /**
   * 마지막 응답의 토큰 사용량 반환
   */
  getLastUsage(): TokenUsage | null {
    return this.lastUsage ? { ...this.lastUsage } : null;
  }

  /**
   * 토큰 사용량 초기화
   */
  resetTokenUsage(): void {
    this.tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    this.lastUsage = null;
  }

  // ============================================================
  // 단계 실행
  // ============================================================

  protected async step(): Promise<StepResult> {
    // 1. Think: LLM에게 다음 행동 결정 요청
    const thinkResult = await this.think();

    if (!thinkResult.toolCalls || thinkResult.toolCalls.length === 0) {
      // 도구 호출 없이 응답만 한 경우
      if (thinkResult.content) {
        this.updateMemory(assistantMessage(thinkResult.content));
      }
      return {
        success: true,
        message: thinkResult.content || undefined,
      };
    }

    // 어시스턴트 메시지 저장
    this.updateMemory(assistantMessage(thinkResult.content, thinkResult.toolCalls));

    // 2. Act: 도구 실행
    const actResult = await this.act(thinkResult.toolCalls);

    return actResult;
  }

  // ============================================================
  // Think: LLM에게 다음 행동 결정 요청
  // ============================================================

  protected async think(): Promise<{
    content: string | null;
    toolCalls?: ToolCall[];
  }> {
    this.log('info', '다음 행동 결정 중...');

    const messages = this.getMessages();
    const tools = this.tools.getSchemas();

    try {
      const response = await this.llm.askTool(
        messages,
        tools,
        this.toolChoice
      );

      // 토큰 사용량 추적
      if (response.usage) {
        this.lastUsage = {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
        };
        this.tokenUsage.promptTokens += response.usage.promptTokens;
        this.tokenUsage.completionTokens += response.usage.completionTokens;
        this.tokenUsage.totalTokens += response.usage.totalTokens;

        this.log('info', `토큰: ${response.usage.promptTokens} → ${response.usage.completionTokens} (총 ${response.usage.totalTokens})`);
      }

      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolNames = response.toolCalls.map(tc => tc.function.name).join(', ');
        this.log('info', `도구 호출: ${toolNames}`);
      }

      return {
        content: response.content,
        toolCalls: response.toolCalls,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `LLM 호출 실패: ${errorMessage}`);
      throw error;
    }
  }

  // ============================================================
  // Act: 도구 실행
  // ============================================================

  protected async act(toolCalls: ToolCall[]): Promise<StepResult> {
    const results: ToolResult[] = [];
    let shouldFinish = false;
    let finalMessage: string | undefined;

    for (const toolCall of toolCalls) {
      const { name, arguments: argsString } = toolCall.function;
      this.log('info', `도구 실행: ${name}`);

      try {
        // 인자 파싱
        const args = JSON.parse(argsString);

        // 도구 실행
        const result = await this.executeTool(name, args);
        results.push(result);

        // 결과를 메모리에 저장
        const resultString = this.formatToolResult(result);
        this.updateMemory(toolMessage(resultString, toolCall.id));

        // 특수 도구 처리
        if (result.system === 'TASK_COMPLETED' || result.system === 'TASK_FAILED') {
          shouldFinish = true;
          finalMessage = result.output;
        } else if (result.system === 'AWAITING_HUMAN_INPUT') {
          // 사용자 입력 대기 (실제로는 별도 처리 필요)
          this.log('info', `사용자 입력 대기: ${result.output}`);
        }

        this.log('info', `도구 결과: ${resultString.slice(0, 200)}${resultString.length > 200 ? '...' : ''}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.log('error', `도구 실행 실패: ${errorMessage}`);

        const errorResult: ToolResult = { error: errorMessage };
        results.push(errorResult);
        this.updateMemory(toolMessage(`오류: ${errorMessage}`, toolCall.id));
      }
    }

    return {
      success: !results.some(r => r.error),
      toolResults: results,
      shouldFinish,
      message: finalMessage,
    };
  }

  // ============================================================
  // 도구 실행
  // ============================================================

  protected async executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      return { error: `도구를 찾을 수 없습니다: ${name}` };
    }

    return tool.call(args);
  }

  // ============================================================
  // 결과 포맷팅
  // ============================================================

  protected formatToolResult(result: ToolResult): string {
    if (result.error) {
      return `오류: ${result.error}`;
    }

    let output = result.output || '';

    // 결과가 너무 길면 자름
    if (output.length > this.maxObserve) {
      output = output.slice(0, this.maxObserve) + '\n\n... (결과가 잘렸습니다)';
    }

    return output;
  }

  // ============================================================
  // 도구 관리
  // ============================================================

  addTool(tool: InstanceType<typeof import('../tools/base').BaseTool>): void {
    this.tools.add(tool);
  }

  getToolNames(): string[] {
    return this.tools.getNames();
  }

  // ============================================================
  // 시스템 프롬프트 오버라이드
  // ============================================================

  protected getDefaultSystemPrompt(): string {
    const toolList = this.tools.getNames().join(', ');

    return `당신은 ${this.name}입니다. 주어진 도구를 사용하여 사용자의 요청을 수행하는 AI 에이전트입니다.

사용 가능한 도구: ${toolList}

## 작업 규칙

1. **계획 먼저**: 복잡한 작업은 먼저 계획을 세우세요.
2. **한 번에 하나씩**: 각 단계에서 하나의 작업에 집중하세요.
3. **확인 후 수정**: 파일을 수정하기 전에 반드시 read_file로 내용을 확인하세요.
4. **결과 확인**: 명령어 실행 후 결과를 확인하세요.
5. **오류 처리**: 오류가 발생하면 다른 방법을 시도하세요.
6. **완료 보고**: 작업이 완료되면 terminate 도구를 호출하세요.

## 응답 형식

- 한국어로 응답하세요.
- 작업 진행 상황을 명확히 설명하세요.
- 코드나 명령어는 백틱으로 감싸세요.

지금부터 사용자의 요청을 처리하세요.`;
  }
}

// ============================================================
// Manus Agent (기본 코딩 에이전트)
// ============================================================

export class ManusAgent extends ToolCallAgent {
  constructor(projectPath?: string) {
    super({
      name: 'Manus',
      description: '코드 작성 및 프로젝트 관리를 수행하는 AI 에이전트',
      maxSteps: 30,
    });

    this.systemPrompt = this.getManusSystemPrompt(projectPath);
  }

  private getManusSystemPrompt(projectPath?: string): string {
    return `당신은 Manus, 전문 소프트웨어 개발자 AI입니다.

## 역할
- 코드 작성, 수정, 디버깅
- 프로젝트 구조 분석 및 개선
- 테스트 작성 및 실행
- Git 커밋 및 버전 관리

${projectPath ? `## 프로젝트 경로\n${projectPath}` : ''}

## 코딩 원칙

1. **코드 품질**
   - 깔끔하고 읽기 쉬운 코드 작성
   - 의미 있는 변수/함수명 사용
   - 필요한 경우 주석 추가

2. **안전성**
   - 파일 수정 전 반드시 백업 고려
   - 위험한 명령어 실행 전 확인
   - 에러 처리 포함

3. **효율성**
   - 불필요한 코드 중복 방지
   - 기존 코드 재사용
   - 점진적 수정

## 작업 흐름

1. 요청 분석 → 계획 수립
2. 관련 파일 탐색 및 읽기
3. 코드 작성/수정
4. 테스트 및 검증
5. 결과 보고

응답은 한국어로 해주세요.`;
  }
}
