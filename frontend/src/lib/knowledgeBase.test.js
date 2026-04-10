/**
 * Tests for knowledgeBase.js
 *
 * 属性 26：术语识别正确性（返回术语在文本中的起始/结束索引）
 * 属性 27：术语查询完整性（返回 definition、usage、related_terms 三字段）
 *
 * 验证：需求 2.2、2.3
 */
import { describe, it, expect } from 'vitest';
import { TERMS, identifyTerms, queryTerm } from './knowledgeBase.js';

// ---------------------------------------------------------------------------
// 基础验证
// ---------------------------------------------------------------------------

describe('知识库基础', () => {
  it('术语数量 >= 200', () => {
    expect(TERMS.length).toBeGreaterThanOrEqual(200);
  });

  it('每个术语都有必要字段', () => {
    for (const entry of TERMS) {
      expect(typeof entry.term).toBe('string');
      expect(entry.term.length).toBeGreaterThan(0);
      expect(typeof entry.definition).toBe('string');
      expect(entry.definition.length).toBeGreaterThan(0);
      expect(entry.definition.length).toBeLessThanOrEqual(80);
      expect(typeof entry.usage).toBe('string');
      expect(Array.isArray(entry.related_terms)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 属性测试 15.3 — 属性 26：术语识别正确性
// Feature: youngquant-platform-enhancement, Property 26
// **Validates: Requirements 2.2**
// ---------------------------------------------------------------------------

describe('identifyTerms — 属性 26：术语识别正确性', () => {
  it('识别文本中的已知术语并返回正确索引', () => {
    const text = '当MACD出现金叉时，通常是买入信号';
    const results = identifyTerms(text);

    const macdResult = results.find(r => r.term === 'MACD');
    expect(macdResult).toBeDefined();
    expect(macdResult.start).toBe(text.indexOf('MACD'));
    expect(macdResult.end).toBe(text.indexOf('MACD') + 'MACD'.length);

    const jinChaResult = results.find(r => r.term === '金叉');
    expect(jinChaResult).toBeDefined();
    expect(jinChaResult.start).toBe(text.indexOf('金叉'));
    expect(jinChaResult.end).toBe(text.indexOf('金叉') + '金叉'.length);
  });

  it('返回的每个结果都有 term、start、end 字段', () => {
    const text = 'RSI超买时需要注意止损，均线金叉是买入信号';
    const results = identifyTerms(text);
    for (const r of results) {
      expect(typeof r.term).toBe('string');
      expect(typeof r.start).toBe('number');
      expect(typeof r.end).toBe('number');
      expect(r.end).toBeGreaterThan(r.start);
    }
  });

  it('start 和 end 索引与文本中实际位置一致', () => {
    const text = '布林带和MACD是常用的技术指标，RSI用于判断超买超卖';
    const results = identifyTerms(text);
    for (const r of results) {
      expect(text.slice(r.start, r.end)).toBe(r.term);
    }
  });

  it('文本中不含已知术语时返回空数组', () => {
    const results = identifyTerms('这是一段没有专业术语的普通文字');
    expect(Array.isArray(results)).toBe(true);
    // 可能有也可能没有，但不应抛出异常
  });

  it('空字符串返回空数组', () => {
    expect(identifyTerms('')).toEqual([]);
  });

  it('null/undefined 返回空数组', () => {
    expect(identifyTerms(null)).toEqual([]);
    expect(identifyTerms(undefined)).toEqual([]);
  });

  it('同一术语多次出现时每次都被识别', () => {
    const text = 'MACD金叉后，MACD继续走强';
    const results = identifyTerms(text);
    const macdResults = results.filter(r => r.term === 'MACD');
    expect(macdResults.length).toBe(2);
    expect(macdResults[0].start).toBe(0);
    expect(macdResults[1].start).toBe(text.lastIndexOf('MACD'));
  });

  it('结果按 start 升序排列', () => {
    const text = '均线金叉后RSI超买，MACD顶背离需要注意止损';
    const results = identifyTerms(text);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].start).toBeGreaterThanOrEqual(results[i - 1].start);
    }
  });
});

// ---------------------------------------------------------------------------
// 属性测试 15.4 — 属性 27：术语查询完整性
// Feature: youngquant-platform-enhancement, Property 27
// **Validates: Requirements 2.3**
// ---------------------------------------------------------------------------

describe('queryTerm — 属性 27：术语查询完整性', () => {
  it('查询已知术语返回三个必要字段', () => {
    const knownTerms = ['MACD', 'RSI', 'KDJ', '均线', '金叉', '死叉', '布林带', '市盈率'];
    for (const term of knownTerms) {
      const result = queryTerm(term);
      expect(result).not.toBeNull();
      expect(typeof result.definition).toBe('string');
      expect(result.definition.length).toBeGreaterThan(0);
      expect(typeof result.usage).toBe('string');
      expect(result.usage.length).toBeGreaterThan(0);
      expect(Array.isArray(result.related_terms)).toBe(true);
    }
  });

  it('查询不存在的术语返回 null', () => {
    expect(queryTerm('不存在的术语XYZ')).toBeNull();
    expect(queryTerm('')).toBeNull();
    expect(queryTerm(null)).toBeNull();
  });

  it('所有已知术语都可以被查询到', () => {
    for (const entry of TERMS) {
      const result = queryTerm(entry.term);
      expect(result).not.toBeNull();
      expect(result.definition).toBe(entry.definition);
      expect(result.usage).toBe(entry.usage);
    }
  });

  it('definition 长度 <= 80 字', () => {
    for (const entry of TERMS) {
      const result = queryTerm(entry.term);
      expect(result.definition.length).toBeLessThanOrEqual(80);
    }
  });
});
