/**
 * open-onesaas - 코딩 전문 에이전트
 * 프로그램 개발에 최적화된 AI 에이전트
 */

import { ToolCallAgent, type ToolCallAgentConfig } from './toolcall';
import { LLM, getDefaultLLM } from '../llm';
import { ToolCollection } from '../tools/base';
import {
  ReadFileTool, WriteFileTool, EditFileTool,
  ListDirectoryTool, CreateDirectoryTool,
  SearchFilesTool, DeleteFileTool
} from '../tools/file';
import { BashTool, GitTool, NpmTool, NodeExecuteTool, PythonExecuteTool } from '../tools/bash';
import { TerminateTool, ThinkTool, PlanningTool } from '../tools/terminate';
import {
  AVAILABLE_MODELS, setCurrentModel, getCurrentModel,
  getAvailableModels, getApiKey, type ModelInfo
} from '../models';

// ============================================================
// 코딩 에이전트 설정
// ============================================================

export interface CodingAgentConfig extends Partial<ToolCallAgentConfig> {
  /** 프로젝트 경로 */
  projectPath?: string;
  /** 사용할 모델 ID */
  modelId?: string;
  /** 프로그래밍 언어 */
  language?: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java' | 'auto';
  /** 코딩 스타일 */
  style?: 'minimal' | 'verbose' | 'documented';
  /** 테스트 생성 여부 */
  generateTests?: boolean;
  /** 타입 체크 여부 */
  typeCheck?: boolean;
  /** Git 커밋 자동화 */
  autoCommit?: boolean;
}

// ============================================================
// 코딩 전문 에이전트
// ============================================================

export class CodingAgent extends ToolCallAgent {
  private projectPath: string;
  private language: string;
  private style: string;
  private generateTests: boolean;
  private typeCheck: boolean;
  private autoCommit: boolean;
  private selectedModel: ModelInfo;

  constructor(config: CodingAgentConfig = {}) {
    // 코딩 전용 도구 세트 생성
    const tools = createCodingToolset();

    super({
      name: config.name || 'CodingAgent',
      description: config.description || '프로그램 개발 전문 AI 에이전트',
      tools,
      maxSteps: config.maxSteps || 100,
      toolChoice: config.toolChoice,
    });

    this.projectPath = config.projectPath || process.cwd();
    this.language = config.language || 'auto';
    this.style = config.style || 'minimal';
    this.generateTests = config.generateTests ?? false;
    this.typeCheck = config.typeCheck ?? true;
    this.autoCommit = config.autoCommit ?? false;

    // 모델 선택
    if (config.modelId) {
      this.selectModel(config.modelId);
    }
    this.selectedModel = getCurrentModel();

    // 시스템 프롬프트 설정
    this.systemPrompt = this.getCodingSystemPrompt();
  }

  /**
   * 모델 선택
   */
  selectModel(modelId: string): boolean {
    const model = setCurrentModel(modelId);
    if (model) {
      this.selectedModel = model;
      // LLM 재생성 (DeepSeek 전용)
      const apiKey = getApiKey();
      if (apiKey) {
        this.llm = new LLM({
          model: model.model,
          apiKey,
          maxTokens: model.maxTokens,
          baseUrl: model.baseUrl,
        });
        this.log('info', `모델 변경: ${model.name}`);
        return true;
      }
    }
    return false;
  }

  /**
   * 현재 선택된 모델 정보
   */
  getSelectedModel(): ModelInfo {
    return this.selectedModel;
  }

  /**
   * 사용 가능한 모델 목록
   */
  static getAvailableModels(): ModelInfo[] {
    return getAvailableModels();
  }

  /**
   * 모든 모델 목록 (API 키 유무 관계없이)
   */
  static getAllModels(): ModelInfo[] {
    return AVAILABLE_MODELS;
  }

  /**
   * 코딩에 추천되는 모델 목록 (DeepSeek 전용)
   */
  static getRecommendedModelsForCoding(): ModelInfo[] {
    // DeepSeek Coder가 코딩에 최적화
    return AVAILABLE_MODELS.filter(m =>
      m.id === 'deepseek-coder' || m.id === 'deepseek-v3.2'
    );
  }

  /**
   * 코딩 전용 시스템 프롬프트
   */
  private getCodingSystemPrompt(): string {
    const languageHint = this.language !== 'auto'
      ? `주로 ${this.language}를 사용합니다.`
      : '프로젝트에 맞는 언어를 자동 감지합니다.';

    const styleHint = {
      minimal: '최소한의 코드로 핵심 기능만 구현합니다.',
      verbose: '명확한 변수명과 상세한 로직을 작성합니다.',
      documented: '주석과 문서화를 포함한 코드를 작성합니다.',
    }[this.style];

    return `당신은 숙련된 소프트웨어 개발자 AI 에이전트입니다.

## 프로젝트 정보
- 작업 디렉토리: ${this.projectPath}
- ${languageHint}
- 코딩 스타일: ${styleHint}
${this.generateTests ? '- 테스트 코드를 함께 생성합니다.' : ''}
${this.typeCheck ? '- 타입 안전성을 중요시합니다.' : ''}

## 🚨🚨🚨 필수 작업 순서 (절대 건너뛰지 마세요!)

### 1단계: 철저한 프로젝트 분석 (최소 3-5번 탐색!)
**코드 수정 전에 반드시 아래를 모두 실행하세요:**

1. list_directory "." → 루트 구조 파악
2. list_directory "src" 또는 주요 폴더 → 소스 구조 파악
3. search_files로 키워드 검색 (여러 키워드로!)
4. 관련 파일 모두 read_file로 읽기

**예시) "부동산 랜딩 페이지 디자인 수정" 요청:**
1. list_directory "." → 전체 구조
2. list_directory "src" → 소스 폴더 확인
3. search_files "landing" → 랜딩 관련 파일
4. search_files "부동산" → 키워드로 검색
5. search_files "page" → 페이지 파일들
6. search_files ".css" 또는 "style" → 스타일 파일
7. 찾은 파일들 전부 read_file로 내용 확인
8. **모든 관련 파일을 파악한 후에** 수정 시작

### 2단계: 의도 분석
- "이쁜 디자인" → CSS/스타일 파일 찾기
- "버그 수정" → 에러 메시지의 키워드로 검색
- "기능 추가" → 비슷한 기능 파일 먼저 찾기

### 3단계: 코드 수정 (탐색 완료 후에만!)
- 탐색에서 찾은 정확한 파일만 수정
- read_file로 전체 내용 파악 후 edit_file로 정확히 수정

## 파일 수정 규칙
**기존 파일은 반드시 edit_file로 수정!**

- 기존 파일 수정: edit_file 사용 (write_file로 덮어쓰기 금지!)
- 새 파일 생성: write_file 사용

## 도구 사용 (순서대로!)
1. list_directory → 구조 파악 (필수!)
2. search_files → 파일 찾기 (필수!)
3. read_file → 내용 **전체** 확인 (필수!)
4. edit_file → 필요한 부분만 정확히 수정
5. terminate → 완료 보고

## 금지 사항
- 기존 파일을 write_file로 덮어쓰기 ❌ (내용 손실 위험!)
- 탐색 없이 바로 수정 ❌
- 파일 경로 추측 ❌
- read_file 안 하고 edit_file 사용 ❌

완료되면 terminate로 결과를 보고하세요.`;
  }

  protected getDefaultSystemPrompt(): string {
    return this.getCodingSystemPrompt();
  }
}

// ============================================================
// 코딩 도구 세트
// ============================================================

function createCodingToolset(): ToolCollection {
  return new ToolCollection([
    // 파일 도구
    new ReadFileTool(),
    new WriteFileTool(),
    new EditFileTool(),
    new ListDirectoryTool(),
    new CreateDirectoryTool(),
    new SearchFilesTool(),
    new DeleteFileTool(),
    // 실행 도구
    new BashTool(),
    new GitTool(),
    new NpmTool(),
    new NodeExecuteTool(),
    new PythonExecuteTool(),
    // 제어 도구
    new TerminateTool(),
    new ThinkTool(),
    new PlanningTool(),
  ]);
}

// ============================================================
// 편의 함수
// ============================================================

/**
 * 코딩 에이전트로 작업 실행
 */
// 토큰 사용량 타입
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export async function runCodingTask(
  prompt: string,
  options: CodingAgentConfig & {
    onLog?: (log: { timestamp: string; level: string; message: string }) => void;
  } = {}
): Promise<{
  success: boolean;
  result: string;
  model: ModelInfo;
  logs: Array<{ timestamp: string; level: string; message: string }>;
  usage: TokenUsage;
}> {
  const agent = new CodingAgent(options);

  if (options.onLog) {
    agent.setLogHandler(options.onLog);
  }

  try {
    const result = await agent.run(prompt);
    return {
      success: true,
      result,
      model: agent.getSelectedModel(),
      logs: agent.getLogs(),
      usage: agent.getTokenUsage(),
    };
  } catch (error) {
    return {
      success: false,
      result: error instanceof Error ? error.message : 'Unknown error',
      model: agent.getSelectedModel(),
      logs: agent.getLogs(),
      usage: agent.getTokenUsage(),
    };
  }
}

/**
 * 특정 모델로 코딩 작업 실행
 */
export async function runCodingTaskWithModel(
  prompt: string,
  modelId: string,
  options: Omit<CodingAgentConfig, 'modelId'> = {}
): Promise<{
  success: boolean;
  result: string;
  model: ModelInfo;
}> {
  return runCodingTask(prompt, { ...options, modelId });
}

/**
 * 여러 모델로 동시에 코딩 작업 실행 (비교용)
 */
export async function runCodingTaskWithMultipleModels(
  prompt: string,
  modelIds: string[],
  options: Omit<CodingAgentConfig, 'modelId'> = {}
): Promise<Array<{
  modelId: string;
  success: boolean;
  result: string;
  model: ModelInfo;
}>> {
  const results = await Promise.allSettled(
    modelIds.map(modelId => runCodingTask(prompt, { ...options, modelId }))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        modelId: modelIds[index],
        ...result.value,
      };
    } else {
      return {
        modelId: modelIds[index],
        success: false,
        result: result.reason?.message || 'Unknown error',
        model: AVAILABLE_MODELS.find(m => m.id === modelIds[index]) || AVAILABLE_MODELS[0],
      };
    }
  });
}
