/**
 * OpenManus TypeScript - 종료 및 계획 도구
 */

import { BaseTool } from './base';
import { type ToolResult, type ToolParameters } from '../types';

// ============================================================
// 종료 도구
// ============================================================

export class TerminateTool extends BaseTool {
  name = 'terminate';
  description = '작업을 완료하고 최종 결과를 반환합니다. 모든 작업이 끝났을 때 호출하세요.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      result: {
        type: 'string',
        description: '작업 완료 결과 또는 최종 메시지',
      },
      success: {
        type: 'boolean',
        description: '작업 성공 여부',
      },
    },
    required: ['result'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const result = args.result as string;
    const success = args.success !== false;

    return {
      output: result,
      system: success ? 'TASK_COMPLETED' : 'TASK_FAILED',
    };
  }
}

// ============================================================
// 계획 도구
// ============================================================

export class PlanningTool extends BaseTool {
  name = 'planning';
  description = '복잡한 작업을 단계별로 계획합니다. 작업 시작 전에 전체 계획을 세울 때 사용하세요.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      goal: {
        type: 'string',
        description: '달성하려는 최종 목표',
      },
      steps: {
        type: 'string',
        description: '단계별 계획 (각 단계를 줄바꿈으로 구분)',
      },
      currentStep: {
        type: 'number',
        description: '현재 진행 중인 단계 번호',
      },
    },
    required: ['goal', 'steps'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const goal = args.goal as string;
    const steps = args.steps as string;
    const currentStep = args.currentStep as number | undefined;

    const stepLines = steps.split('\n').filter(s => s.trim());
    const formattedSteps = stepLines.map((step, i) => {
      const prefix = currentStep !== undefined && i + 1 === currentStep ? '→' : ' ';
      return `${prefix} ${i + 1}. ${step.trim()}`;
    }).join('\n');

    return this.successResponse(
      `📋 계획\n\n목표: ${goal}\n\n단계:\n${formattedSteps}`
    );
  }
}

// ============================================================
// 사용자 질문 도구
// ============================================================

export class AskHumanTool extends BaseTool {
  name = 'ask_human';
  description = '사용자에게 추가 정보나 확인이 필요할 때 질문합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: '사용자에게 할 질문',
      },
    },
    required: ['question'],
  };

  // 실제로는 사용자 입력을 기다려야 하므로 특별 처리 필요
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const question = args.question as string;

    return {
      output: question,
      system: 'AWAITING_HUMAN_INPUT',
    };
  }
}

// ============================================================
// 생각 도구 (Chain of Thought)
// ============================================================

export class ThinkTool extends BaseTool {
  name = 'think';
  description = '복잡한 문제를 분석하고 생각을 정리합니다. 결정을 내리기 전에 사용하세요.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      thought: {
        type: 'string',
        description: '분석하고 있는 내용이나 생각',
      },
    },
    required: ['thought'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const thought = args.thought as string;
    return this.successResponse(`💭 ${thought}`);
  }
}
