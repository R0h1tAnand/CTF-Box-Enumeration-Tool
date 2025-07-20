import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

interface PageTransitionProps {
  children: React.ReactNode;
  transitionType?: 'fade' | 'slide' | 'zoom' | 'flip' | 'none';
  duration?: number;
}

// Define different transition variants
const transitionVariants = {
  fade: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  },
  slide: {
    initial: { opacity: 0, x: -50 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: 50 }
  },
  zoom: {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.05 }
  },
  flip: {
    initial: { opacity: 0, rotateY: -15 },
    in: { opacity: 1, rotateY: 0 },
    out: { opacity: 0, rotateY: 15 }
  },
  none: {
    initial: { opacity: 1 },
    in: { opacity: 1 },
    out: { opacity: 1 }
  }
};

// Define transition timing functions
const transitionTimings = {
  fade: { duration: 0.4, ease: [0.4, 0.0, 0.2, 1] },
  slide: { type: 'spring', stiffness: 300, damping: 30 },
  zoom: { type: 'spring', stiffness: 400, damping: 30 },
  flip: { type: 'spring', stiffness: 300, damping: 25 },
  none: { duration: 0 }
};

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  transitionType = 'slide',
  duration
}) => {
  const location = useLocation();
  const [isInitialRender, setIsInitialRender] = useState(true);
  
  // Skip animation on initial render for better performance
  useEffect(() => {
    if (isInitialRender) {
      setIsInitialRender(false);
    }
  }, []);

  // Get the appropriate variants and timing
  const variants = transitionVariants[transitionType];
  const timing = { 
    ...transitionTimings[transitionType],
    ...(duration ? { duration } : {})
  };

  // For initial page load, use a faster, simpler transition
  const initialTiming = { duration: 0.2, ease: 'easeOut' };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={variants}
        transition={isInitialRender ? initialTiming : timing}
        className="page-transition"
      >
        <div className="page-transition__content">
          {children}
        </div>
        
        {/* Optional page transition overlay effect */}
        {!isInitialRender && transitionType !== 'none' && (
          <motion.div 
            className="page-transition__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0.1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;