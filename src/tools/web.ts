/**
 * OpenManus TypeScript - 웹 도구
 */

import { BaseTool } from './base';
import { type ToolResult, type ToolParameters } from '../types';

// ============================================================
// 웹 검색 도구
// ============================================================

export class WebSearchTool extends BaseTool {
  name = 'web_search';
  description = '인터넷에서 정보를 검색합니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '검색할 내용',
      },
      numResults: {
        type: 'number',
        description: '검색 결과 개수 (기본 5)',
      },
    },
    required: ['query'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    const numResults = (args.numResults as number) || 5;

    // Google Custom Search API 사용 (API 키 필요)
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      // API 키가 없으면 DuckDuckGo Instant Answer API 사용 (제한적)
      return this.searchDuckDuckGo(query);
    }

    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${numResults}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json() as { items?: Array<{ title: string; link: string; snippet: string }> };
      const results = data.items?.map((item) => {
        return `📌 ${item.title}\n   ${item.link}\n   ${item.snippet}`;
      }) || [];

      if (results.length === 0) {
        return this.successResponse('검색 결과가 없습니다.');
      }

      return this.successResponse(results.join('\n\n'));
    } catch (error) {
      return this.failResponse(
        error instanceof Error ? error.message : '검색 중 오류 발생'
      );
    }
  }

  private async searchDuckDuckGo(query: string): Promise<ToolResult> {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
      const response = await fetch(url);

      interface DuckDuckGoTopic {
        Text?: string;
      }
      interface DuckDuckGoResponse {
        AbstractText?: string;
        AbstractURL?: string;
        RelatedTopics?: DuckDuckGoTopic[];
      }

      const data = await response.json() as DuckDuckGoResponse;

      const results: string[] = [];

      if (data.AbstractText) {
        results.push(`📖 요약: ${data.AbstractText}`);
        if (data.AbstractURL) {
          results.push(`   출처: ${data.AbstractURL}`);
        }
      }

      if (data.RelatedTopics?.length && data.RelatedTopics.length > 0) {
        results.push('\n📋 관련 주제:');
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.Text) {
            results.push(`• ${topic.Text}`);
          }
        }
      }

      if (results.length === 0) {
        return this.successResponse(
          '직접적인 검색 결과를 찾지 못했습니다. 다른 검색어를 시도해보세요.'
        );
      }

      return this.successResponse(results.join('\n'));
    } catch (error) {
      return this.failResponse('검색 중 오류가 발생했습니다.');
    }
  }
}

// ============================================================
// 웹 페이지 가져오기 도구
// ============================================================

export class WebFetchTool extends BaseTool {
  name = 'web_fetch';
  description = 'URL에서 웹 페이지 내용을 가져옵니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '가져올 웹 페이지 URL',
      },
      extractText: {
        type: 'boolean',
        description: 'HTML에서 텍스트만 추출할지 여부 (기본 true)',
      },
    },
    required: ['url'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const url = args.url as string;
    const extractText = args.extractText !== false;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenManus/1.0)',
        },
      });

      if (!response.ok) {
        return this.failResponse(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await response.json();
        return this.successResponse(JSON.stringify(json, null, 2).slice(0, 10000));
      }

      let content = await response.text();

      if (extractText && contentType.includes('text/html')) {
        content = this.extractTextFromHtml(content);
      }

      // 너무 긴 내용은 자름
      if (content.length > 15000) {
        content = content.slice(0, 15000) + '\n\n... (내용이 잘렸습니다)';
      }

      return this.successResponse(content);
    } catch (error) {
      return this.failResponse(
        error instanceof Error ? error.message : '웹 페이지 가져오기 실패'
      );
    }
  }

  private extractTextFromHtml(html: string): string {
    // 간단한 HTML 텍스트 추출
    return html
      // 스크립트와 스타일 제거
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // 주석 제거
      .replace(/<!--[\s\S]*?-->/g, '')
      // 태그를 줄바꿈이나 공백으로 교체
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      // 나머지 태그 제거
      .replace(/<[^>]+>/g, ' ')
      // HTML 엔티티 디코딩
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // 연속된 공백/줄바꿈 정리
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }
}

// ============================================================
// HTTP 요청 도구
// ============================================================

export class HttpRequestTool extends BaseTool {
  name = 'http_request';
  description = 'HTTP API 요청을 보냅니다.';
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '요청 URL',
      },
      method: {
        type: 'string',
        description: 'HTTP 메서드 (GET, POST, PUT, DELETE)',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      },
      headers: {
        type: 'string',
        description: '헤더 (JSON 문자열)',
      },
      body: {
        type: 'string',
        description: '요청 본문 (JSON 문자열)',
      },
    },
    required: ['url'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const url = args.url as string;
    const method = (args.method as string) || 'GET';
    const headersStr = args.headers as string | undefined;
    const body = args.body as string | undefined;

    try {
      const headers: Record<string, string> = headersStr
        ? JSON.parse(headersStr)
        : {};

      if (body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body,
      });

      const contentType = response.headers.get('content-type') || '';
      let responseBody: string;

      if (contentType.includes('application/json')) {
        const json = await response.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await response.text();
      }

      // 응답이 너무 길면 자름
      if (responseBody.length > 10000) {
        responseBody = responseBody.slice(0, 10000) + '\n\n... (응답이 잘렸습니다)';
      }

      return this.successResponse(
        `Status: ${response.status} ${response.statusText}\n\n${responseBody}`
      );
    } catch (error) {
      return this.failResponse(
        error instanceof Error ? error.message : 'HTTP 요청 실패'
      );
    }
  }
}
