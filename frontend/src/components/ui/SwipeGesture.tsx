import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import './SwipeGesture.css';

interface SwipeGestureProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
  disabled?: boolean;
  showIndicator?: boolean;
  indicatorType?: 'arrow' | 'dot' | 'pill' | 'custom';
  indicatorContent?: React.ReactNode;
  dragLock?: 'x' | 'y' | 'none';
  hapticFeedback?: boolean;
  swipeDistance?: number; // How far the swipe can go (percentage of container width)
  onSwipeStart?: () => void;
  onSwipeCancel?: () => void;
  disableOnDesktop?: boolean;
}

export const SwipeGesture: React.FC<SwipeGestureProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className = '',
  disabled = false,
  showIndicator = false,
  indicatorType = 'arrow',
  indicatorContent,
  dragLock = 'none',
  hapticFeedback = true,
  swipeDistance = 25, // 25% of container width
  onSwipeStart,
  onSwipeCancel,
  disableOnDesktop = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Check if we're on desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  // Determine if swipe gestures should be disabled
  const shouldDisableSwipe = disabled || (disableOnDesktop && isDesktop);
  
  // Transform values for visual feedback
  const opacity = useTransform(
    x,
    [-threshold * 2, -threshold, 0, threshold, threshold * 2],
    [0.3, 0.7, 1, 0.7, 0.3]
  );
  
  const scale = useTransform(
    x,
    [-threshold * 2, -threshold, 0, threshold, threshold * 2],
    [0.95, 0.97, 1, 0.97, 0.95]
  );
  
  const rotate = useTransform(
    x,
    [-threshold * 2, -threshold, 0, threshold, threshold * 2],
    [-2, -1, 0, 1, 2]
  );
  
  const handleDragStart = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (shouldDisableSwipe) return;
    
    setIsDragging(true);
    setSwipeDirection(null);
    
    if (onSwipeStart) {
      onSwipeStart();
    }
  }, [shouldDisableSwipe, onSwipeStart]);

  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (shouldDisableSwipe) return;
    
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    
    // Determine swipe direction during drag for visual feedback
    if (absX > absY && absX > threshold / 2) {
      setSwipeDirection(offset.x > 0 ? 'right' : 'left');
    } else if (absY > absX && absY > threshold / 2) {
      setSwipeDirection(offset.y > 0 ? 'down' : 'up');
    } else {
      setSwipeDirection(null);
    }
  }, [shouldDisableSwipe, threshold]);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (shouldDisableSwipe) return;
    
    setIsDragging(false);
    
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    const absVelX = Math.abs(velocity.x);
    const absVelY = Math.abs(velocity.y);
    
    // Consider both distance and velocity for swipe detection
    const isSwipe = 
      (absX > threshold || absVelX > 500) || 
      (absY > threshold || absVelY > 500);
    
    if (!isSwipe) {
      if (onSwipeCancel) {
        onSwipeCancel();
      }
      setSwipeDirection(null);
      x.set(0);
      y.set(0);
      return;
    }
    
    // Determine if it's a horizontal or vertical swipe
    if (absX > absY) {
      // Horizontal swipe
      if (offset.x > 0 && onSwipeRight) {
        triggerHapticFeedback();
        onSwipeRight();
      } else if (offset.x < 0 && onSwipeLeft) {
        triggerHapticFeedback();
        onSwipeLeft();
      }
    } else {
      // Vertical swipe
      if (offset.y > 0 && onSwipeDown) {
        triggerHapticFeedback();
        onSwipeDown();
      } else if (offset.y < 0 && onSwipeUp) {
        triggerHapticFeedback();
        onSwipeUp();
      }
    }
    
    // Reset position
    setSwipeDirection(null);
    x.set(0);
    y.set(0);
  }, [shouldDisableSwipe, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeCancel, x, y]);

  // Trigger haptic feedback if available
  const triggerHapticFeedback = () => {
    if (hapticFeedback && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch (e) {
        // Vibration API not supported or disabled
      }
    }
  };

  // Calculate drag constraints based on container size and swipeDistance
  const getDragConstraints = () => {
    if (!containerRef.current) {
      return { left: 0, right: 0, top: 0, bottom: 0 };
    }
    
    const { width, height } = containerRef.current.getBoundingClientRect();
    const horizontalLimit = (width * swipeDistance) / 100;
    const verticalLimit = (height * swipeDistance) / 100;
    
    return {
      left: -horizontalLimit,
      right: horizontalLimit,
      top: -verticalLimit,
      bottom: verticalLimit
    };
  };

  // Determine drag axis based on dragLock prop
  const getDragDirectionLock = () => {
    switch (dragLock) {
      case 'x': return true;
      case 'y': return true;
      default: return false;
    }
  };

  // Render appropriate indicator based on type
  const renderIndicator = () => {
    if (indicatorContent) {
      return indicatorContent;
    }
    
    switch (indicatorType) {
      case 'arrow':
        return (
          <div className="swipe-indicator__arrow">
            {swipeDirection === 'left' && <span>←</span>}
            {swipeDirection === 'right' && <span>→</span>}
            {swipeDirection === 'up' && <span>↑</span>}
            {swipeDirection === 'down' && <span>↓</span>}
            {!swipeDirection && <span>↔</span>}
          </div>
        );
      case 'dot':
        return <div className="swipe-indicator__dot" />;
      case 'pill':
        return (
          <div className="swipe-indicator__pill">
            <div className="swipe-indicator__pill-inner" />
          </div>
        );
      default:
        return <div className="swipe-indicator__default">↔</div>;
    }
  };

  return (
    <motion.div
      ref={containerRef}
      className={`swipe-gesture ${className} ${isDragging ? 'is-dragging' : ''} ${swipeDirection ? `swipe-direction-${swipeDirection}` : ''}`}
      drag={!shouldDisableSwipe}
      dragDirectionLock={getDragDirectionLock()}
      dragConstraints={getDragConstraints()}
      dragElastic={0.2}
      dragMomentum={true}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{ 
        x: dragLock === 'y' ? 0 : x, 
        y: dragLock === 'x' ? 0 : y, 
        opacity: showIndicator ? opacity : 1,
        scale: isDragging ? scale : 1,
        rotate: isDragging ? rotate : 0,
        cursor: shouldDisableSwipe ? 'default' : isDragging ? 'grabbing' : 'grab'
      }}
      whileDrag={{ 
        cursor: 'grabbing',
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30
      }}
      data-swipe-enabled={!shouldDisableSwipe}
      data-swipe-direction={swipeDirection || 'none'}
    >
      {children}
      
      <AnimatePresence>
        {showIndicator && isDragging && (
          <motion.div
            className={`swipe-indicator swipe-indicator--${indicatorType}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.9, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {renderIndicator()}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Visual hints for available swipe directions */}
      {!shouldDisableSwipe && (
        <>
          {onSwipeLeft && <div className="swipe-hint swipe-hint--left" aria-hidden="true" />}
          {onSwipeRight && <div className="swipe-hint swipe-hint--right" aria-hidden="true" />}
          {onSwipeUp && <div className="swipe-hint swipe-hint--up" aria-hidden="true" />}
          {onSwipeDown && <div className="swipe-hint swipe-hint--down" aria-hidden="true" />}
        </>
      )}
    </motion.div>
  );
};

// Hook for swipe detection without component wrapper
export const useSwipeGesture = (
  element: React.RefObject<HTMLElement>,
  options: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    threshold?: number;
    disabled?: boolean;
  }
) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    disabled = false
  } = options;

  React.useEffect(() => {
    if (!element.current || disabled) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!e.changedTouches.length) return;

      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;

      // Ignore if too slow (likely not a swipe)
      if (deltaTime > 300) return;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine swipe direction
      if (absX > absY && absX > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else if (absY > absX && absY > threshold) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    };

    const el = element.current;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, disabled]);
};

// Swipeable tabs component
interface SwipeableTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const SwipeableTabs: React.FC<SwipeableTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  
  const handleSwipeLeft = useCallback(() => {
    const nextIndex = (activeIndex + 1) % tabs.length;
    onTabChange(tabs[nextIndex].id);
  }, [activeIndex, tabs, onTabChange]);
  
  const handleSwipeRight = useCallback(() => {
    const prevIndex = activeIndex === 0 ? tabs.length - 1 : activeIndex - 1;
    onTabChange(tabs[prevIndex].id);
  }, [activeIndex, tabs, onTabChange]);

  const activeTab_content = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={`swipeable-tabs ${className}`}>
      <div className="swipeable-tabs__header">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            className={`swipeable-tabs__tab ${tab.id === activeTab ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <SwipeGesture
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        className="swipeable-tabs__content"
        showIndicator={true}
      >
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab_content}
        </motion.div>
      </SwipeGesture>
      
      <div className="swipeable-tabs__indicators">
        {tabs.map((_, index) => (
          <div
            key={index}
            className={`indicator ${index === activeIndex ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
};