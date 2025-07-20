import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import './Toast.css';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  dismissible?: boolean;
  pauseOnHover?: boolean;
  animationType?: 'slide' | 'fade' | 'zoom' | 'flip';
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultPosition?: Toast['position'];
  defaultDuration?: number;
  defaultDismissible?: boolean;
  defaultPauseOnHover?: boolean;
  defaultAnimationType?: Toast['animationType'];
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  maxToasts = 5,
  defaultPosition = 'top-right',
  defaultDuration = 5000,
  defaultDismissible = true,
  defaultPauseOnHover = true,
  defaultAnimationType = 'slide'
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(toastTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? defaultDuration,
      position: toast.position ?? defaultPosition,
      dismissible: toast.dismissible ?? defaultDismissible,
      pauseOnHover: toast.pauseOnHover ?? defaultPauseOnHover,
      animationType: toast.animationType ?? defaultAnimationType
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    // Auto remove toast after duration
    if (newToast.duration > 0) {
      toastTimers.current[id] = setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  }, [maxToasts, defaultDuration, defaultPosition, defaultDismissible, defaultPauseOnHover, defaultAnimationType]);

  const removeToast = useCallback((id: string) => {
    // Clear the timeout if it exists
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
    
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
    
    // If duration is updated, reset the timer
    if (updates.duration !== undefined && updates.duration > 0) {
      if (toastTimers.current[id]) {
        clearTimeout(toastTimers.current[id]);
      }
      
      toastTimers.current[id] = setTimeout(() => {
        removeToast(id);
      }, updates.duration);
    }
  }, [removeToast]);

  const clearAll = useCallback(() => {
    // Clear all timeouts
    Object.values(toastTimers.current).forEach(timer => clearTimeout(timer));
    toastTimers.current = {};
    
    setToasts([]);
  }, []);

  // Group toasts by position
  const groupedToasts = toasts.reduce<Record<string, Toast[]>>((acc, toast) => {
    const position = toast.position || defaultPosition;
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(toast);
    return acc;
  }, {});

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearAll, updateToast }}>
      {children}
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <ToastContainer 
          key={position} 
          position={position as Toast['position']} 
          toasts={positionToasts} 
          onRemove={removeToast} 
        />
      ))}
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  position: Toast['position'];
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ position, toasts, onRemove }) => {
  return (
    <div className={`toast-container toast-container--${position}`}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const controls = useAnimation();
  
  // Set up animation variants based on toast position and animation type
  const getAnimationVariants = () => {
    const position = toast.position || 'top-right';
    const animationType = toast.animationType || 'slide';
    
    // Default slide animations based on position
    const slideVariants = {
      'top-right': {
        initial: { opacity: 0, x: 50, y: 0 },
        animate: { opacity: 1, x: 0, y: 0 },
        exit: { opacity: 0, x: 100, y: 0 }
      },
      'top-left': {
        initial: { opacity: 0, x: -50, y: 0 },
        animate: { opacity: 1, x: 0, y: 0 },
        exit: { opacity: 0, x: -100, y: 0 }
      },
      'bottom-right': {
        initial: { opacity: 0, x: 50, y: 0 },
        animate: { opacity: 1, x: 0, y: 0 },
        exit: { opacity: 0, x: 100, y: 0 }
      },
      'bottom-left': {
        initial: { opacity: 0, x: -50, y: 0 },
        animate: { opacity: 1, x: 0, y: 0 },
        exit: { opacity: 0, x: -100, y: 0 }
      },
      'top-center': {
        initial: { opacity: 0, y: -50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -50 }
      },
      'bottom-center': {
        initial: { opacity: 0, y: 50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 50 }
      }
    };
    
    // Animation type variants
    switch (animationType) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
      case 'zoom':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.8 }
        };
      case 'flip':
        return {
          initial: { opacity: 0, rotateX: 90 },
          animate: { opacity: 1, rotateX: 0 },
          exit: { opacity: 0, rotateX: 90 }
        };
      case 'slide':
      default:
        return slideVariants[position as keyof typeof slideVariants];
    }
  };
  
  const variants = getAnimationVariants();

  // Start or pause progress timer based on hover state
  useEffect(() => {
    if (toast.duration <= 0 || (isHovered && toast.pauseOnHover)) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      return;
    }

    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (toast.duration! / 100));
        if (newProgress <= 0) {
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
            progressInterval.current = null;
          }
          onRemove(toast.id);
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, [toast.duration, toast.id, onRemove, isHovered, toast.pauseOnHover]);

  // Handle shake animation when near expiry
  useEffect(() => {
    if (progress < 20 && progress > 0) {
      controls.start({
        x: [0, -2, 2, -2, 0],
        transition: { duration: 0.5 }
      });
    }
  }, [progress, controls]);

  // Get appropriate icon based on toast type
  const getIcon = () => {
    if (toast.icon) return toast.icon;
    
    switch (toast.type) {
      case 'success':
        return (
          <svg className="toast__icon-svg toast__icon-svg--success" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="toast__icon-svg toast__icon-svg--error" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="toast__icon-svg toast__icon-svg--warning" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="toast__icon-svg toast__icon-svg--info" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        );
      default:
        return (
          <svg className="toast__icon-svg toast__icon-svg--info" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        );
    }
  };

  return (
    <motion.div
      className={`toast toast--${toast.type}`}
      initial={variants.initial}
      animate={controls}
      exit={variants.exit}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30
      }}
      layout
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTap={() => {
        if (toast.dismissible) {
          onRemove(toast.id);
        }
      }}
      data-testid={`toast-${toast.id}`}
    >
      <div className="toast__content">
        <div className="toast__icon">
          {getIcon()}
        </div>
        <div className="toast__text">
          <div className="toast__title">{toast.title}</div>
          {toast.message && (
            <div className="toast__message">{toast.message}</div>
          )}
        </div>
        {toast.action && (
          <button
            className="toast__action"
            onClick={(e) => {
              e.stopPropagation();
              toast.action?.onClick();
            }}
          >
            {toast.action.label}
          </button>
        )}
        {toast.dismissible && (
          <button
            className="toast__close"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(toast.id);
            }}
            aria-label="Close notification"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        )}
      </div>
      {toast.duration > 0 && (
        <motion.div
          className="toast__progress"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
          style={{ 
            backgroundColor: progress < 20 ? 'var(--toast-progress-urgent-color)' : undefined 
          }}
        />
      )}
    </motion.div>
  );
};

// Convenience hooks for different toast types
export const useToastHelpers = () => {
  const { addToast, updateToast, removeToast } = useToast();

  return {
    success: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type'>>) =>
      addToast({ type: 'success', title, message, ...options }),
    
    error: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type'>>) =>
      addToast({ type: 'error', title, message, ...options }),
    
    warning: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type'>>) =>
      addToast({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type'>>) =>
      addToast({ type: 'info', title, message, ...options }),
      
    // Loading toast with promise support
    promise: <T,>(
      promise: Promise<T>,
      {
        loading = 'Loading...',
        success = 'Success!',
        error = 'Error occurred',
        duration = 5000
      }: {
        loading?: string | { title: string; message?: string };
        success?: string | { title: string; message?: string } | ((result: T) => string | { title: string; message?: string });
        error?: string | { title: string; message?: string } | ((err: any) => string | { title: string; message?: string });
        duration?: number;
      } = {}
    ) => {
      const loadingTitle = typeof loading === 'string' ? loading : loading.title;
      const loadingMessage = typeof loading === 'string' ? undefined : loading.message;
      
      // Create loading toast
      const toastId = addToast({
        type: 'info',
        title: loadingTitle,
        message: loadingMessage,
        duration: 0, // Don't auto-dismiss loading toast
      });
      
      // Handle promise resolution
      promise
        .then((result) => {
          let successTitle: string;
          let successMessage: string | undefined;
          
          if (typeof success === 'function') {
            const successResult = success(result);
            if (typeof successResult === 'string') {
              successTitle = successResult;
              successMessage = undefined;
            } else {
              successTitle = successResult.title;
              successMessage = successResult.message;
            }
          } else if (typeof success === 'string') {
            successTitle = success;
            successMessage = undefined;
          } else {
            successTitle = success.title;
            successMessage = success.message;
          }
          
          // Update the toast with success state
          updateToast(toastId, {
            type: 'success',
            title: successTitle,
            message: successMessage,
            duration
          });
          
          return result;
        })
        .catch((err) => {
          let errorTitle: string;
          let errorMessage: string | undefined;
          
          if (typeof error === 'function') {
            const errorResult = error(err);
            if (typeof errorResult === 'string') {
              errorTitle = errorResult;
              errorMessage = undefined;
            } else {
              errorTitle = errorResult.title;
              errorMessage = errorResult.message;
            }
          } else if (typeof error === 'string') {
            errorTitle = error;
            errorMessage = undefined;
          } else {
            errorTitle = error.title;
            errorMessage = error.message;
          }
          
          // Update the toast with error state
          updateToast(toastId, {
            type: 'error',
            title: errorTitle,
            message: errorMessage,
            duration
          });
          
          throw err;
        });
      
      return toastId;
    },
    
    // Update an existing toast
    update: updateToast,
    
    // Remove a toast
    dismiss: removeToast
  };
};