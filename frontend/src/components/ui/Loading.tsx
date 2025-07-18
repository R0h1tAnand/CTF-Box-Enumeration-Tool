import React from 'react';
import { motion } from 'framer-motion';
import './Loading.css';

export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'bars';

interface LoadingProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  color?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  variant = 'spinner',
  color,
  className = '' 
}) => {
  const baseClasses = 'loading';
  const sizeClass = `loading--${size}`;
  const variantClass = `loading--${variant}`;
  
  const classes = [
    baseClasses,
    sizeClass,
    variantClass,
    className
  ].filter(Boolean).join(' ');

  const style = color ? { color } : {};

  if (variant === 'spinner') {
    return (
      <motion.div 
        className={classes}
        style={style}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <div className="loading__spinner" />
      </motion.div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={classes} style={style}>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="loading__dot"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: index * 0.2
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <motion.div 
        className={classes}
        style={style}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        <div className="loading__pulse" />
      </motion.div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={classes} style={style}>
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            className="loading__bar"
            animate={{
              scaleY: [1, 2, 1]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.1
            }}
          />
        ))}
      </div>
    );
  }

  return null;
};

interface SpinnerProps {
  size?: LoadingSize;
  color?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = (props) => (
  <Loading variant="spinner" {...props} />
);

interface LoadingOverlayProps {
  visible: boolean;
  children?: React.ReactNode;
  size?: LoadingSize;
  variant?: LoadingVariant;
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  children,
  size = 'lg',
  variant = 'spinner',
  message,
  className = ''
}) => {
  if (!visible) return <>{children}</>;

  return (
    <div className={`loading-overlay ${className}`}>
      <motion.div 
        className="loading-overlay__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div 
        className="loading-overlay__content"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <Loading size={size} variant={variant} />
        {message && (
          <motion.p 
            className="loading-overlay__message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {message}
          </motion.p>
        )}
      </motion.div>
      {children && (
        <div className="loading-overlay__children">
          {children}
        </div>
      )}
    </div>
  );
};

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  size?: LoadingSize;
  className?: string;
  [key: string]: any;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  loadingText,
  size = 'sm',
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`loading-button ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={size} />}
      <span className={loading ? 'loading-button__text--loading' : 'loading-button__text'}>
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  );
};