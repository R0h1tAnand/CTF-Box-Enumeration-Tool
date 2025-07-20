import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LoadingAnimation.css';

interface LoadingAnimationProps {
  type?: 'spinner' | 'pulse' | 'dots' | 'scan' | 'cyber' | 'terminal';
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
  showMessage?: boolean;
  typingEffect?: boolean;
}

const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

const pulseVariants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

const dotsVariants = {
  animate: {
    transition: {
      staggerChildren: 0.2,
      repeat: Infinity,
      repeatType: 'loop' as const
    }
  }
};

const dotVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      ease: 'easeInOut'
    }
  }
};

const scanLineVariants = {
  animate: {
    x: ['-100%', '100%'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

const cyberHexVariants = {
  initial: {
    opacity: 0,
    scale: 0
  },
  animate: (i: number) => ({
    opacity: [0.3, 1, 0.3],
    scale: [0.8, 1, 0.8],
    transition: {
      duration: 3,
      repeat: Infinity,
      delay: i * 0.1,
      ease: 'easeInOut'
    }
  })
};

const terminalCursorVariants = {
  animate: {
    opacity: [1, 0, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'steps(1)'
    }
  }
};

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  type = 'spinner',
  size = 'medium',
  message,
  className = '',
  showMessage = true,
  typingEffect = false
}) => {
  const renderAnimation = () => {
    switch (type) {
      case 'spinner':
        return (
          <motion.div
            className={`loading-spinner loading-${size}`}
            variants={spinnerVariants}
            animate="animate"
          >
            <div className="spinner-ring"></div>
          </motion.div>
        );

      case 'pulse':
        return (
          <motion.div
            className={`loading-pulse loading-${size}`}
            variants={pulseVariants}
            animate="animate"
          >
            <div className="pulse-circle"></div>
          </motion.div>
        );

      case 'dots':
        return (
          <motion.div
            className={`loading-dots loading-${size}`}
            variants={dotsVariants}
            animate="animate"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="dot"
                variants={dotVariants}
              />
            ))}
          </motion.div>
        );

      case 'scan':
        return (
          <div className={`loading-scan loading-${size}`}>
            <div className="scan-container">
              <motion.div
                className="scan-line"
                variants={scanLineVariants}
                animate="animate"
              />
              <div className="scan-grid">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="scan-dot"
                    initial={{ opacity: 0.3 }}
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.1
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'cyber':
        return (
          <div className={`loading-cyber loading-${size}`}>
            <div className="cyber-container">
              <div className="cyber-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="cyber-hex"
                    custom={i}
                    variants={cyberHexVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <div className="cyber-hex-inner" />
                  </motion.div>
                ))}
              </div>
              <motion.div 
                className="cyber-circle"
                animate={{
                  rotate: 360,
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  rotate: {
                    duration: 8,
                    repeat: Infinity,
                    ease: 'linear'
                  },
                  scale: {
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }
                }}
              />
            </div>
          </div>
        );
        
      case 'terminal':
        return (
          <div className={`loading-terminal loading-${size}`}>
            <div className="terminal-container">
              <div className="terminal-header">
                <div className="terminal-buttons">
                  <div className="terminal-button terminal-button--close" />
                  <div className="terminal-button terminal-button--minimize" />
                  <div className="terminal-button terminal-button--maximize" />
                </div>
                <div className="terminal-title">scan.exe</div>
              </div>
              <div className="terminal-body">
                <div className="terminal-line">
                  <span className="terminal-prompt">$</span>
                  <span className="terminal-command">
                    {message || 'running scan'}
                  </span>
                  <motion.span 
                    className="terminal-cursor"
                    variants={terminalCursorVariants}
                    animate="animate"
                  >_</motion.span>
                </div>
                <div className="terminal-output">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <motion.div 
                      key={i}
                      className="terminal-output-line"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + (i * 0.1) }}
                    >
                      {i === 0 && 'Initializing scan...'}
                      {i === 1 && 'Connecting to target...'}
                      {i === 2 && 'Processing data...'}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Typing effect for message
  const renderMessage = () => {
    if (!message || !showMessage) return null;
    
    if (typingEffect) {
      return (
        <motion.div className="loading-message-container">
          <motion.p className="loading-message">
            {message.split('').map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + (i * 0.03) }}
              >
                {char}
              </motion.span>
            ))}
          </motion.p>
          <motion.span 
            className="loading-message-cursor"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'steps(1)' }}
          >_</motion.span>
        </motion.div>
      );
    }
    
    return (
      <motion.p
        className="loading-message"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.p>
    );
  };

  return (
    <div className={`loading-animation ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={type}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          {renderAnimation()}
        </motion.div>
      </AnimatePresence>
      {showMessage && renderMessage()}
    </div>
  );
};

export default LoadingAnimation;