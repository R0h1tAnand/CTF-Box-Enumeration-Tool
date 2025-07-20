import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import './FormValidation.css';

export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
  type?: 'error' | 'warning' | 'info';
  priority?: number; // Higher number = higher priority
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  infos: string[];
  strength?: number; // 0-100 for password strength or other metrics
}

interface FormValidationProps {
  value: string;
  rules: ValidationRule[];
  showValidation?: boolean;
  realTime?: boolean;
  className?: string;
  children?: React.ReactNode;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
  showStrengthMeter?: boolean;
  successMessage?: string;
  animationType?: 'slide' | 'fade' | 'scale';
  onValidationChange?: (result: ValidationResult) => void;
  inputId?: string; // To connect validation messages with input for accessibility
}

export const FormValidation: React.FC<FormValidationProps> = ({
  value,
  rules,
  showValidation = true,
  realTime = true,
  className = '',
  children,
  validateOnBlur = false,
  validateOnMount = false,
  showStrengthMeter = false,
  successMessage = 'Looks good!',
  animationType = 'slide',
  onValidationChange,
  inputId
}) => {
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
    infos: [],
    strength: 0
  });
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const [hasBeenBlurred, setHasBeenBlurred] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const controls = useAnimation();
  
  // Calculate validation result
  const validateValue = useCallback((val: string): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];
    let passedRules = 0;

    // Sort rules by priority if specified
    const sortedRules = [...rules].sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );

    sortedRules.forEach(rule => {
      const passes = rule.test(val);
      
      if (!passes) {
        if (rule.type === 'warning') {
          warnings.push(rule.message);
        } else if (rule.type === 'info') {
          infos.push(rule.message);
        } else {
          errors.push(rule.message);
        }
      } else {
        passedRules++;
      }
    });

    // Calculate strength as percentage of passed rules
    const strength = rules.length > 0 
      ? Math.round((passedRules / rules.length) * 100) 
      : 0;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
      strength
    };
  }, [rules]);

  // Handle validation on value change
  useEffect(() => {
    // Clear any existing timer
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }
    
    if (value.length > 0) {
      setIsTyping(true);
      
      // Set a timer to detect when user stops typing
      typingTimer.current = setTimeout(() => {
        setIsTyping(false);
      }, 500);
    }
    
    const shouldValidate = 
      (realTime && value.length > 0) || 
      (validateOnBlur && hasBeenBlurred) ||
      (validateOnMount) ||
      hasBeenTouched;
    
    if (shouldValidate) {
      const result = validateValue(value);
      setValidation(result);
      
      // Notify parent component of validation change
      if (onValidationChange) {
        onValidationChange(result);
      }
      
      // Shake effect for errors
      if (result.errors.length > 0 && hasBeenTouched) {
        controls.start({
          x: [0, -5, 5, -5, 0],
          transition: { duration: 0.4 }
        });
      }
    }
    
    // Mark as touched if value changes
    if (value.length > 0 && !hasBeenTouched) {
      setHasBeenTouched(true);
    }
    
    // Cleanup timer on unmount
    return () => {
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
    };
  }, [value, validateValue, realTime, hasBeenTouched, hasBeenBlurred, validateOnMount, onValidationChange, controls]);

  // Handle blur event
  const handleBlur = useCallback(() => {
    setHasBeenBlurred(true);
    setIsTyping(false);
    
    if (validateOnBlur) {
      const result = validateValue(value);
      setValidation(result);
      
      if (onValidationChange) {
        onValidationChange(result);
      }
    }
  }, [validateOnBlur, validateValue, value, onValidationChange]);

  // Determine if validation should be shown
  const shouldShowValidation = showValidation && (
    (realTime && !isTyping) || 
    hasBeenTouched || 
    hasBeenBlurred || 
    validateOnMount
  );

  // Get animation variants based on animation type
  const getAnimationVariants = () => {
    switch (animationType) {
      case 'fade':
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
          exit: { opacity: 0 }
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.8 },
          visible: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.8 }
        };
      case 'slide':
      default:
        return {
          hidden: { opacity: 0, height: 0, y: -10 },
          visible: { opacity: 1, height: 'auto', y: 0 },
          exit: { opacity: 0, height: 0, y: -10 }
        };
    }
  };

  // Get strength meter color
  const getStrengthColor = (strength: number) => {
    if (strength < 30) return 'var(--color-error)';
    if (strength < 70) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  // Get strength label
  const getStrengthLabel = (strength: number) => {
    if (strength < 30) return 'Weak';
    if (strength < 70) return 'Moderate';
    return 'Strong';
  };

  const animationVariants = getAnimationVariants();

  return (
    <motion.div 
      className={`form-validation ${className}`}
      animate={controls}
    >
      {children}
      
      <AnimatePresence>
        {shouldShowValidation && (validation.errors.length > 0 || validation.warnings.length > 0 || validation.infos.length > 0) && (
          <motion.div
            className="validation-messages"
            variants={animationVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="alert"
            aria-live="polite"
            {...(inputId ? { 'aria-describedby': `${inputId}-validation` } : {})}
          >
            {validation.errors.map((error, index) => (
              <motion.div
                key={`error-${index}`}
                className="validation-message validation-message--error"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                id={inputId ? `${inputId}-error-${index}` : undefined}
              >
                <span className="validation-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </span>
                <span className="validation-text">{error}</span>
              </motion.div>
            ))}
            
            {validation.warnings.map((warning, index) => (
              <motion.div
                key={`warning-${index}`}
                className="validation-message validation-message--warning"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (validation.errors.length + index) * 0.05 }}
                id={inputId ? `${inputId}-warning-${index}` : undefined}
              >
                <span className="validation-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                  </svg>
                </span>
                <span className="validation-text">{warning}</span>
              </motion.div>
            ))}
            
            {validation.infos.map((info, index) => (
              <motion.div
                key={`info-${index}`}
                className="validation-message validation-message--info"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (validation.errors.length + validation.warnings.length + index) * 0.05 }}
                id={inputId ? `${inputId}-info-${index}` : undefined}
              >
                <span className="validation-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                </span>
                <span className="validation-text">{info}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {shouldShowValidation && validation.isValid && value.length > 0 && !isTyping && (
          <motion.div
            className="validation-success"
            variants={animationVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            id={inputId ? `${inputId}-success` : undefined}
          >
            <span className="validation-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </span>
            <span className="validation-text">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Strength meter */}
      {showStrengthMeter && value.length > 0 && (
        <motion.div 
          className="validation-strength"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="validation-strength__meter">
            <motion.div 
              className="validation-strength__bar"
              initial={{ width: 0 }}
              animate={{ width: `${validation.strength}%` }}
              style={{ backgroundColor: getStrengthColor(validation.strength || 0) }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="validation-strength__label">
            {getStrengthLabel(validation.strength || 0)}
          </div>
        </motion.div>
      )}
      
      {/* Hidden input for blur detection */}
      <input 
        type="hidden" 
        onBlur={handleBlur} 
        style={{ display: 'none' }} 
        aria-hidden="true"
      />
    </motion.div>
  );
};

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value) => value.trim().length > 0,
    message,
    priority: 100 // Highest priority
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value) => value.length >= min,
    message: message || `Must be at least ${min} characters`,
    priority: 90
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value) => value.length <= max,
    message: message || `Must be no more than ${max} characters`,
    priority: 90
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
    priority: 80
  }),

  password: (message = 'Password must contain at least 8 characters, including uppercase, lowercase, and numbers'): ValidationRule => ({
    test: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(value),
    message,
    priority: 80
  }),

  passwordStrength: (): ValidationRule[] => [
    {
      test: (value) => value.length >= 8,
      message: 'At least 8 characters',
      type: 'error',
      priority: 90
    },
    {
      test: (value) => /[a-z]/.test(value),
      message: 'At least one lowercase letter',
      type: 'error',
      priority: 80
    },
    {
      test: (value) => /[A-Z]/.test(value),
      message: 'At least one uppercase letter',
      type: 'error',
      priority: 80
    },
    {
      test: (value) => /\d/.test(value),
      message: 'At least one number',
      type: 'error',
      priority: 80
    },
    {
      test: (value) => /[!@#$%^&*(),.?":{}|<>]/.test(value),
      message: 'Consider adding special characters for extra security',
      type: 'warning',
      priority: 70
    },
    {
      test: (value) => value.length >= 12,
      message: 'Using 12+ characters greatly increases security',
      type: 'info',
      priority: 60
    }
  ],

  ipAddress: (message = 'Please enter a valid IP address'): ValidationRule => ({
    test: (value) => {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      return ipv4Regex.test(value) || ipv6Regex.test(value);
    },
    message,
    priority: 80
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    test: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
    priority: 80
  }),

  numeric: (message = 'Please enter a valid number'): ValidationRule => ({
    test: (value) => !isNaN(Number(value)) && value.trim() !== '',
    message,
    priority: 80
  }),

  range: (min: number, max: number, message?: string): ValidationRule => ({
    test: (value) => {
      const num = Number(value);
      return !isNaN(num) && num >= min && num <= max;
    },
    message: message || `Must be between ${min} and ${max}`,
    priority: 80
  }),
  
  pattern: (regex: RegExp, message: string): ValidationRule => ({
    test: (value) => regex.test(value),
    message,
    priority: 80
  }),
  
  match: (valueToMatch: string, message = 'Values do not match'): ValidationRule => ({
    test: (value) => value === valueToMatch,
    message,
    priority: 85
  }),
  
  notMatch: (valueToNotMatch: string, message = 'Value cannot be the same'): ValidationRule => ({
    test: (value) => value !== valueToNotMatch,
    message,
    priority: 85
  })
};

// Hook for form validation
export const useFormValidation = (initialValues: Record<string, string> = {}) => {
  const [values, setValues] = useState(initialValues);
  const [validations, setValidations] = useState<Record<string, ValidationResult>>({});
  const [rules, setRules] = useState<Record<string, ValidationRule[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [blurred, setBlurred] = useState<Record<string, boolean>>({});

  const setFieldRules = useCallback((field: string, fieldRules: ValidationRule[]) => {
    setRules(prev => ({ ...prev, [field]: fieldRules }));
  }, []);

  const validateField = useCallback((field: string, value: string): ValidationResult => {
    const fieldRules = rules[field] || [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];
    let passedRules = 0;

    // Sort rules by priority if specified
    const sortedRules = [...fieldRules].sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );

    sortedRules.forEach(rule => {
      const passes = rule.test(value);
      
      if (!passes) {
        if (rule.type === 'warning') {
          warnings.push(rule.message);
        } else if (rule.type === 'info') {
          infos.push(rule.message);
        } else {
          errors.push(rule.message);
        }
      } else {
        passedRules++;
      }
    });

    // Calculate strength as percentage of passed rules
    const strength = fieldRules.length > 0 
      ? Math.round((passedRules / fieldRules.length) * 100) 
      : 0;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
      strength
    };
  }, [rules]);

  const setValue = useCallback((field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (rules[field]) {
      const validation = validateField(field, value);
      setValidations(prev => ({ ...prev, [field]: validation }));
    }
  }, [rules, validateField]);
  
  const setBlurred = useCallback((field: string) => {
    setBlurred(prev => ({ ...prev, [field]: true }));
    
    if (rules[field]) {
      const validation = validateField(field, values[field] || '');
      setValidations(prev => ({ ...prev, [field]: validation }));
    }
  }, [rules, validateField, values]);

  const validateAll = useCallback((): boolean => {
    const newValidations: Record<string, ValidationResult> = {};
    let isFormValid = true;

    Object.keys(rules).forEach(field => {
      const validation = validateField(field, values[field] || '');
      newValidations[field] = validation;
      if (!validation.isValid) {
        isFormValid = false;
      }
    });

    setValidations(newValidations);
    return isFormValid;
  }, [rules, values, validateField]);
  
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setTouched({});
    setBlurred({});
    setValidations({});
  }, [initialValues]);

  return {
    values,
    validations,
    touched,
    blurred,
    setValue,
    setBlurred,
    setFieldRules,
    validateAll,
    resetForm,
    isValid: Object.values(validations).every(v => v.isValid)
  };
};

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value) => value.trim().length > 0,
    message
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value) => value.length >= min,
    message: message || `Must be at least ${min} characters`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value) => value.length <= max,
    message: message || `Must be no more than ${max} characters`
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message
  }),

  password: (message = 'Password must contain at least 8 characters, including uppercase, lowercase, and numbers'): ValidationRule => ({
    test: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(value),
    message
  }),

  passwordStrength: (): ValidationRule[] => [
    {
      test: (value) => value.length >= 8,
      message: 'At least 8 characters',
      type: 'error'
    },
    {
      test: (value) => /[a-z]/.test(value),
      message: 'At least one lowercase letter',
      type: 'error'
    },
    {
      test: (value) => /[A-Z]/.test(value),
      message: 'At least one uppercase letter',
      type: 'error'
    },
    {
      test: (value) => /\d/.test(value),
      message: 'At least one number',
      type: 'error'
    },
    {
      test: (value) => /[!@#$%^&*(),.?":{}|<>]/.test(value),
      message: 'Consider adding special characters for extra security',
      type: 'warning'
    }
  ],

  ipAddress: (message = 'Please enter a valid IP address'): ValidationRule => ({
    test: (value) => {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      return ipv4Regex.test(value) || ipv6Regex.test(value);
    },
    message
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    test: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message
  }),

  numeric: (message = 'Please enter a valid number'): ValidationRule => ({
    test: (value) => !isNaN(Number(value)) && value.trim() !== '',
    message
  }),

  range: (min: number, max: number, message?: string): ValidationRule => ({
    test: (value) => {
      const num = Number(value);
      return !isNaN(num) && num >= min && num <= max;
    },
    message: message || `Must be between ${min} and ${max}`
  })
};

// Hook for form validation
export const useFormValidation = (initialValues: Record<string, string> = {}) => {
  const [values, setValues] = useState(initialValues);
  const [validations, setValidations] = useState<Record<string, ValidationResult>>({});
  const [rules, setRules] = useState<Record<string, ValidationRule[]>>({});

  const setFieldRules = useCallback((field: string, fieldRules: ValidationRule[]) => {
    setRules(prev => ({ ...prev, [field]: fieldRules }));
  }, []);

  const validateField = useCallback((field: string, value: string): ValidationResult => {
    const fieldRules = rules[field] || [];
    const errors: string[] = [];
    const warnings: string[] = [];

    fieldRules.forEach(rule => {
      if (!rule.test(value)) {
        if (rule.type === 'warning') {
          warnings.push(rule.message);
        } else {
          errors.push(rule.message);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [rules]);

  const setValue = useCallback((field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    if (rules[field]) {
      const validation = validateField(field, value);
      setValidations(prev => ({ ...prev, [field]: validation }));
    }
  }, [rules, validateField]);

  const validateAll = useCallback((): boolean => {
    const newValidations: Record<string, ValidationResult> = {};
    let isFormValid = true;

    Object.keys(rules).forEach(field => {
      const validation = validateField(field, values[field] || '');
      newValidations[field] = validation;
      if (!validation.isValid) {
        isFormValid = false;
      }
    });

    setValidations(newValidations);
    return isFormValid;
  }, [rules, values, validateField]);

  return {
    values,
    validations,
    setValue,
    setFieldRules,
    validateAll,
    isValid: Object.values(validations).every(v => v.isValid)
  };
};