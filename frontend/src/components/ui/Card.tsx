import React, { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import './Card.css';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: CardVariant;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    variant = 'default', 
    hoverable = false, 
    padding = 'md',
    children, 
    className = '',
    ...props 
  }, ref) => {
    const baseClasses = 'card';
    const variantClass = `card--${variant}`;
    const paddingClass = `card--padding-${padding}`;
    const hoverableClass = hoverable ? 'card--hoverable' : '';
    
    const classes = [
      baseClasses,
      variantClass,
      paddingClass,
      hoverableClass,
      className
    ].filter(Boolean).join(' ');

    const hoverAnimation = hoverable ? {
      whileHover: { 
        y: -4,
        transition: { duration: 0.2 }
      },
      whileTap: { 
        scale: 0.98,
        transition: { duration: 0.1 }
      }
    } : {};

    return (
      <motion.div
        ref={ref}
        className={classes}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        {...hoverAnimation}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`card__header ${className}`}>
    {children}
  </div>
);

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => (
  <div className={`card__body ${className}`}>
    {children}
  </div>
);

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`card__footer ${className}`}>
    {children}
  </div>
);

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle: React.FC<CardTitleProps> = ({ 
  children, 
  className = '', 
  as: Component = 'h3' 
}) => (
  <Component className={`card__title ${className}`}>
    {children}
  </Component>
);

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = '' }) => (
  <p className={`card__description ${className}`}>
    {children}
  </p>
);