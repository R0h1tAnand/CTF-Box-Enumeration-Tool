import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ResponsiveContainer.css';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
  fluid?: boolean;
  safeArea?: boolean;
  animate?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'lg',
  padding = 'md',
  center = true,
  fluid = false,
  safeArea = true,
  animate = false
}) => {
  const classes = [
    'responsive-container',
    `responsive-container--${maxWidth}`,
    `responsive-container--padding-${padding}`,
    center ? 'responsive-container--center' : '',
    fluid ? 'responsive-container--fluid' : '',
    safeArea ? 'responsive-container--safe-area' : '',
    className
  ].filter(Boolean).join(' ');

  return animate ? (
    <motion.div 
      className={classes}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  ) : (
    <div className={classes}>
      {children}
    </div>
  );
};

// Enhanced hook for responsive breakpoints with more features
export const useResponsive = () => {
  type Breakpoint = 'xs' | 'sm' | 'mobile' | 'tablet' | 'desktop' | 'lg' | 'xl' | '2xl';
  
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [touchDevice, setTouchDevice] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersDarkMode, setPrefersDarkMode] = useState(false);
  
  // Debounce function for resize events
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    const timeoutRef = useRef<number | null>(null);
    
    return (...args: Parameters<T>) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = window.setTimeout(() => {
        func(...args);
      }, wait);
    };
  };

  // Update all responsive states
  const updateResponsiveState = useCallback(() => {
    // Update window size
    const width = window.innerWidth;
    const height = window.innerHeight;
    setWindowSize({ width, height });
    
    // Update orientation
    setOrientation(width > height ? 'landscape' : 'portrait');
    
    // Update breakpoint
    if (width < 480) {
      setBreakpoint('xs');
    } else if (width < 640) {
      setBreakpoint('sm');
    } else if (width < 768) {
      setBreakpoint('mobile');
    } else if (width < 1024) {
      setBreakpoint('tablet');
    } else if (width < 1280) {
      setBreakpoint('desktop');
    } else if (width < 1536) {
      setBreakpoint('xl');
    } else {
      setBreakpoint('2xl');
    }
    
    // Check if touch device
    setTouchDevice(
      'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 || 
      (navigator as any).msMaxTouchPoints > 0
    );
  }, []);
  
  // Debounced version of updateResponsiveState
  const debouncedUpdateResponsiveState = debounce(updateResponsiveState, 200);

  useEffect(() => {
    // Initial update
    updateResponsiveState();
    
    // Set up event listeners
    window.addEventListener('resize', debouncedUpdateResponsiveState);
    window.addEventListener('orientationchange', updateResponsiveState);
    
    // Check for reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    // Check for dark mode preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDarkMode(darkModeQuery.matches);
    
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setPrefersDarkMode(e.matches);
    };
    
    // Add media query listeners
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', handleMotionChange);
      darkModeQuery.addEventListener('change', handleDarkModeChange);
    } else {
      // Fallback for older browsers
      motionQuery.addListener(handleMotionChange);
      darkModeQuery.addListener(handleDarkModeChange);
    }
    
    // Clean up
    return () => {
      window.removeEventListener('resize', debouncedUpdateResponsiveState);
      window.removeEventListener('orientationchange', updateResponsiveState);
      
      if (typeof motionQuery.removeEventListener === 'function') {
        motionQuery.removeEventListener('change', handleMotionChange);
        darkModeQuery.removeEventListener('change', handleDarkModeChange);
      } else {
        // Fallback for older browsers
        motionQuery.removeListener(handleMotionChange);
        darkModeQuery.removeListener(handleDarkModeChange);
      }
    };
  }, [updateResponsiveState, debouncedUpdateResponsiveState]);

  return {
    // Basic breakpoint info
    breakpoint,
    isMobile: breakpoint === 'mobile' || breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop' || breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
    isMobileOrTablet: breakpoint === 'mobile' || breakpoint === 'tablet' || breakpoint === 'xs' || breakpoint === 'sm',
    
    // Detailed breakpoints
    isXs: breakpoint === 'xs',
    isSm: breakpoint === 'sm',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl',
    is2xl: breakpoint === '2xl',
    
    // Window size
    windowWidth: windowSize.width,
    windowHeight: windowSize.height,
    
    // Orientation
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    
    // Device capabilities
    isTouchDevice: touchDevice,
    prefersReducedMotion,
    prefersDarkMode,
    
    // Utility methods
    lessThan: (size: Breakpoint) => {
      const sizes = ['xs', 'sm', 'mobile', 'tablet', 'desktop', 'lg', 'xl', '2xl'];
      return sizes.indexOf(breakpoint) < sizes.indexOf(size);
    },
    greaterThan: (size: Breakpoint) => {
      const sizes = ['xs', 'sm', 'mobile', 'tablet', 'desktop', 'lg', 'xl', '2xl'];
      return sizes.indexOf(breakpoint) > sizes.indexOf(size);
    }
  };
};

// Enhanced responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    mobile?: number;
    tablet?: number;
    desktop?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rowGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  columnGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  autoRows?: 'auto' | 'min' | 'max' | 'fr';
  minItemWidth?: string;
  animate?: boolean;
  staggerChildren?: boolean;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { xs: 1, sm: 1, mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  rowGap,
  columnGap,
  className = '',
  autoRows = 'auto',
  minItemWidth,
  animate = false,
  staggerChildren = false,
  alignItems,
  justifyItems
}) => {
  const classes = [
    'responsive-grid',
    gap !== 'none' && !rowGap && !columnGap ? `responsive-grid--gap-${gap}` : '',
    rowGap && rowGap !== 'none' ? `responsive-grid--row-gap-${rowGap}` : '',
    columnGap && columnGap !== 'none' ? `responsive-grid--column-gap-${columnGap}` : '',
    alignItems ? `responsive-grid--align-${alignItems}` : '',
    justifyItems ? `responsive-grid--justify-${justifyItems}` : '',
    className
  ].filter(Boolean).join(' ');

  const style = {
    '--grid-cols-xs': columns.xs || 1,
    '--grid-cols-sm': columns.sm || columns.xs || 1,
    '--grid-cols-mobile': columns.mobile || columns.sm || columns.xs || 1,
    '--grid-cols-tablet': columns.tablet || columns.mobile || 2,
    '--grid-cols-desktop': columns.desktop || columns.tablet || 3,
    '--grid-cols-lg': columns.lg || columns.desktop || 3,
    '--grid-cols-xl': columns.xl || columns.lg || 4,
    '--grid-auto-rows': autoRows === 'fr' ? '1fr' : `${autoRows}-content`,
    ...(minItemWidth ? { '--grid-min-item-width': minItemWidth } : {})
  } as React.CSSProperties;

  // For auto-fill grid with minItemWidth
  const gridTemplateStyle = minItemWidth ? {
    gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}, 1fr))`
  } : {};

  if (!animate) {
    return (
      <div className={classes} style={{ ...style, ...gridTemplateStyle }}>
        {children}
      </div>
    );
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerChildren ? 0.1 : 0
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    }
  };

  return (
    <motion.div
      className={classes}
      style={{ ...style, ...gridTemplateStyle }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {staggerChildren
        ? React.Children.map(children, (child, index) => (
            <motion.div key={index} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
};

// Enhanced responsive text component
interface ResponsiveTextProps {
  children: React.ReactNode;
  size?: {
    xs?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    sm?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    mobile?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    tablet?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    desktop?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  };
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  className?: string;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  color?: 'primary' | 'secondary' | 'accent' | 'muted' | 'error' | 'warning' | 'success' | 'info';
  align?: 'left' | 'center' | 'right' | 'justify';
  truncate?: boolean;
  lineClamp?: number;
  animate?: boolean;
  animationType?: 'fade' | 'slide' | 'typewriter';
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  size = { mobile: 'base', tablet: 'base', desktop: 'base' },
  weight = 'normal',
  className = '',
  as: Component = 'p',
  color,
  align,
  truncate = false,
  lineClamp,
  animate = false,
  animationType = 'fade'
}) => {
  const classes = [
    'responsive-text',
    `responsive-text--weight-${weight}`,
    size.xs && `responsive-text--xs-${size.xs}`,
    size.sm && `responsive-text--sm-${size.sm}`,
    size.mobile && `responsive-text--mobile-${size.mobile}`,
    size.tablet && `responsive-text--tablet-${size.tablet}`,
    size.desktop && `responsive-text--desktop-${size.desktop}`,
    color && `responsive-text--color-${color}`,
    align && `responsive-text--align-${align}`,
    truncate && 'responsive-text--truncate',
    lineClamp && 'responsive-text--line-clamp',
    className
  ].filter(Boolean).join(' ');

  const style = lineClamp ? { '--line-clamp': lineClamp } as React.CSSProperties : {};

  if (!animate) {
    return (
      <Component className={classes} style={style}>
        {children}
      </Component>
    );
  }

  // Animation variants
  const getAnimationVariants = () => {
    switch (animationType) {
      case 'slide':
        return {
          hidden: { opacity: 0, y: 20 },
          visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
              type: 'spring',
              stiffness: 300,
              damping: 30
            }
          }
        };
      case 'typewriter':
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 }
        };
      case 'fade':
      default:
        return {
          hidden: { opacity: 0 },
          visible: { 
            opacity: 1,
            transition: { duration: 0.5 }
          }
        };
    }
  };

  // For typewriter effect
  const renderTypewriterText = () => {
    if (typeof children !== 'string') {
      return children;
    }

    return (
      <>
        {children.split('').map((char, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03 }}
          >
            {char}
          </motion.span>
        ))}
      </>
    );
  };

  return (
    <motion.div
      className={classes}
      style={style}
      variants={getAnimationVariants()}
      initial="hidden"
      animate="visible"
      as={Component}
    >
      {animationType === 'typewriter' ? renderTypewriterText() : children}
    </motion.div>
  );
};