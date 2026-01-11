/**
 * OpenManus TypeScript - 도구 모음
 */

// 기본 클래스
export { BaseTool, ToolCollection } from './base';

// 파일 도구
export {
  ReadFileTool,
  WriteFileTool,
  EditFileTool,
  ListDirectoryTool,
  CreateDirectoryTool,
  DeleteFileTool,
  SearchFilesTool,
} from './file';

// Bash/실행 도구
export {
  BashTool,
  PythonExecuteTool,
  NodeExecuteTool,
  GitTool,
  NpmTool,
} from './bash';

// 웹 도구
export {
  WebSearchTool,
  WebFetchTool,
  HttpRequestTool,
} from './web';

// 종료/계획 도구
export {
  TerminateTool,
  PlanningTool,
  AskHumanTool,
  ThinkTool,
} from './terminate';

// ============================================================
// 기본 도구 세트
// ============================================================

import { ToolCollection } from './base';
import {
  ReadFileTool,
  WriteFileTool,
  EditFileTool,
  ListDirectoryTool,
  SearchFilesTool,
} from './file';
import {
  BashTool,
  GitTool,
  NpmTool,
} from './bash';
import {
  WebSearchTool,
  WebFetchTool,
} from './web';
import {
  TerminateTool,
  PlanningTool,
  ThinkTool,
} from './terminate';

/**
 * 기본 도구 세트 생성
 */
export function createDefaultTools(): ToolCollection {
  return new ToolCollection([
    // 파일 도구
    new ReadFileTool(),
    new WriteFileTool(),
    new EditFileTool(),
    new ListDirectoryTool(),
    new SearchFilesTool(),
    // 실행 도구
    new BashTool(),
    new GitTool(),
    new NpmTool(),
    // 웹 도구
    new WebSearchTool(),
    new WebFetchTool(),
    // 제어 도구
    new TerminateTool(),
    new PlanningTool(),
    new ThinkTool(),
  ]);
}

/**
 * 코딩 전용 도구 세트 (파일 + 실행만)
 */
export function createCodingTools(): ToolCollection {
  return new ToolCollection([
    new ReadFileTool(),
    new WriteFileTool(),
    new EditFileTool(),
    new ListDirectoryTool(),
    new SearchFilesTool(),
    new BashTool(),
    new GitTool(),
    new NpmTool(),
    new TerminateTool(),
    new ThinkTool(),
  ]);
}

/**
 * 읽기 전용 도구 세트
 */
export function createReadOnlyTools(): ToolCollection {
  return new ToolCollection([
    new ReadFileTool(),
    new ListDirectoryTool(),
    new SearchFilesTool(),
    new WebSearchTool(),
    new WebFetchTool(),
    new TerminateTool(),
    new ThinkTool(),
  ]);
}
