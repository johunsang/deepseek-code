#!/usr/bin/env node

/**
 * Hello World Runner
 * 
 * 빌드된 hello-world 모듈을 사용하는 실행 스크립트
 */

// 빌드된 모듈을 사용
const { printHelloWorld } = require('../dist/index.js');

// 메인 실행 함수
function main() {
  printHelloWorld();
}

// CLI에서 직접 실행될 때만 실행
if (require.main === module) {
  main();
}

module.exports = { main };