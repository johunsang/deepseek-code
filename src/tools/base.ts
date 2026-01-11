/**
 * OpenManus TypeScript - Tool 기본 클래스
 */

import { type ToolResult, type ToolSchema, type ToolParameters } from '../types';

// ============================================================
// 기본 Tool 클래스
// ============================================================

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract parameters: ToolParameters;

  /**
   * 도구 실행 (서브클래스에서 구현)
   */
  abstract execute(args: Record<string, unknown>): Promise<ToolResult>;

  /**
   * 도구 호출
   */
  async call(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      return await this.execute(args);
    } catch (error) {
      return this.failResponse(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * OpenAI 함수 형식으로 변환
   */
  toSchema(): ToolSchema {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters,
      },
    };
  }

  /**
   * 성공 응답 생성
   */
  protected successResponse(output: string, base64Image?: string): ToolResult {
    return {
      output,
      base64Image,
    };
  }

  /**
   * 실패 응답 생성
   */
  protected failResponse(error: string): ToolResult {
    return {
      error,
    };
  }
}

// ============================================================
// Tool Collection
// ============================================================

export class ToolCollection {
  private tools: Map<string, BaseTool> = new Map();

  constructor(tools: BaseTool[] = []) {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * 도구 추가
   */
  add(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 도구 가져오기
   */
  get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * 도구 실행
   */
  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { error: `Tool not found: ${name}` };
    }
    return tool.call(args);
  }

  /**
   * 모든 도구 스키마 가져오기
   */
  getSchemas(): ToolSchema[] {
    return Array.from(this.tools.values()).map(t => t.toSchema());
  }

  /**
   * 도구 이름 목록
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 도구 개수
   */
  get size(): number {
    return this.tools.size;
  }
}
