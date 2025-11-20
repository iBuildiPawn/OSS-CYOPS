/**
 * Response formatting utilities
 */

import { CHARACTER_LIMIT, ResponseFormat } from "../constants.js";
import { PaginationMetadata } from "../types.js";

/**
 * Format a date string to human-readable format
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  } catch {
    return dateString;
  }
}

/**
 * Create a markdown table from data
 */
export function createMarkdownTable(headers: string[], rows: string[][]): string {
  const lines: string[] = [];

  // Header row
  lines.push(`| ${headers.join(' | ')} |`);

  // Separator row
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);

  // Data rows
  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Add pagination metadata to response
 */
export function createPaginationMetadata(
  total: number,
  count: number,
  offset: number
): PaginationMetadata {
  const hasMore = total > offset + count;
  return {
    total,
    count,
    offset,
    has_more: hasMore,
    ...(hasMore ? { next_offset: offset + count } : {})
  };
}

/**
 * Format pagination info as markdown
 */
export function formatPaginationMarkdown(metadata: PaginationMetadata): string {
  const lines: string[] = [
    `**Total**: ${metadata.total}`,
    `**Showing**: ${metadata.count} (offset: ${metadata.offset})`
  ];

  if (metadata.has_more) {
    lines.push(`**More available**: Use offset=${metadata.next_offset} to see next page`);
  }

  return lines.join(' | ');
}

/**
 * Truncate response if it exceeds CHARACTER_LIMIT
 */
export function truncateResponse(content: string, dataLength?: number): string {
  if (content.length <= CHARACTER_LIMIT) {
    return content;
  }

  const truncationMessage = `\n\n---\n**Response Truncated**: Original response was ${content.length} characters (limit: ${CHARACTER_LIMIT}).${dataLength ? ` Showing partial results (originally ${dataLength} items).` : ''}\n\nTo see more results:\n- Use pagination parameters (offset, limit)\n- Add filters to narrow results\n- Request specific IDs or ranges`;

  const availableSpace = CHARACTER_LIMIT - truncationMessage.length;
  const truncated = content.substring(0, availableSpace);

  return truncated + truncationMessage;
}

/**
 * Escape special characters in markdown
 */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

/**
 * Format a key-value pair for markdown
 */
export function formatKeyValue(key: string, value: any): string {
  if (value === null || value === undefined) {
    return `**${key}**: _Not set_`;
  }
  if (typeof value === 'boolean') {
    return `**${key}**: ${value ? 'Yes' : 'No'}`;
  }
  if (Array.isArray(value)) {
    return `**${key}**: ${value.join(', ') || '_None_'}`;
  }
  return `**${key}**: ${value}`;
}

/**
 * Create a severity badge for markdown
 */
export function severityBadge(severity: string): string {
  const badges: Record<string, string> = {
    'CRITICAL': '🔴 CRITICAL',
    'HIGH': '🟠 HIGH',
    'MEDIUM': '🟡 MEDIUM',
    'LOW': '🟢 LOW',
    'INFO': '🔵 INFO'
  };
  return badges[severity] || severity;
}

/**
 * Create a status badge for markdown
 */
export function statusBadge(status: string): string {
  const badges: Record<string, string> = {
    'OPEN': '🔓 OPEN',
    'IN_PROGRESS': '⏳ IN PROGRESS',
    'RESOLVED': '✅ RESOLVED',
    'CLOSED': '🔒 CLOSED',
    'ACTIVE': '✅ ACTIVE',
    'INACTIVE': '⏸️  INACTIVE',
    'DECOMMISSIONED': '❌ DECOMMISSIONED',
    'FIXED': '✅ FIXED',
    'VERIFIED': '✔️  VERIFIED',
    'RISK_ACCEPTED': '⚠️  RISK ACCEPTED',
    'FALSE_POSITIVE': '❎ FALSE POSITIVE'
  };
  return badges[status] || status;
}
