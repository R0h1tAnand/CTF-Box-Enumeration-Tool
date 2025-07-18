import React, { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    fullWidth = false, 
    disabled,
    children, 
    className = '',
    ...props 
  }, ref) => {
    const baseClasses = 'btn';
    const variantClass = `btn--${variant}`;
    const sizeClass = `btn--${size}`;
    const fullWidthClass = fullWidth ? 'btn--full-width' : '';
    const loadingClass = loading ? 'btn--loading' : '';
    
    const classes = [
      baseClasses,
      variantClass,
      sizeClass,
      fullWidthClass,
      loadingClass,
      className
    ].filter(Boolean).join(' ');

    return (
      <motion.button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {loading && (
          <motion.div
            className="btn__spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
        <span className={loading ? 'btn__content--loading' : 'btn__content'}>
          {children}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';