#!/usr/bin/env node

/**
 * Hello World CLI 스크립트
 * 
 * TypeScript로 작성된 hello-world 모듈을 사용하는 CLI 스크립트
 */

import { printHelloWorld } from '../src/hello-world';

// 메인 실행 함수
function main(): void {
  printHelloWorld();
}

// CLI에서 직접 실행될 때만 실행
if (require.main === module) {
  main();
}

export { main };