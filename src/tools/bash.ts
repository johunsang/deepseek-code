/**
 * OpenManus TypeScript - Bash/Terminal 도구
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { BaseTool } from './base';
import { type ToolResult, type ToolParameters } from '../types';

const execAsync = promisify(exec);

// ============================================================
// Bash 실행 도구
// ============================================================

export class BashTool extends BaseTool {
  name = 'bash';
  description = 'Bash 명령어를 실행합니다. 시스템 명령어, git, npm 등을 실행할 수 있습니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: '실행할 bash 명령어',
      },
      workingDirectory: {
        type: 'string',
        description: '작업 디렉토리 (선택)',
      },
      timeout: {
        type: 'number',
        description: '타임아웃 (밀리초, 기본 60000)',
      },
    },
    required: ['command'],
  };

  // 위험한 명령어 목록
  private dangerousCommands = [
    'rm -rf /',
    'rm -rf ~',
    'rm -rf *',
    ':(){ :|:& };:',
    'mkfs',
    'dd if=/dev/zero',
    'chmod -R 777 /',
    '> /dev/sda',
  ];

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const command = args.command as string;
    const workingDirectory = args.workingDirectory as string | undefined;
    const timeout = (args.timeout as number) || 60000;

    // 위험한 명령어 체크
    for (const dangerous of this.dangerousCommands) {
      if (command.includes(dangerous)) {
        return this.failResponse(`위험한 명령어는 실행할 수 없습니다: ${dangerous}`);
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDirectory,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += (output ? '\n' : '') + `[stderr] ${stderr}`;

      return this.successResponse(output || '명령어가 성공적으로 실행되었습니다.');
    } catch (error) {
      const err = error as { code?: number; stdout?: string; stderr?: string; message?: string };

      if (err.code !== undefined) {
        let output = '';
        if (err.stdout) output += err.stdout;
        if (err.stderr) output += (output ? '\n' : '') + `[stderr] ${err.stderr}`;
        return this.failResponse(
          `명령어 실행 실패 (exit code: ${err.code})\n${output}`
        );
      }

      return this.failResponse(err.message || 'Unknown error');
    }
  }
}

// ============================================================
// Python 실행 도구
// ============================================================

export class PythonExecuteTool extends BaseTool {
  name = 'python_execute';
  description = 'Python 코드를 실행합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: '실행할 Python 코드',
      },
      timeout: {
        type: 'number',
        description: '타임아웃 (밀리초, 기본 30000)',
      },
    },
    required: ['code'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.code as string;
    const timeout = (args.timeout as number) || 30000;

    try {
      const { stdout, stderr } = await execAsync(`python3 -c "${code.replace(/"/g, '\\"')}"`, {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      });

      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += (output ? '\n' : '') + `[stderr] ${stderr}`;

      return this.successResponse(output || '코드가 성공적으로 실행되었습니다.');
    } catch (error) {
      const err = error as { stderr?: string; message?: string };
      return this.failResponse(err.stderr || err.message || 'Python 실행 오류');
    }
  }
}

// ============================================================
// Node.js 실행 도구
// ============================================================

export class NodeExecuteTool extends BaseTool {
  name = 'node_execute';
  description = 'Node.js/JavaScript 코드를 실행합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: '실행할 JavaScript 코드',
      },
      timeout: {
        type: 'number',
        description: '타임아웃 (밀리초, 기본 30000)',
      },
    },
    required: ['code'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.code as string;
    const timeout = (args.timeout as number) || 30000;

    try {
      // 코드를 안전하게 이스케이프
      const escapedCode = code.replace(/'/g, "'\\''");
      const { stdout, stderr } = await execAsync(`node -e '${escapedCode}'`, {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      });

      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += (output ? '\n' : '') + `[stderr] ${stderr}`;

      return this.successResponse(output || '코드가 성공적으로 실행되었습니다.');
    } catch (error) {
      const err = error as { stderr?: string; message?: string };
      return this.failResponse(err.stderr || err.message || 'Node.js 실행 오류');
    }
  }
}

// ============================================================
// Git 도구
// ============================================================

export class GitTool extends BaseTool {
  name = 'git';
  description = 'Git 명령어를 실행합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Git 명령어 (예: status, add ., commit -m "message")',
      },
      workingDirectory: {
        type: 'string',
        description: 'Git 저장소 디렉토리',
      },
    },
    required: ['command'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const command = args.command as string;
    const workingDirectory = args.workingDirectory as string | undefined;

    // 위험한 git 명령어 체크
    const dangerousGitCommands = ['push --force', 'reset --hard HEAD~', 'clean -fd'];
    for (const dangerous of dangerousGitCommands) {
      if (command.includes(dangerous)) {
        return this.failResponse(
          `주의가 필요한 명령어입니다. 직접 터미널에서 실행하세요: git ${dangerous}`
        );
      }
    }

    try {
      const { stdout, stderr } = await execAsync(`git ${command}`, {
        cwd: workingDirectory,
        timeout: 60000,
      });

      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += (output ? '\n' : '') + stderr;

      return this.successResponse(output || 'Git 명령어가 실행되었습니다.');
    } catch (error) {
      const err = error as { stderr?: string; message?: string };
      return this.failResponse(err.stderr || err.message || 'Git 실행 오류');
    }
  }
}

// ============================================================
// NPM 도구
// ============================================================

export class NpmTool extends BaseTool {
  name = 'npm';
  description = 'npm/pnpm 명령어를 실행합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'npm 명령어 (예: install, run build, test)',
      },
      workingDirectory: {
        type: 'string',
        description: '프로젝트 디렉토리',
      },
      usePnpm: {
        type: 'boolean',
        description: 'pnpm 사용 여부 (기본 true)',
      },
    },
    required: ['command'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const command = args.command as string;
    const workingDirectory = args.workingDirectory as string | undefined;
    const usePnpm = args.usePnpm !== false;

    const packageManager = usePnpm ? 'pnpm' : 'npm';

    try {
      const { stdout, stderr } = await execAsync(`${packageManager} ${command}`, {
        cwd: workingDirectory,
        timeout: 300000, // 5분
        maxBuffer: 50 * 1024 * 1024, // 50MB
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += (output ? '\n' : '') + stderr;

      return this.successResponse(output || '명령어가 실행되었습니다.');
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      let output = '';
      if (err.stdout) output += err.stdout;
      if (err.stderr) output += (output ? '\n' : '') + err.stderr;
      return this.failResponse(output || err.message || '실행 오류');
    }
  }
}
