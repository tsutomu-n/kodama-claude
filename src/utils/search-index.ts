/**
 * Search index utilities for full-text search across snapshots
 * Implements in-memory search with ranking and highlighting
 */

import * as fs from "fs";
import * as path from "path";
import { getStoragePaths, Snapshot, SnapshotSchema } from "../types";
import { config } from "../config";

export interface SearchResult {
  snapshot: Snapshot;
  score: number;
  highlights: SearchHighlight[];
  filename: string;
}

export interface SearchHighlight {
  field: string;
  text: string;
  matches: Array<{ start: number; end: number }>;
}

export interface SearchOptions {
  query: string;
  fields?: string[]; // Default: ['title'], 'all' for all fields
  tags?: string[];
  regex?: boolean;
  since?: string;
  until?: string;
  limit?: number;
  caseSensitive?: boolean;
}

export class SearchIndex {
  private paths = getStoragePaths();
  
  /**
   * Search snapshots using in-memory full-text search
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const {
      query,
      fields = ['title'],
      tags = [],
      regex = false,
      since,
      until,
      limit = 50,
      caseSensitive = false
    } = options;

    // Validate query
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Validate and sanitize query
    const sanitizedQuery = this.sanitizeQuery(query, regex);
    if (!sanitizedQuery) {
      return [];
    }

    // Load all snapshots
    const snapshots = await this.loadAllSnapshots();
    
    // Apply filters
    const filteredSnapshots = this.applyFilters(snapshots, { tags, since, until });
    
    // Perform search and scoring
    const results = this.performSearch(filteredSnapshots, sanitizedQuery, fields, regex, caseSensitive);
    
    // Sort by score (highest first) and apply limit
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, Math.min(limit, 1000)); // Cap at 1000 for performance
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(partialQuery: string, limit: number = 10): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    const snapshots = await this.loadAllSnapshots();
    const suggestions = new Set<string>();

    // Extract words from titles and context
    for (const { snapshot } of snapshots) {
      const words = this.extractWords(snapshot.title || "");
      
      for (const word of words) {
        if (word.toLowerCase().startsWith(partialQuery.toLowerCase()) && 
            word.length > partialQuery.length) {
          suggestions.add(word);
          if (suggestions.size >= limit) break;
        }
      }
      
      if (suggestions.size >= limit) break;
    }

    return Array.from(suggestions).sort();
  }

  private async loadAllSnapshots(): Promise<Array<{ snapshot: Snapshot; filename: string }>> {
    const snapshotDir = this.paths.snapshots;
    
    if (!fs.existsSync(snapshotDir)) {
      return [];
    }

    const results: Array<{ snapshot: Snapshot; filename: string }> = [];
    const files = fs.readdirSync(snapshotDir)
      .filter(f => f.endsWith(".json") && !f.startsWith("archive") && f !== "latest.json")
      .slice(0, 1000); // Performance: Cap at 1000 files to prevent memory issues

    for (const filename of files) {
      try {
        const filePath = path.join(snapshotDir, filename);
        const content = fs.readFileSync(filePath, "utf-8");
        
        // Security: Limit file size
        if (content.length > 1024 * 1024) { // 1MB limit
          if (config.debug) {
            console.warn(`⚠️  Skipping large snapshot: ${filename}`);
          }
          continue;
        }
        
        const data = JSON.parse(content);
        const snapshot = SnapshotSchema.parse(data);
        
        results.push({ snapshot, filename });
      } catch (error) {
        if (config.debug) {
          console.warn(`⚠️  Failed to load snapshot ${filename}:`, error);
        }
      }
    }

    return results;
  }

  private applyFilters(
    snapshots: Array<{ snapshot: Snapshot; filename: string }>, 
    filters: { tags?: string[]; since?: string; until?: string }
  ): Array<{ snapshot: Snapshot; filename: string }> {
    return snapshots.filter(({ snapshot }) => {
      // Tag filter
      if (filters.tags && filters.tags.length > 0) {
        const snapshotTags = snapshot.tags || [];
        const hasMatchingTag = filters.tags.some(tag => 
          snapshotTags.some(snapshotTag => 
            snapshotTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTag) return false;
      }

      // Date filters
      const snapshotDate = new Date(snapshot.timestamp);
      
      if (filters.since) {
        const sinceDate = this.parseDate(filters.since);
        if (sinceDate && snapshotDate < sinceDate) return false;
      }
      
      if (filters.until) {
        const untilDate = this.parseDate(filters.until);
        if (untilDate && snapshotDate > untilDate) return false;
      }

      return true;
    });
  }

  private performSearch(
    snapshots: Array<{ snapshot: Snapshot; filename: string }>,
    query: string,
    fields: string[],
    regex: boolean,
    caseSensitive: boolean
  ): SearchResult[] {
    const results: SearchResult[] = [];
    
    const searchPattern = this.createSearchPattern(query, regex, caseSensitive);
    if (!searchPattern) return results;

    for (const { snapshot, filename } of snapshots) {
      const searchResult = this.searchSnapshot(snapshot, searchPattern, fields, caseSensitive);
      
      if (searchResult.score > 0) {
        results.push({
          snapshot,
          filename,
          score: searchResult.score,
          highlights: searchResult.highlights
        });
      }
    }

    return results;
  }

  private searchSnapshot(
    snapshot: Snapshot,
    searchPattern: RegExp,
    fields: string[],
    caseSensitive: boolean
  ): { score: number; highlights: SearchHighlight[] } {
    let totalScore = 0;
    const highlights: SearchHighlight[] = [];

    // Determine which fields to search
    const fieldsToSearch = fields.includes('all') ? 
      ['title', 'context', 'decisions', 'nextSteps', 'tags'] : 
      fields;

    for (const field of fieldsToSearch) {
      const fieldResult = this.searchField(snapshot, field, searchPattern, caseSensitive);
      totalScore += fieldResult.score;
      
      if (fieldResult.highlights.length > 0) {
        highlights.push({
          field,
          text: fieldResult.text,
          matches: fieldResult.highlights
        });
      }
    }

    return { score: totalScore, highlights };
  }

  private searchField(
    snapshot: Snapshot,
    field: string,
    searchPattern: RegExp,
    caseSensitive: boolean
  ): { score: number; highlights: Array<{ start: number; end: number }>; text: string } {
    let text = "";
    let fieldMultiplier = 1;

    // Extract field content and set scoring multiplier
    switch (field) {
      case 'title':
        text = snapshot.title || "";
        fieldMultiplier = 3; // Title matches are more important
        break;
      case 'context':
        text = snapshot.context || "";
        fieldMultiplier = 1;
        break;
      case 'decisions':
        text = (snapshot.decisions || []).join(' ');
        fieldMultiplier = 2;
        break;
      case 'nextSteps':
        text = (snapshot.nextSteps || []).join(' ');
        fieldMultiplier = 2;
        break;
      case 'tags':
        text = (snapshot.tags || []).join(' ');
        fieldMultiplier = 2;
        break;
      default:
        return { score: 0, highlights: [], text: "" };
    }

    if (!text) {
      return { score: 0, highlights: [], text: "" };
    }

    // Find all matches
    const highlights: Array<{ start: number; end: number }> = [];
    let match;
    let score = 0;

    // Reset regex lastIndex for global searches
    searchPattern.lastIndex = 0;
    
    while ((match = searchPattern.exec(text)) !== null) {
      highlights.push({
        start: match.index,
        end: match.index + match[0].length
      });
      
      // Score based on match length and position
      const matchScore = match[0].length * fieldMultiplier;
      
      // Boost score for matches at word boundaries
      if (this.isWordBoundary(text, match.index)) {
        score += matchScore * 1.5;
      } else {
        score += matchScore;
      }
      
      // Break for non-global regex to avoid infinite loops
      if (!searchPattern.global) break;
    }

    return { score, highlights, text };
  }

  private createSearchPattern(query: string, regex: boolean, caseSensitive: boolean): RegExp | null {
    try {
      if (regex) {
        const flags = caseSensitive ? 'g' : 'gi';
        return new RegExp(query, flags);
      } else {
        // Escape special regex characters for literal search
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitive ? 'g' : 'gi';
        return new RegExp(escapedQuery, flags);
      }
    } catch (error) {
      if (config.debug) {
        console.warn(`⚠️  Invalid search pattern: ${query}`, error);
      }
      return null;
    }
  }

  private sanitizeQuery(query: string, regex: boolean): string | null {
    // Basic sanitization
    const sanitized = query.trim();
    
    if (sanitized.length === 0 || sanitized.length > 500) {
      return null;
    }

    // For regex queries, do basic validation
    if (regex) {
      try {
        new RegExp(sanitized);
      } catch {
        return null;
      }
    }

    return sanitized;
  }

  private parseDate(dateStr: string): Date | null {
    // Support various date formats
    try {
      // ISO format
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return new Date(dateStr);
      }
      
      // Relative dates
      const now = new Date();
      const match = dateStr.match(/^(\d+)\s*(day|days|week|weeks|month|months)?\s*ago$/i);
      if (match) {
        const amount = parseInt(match[1], 10);
        const unit = match[2]?.toLowerCase() || 'days';
        
        switch (unit) {
          case 'day':
          case 'days':
            return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
          case 'week':
          case 'weeks':
            return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
          case 'month':
          case 'months':
            const monthsAgo = new Date(now);
            monthsAgo.setMonth(monthsAgo.getMonth() - amount);
            return monthsAgo;
        }
      }
      
      return new Date(dateStr);
    } catch {
      return null;
    }
  }

  private extractWords(text: string): string[] {
    // Simple word extraction - split on non-word characters
    return text
      .split(/\W+/)
      .filter(word => word.length > 2)
      .slice(0, 100); // Limit to prevent DoS
  }

  private isWordBoundary(text: string, index: number): boolean {
    const before = index > 0 ? text[index - 1] : ' ';
    const after = index < text.length - 1 ? text[index + 1] : ' ';
    
    return /\W/.test(before) || /\W/.test(after);
  }

  /**
   * Highlight matches in text for display
   */
  static highlightText(text: string, highlights: Array<{ start: number; end: number }>): string {
    if (highlights.length === 0) return text;

    // Sort highlights by start position (descending to avoid index shifting)
    const sortedHighlights = highlights.sort((a, b) => b.start - a.start);
    
    let highlightedText = text;
    
    for (const highlight of sortedHighlights) {
      const before = highlightedText.substring(0, highlight.start);
      const match = highlightedText.substring(highlight.start, highlight.end);
      const after = highlightedText.substring(highlight.end);
      
      highlightedText = before + `**${match}**` + after;
    }
    
    return highlightedText;
  }

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<{ 
    totalSnapshots: number; 
    indexedFields: number; 
    averageSnapshotSize: number 
  }> {
    const snapshots = await this.loadAllSnapshots();
    
    const totalSize = snapshots.reduce((sum, { snapshot }) => {
      const size = (snapshot.title || "").length + 
                   (snapshot.context || "").length +
                   (snapshot.decisions || []).join('').length +
                   (snapshot.nextSteps || []).join('').length;
      return sum + size;
    }, 0);

    return {
      totalSnapshots: snapshots.length,
      indexedFields: 5, // title, context, decisions, nextSteps, tags
      averageSnapshotSize: snapshots.length > 0 ? Math.round(totalSize / snapshots.length) : 0
    };
  }
}