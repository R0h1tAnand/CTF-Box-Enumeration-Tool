import React, { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import './Input.css';

export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputSize = 'sm' | 'md' | 'lg';

interface BaseInputProps {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

interface InputProps extends BaseInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    variant = 'default',
    size = 'md',
    label,
    error,
    helperText,
    required = false,
    fullWidth = false,
    startIcon,
    endIcon,
    className = '',
    id,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    const baseClasses = 'input-field';
    const variantClass = `input-field--${variant}`;
    const sizeClass = `input-field--${size}`;
    const fullWidthClass = fullWidth ? 'input-field--full-width' : '';
    const errorClass = error ? 'input-field--error' : '';
    const focusedClass = isFocused ? 'input-field--focused' : '';
    const hasIconsClass = (startIcon || endIcon) ? 'input-field--with-icons' : '';
    
    const wrapperClasses = [
      'input-wrapper',
      fullWidthClass,
      className
    ].filter(Boolean).join(' ');
    
    const fieldClasses = [
      baseClasses,
      variantClass,
      sizeClass,
      errorClass,
      focusedClass,
      hasIconsClass
    ].filter(Boolean).join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <motion.label 
            htmlFor={inputId}
            className="input-label"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
            {required && <span className="input-label__required">*</span>}
          </motion.label>
        )}
        
        <div className="input-container">
          {startIcon && (
            <div className="input-icon input-icon--start">
              {startIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={fieldClasses}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          
          {endIcon && (
            <div className="input-icon input-icon--end">
              {endIcon}
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <motion.div 
            className={`input-message ${error ? 'input-message--error' : 'input-message--helper'}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error || helperText}
          </motion.div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends BaseInputProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    variant = 'default',
    size = 'md',
    label,
    error,
    helperText,
    required = false,
    fullWidth = false,
    resize = 'vertical',
    className = '',
    id,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    
    const baseClasses = 'textarea-field';
    const variantClass = `textarea-field--${variant}`;
    const sizeClass = `textarea-field--${size}`;
    const fullWidthClass = fullWidth ? 'textarea-field--full-width' : '';
    const errorClass = error ? 'textarea-field--error' : '';
    const focusedClass = isFocused ? 'textarea-field--focused' : '';
    const resizeClass = `textarea-field--resize-${resize}`;
    
    const wrapperClasses = [
      'input-wrapper',
      fullWidthClass,
      className
    ].filter(Boolean).join(' ');
    
    const fieldClasses = [
      baseClasses,
      variantClass,
      sizeClass,
      errorClass,
      focusedClass,
      resizeClass
    ].filter(Boolean).join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <motion.label 
            htmlFor={textareaId}
            className="input-label"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
            {required && <span className="input-label__required">*</span>}
          </motion.label>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          className={fieldClasses}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        
        {(error || helperText) && (
          <motion.div 
            className={`input-message ${error ? 'input-message--error' : 'input-message--helper'}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error || helperText}
          </motion.div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';