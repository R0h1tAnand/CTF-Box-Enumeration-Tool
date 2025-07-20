import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import './FadeSlideAnimation.css';

interface FadeSlideAnimationProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  delay?: number;
  distance?: number;
  show?: boolean;
  className?: string;
  stagger?: boolean;
  staggerDelay?: number;
  animationType?: 'fade' | 'slide' | 'zoom' | 'flip' | 'bounce' | 'elastic';
}

// Define different animation variants
const getVariants = (direction: string, distance: number, animationType: string): Variants => {
  const directions = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance }
  };

  const directionProps = directions[direction as keyof typeof directions];

  // Base variants for different animation types
  const animationVariants = {
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slide: {
      hidden: { opacity: 0, ...directionProps },
      visible: { opacity: 1, x: 0, y: 0 },
      exit: { opacity: 0, ...directionProps }
    },
    zoom: {
      hidden: { opacity: 0, scale: direction === 'up' || direction === 'left' ? 0.8 : 1.2 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: direction === 'up' || direction === 'left' ? 0.8 : 1.2 }
    },
    flip: {
      hidden: { 
        opacity: 0, 
        rotateX: direction === 'up' || direction === 'down' ? 90 : 0,
        rotateY: direction === 'left' || direction === 'right' ? 90 : 0
      },
      visible: { 
        opacity: 1, 
        rotateX: 0,
        rotateY: 0
      },
      exit: { 
        opacity: 0, 
        rotateX: direction === 'up' || direction === 'down' ? -90 : 0,
        rotateY: direction === 'left' || direction === 'right' ? -90 : 0
      }
    },
    bounce: {
      hidden: { opacity: 0, ...directionProps, scale: 0.9 },
      visible: { 
        opacity: 1, 
        x: 0, 
        y: 0, 
        scale: [0.9, 1.1, 1],
        transition: { 
          type: 'spring',
          stiffness: 300,
          damping: 10
        }
      },
      exit: { opacity: 0, ...directionProps, scale: 0.9 }
    },
    elastic: {
      hidden: { opacity: 0, ...directionProps },
      visible: { 
        opacity: 1, 
        x: 0, 
        y: 0,
        transition: { 
          type: 'spring',
          stiffness: 400,
          damping: 15
        }
      },
      exit: { opacity: 0, ...directionProps }
    }
  };

  return animationVariants[animationType as keyof typeof animationVariants] || animationVariants.slide;
};

// Define transition presets
const getTransition = (animationType: string, duration: number, delay: number) => {
  const transitions = {
    fade: { 
      duration, 
      delay, 
      ease: [0.4, 0.0, 0.2, 1] 
    },
    slide: { 
      duration, 
      delay, 
      ease: [0.4, 0.0, 0.2, 1] 
    },
    zoom: { 
      type: 'spring', 
      stiffness: 400, 
      damping: 30, 
      delay 
    },
    flip: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 20, 
      delay 
    },
    bounce: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 10, 
      delay 
    },
    elastic: { 
      type: 'spring', 
      stiffness: 400, 
      damping: 15, 
      delay 
    }
  };

  return transitions[animationType as keyof typeof transitions] || transitions.slide;
};

export const FadeSlideAnimation: React.FC<FadeSlideAnimationProps> = ({
  children,
  direction = 'up',
  duration = 0.3,
  delay = 0,
  distance = 20,
  show = true,
  className = '',
  stagger = false,
  staggerDelay = 0.1,
  animationType = 'slide'
}) => {
  const variants = getVariants(direction, distance, animationType);
  const transition = getTransition(animationType, duration, delay);

  if (stagger && React.Children.count(children) > 1) {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            className={`fade-slide-animation ${className}`}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{
              staggerChildren: staggerDelay,
              delayChildren: delay
            }}
          >
            {React.Children.map(children, (child, index) => (
              <motion.div
                key={index}
                variants={variants}
                transition={transition}
                className="fade-slide-animation__item"
              >
                {child}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`fade-slide-animation ${className}`}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          transition={transition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Specialized components for common use cases
export const FadeInUp: React.FC<Omit<FadeSlideAnimationProps, 'direction'>> = (props) => (
  <FadeSlideAnimation {...props} direction="up" />
);

export const FadeInDown: React.FC<Omit<FadeSlideAnimationProps, 'direction'>> = (props) => (
  <FadeSlideAnimation {...props} direction="down" />
);

export const FadeInLeft: React.FC<Omit<FadeSlideAnimationProps, 'direction'>> = (props) => (
  <FadeSlideAnimation {...props} direction="left" />
);

export const FadeInRight: React.FC<Omit<FadeSlideAnimationProps, 'direction'>> = (props) => (
  <FadeSlideAnimation {...props} direction="right" />
);

// Animation with specific types
export const ZoomIn: React.FC<Omit<FadeSlideAnimationProps, 'animationType'>> = (props) => (
  <FadeSlideAnimation {...props} animationType="zoom" />
);

export const FlipIn: React.FC<Omit<FadeSlideAnimationProps, 'animationType'>> = (props) => (
  <FadeSlideAnimation {...props} animationType="flip" />
);

export const BounceIn: React.FC<Omit<FadeSlideAnimationProps, 'animationType'>> = (props) => (
  <FadeSlideAnimation {...props} animationType="bounce" />
);

export const ElasticIn: React.FC<Omit<FadeSlideAnimationProps, 'animationType'>> = (props) => (
  <FadeSlideAnimation {...props} animationType="elastic" />
);

// Staggered list animation
interface StaggeredListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  itemDelay?: number;
  animationType?: 'fade' | 'slide' | 'zoom' | 'flip' | 'bounce' | 'elastic';
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  className = '',
  staggerDelay = 0.1,
  itemDelay = 0,
  animationType = 'slide',
  direction = 'up'
}) => {
  // Get appropriate variants based on animation type
  const getItemVariants = (): Variants => {
    switch (animationType) {
      case 'fade':
        return {
          hidden: { opacity: 0 },
          visible: { 
            opacity: 1,
            transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
          }
        };
      case 'zoom':
        return {
          hidden: { opacity: 0, scale: 0.5 },
          visible: { 
            opacity: 1, 
            scale: 1,
            transition: { type: 'spring', stiffness: 400, damping: 30 }
          }
        };
      case 'flip':
        return {
          hidden: { 
            opacity: 0, 
            rotateX: direction === 'up' || direction === 'down' ? 90 : 0,
            rotateY: direction === 'left' || direction === 'right' ? 90 : 0
          },
          visible: { 
            opacity: 1, 
            rotateX: 0,
            rotateY: 0,
            transition: { type: 'spring', stiffness: 300, damping: 20 }
          }
        };
      case 'bounce':
        return {
          hidden: { 
            opacity: 0, 
            y: direction === 'up' ? 50 : direction === 'down' ? -50 : 0,
            x: direction === 'left' ? 50 : direction === 'right' ? -50 : 0,
            scale: 0.9 
          },
          visible: { 
            opacity: 1, 
            y: 0, 
            x: 0,
            scale: [0.9, 1.1, 1],
            transition: { type: 'spring', stiffness: 300, damping: 10 }
          }
        };
      case 'elastic':
        return {
          hidden: { 
            opacity: 0, 
            y: direction === 'up' ? 50 : direction === 'down' ? -50 : 0,
            x: direction === 'left' ? 50 : direction === 'right' ? -50 : 0
          },
          visible: { 
            opacity: 1, 
            y: 0, 
            x: 0,
            transition: { type: 'spring', stiffness: 400, damping: 15 }
          }
        };
      default: // slide
        return {
          hidden: { 
            opacity: 0, 
            y: direction === 'up' ? 20 : direction === 'down' ? -20 : 0,
            x: direction === 'left' ? 20 : direction === 'right' ? -20 : 0,
            scale: 0.95
          },
          visible: { 
            opacity: 1, 
            y: 0,
            x: 0,
            scale: 1,
            transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
          }
        };
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: itemDelay
      }
    }
  };

  const itemVariants = getItemVariants();

  return (
    <motion.div
      className={`staggered-list ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          className="staggered-list__item"
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Reveal animation for text
interface RevealTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  staggerDelay?: number;
  inline?: boolean;
}

export const RevealText: React.FC<RevealTextProps> = ({
  text,
  className = '',
  delay = 0,
  duration = 0.05,
  staggerDelay = 0.01,
  inline = false
}) => {
  const words = text.split(' ');
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { 
        staggerChildren: staggerDelay,
        delayChildren: delay * i 
      }
    })
  };
  
  const child = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 200
      }
    }
  };
  
  return (
    <motion.div
      className={`reveal-text ${className}`}
      style={{ display: inline ? 'inline-block' : 'block' }}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          className="reveal-text__word"
          variants={child}
          style={{ display: 'inline-block', marginRight: '0.25em' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

export default FadeSlideAnimation;