/**
 * open-onesaas
 * AI 에이전트 프레임워크 - 코드 생성, 파일 조작, 웹 검색 등 다양한 도구를 갖춘 LLM 에이전트
 *
 * 원본 참고: https://github.com/FoundationAgents/OpenManus
 */

// 타입
export * from './types';

// LLM
export { LLM, getDefaultLLM, createLLM, switchModel, getAvailableModels, getCurrentModel } from './llm';

// 모델 정보
export { AVAILABLE_MODELS, type ModelInfo } from './models';

// 도구
export {
  BaseTool,
  ToolCollection,
  createDefaultTools,
  createCodingTools,
  createReadOnlyTools,
  // 개별 도구
  ReadFileTool,
  WriteFileTool,
  EditFileTool,
  ListDirectoryTool,
  CreateDirectoryTool,
  DeleteFileTool,
  SearchFilesTool,
  BashTool,
  PythonExecuteTool,
  NodeExecuteTool,
  GitTool,
  NpmTool,
  WebSearchTool,
  WebFetchTool,
  HttpRequestTool,
  TerminateTool,
  PlanningTool,
  AskHumanTool,
  ThinkTool,
} from './tools';

// 에이전트
export {
  BaseAgent,
  ToolCallAgent,
  ManusAgent,
  CodingAgent,
  runCodingTask,
  runCodingTaskWithModel,
  runCodingTaskWithMultipleModels,
  type CodingAgentConfig,
  type TokenUsage,
} from './agent';

// 모델 관리 (DeepSeek 전용)
export {
  getReasoningModel,
  getCoderModel,
  getDefaultModel,
  getModelById,
  createSession,
  getSession,
  closeSession,
  listSessions,
  clearAllSessions,
  createSessionPool,
  closeSessionPool,
  type ModelSession,
  type ParallelTask,
  type ParallelResult,
} from './models';

// 예제 모듈
export { getHelloWorld, printHelloWorld } from './hello-world';

// 수학 함수
export {
  fibonacci,
  fibonacciRecursive,
  fibonacciIterative,
  fibonacciMemoized,
} from './fibonacci';

// ============================================================
// 편의 함수
// ============================================================

import { ManusAgent } from './agent';
import type { TaskLog } from './types';

/**
 * 간단한 에이전트 실행
 */
export async function runAgent(
  prompt: string,
  options: {
    projectPath?: string;
    onLog?: (log: TaskLog) => void;
    maxSteps?: number;
  } = {}
): Promise<{
  success: boolean;
  result: string;
  logs: TaskLog[];
}> {
  const agent = new ManusAgent(options.projectPath);

  if (options.maxSteps) {
    agent.maxSteps = options.maxSteps;
  }

  if (options.onLog) {
    agent.setLogHandler(options.onLog);
  }

  try {
    const result = await agent.run(prompt);
    return {
      success: true,
      result,
      logs: agent.getLogs(),
    };
  } catch (error) {
    return {
      success: false,
      result: error instanceof Error ? error.message : 'Unknown error',
      logs: agent.getLogs(),
    };
  }
}

/**
 * 스트리밍 에이전트 실행 (Generator)
 */
export async function* runAgentStream(
  prompt: string,
  options: {
    projectPath?: string;
    maxSteps?: number;
  } = {}
): AsyncGenerator<TaskLog, string, unknown> {
  const agent = new ManusAgent(options.projectPath);

  if (options.maxSteps) {
    agent.maxSteps = options.maxSteps;
  }

  const logs: TaskLog[] = [];

  agent.setLogHandler((log) => {
    logs.push(log);
  });

  // 에이전트 실행을 백그라운드에서 시작
  const runPromise = agent.run(prompt);

  // 로그를 yield
  let lastYieldedIndex = 0;
  const checkInterval = 100; // 100ms

  while (agent.isRunning() || lastYieldedIndex < logs.length) {
    // 새 로그가 있으면 yield
    while (lastYieldedIndex < logs.length) {
      yield logs[lastYieldedIndex];
      lastYieldedIndex++;
    }

    // 잠시 대기
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  // 최종 결과 반환
  const result = await runPromise;
  return result;
}
