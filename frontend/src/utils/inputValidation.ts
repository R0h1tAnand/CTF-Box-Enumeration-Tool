/**
 * Input validation and sanitization utilities for frontend
 */

/**
 * Sanitize a string to prevent XSS attacks
 * @param value String to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (value: string): string => {
  if (!value) return '';
  
  // Create a temporary DOM element
  const temp = document.createElement('div');
  
  // Set the value as text content (which escapes HTML)
  temp.textContent = value;
  
  // Return the escaped HTML
  return temp.innerHTML;
};

/**
 * Sanitize HTML content
 * @param value HTML string to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (value: string): string => {
  if (!value) return '';
  
  // Create a temporary DOM element
  const temp = document.createElement('div');
  
  // Set the value as HTML
  temp.innerHTML = value;
  
  // Remove script tags
  const scripts = temp.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // Remove on* event attributes from all elements
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(el => {
    const attributes = el.attributes;
    for (let i = attributes.length - 1; i >= 0; i--) {
      const attr = attributes[i];
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
      
      // Remove javascript: URLs
      if (attr.name === 'href' || attr.name === 'src') {
        const value = attr.value.toLowerCase();
        if (value.startsWith('javascript:') || value.startsWith('data:')) {
          el.removeAttribute(attr.name);
        }
      }
    }
  });
  
  return temp.innerHTML;
};

/**
 * Validate an email address
 * @param email Email to validate
 * @returns True if valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email);
};

/**
 * Validate a password for strength
 * @param password Password to validate
 * @returns Object with validation result
 */
export const validatePassword = (password: string): { 
  isValid: boolean; 
  strength: number; 
  message: string;
} => {
  if (!password) {
    return { isValid: false, strength: 0, message: 'Password is required' };
  }
  
  let strength = 0;
  let message = '';
  
  // Check length
  if (password.length < 8) {
    message = 'Password must be at least 8 characters long';
    return { isValid: false, strength: 10, message };
  } else {
    strength += 25;
  }
  
  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    message = 'Password must contain at least one uppercase letter';
    return { isValid: false, strength: strength, message };
  } else {
    strength += 25;
  }
  
  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    message = 'Password must contain at least one lowercase letter';
    return { isValid: false, strength: strength, message };
  } else {
    strength += 25;
  }
  
  // Check for numbers
  if (!/\d/.test(password)) {
    message = 'Password must contain at least one number';
    return { isValid: false, strength: strength, message };
  } else {
    strength += 25;
  }
  
  // Additional strength checks (not required but improve strength)
  if (password.length >= 12) strength += 10;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 10;
  if (/[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{3,}/.test(password)) strength += 5;
  
  // Cap strength at 100
  strength = Math.min(strength, 100);
  
  return { 
    isValid: true, 
    strength, 
    message: strength < 70 ? 'Consider a stronger password' : 'Password is strong' 
  };
};

/**
 * Validate an IP address (IPv4 or IPv6)
 * @param ip IP address to validate
 * @returns True if valid, false otherwise
 */
export const validateIpAddress = (ip: string): boolean => {
  if (!ip) return false;
  
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * Validate a hostname
 * @param hostname Hostname to validate
 * @returns True if valid, false otherwise
 */
export const validateHostname = (hostname: string): boolean => {
  if (!hostname) return false;
  
  // Hostname regex
  const hostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
  
  return hostnameRegex.test(hostname);
};

/**
 * Validate a scan target (IP address or hostname)
 * @param target Target to validate
 * @returns True if valid, false otherwise
 */
export const validateScanTarget = (target: string): boolean => {
  if (!target) return false;
  
  return validateIpAddress(target) || validateHostname(target);
};

/**
 * Validate a port or port range
 * @param ports Port or port range to validate (e.g., "80", "80-443", "80,443")
 * @returns True if valid, false otherwise
 */
export const validatePorts = (ports: string): boolean => {
  if (!ports) return false;
  
  // Port range regex (e.g., "80", "80-443", "80,443,8080-8090")
  const portRangeRegex = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;
  
  if (!portRangeRegex.test(ports)) {
    return false;
  }
  
  // Check individual ports and ranges
  const portParts = ports.split(',');
  
  for (const part of portParts) {
    if (part.includes('-')) {
      // Port range
      const [start, end] = part.split('-').map(Number);
      
      if (isNaN(start) || isNaN(end) || start < 1 || start > 65535 || end < 1 || end > 65535 || start > end) {
        return false;
      }
    } else {
      // Single port
      const port = Number(part);
      
      if (isNaN(port) || port < 1 || port > 65535) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Validate a URL
 * @param url URL to validate
 * @returns True if valid, false otherwise
 */
export const validateUrl = (url: string): boolean => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate a username
 * @param username Username to validate
 * @returns True if valid, false otherwise
 */
export const validateUsername = (username: string): boolean => {
  if (!username) return false;
  
  // Username regex (alphanumeric, underscore, hyphen, 3-80 chars)
  const usernameRegex = /^[a-zA-Z0-9_-]{3,80}$/;
  
  return usernameRegex.test(username);
};

/**
 * Enhanced validation rules for the FormValidation component
 */
export const ValidationRulesEnhanced = {
  // Username validation with enhanced security
  username: [
    {
      test: (value: string) => value.trim().length >= 3,
      message: 'Username must be at least 3 characters',
      type: 'error',
      priority: 100
    },
    {
      test: (value: string) => value.trim().length <= 80,
      message: 'Username must be no more than 80 characters',
      type: 'error',
      priority: 90
    },
    {
      test: (value: string) => /^[a-zA-Z0-9_-]+$/.test(value),
      message: 'Username can only contain letters, numbers, underscores, and hyphens',
      type: 'error',
      priority: 80
    }
  ],
  
  // Enhanced password validation
  password: [
    {
      test: (value: string) => value.length >= 8,
      message: 'Password must be at least 8 characters',
      type: 'error',
      priority: 100
    },
    {
      test: (value: string) => /[A-Z]/.test(value),
      message: 'Password must contain at least one uppercase letter',
      type: 'error',
      priority: 90
    },
    {
      test: (value: string) => /[a-z]/.test(value),
      message: 'Password must contain at least one lowercase letter',
      type: 'error',
      priority: 90
    },
    {
      test: (value: string) => /\d/.test(value),
      message: 'Password must contain at least one number',
      type: 'error',
      priority: 90
    },
    {
      test: (value: string) => /[!@#$%^&*(),.?":{}|<>]/.test(value),
      message: 'Consider adding special characters for extra security',
      type: 'warning',
      priority: 70
    },
    {
      test: (value: string) => value.length >= 12,
      message: 'Using 12+ characters greatly increases security',
      type: 'info',
      priority: 60
    },
    {
      test: (value: string) => !/(.)\1{2,}/.test(value),
      message: 'Avoid repeating characters (e.g., "aaa", "111")',
      type: 'warning',
      priority: 50
    },
    {
      test: (value: string) => !/^(password|admin|user|root|123456|qwerty)/i.test(value),
      message: 'Avoid common password patterns',
      type: 'warning',
      priority: 50
    }
  ],
  
  // Enhanced email validation
  email: [
    {
      test: (value: string) => !!value.trim(),
      message: 'Email is required',
      type: 'error',
      priority: 100
    },
    {
      test: validateEmail,
      message: 'Please enter a valid email address',
      type: 'error',
      priority: 90
    }
  ],
  
  // Scan target validation
  scanTarget: [
    {
      test: (value: string) => !!value.trim(),
      message: 'Target is required',
      type: 'error',
      priority: 100
    },
    {
      test: validateScanTarget,
      message: 'Please enter a valid IP address or hostname',
      type: 'error',
      priority: 90
    },
    {
      test: (value: string) => !/(localhost|127\.0\.0\.1|::1)/.test(value),
      message: 'Scanning localhost is not allowed',
      type: 'error',
      priority: 80
    },
    {
      test: (value: string) => !/(^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\.)/.test(value),
      message: 'Scanning private networks is not allowed',
      type: 'error',
      priority: 80
    }
  ],
  
  // Port validation
  ports: [
    {
      test: (value: string) => !!value.trim(),
      message: 'Ports are required',
      type: 'error',
      priority: 100
    },
    {
      test: validatePorts,
      message: 'Please enter valid ports (e.g., "80", "80-443", "80,443")',
      type: 'error',
      priority: 90
    }
  ]
};