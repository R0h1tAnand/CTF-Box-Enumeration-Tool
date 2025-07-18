import React from 'react';
import { motion } from 'framer-motion';
import './ProgressBar.css';

export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressVariant = 'default' | 'success' | 'warning' | 'error';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: ProgressSize;
  variant?: ProgressVariant;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = true,
  striped = false,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const baseClasses = 'progress-bar';
  const sizeClass = `progress-bar--${size}`;
  const variantClass = `progress-bar--${variant}`;
  const stripedClass = striped ? 'progress-bar--striped' : '';
  const animatedClass = animated ? 'progress-bar--animated' : '';
  
  const wrapperClasses = [
    'progress-wrapper',
    className
  ].filter(Boolean).join(' ');
  
  const barClasses = [
    baseClasses,
    sizeClass,
    variantClass,
    stripedClass,
    animatedClass
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      {(showLabel || label) && (
        <div className="progress-label">
          <span className="progress-label__text">
            {label || `${Math.round(percentage)}%`}
          </span>
          {showLabel && !label && (
            <span className="progress-label__percentage">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div className={barClasses}>
        <motion.div
          className="progress-bar__fill"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            duration: animated ? 0.5 : 0,
            ease: 'easeOut'
          }}
        />
        
        {striped && (
          <div className="progress-bar__stripes" />
        )}
      </div>
    </div>
  );
};

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  variant = 'default',
  showLabel = true,
  label,
  animated = true,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const variantColors = {
    default: 'var(--accent-color)',
    success: 'var(--success-color)',
    warning: 'var(--warning-color)',
    error: 'var(--error-color)'
  };

  return (
    <div className={`circular-progress ${className}`}>
      <svg
        width={size}
        height={size}
        className="circular-progress__svg"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={strokeWidth}
          className="circular-progress__background"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={variantColors[variant]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={`circular-progress__fill circular-progress__fill--${variant}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ 
            duration: animated ? 1 : 0,
            ease: 'easeOut'
          }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      
      {showLabel && (
        <div className="circular-progress__label">
          <span className="circular-progress__text">
            {label || `${Math.round(percentage)}%`}
          </span>
        </div>
      )}
    </div>
  );
};

interface StepProgressProps {
  steps: Array<{
    label: string;
    completed?: boolean;
    active?: boolean;
    error?: boolean;
  }>;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  className = ''
}) => {
  return (
    <div className={`step-progress ${className}`}>
      {steps.map((step, index) => (
        <div key={index} className="step-progress__item">
          <motion.div 
            className={`step-progress__indicator ${
              step.completed ? 'step-progress__indicator--completed' : ''
            } ${
              step.active ? 'step-progress__indicator--active' : ''
            } ${
              step.error ? 'step-progress__indicator--error' : ''
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {step.completed ? (
              <motion.div
                className="step-progress__check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                ✓
              </motion.div>
            ) : step.error ? (
              <motion.div
                className="step-progress__error"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                ✕
              </motion.div>
            ) : (
              <span className="step-progress__number">{index + 1}</span>
            )}
          </motion.div>
          
          <motion.div 
            className="step-progress__label"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.1 }}
          >
            {step.label}
          </motion.div>
          
          {index < steps.length - 1 && (
            <div className="step-progress__connector">
              <motion.div
                className={`step-progress__line ${
                  step.completed ? 'step-progress__line--completed' : ''
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: step.completed ? 1 : 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};