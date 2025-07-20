import React from 'react';

/**
 * Highlights occurrences of a search term within a text string by wrapping them in a span with a highlight class.
 * 
 * @param text The text to search within
 * @param searchTerm The term to highlight
 * @returns React elements with highlighted search terms
 */
export function highlightText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm || !text) {
    return text;
  }
  
  try {
    // Escape special regex characters in the search term
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    
    // Split the text by the search term
    const parts = text.split(regex);
    
    // Map each part to either plain text or highlighted span
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return <span key={index} className="highlight">{part}</span>;
      }
      return part;
    });
  } catch (error) {
    // In case of any regex errors, return the original text
    console.error('Error highlighting text:', error);
    return text;
  }
}

/**
 * Calculates a relevance score for a text based on how well it matches a search term.
 * Higher scores indicate better matches.
 * 
 * @param text The text to evaluate
 * @param searchTerm The search term to match against
 * @returns A relevance score (higher is better)
 */
export function calculateRelevance(text: string, searchTerm: string): number {
  if (!searchTerm || !text) {
    return 0;
  }
  
  const lowerText = text.toLowerCase();
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  // Base score: number of occurrences
  const occurrences = (lowerText.match(new RegExp(lowerSearchTerm, 'g')) || []).length;
  
  // Bonus for exact matches
  const exactMatchBonus = lowerText === lowerSearchTerm ? 10 : 0;
  
  // Bonus for matches at the beginning
  const startsWithBonus = lowerText.startsWith(lowerSearchTerm) ? 5 : 0;
  
  // Bonus for matches of whole words
  const wordBoundaryRegex = new RegExp(`\\b${lowerSearchTerm}\\b`, 'g');
  const wholeWordMatches = (lowerText.match(wordBoundaryRegex) || []).length;
  const wholeWordBonus = wholeWordMatches * 3;
  
  return occurrences + exactMatchBonus + startsWithBonus + wholeWordBonus;
}