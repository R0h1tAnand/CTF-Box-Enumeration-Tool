/**
 * Format a date string for display
 * @param dateString ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
};

/**
 * Calculate duration between two dates
 * @param startDate Start date ISO string
 * @param endDate End date ISO string
 * @returns Formatted duration string
 */
export const calculateDuration = (startDate?: string, endDate?: string): string => {
  if (!startDate || !endDate) return 'N/A';
  
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const durationMs = end - start;
  
  // Format duration
  if (durationMs < 0) return 'Invalid duration';
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
  
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m ${seconds}s`;
};

/**
 * Format a date for use in form inputs (YYYY-MM-DD)
 * @param date Date object or ISO string
 * @returns Formatted date string (YYYY-MM-DD)
 */
export const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param dateString ISO date string
 * @returns Relative time string
 */
export const getRelativeTimeString = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return rtf.format(-days, 'day');
  } else if (hours > 0) {
    return rtf.format(-hours, 'hour');
  } else if (minutes > 0) {
    return rtf.format(-minutes, 'minute');
  } else {
    return rtf.format(-seconds, 'second');
  }
};