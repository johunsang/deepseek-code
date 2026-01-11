/**
 * OpenManus TypeScript - Base Agent
 */

import { LLM, getDefaultLLM } from '../llm';
import {
  type Message,
  type Memory,
  type AgentConfig,
  type StepResult,
  type TaskLog,
  AgentState,
  Role,
  createMemory,
  addToMemory,
  systemMessage,
  userMessage,
} from '../types';

// ============================================================
// Base Agent 클래스
// ============================================================

export abstract class BaseAgent {
  // 설정
  name: string;
  description: string;
  nextStepPrompt: string;
  maxSteps: number;

  // 상태
  protected _state: AgentState = AgentState.IDLE;
  protected currentStep: number = 0;
  protected memory: Memory;
  protected llm: LLM;

  // 로그
  protected logs: TaskLog[] = [];
  protected onLog?: (log: TaskLog) => void;

  constructor(config: AgentConfig = { name: 'Agent' }) {
    this.name = config.name;
    this.description = config.description || '';
    this.nextStepPrompt = config.nextStepPrompt || '';
    this.maxSteps = config.maxSteps || 20;

    this.memory = createMemory(100); // 최대 100개 메시지
    this.llm = getDefaultLLM();

    // systemPrompt는 서브클래스 초기화 후 설정 (lazy init)
    this._systemPrompt = config.systemPrompt;
  }

  private _systemPrompt?: string;

  get systemPrompt(): string {
    if (!this._systemPrompt) {
      this._systemPrompt = this.getDefaultSystemPrompt();
    }
    return this._systemPrompt;
  }

  set systemPrompt(value: string) {
    this._systemPrompt = value;
  }

  // ============================================================
  // 상태 관리
  // ============================================================

  get state(): AgentState {
    return this._state;
  }

  protected setState(state: AgentState): void {
    const prevState = this._state;
    this._state = state;
    this.log('info', `상태 변경: ${prevState} → ${state}`);
  }

  isRunning(): boolean {
    return this._state === AgentState.RUNNING;
  }

  isFinished(): boolean {
    return this._state === AgentState.FINISHED;
  }

  // ============================================================
  // 메모리 관리
  // ============================================================

  protected updateMemory(message: Message): void {
    this.memory = addToMemory(this.memory, message);
  }

  protected getMessages(): Message[] {
    return this.memory.messages;
  }

  clearMemory(): void {
    this.memory = createMemory(100);
    this.currentStep = 0;
    this._state = AgentState.IDLE;
    this.logs = [];
  }

  // ============================================================
  // 로그
  // ============================================================

  protected log(level: TaskLog['level'], message: string): void {
    const log: TaskLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    this.logs.push(log);

    if (this.onLog) {
      this.onLog(log);
    }
  }

  getLogs(): TaskLog[] {
    return this.logs;
  }

  setLogHandler(handler: (log: TaskLog) => void): void {
    this.onLog = handler;
  }

  // ============================================================
  // 무한 루프 감지
  // ============================================================

  protected isStuck(): boolean {
    const messages = this.getMessages();
    if (messages.length < 4) return false;

    // 최근 메시지들 확인
    const recent = messages.slice(-4);
    const assistantMessages = recent.filter(m => m.role === Role.ASSISTANT);

    if (assistantMessages.length < 2) return false;

    // 같은 내용 반복 체크
    const contents = assistantMessages.map(m => m.content);
    return new Set(contents).size < contents.length;
  }

  protected handleStuck(): void {
    this.log('warning', '동일한 응답이 반복되고 있습니다. 전략을 변경합니다.');
    this.updateMemory(
      systemMessage(
        '주의: 동일한 응답이 반복되고 있습니다. 다른 접근 방식을 시도하거나, 작업을 완료할 수 없다면 terminate 도구를 사용하세요.'
      )
    );
  }

  // ============================================================
  // 실행 (서브클래스에서 구현)
  // ============================================================

  protected abstract step(): Promise<StepResult>;

  /**
   * 메인 실행 루프
   */
  async run(request: string): Promise<string> {
    // 상태 초기화
    if (this._state !== AgentState.IDLE) {
      throw new Error(`Agent is already ${this._state}`);
    }

    this.setState(AgentState.RUNNING);
    this.log('info', `작업 시작: ${request.slice(0, 100)}...`);

    try {
      // 시스템 프롬프트 추가
      this.updateMemory(systemMessage(this.systemPrompt));

      // 사용자 요청 추가
      this.updateMemory(userMessage(request));

      // 메인 루프
      while (this.currentStep < this.maxSteps && this.isRunning()) {
        this.currentStep++;
        this.log('info', `Step ${this.currentStep}/${this.maxSteps}`);

        // 무한 루프 체크
        if (this.isStuck()) {
          this.handleStuck();
        }

        // 단계 실행
        const result = await this.step();

        if (result.shouldFinish) {
          this.setState(AgentState.FINISHED);
          this.log('info', '작업 완료');
          return result.message || '작업이 완료되었습니다.';
        }
      }

      // 최대 스텝 도달
      if (this.currentStep >= this.maxSteps) {
        this.setState(AgentState.FINISHED);
        this.log('warning', '최대 스텝에 도달했습니다.');
        return '최대 실행 횟수에 도달했습니다. 작업이 완료되지 않았을 수 있습니다.';
      }

      return '작업이 완료되었습니다.';
    } catch (error) {
      this.setState(AgentState.ERROR);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `오류 발생: ${errorMessage}`);
      throw error;
    }
  }

  // ============================================================
  // 기본 시스템 프롬프트
  // ============================================================

  protected getDefaultSystemPrompt(): string {
    return `당신은 ${this.name}입니다. 사용자의 요청을 수행하는 AI 에이전트입니다.

주어진 도구를 사용하여 작업을 완료하세요.
각 단계에서 현재 상황을 분석하고, 다음에 수행할 작업을 결정하세요.

규칙:
1. 한 번에 하나의 작업에 집중하세요.
2. 파일을 수정하기 전에 반드시 먼저 읽어보세요.
3. 명령어 실행 결과를 확인하세요.
4. 작업이 완료되면 terminate 도구를 호출하세요.
5. 오류가 발생하면 다른 방법을 시도하세요.

응답은 한국어로 해주세요.`;
  }
}
