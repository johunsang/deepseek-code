/**
 * 딥시크 코드 - DeepSeek V3.2 전용
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// API 키 저장 경로 (~/.deepseek-code/config)
const CONFIG_DIR = path.join(os.homedir(), '.deepseek-code');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config');

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'deepseek';
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

// DeepSeek V3.2 고정
export const DEEPSEEK_MODEL: ModelInfo = {
  id: 'deepseek-v3.2',
  name: 'DeepSeek V3.2',
  provider: 'deepseek',
  model: 'deepseek-chat',
  description: 'GPT-5급 성능의 최신 모델. 685B 파라미터.',
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
};

export const AVAILABLE_MODELS: ModelInfo[] = [DEEPSEEK_MODEL];

// ============================================================
// 모델 함수 (V3.2 고정)
// ============================================================

export function getCurrentModel(): ModelInfo {
  return DEEPSEEK_MODEL;
}

export function setCurrentModel(_modelId: string): ModelInfo {
  return DEEPSEEK_MODEL; // 항상 V3.2 반환
}

export function getAvailableModels(): ModelInfo[] {
  return [DEEPSEEK_MODEL];
}

// API 키 로드 (환경변수 → 로컬 파일)
export function getApiKey(): string | undefined {
  // 1. 환경변수 우선
  if (process.env.DEEPSEEK_API_KEY) {
    return process.env.DEEPSEEK_API_KEY;
  }

  // 2. 로컬 설정 파일에서 로드
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      return config.apiKey;
    }
  } catch {
    // 파일 읽기 실패 시 무시
  }

  return undefined;
}

// API 키 저장
export function saveApiKey(apiKey: string): boolean {
  try {
    // 디렉토리 생성
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }

    // 설정 파일 저장
    const config = { apiKey };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

// API 키 삭제
export function deleteApiKey(): boolean {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
    return true;
  } catch {
    return false;
  }
}

export function getDefaultModel(): ModelInfo {
  return DEEPSEEK_MODEL;
}
