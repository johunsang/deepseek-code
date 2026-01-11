/**
 * OpenManus TypeScript - 파일 도구
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { BaseTool } from './base';
import { type ToolResult, type ToolParameters } from '../types';

// ============================================================
// 공용 백업 함수 (마지막 백업만 유지)
// ============================================================

async function createBackup(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      return null;
    }

    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const backupDir = path.join(dir, '.backup');

    await fs.mkdir(backupDir, { recursive: true });

    // 백업 파일명: 원본명.bak (마지막 백업만 유지)
    const backupPath = path.join(backupDir, `${fileName}.bak`);

    // 파일 복사
    const content = await fs.readFile(filePath);
    await fs.writeFile(backupPath, content);

    return backupPath;
  } catch {
    return null;
  }
}

// ============================================================
// 파일 읽기 도구
// ============================================================

export class ReadFileTool extends BaseTool {
  name = 'read_file';
  description = '파일 내용을 읽습니다. 경로와 선택적으로 시작/끝 줄 번호를 지정할 수 있습니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '읽을 파일의 경로',
      },
      startLine: {
        type: 'number',
        description: '시작 줄 번호 (1부터 시작, 선택)',
      },
      endLine: {
        type: 'number',
        description: '끝 줄 번호 (선택)',
      },
    },
    required: ['path'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const filePath = args.path as string;
    const startLine = args.startLine as number | undefined;
    const endLine = args.endLine as number | undefined;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      if (startLine !== undefined || endLine !== undefined) {
        const start = (startLine || 1) - 1;
        const end = endLine || lines.length;
        const selectedLines = lines.slice(start, end);
        return this.successResponse(selectedLines.join('\n'));
      }

      return this.successResponse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.failResponse(`파일을 찾을 수 없습니다: ${filePath}`);
      }
      throw error;
    }
  }
}

// ============================================================
// 파일 쓰기 도구
// ============================================================

export class WriteFileTool extends BaseTool {
  name = 'write_file';
  description = '파일에 내용을 씁니다. 파일이 없으면 생성합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '쓸 파일의 경로',
      },
      content: {
        type: 'string',
        description: '파일에 쓸 내용',
      },
    },
    required: ['path', 'content'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const filePath = args.path as string;
    const content = args.content as string;

    try {
      // 디렉토리가 없으면 생성
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(filePath, content, 'utf-8');
      return this.successResponse(`파일이 성공적으로 작성되었습니다: ${filePath}`);
    } catch (error) {
      throw error;
    }
  }
}

// ============================================================
// 파일 편집 도구 (str_replace 방식, 자동 백업)
// ============================================================

export class EditFileTool extends BaseTool {
  name = 'edit_file';
  description = '파일의 특정 부분을 찾아서 교체합니다. 수정 전 자동으로 백업을 생성합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '편집할 파일의 경로',
      },
      oldString: {
        type: 'string',
        description: '찾을 문자열 (정확히 일치해야 함)',
      },
      newString: {
        type: 'string',
        description: '교체할 문자열',
      },
    },
    required: ['path', 'oldString', 'newString'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const filePath = args.path as string;
    const oldString = args.oldString as string;
    const newString = args.newString as string;

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      if (!content.includes(oldString)) {
        return this.failResponse(
          `지정한 문자열을 찾을 수 없습니다. 파일 내용을 확인하세요.`
        );
      }

      // 중복 매칭 확인
      const matches = content.split(oldString).length - 1;
      if (matches > 1) {
        return this.failResponse(
          `${matches}개의 일치 항목이 있습니다. 더 구체적인 문자열을 지정하세요.`
        );
      }

      // 수정 전 백업 생성
      await createBackup(filePath);

      const newContent = content.replace(oldString, newString);
      await fs.writeFile(filePath, newContent, 'utf-8');

      return this.successResponse(`파일이 성공적으로 편집되었습니다: ${filePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.failResponse(`파일을 찾을 수 없습니다: ${filePath}`);
      }
      throw error;
    }
  }
}

// ============================================================
// 디렉토리 목록 도구
// ============================================================

export class ListDirectoryTool extends BaseTool {
  name = 'list_directory';
  description = '디렉토리의 파일과 폴더 목록을 가져옵니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '목록을 볼 디렉토리 경로',
      },
      recursive: {
        type: 'boolean',
        description: '하위 디렉토리도 포함할지 여부',
      },
    },
    required: ['path'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const dirPath = args.path as string;
    const recursive = args.recursive as boolean | undefined;

    try {
      if (recursive) {
        const items = await this.listRecursive(dirPath, '');
        return this.successResponse(items.join('\n'));
      }

      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const list = items.map(item => {
        const prefix = item.isDirectory() ? '[DIR]' : '[FILE]';
        return `${prefix} ${item.name}`;
      });

      return this.successResponse(list.join('\n'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.failResponse(`디렉토리를 찾을 수 없습니다: ${dirPath}`);
      }
      throw error;
    }
  }

  private async listRecursive(basePath: string, relativePath: string): Promise<string[]> {
    const fullPath = path.join(basePath, relativePath);
    const items = await fs.readdir(fullPath, { withFileTypes: true });
    const results: string[] = [];

    for (const item of items) {
      const itemRelativePath = path.join(relativePath, item.name);
      if (item.isDirectory()) {
        results.push(`[DIR] ${itemRelativePath}`);
        const subItems = await this.listRecursive(basePath, itemRelativePath);
        results.push(...subItems);
      } else {
        results.push(`[FILE] ${itemRelativePath}`);
      }
    }

    return results;
  }
}

// ============================================================
// 파일/디렉토리 생성 도구
// ============================================================

export class CreateDirectoryTool extends BaseTool {
  name = 'create_directory';
  description = '새 디렉토리를 생성합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '생성할 디렉토리 경로',
      },
    },
    required: ['path'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const dirPath = args.path as string;

    try {
      await fs.mkdir(dirPath, { recursive: true });
      return this.successResponse(`디렉토리가 생성되었습니다: ${dirPath}`);
    } catch (error) {
      throw error;
    }
  }
}

// ============================================================
// 파일 삭제 도구 (자동 백업 포함)
// ============================================================

export class DeleteFileTool extends BaseTool {
  name = 'delete_file';
  description = '파일 또는 빈 디렉토리를 삭제합니다. 삭제 전 자동으로 백업을 생성합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '삭제할 파일/디렉토리 경로',
      },
    },
    required: ['path'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const targetPath = args.path as string;

    try {
      const stat = await fs.stat(targetPath);

      if (stat.isDirectory()) {
        await fs.rmdir(targetPath);
        return this.successResponse(`디렉토리가 삭제되었습니다: ${targetPath}`);
      } else {
        // 파일 삭제 전 백업 생성
        await createBackup(targetPath);
        await fs.unlink(targetPath);
        return this.successResponse(`삭제되었습니다: ${targetPath}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.failResponse(`파일/디렉토리를 찾을 수 없습니다: ${targetPath}`);
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOTEMPTY') {
        return this.failResponse(`디렉토리가 비어있지 않습니다: ${targetPath}`);
      }
      throw error;
    }
  }
}

// ============================================================
// 파일 검색 도구
// ============================================================

export class SearchFilesTool extends BaseTool {
  name = 'search_files';
  description = '파일 내용에서 텍스트를 검색합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '검색할 디렉토리 경로',
      },
      pattern: {
        type: 'string',
        description: '검색할 텍스트 또는 정규식 패턴',
      },
      filePattern: {
        type: 'string',
        description: '파일 이름 패턴 (예: *.ts)',
      },
    },
    required: ['path', 'pattern'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const searchPath = args.path as string;
    const pattern = args.pattern as string;
    const filePattern = args.filePattern as string | undefined;

    try {
      const results: string[] = [];
      const regex = new RegExp(pattern, 'g');

      await this.searchInDirectory(searchPath, regex, filePattern, results);

      if (results.length === 0) {
        return this.successResponse('검색 결과가 없습니다.');
      }

      return this.successResponse(results.slice(0, 50).join('\n\n'));
    } catch (error) {
      throw error;
    }
  }

  private async searchInDirectory(
    dirPath: string,
    regex: RegExp,
    filePattern: string | undefined,
    results: string[]
  ): Promise<void> {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // node_modules 등 제외
        if (!['node_modules', '.git', '.next', 'dist'].includes(item.name)) {
          await this.searchInDirectory(fullPath, regex, filePattern, results);
        }
      } else if (item.isFile()) {
        // 파일 패턴 체크
        if (filePattern) {
          const ext = path.extname(item.name);
          const patternExt = filePattern.replace('*', '');
          if (ext !== patternExt) continue;
        }

        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              results.push(`${fullPath}:${i + 1}: ${lines[i].trim()}`);
              if (results.length >= 50) return;
            }
            regex.lastIndex = 0; // Reset regex state
          }
        } catch {
          // 바이너리 파일 등은 무시
        }
      }
    }
  }
}
