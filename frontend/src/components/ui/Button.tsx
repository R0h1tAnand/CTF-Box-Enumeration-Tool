import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { motion, type HTMLMotionProps, AnimatePresence } from 'framer-motion';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'info';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonAnimation = 'ripple' | 'pulse' | 'glow' | 'shine' | 'none';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  animation?: ButtonAnimation;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children: React.ReactNode;
  elevated?: boolean;
  rounded?: boolean;
  active?: boolean;
}

interface RippleEffect {
  id: number;
  x: number;
  y: number;
  size: number;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    fullWidth = false, 
    animation = 'ripple',
    iconLeft,
    iconRight,
    disabled,
    children, 
    className = '',
    onClick,
    elevated = false,
    rounded = false,
    active = false,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = useState<RippleEffect[]>([]);
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    
    // Merge refs
    const mergedRef = (node: HTMLButtonElement) => {
      // Forward the ref
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      
      // Set our local ref
      buttonRef.current = node;
    };
    
    const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (animation !== 'ripple' || disabled || loading) return;
      
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      
      // Calculate ripple size based on the button's diagonal
      const diagonal = Math.sqrt(rect.width * rect.width + rect.height * rect.height);
      const size = diagonal * 2;
      
      // Calculate ripple position
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;
      
      const newRipple: RippleEffect = {
        id: Date.now(),
        x,
        y,
        size
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 850);
    }, [animation, disabled, loading]);
    
    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      createRipple(event);
      onClick?.(event);
    }, [createRipple, onClick]);
    
    // Handle keyboard activation for accessibility
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        setIsPressed(true);
        
        // Create a centered ripple for keyboard activation
        if (animation === 'ripple' && buttonRef.current && !disabled && !loading) {
          const button = buttonRef.current;
          const rect = button.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height) * 2;
          
          const newRipple: RippleEffect = {
            id: Date.now(),
            x: rect.width / 2 - size / 2,
            y: rect.height / 2 - size / 2,
            size
          };
          
          setRipples(prev => [...prev, newRipple]);
          
          setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== newRipple.id));
          }, 850);
        }
      }
    }, [animation, disabled, loading]);
    
    const handleKeyUp = useCallback(() => {
      setIsPressed(false);
    }, []);

    // Clean up ripples when component unmounts
    useEffect(() => {
      return () => {
        setRipples([]);
      };
    }, []);

    const baseClasses = 'btn';
    const variantClass = `btn--${variant}`;
    const sizeClass = `btn--${size}`;
    const fullWidthClass = fullWidth ? 'btn--full-width' : '';
    const loadingClass = loading ? 'btn--loading' : '';
    const animationClass = animation !== 'none' ? `btn--${animation}` : '';
    const elevatedClass = elevated ? 'btn--elevated' : '';
    const roundedClass = rounded ? 'btn--rounded' : '';
    const activeClass = active ? 'btn--active' : '';
    const hasIconClass = (iconLeft || iconRight) ? 'btn--with-icon' : '';
    
    const classes = [
      baseClasses,
      variantClass,
      sizeClass,
      fullWidthClass,
      loadingClass,
      animationClass,
      elevatedClass,
      roundedClass,
      activeClass,
      hasIconClass,
      className
    ].filter(Boolean).join(' ');

    // Animation variants for hover and tap effects
    const buttonVariants = {
      initial: { 
        scale: 1,
        boxShadow: elevated ? '0 2px 5px rgba(0, 0, 0, 0.2)' : 'none'
      },
      hover: { 
        scale: disabled || loading ? 1 : 1.02,
        boxShadow: elevated ? '0 4px 10px rgba(0, 0, 0, 0.25)' : 'none'
      },
      tap: { 
        scale: disabled || loading ? 1 : 0.98,
        boxShadow: elevated ? '0 1px 3px rgba(0, 0, 0, 0.15)' : 'none'
      }
    };

    return (
      <motion.button
        ref={mergedRef}
        className={classes}
        disabled={disabled || loading}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        transition={{ 
          type: 'spring', 
          stiffness: 400, 
          damping: 15 
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        data-state={
          loading ? 'loading' : 
          disabled ? 'disabled' : 
          isPressed ? 'pressed' : 
          isHovered ? 'hovered' : 
          isFocused ? 'focused' : 
          active ? 'active' : 
          'idle'
        }
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <motion.div
            className="btn__spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
        
        {/* Button content with icons */}
        <span className={loading ? 'btn__content--loading' : 'btn__content'}>
          {iconLeft && <span className="btn__icon btn__icon--left">{iconLeft}</span>}
          <span className="btn__label">{children}</span>
          {iconRight && <span className="btn__icon btn__icon--right">{iconRight}</span>}
        </span>
        
        {/* Ripple effect */}
        {animation === 'ripple' && (
          <div className="btn__ripple-container">
            <AnimatePresence>
              {ripples.map((ripple) => (
                <motion.div
                  key={ripple.id}
                  className="btn__ripple"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: ripple.size,
                    height: ripple.size
                  }}
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
        
        {/* Shine effect */}
        {animation === 'shine' && isHovered && !disabled && !loading && (
          <motion.div 
            className="btn__shine"
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '100%', opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        )}
        
        {/* Glow effect */}
        {animation === 'glow' && (isHovered || isFocused) && !disabled && !loading && (
          <motion.div 
            className="btn__glow"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1.1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
          />
        )}
        
        {/* Pulse effect */}
        {animation === 'pulse' && isHovered && !disabled && !loading && (
          <motion.div 
            className="btn__pulse"
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.7, 0.3, 0.7]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';