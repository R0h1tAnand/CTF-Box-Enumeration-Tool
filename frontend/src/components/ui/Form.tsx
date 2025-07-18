import React, { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import './Form.css';

interface FormProps extends HTMLMotionProps<'form'> {
  children: React.ReactNode;
  spacing?: 'sm' | 'md' | 'lg';
}

export const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ children, spacing = 'md', className = '', ...props }, ref) => {
    const baseClasses = 'form';
    const spacingClass = `form--spacing-${spacing}`;
    
    const classes = [
      baseClasses,
      spacingClass,
      className
    ].filter(Boolean).join(' ');

    return (
      <motion.form
        ref={ref}
        className={classes}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        {...props}
      >
        {children}
      </motion.form>
    );
  }
);

Form.displayName = 'Form';

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({ children, className = '' }) => (
  <div className={`form-group ${className}`}>
    {children}
  </div>
);

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export const FormRow: React.FC<FormRowProps> = ({ 
  children, 
  className = '', 
  columns = 2 
}) => (
  <div className={`form-row form-row--${columns}-cols ${className}`}>
    {children}
  </div>
);

interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

export const FormActions: React.FC<FormActionsProps> = ({ 
  children, 
  className = '', 
  align = 'right' 
}) => (
  <div className={`form-actions form-actions--${align} ${className}`}>
    {children}
  </div>
);

interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ 
  children, 
  title, 
  description, 
  className = '' 
}) => (
  <motion.div 
    className={`form-section ${className}`}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    {title && (
      <div className="form-section__header">
        <h3 className="form-section__title">{title}</h3>
        {description && (
          <p className="form-section__description">{description}</p>
        )}
      </div>
    )}
    <div className="form-section__content">
      {children}
    </div>
  </motion.div>
);

interface FormErrorProps {
  children: React.ReactNode;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ children, className = '' }) => (
  <motion.div 
    className={`form-error ${className}`}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.2 }}
  >
    <div className="form-error__icon">⚠️</div>
    <div className="form-error__message">{children}</div>
  </motion.div>
);

interface FormSuccessProps {
  children: React.ReactNode;
  className?: string;
}

export const FormSuccess: React.FC<FormSuccessProps> = ({ children, className = '' }) => (
  <motion.div 
    className={`form-success ${className}`}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.2 }}
  >
    <div className="form-success__icon">✅</div>
    <div className="form-success__message">{children}</div>
  </motion.div>
);