#!/usr/bin/env bun
/**
 * Search snapshots with full-text search capabilities
 * Supports multiple search modes and result ranking
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { getStoragePaths } from "../types";
import { getMessage, formatError } from "../i18n";
import { config } from "../config";
import { SearchIndex, SearchOptions, SearchResult } from "../utils/search-index";

interface SearchCommandOptions {
  all?: boolean;
  tags?: string;
  regex?: boolean;
  since?: string;
  until?: string;
  limit?: number;
  json?: boolean;
  caseSensitive?: boolean;
  suggestions?: boolean;
}

export async function search(query: string, options: SearchCommandOptions = {}): Promise<void> {
  const {
    all = false,
    tags,
    regex = false,
    since,
    until,
    limit = 10,
    json = false,
    caseSensitive = false,
    suggestions = false
  } = options;

  try {
    const searchIndex = new SearchIndex();

    // Handle suggestions
    if (suggestions) {
      return await showSuggestions(searchIndex, query, json);
    }

    // Validate query
    if (!query || query.trim().length === 0) {
      if (json) {
        console.log(JSON.stringify({ error: "Search query is required" }));
      } else {
        console.error("❌ Search query is required");
        console.error("Usage: kc search <query>");
        console.error("Use 'kc search --help' for more information");
      }
      process.exit(1);
    }

    // Parse tags if provided
    const tagList = tags ? parseTags(tags) : [];

    // Build search options
    const searchOptions: SearchOptions = {
      query: query.trim(),
      fields: all ? ['all'] : ['title'],
      tags: tagList,
      regex,
      since,
      until,
      limit: Math.min(limit, 100), // Cap at 100 for performance
      caseSensitive
    };

    // Perform search
    const results = await searchIndex.search(searchOptions);

    // Display results
    if (json) {
      await displayJsonResults(results, searchOptions);
    } else {
      await displayResults(results, searchOptions);
    }

  } catch (error) {
    if (json) {
      console.log(JSON.stringify({ error: String(error) }));
    } else {
      console.error("❌ Error during search:", error);
    }
    process.exit(1);
  } finally {
    // Ensure any open resources are properly cleaned up
  }
}

async function showSuggestions(searchIndex: SearchIndex, partialQuery: string, json: boolean): Promise<void> {
  try {
    const suggestions = await searchIndex.getSuggestions(partialQuery, 10);
    
    if (json) {
      console.log(JSON.stringify({ 
        query: partialQuery,
        suggestions 
      }, null, 2));
    } else {
      if (suggestions.length === 0) {
        console.log(`💡 No suggestions found for "${partialQuery}"`);
      } else {
        console.log(`💡 Search suggestions for "${partialQuery}":`);
        suggestions.forEach((suggestion, index) => {
          console.log(`${index + 1}. ${suggestion}`);
        });
      }
    }
  } catch (error) {
    if (json) {
      console.log(JSON.stringify({ error: String(error) }));
    } else {
      console.error(`❌ Error getting suggestions: ${error}`);
    }
  }
}

async function displayResults(results: SearchResult[], searchOptions: SearchOptions): Promise<void> {
  if (results.length === 0) {
    console.log(`🔍 No snapshots found matching "${searchOptions.query}"`);
    console.log("\n💡 Try:");
    console.log("  • Using --all to search all fields (not just titles)");
    console.log("  • Using --regex for pattern matching");
    console.log("  • Checking your spelling");
    console.log("  • Using broader search terms");
    return;
  }

  // Display search summary
  const fieldsText = searchOptions.fields?.includes('all') ? 'all fields' : 'titles';
  const filtersText = buildFiltersDescription(searchOptions);
  
  console.log(`🔍 Found ${results.length} snapshot(s) matching "${searchOptions.query}" in ${fieldsText}${filtersText}:`);
  console.log("");

  // Display results with highlighting
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const { snapshot } = result;
    
    console.log(`${i + 1}. ${getHighlightedTitle(result)}`);
    
    // Show metadata
    const date = new Date(snapshot.timestamp);
    const timeAgo = getTimeAgo(date);
    const formattedDate = formatDate(date);
    console.log(`   📅 ${formattedDate} (${timeAgo}) • Score: ${Math.round(result.score)}`);
    
    if (snapshot.step && snapshot.step !== "unknown") {
      console.log(`   📊 Step: ${snapshot.step}`);
    }
    
    if (snapshot.tags && snapshot.tags.length > 0) {
      const safeTags = snapshot.tags
        .map(t => String(t).replace(/[\x00-\x1F\x7F]/g, ""))
        .join(", ");
      console.log(`   🏷️  Tags: ${safeTags}`);
    }
    
    // Show context snippets if available
    const contextHighlight = result.highlights.find(h => h.field === 'context');
    if (contextHighlight && contextHighlight.matches.length > 0) {
      const snippet = getContextSnippet(contextHighlight.text, contextHighlight.matches);
      if (snippet) {
        console.log(`   📝 Context: ${snippet}`);
      }
    }
    
    // Show decision/step highlights
    const decisionHighlight = result.highlights.find(h => h.field === 'decisions');
    if (decisionHighlight && decisionHighlight.matches.length > 0) {
      const snippet = getContextSnippet(decisionHighlight.text, decisionHighlight.matches, 80);
      if (snippet) {
        console.log(`   ✅ Decision: ${snippet}`);
      }
    }
    
    const stepHighlight = result.highlights.find(h => h.field === 'nextSteps');
    if (stepHighlight && stepHighlight.matches.length > 0) {
      const snippet = getContextSnippet(stepHighlight.text, stepHighlight.matches, 80);
      if (snippet) {
        console.log(`   📋 Next Step: ${snippet}`);
      }
    }
    
    console.log(`   🆔 ID: ${snapshot.id?.substring(0, 12)}... • File: ${result.filename}`);
    console.log("");
  }

  // Show additional tips
  if (results.length >= searchOptions.limit!) {
    console.log(`💡 Showing top ${searchOptions.limit} results. Use --limit to see more.`);
  }
  
  console.log(`💡 Use 'kc show <id>' to view full snapshot details.`);
}

async function displayJsonResults(results: SearchResult[], searchOptions: SearchOptions): Promise<void> {
  const jsonResults = {
    query: searchOptions.query,
    options: {
      fields: searchOptions.fields,
      tags: searchOptions.tags,
      regex: searchOptions.regex,
      since: searchOptions.since,
      until: searchOptions.until,
      limit: searchOptions.limit,
      caseSensitive: searchOptions.caseSensitive
    },
    resultCount: results.length,
    results: results.map(result => ({
      snapshot: {
        id: result.snapshot.id,
        title: result.snapshot.title,
        timestamp: result.snapshot.timestamp,
        step: result.snapshot.step,
        tags: result.snapshot.tags,
        cwd: result.snapshot.cwd,
        gitBranch: result.snapshot.gitBranch,
        gitCommit: result.snapshot.gitCommit
      },
      score: result.score,
      highlights: result.highlights,
      filename: result.filename
    }))
  };

  console.log(JSON.stringify(jsonResults, null, 2));
}

function parseTags(tagsStr: string): string[] {
  // Parse comma or space separated tags
  return tagsStr
    .split(/[,\s]+/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .slice(0, 10); // Limit to 10 tags for performance
}

function buildFiltersDescription(options: SearchOptions): string {
  const filters: string[] = [];
  
  if (options.tags && options.tags.length > 0) {
    filters.push(`tags: ${options.tags.join(', ')}`);
  }
  
  if (options.since) {
    filters.push(`since: ${options.since}`);
  }
  
  if (options.until) {
    filters.push(`until: ${options.until}`);
  }
  
  if (options.regex) {
    filters.push('regex mode');
  }
  
  if (options.caseSensitive) {
    filters.push('case-sensitive');
  }
  
  return filters.length > 0 ? ` (${filters.join(', ')})` : '';
}

function getHighlightedTitle(result: SearchResult): string {
  const titleHighlight = result.highlights.find(h => h.field === 'title');
  
  if (titleHighlight && titleHighlight.matches.length > 0) {
    const highlighted = SearchIndex.highlightText(titleHighlight.text, titleHighlight.matches);
    return highlighted.replace(/[\x00-\x1F\x7F]/g, ""); // Sanitize after highlighting
  }
  
  // Fallback to plain title
  const title = result.snapshot.title || "Untitled";
  return title.replace(/[\x00-\x1F\x7F]/g, ""); // Sanitize
}

function getContextSnippet(
  text: string, 
  matches: Array<{ start: number; end: number }>,
  maxLength: number = 150
): string | null {
  if (!text || matches.length === 0) return null;

  // Get the first match for snippet
  const firstMatch = matches[0];
  const matchStart = firstMatch.start;
  const matchEnd = firstMatch.end;
  
  // Calculate snippet boundaries
  const snippetStart = Math.max(0, matchStart - Math.floor(maxLength / 3));
  const snippetEnd = Math.min(text.length, matchEnd + Math.floor(maxLength * 2 / 3));
  
  let snippet = text.substring(snippetStart, snippetEnd);
  
  // Add ellipsis if truncated
  if (snippetStart > 0) snippet = "..." + snippet;
  if (snippetEnd < text.length) snippet = snippet + "...";
  
  // Highlight matches within the snippet
  const adjustedMatches = matches
    .filter(match => match.start >= snippetStart && match.end <= snippetEnd)
    .map(match => ({
      start: match.start - snippetStart + (snippetStart > 0 ? 3 : 0), // Account for "..."
      end: match.end - snippetStart + (snippetStart > 0 ? 3 : 0)
    }));
  
  const highlighted = SearchIndex.highlightText(snippet, adjustedMatches);
  
  // Clean up and truncate if still too long
  return highlighted
    .replace(/[\x00-\x1F\x7F]/g, "")
    .substring(0, maxLength + 20); // Allow some extra for markup
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function formatDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month} ${day} ${hours}:${minutes}`;
}

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: SearchCommandOptions = {};
  let query = "";
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--all":
        options.all = true;
        break;
      case "--tags":
      case "-t":
        options.tags = args[++i];
        break;
      case "--regex":
      case "-r":
        options.regex = true;
        break;
      case "--since":
        options.since = args[++i];
        break;
      case "--until":
        options.until = args[++i];
        break;
      case "--limit":
      case "-n":
        const limitValue = parseInt(args[++i], 10);
        if (isNaN(limitValue) || limitValue < 1) {
          console.error("❌ Invalid limit value. Must be a positive number.");
          process.exit(1);
        }
        options.limit = limitValue;
        break;
      case "--json":
        options.json = true;
        break;
      case "--case-sensitive":
      case "-c":
        options.caseSensitive = true;
        break;
      case "--suggestions":
        options.suggestions = true;
        break;
      case "--help":
      case "-h":
        console.log(`Usage: kc search <query> [options]

Search snapshots using full-text search

Arguments:
  <query>              Search query (required)

Options:
  --all                Search all fields (title, context, decisions, steps, tags)
  -t, --tags <tags>    Filter by tags (comma/space separated)
  -r, --regex          Use regular expressions
  --since <date>       Only search snapshots since date (YYYY-MM-DD or relative like "7 days ago")
  --until <date>       Only search snapshots until date
  -n, --limit <num>    Maximum number of results (default: 10)
  --json               Output as JSON
  -c, --case-sensitive Case-sensitive search
  --suggestions        Get search suggestions for partial query
  -h, --help           Show this help message

Examples:
  kc search "authentication"              # Search in titles
  kc search --all "JWT token"             # Search in all fields
  kc search --tags backend "database"     # Search with tag filter
  kc search --regex "fix.*bug"            # Regular expression search
  kc search --since "2025-01-01" "user"   # Search recent snapshots
  kc search --suggestions "auth"          # Get search suggestions`);
        process.exit(0);
      default:
        if (!args[i].startsWith('-')) {
          if (query) {
            query += " " + args[i]; // Multi-word queries
          } else {
            query = args[i];
          }
        }
        break;
    }
  }
  
  search(query, options);
}