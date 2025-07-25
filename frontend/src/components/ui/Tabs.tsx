import React, { useState, useEffect, createContext, useContext } from 'react';
import './Tabs.css';

// Context for tab state
interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

// Hook to use tabs context
const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs component');
  }
  return context;
};

// Tabs component
interface TabsProps {
  children: React.ReactNode;
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ 
  children, 
  activeTab: externalActiveTab, 
  onChange,
  className = ''
}) => {
  // Find the first tab ID from children
  const findFirstTabId = (): string => {
    let firstId = '';
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === TabList) {
        React.Children.forEach(child.props.children, (tab) => {
          if (React.isValidElement(tab) && tab.type === Tab && !firstId) {
            firstId = tab.props.id || '';
          }
        });
      }
    });
    return firstId;
  };

  // State for active tab
  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    externalActiveTab || findFirstTabId()
  );

  // Update internal state when external state changes
  useEffect(() => {
    if (externalActiveTab !== undefined) {
      setInternalActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    if (externalActiveTab === undefined) {
      setInternalActiveTab(tabId);
    }
    if (onChange) {
      onChange(tabId);
    }
  };

  // Get the active tab
  const activeTabId = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;

  return (
    <TabsContext.Provider value={{ activeTab: activeTabId, setActiveTab: handleTabChange }}>
      <div className={`tabs ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

// TabList component
interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabList: React.FC<TabListProps> = ({ children, className = '' }) => {
  return (
    <div className={`tab-list ${className}`} role="tablist">
      {children}
    </div>
  );
};

// Tab component
interface TabProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const Tab: React.FC<TabProps> = ({ 
  id, 
  children, 
  className = '',
  disabled = false
}) => {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(id);
    }
  };

  return (
    <button
      className={`tab ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      onClick={handleClick}
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      id={`tab-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// TabPanel component
interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({ id, children, className = '' }) => {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === id;

  if (!isActive) {
    return null;
  }

  return (
    <div
      className={`tab-panel ${className}`}
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
    >
      {children}
    </div>
  );
};