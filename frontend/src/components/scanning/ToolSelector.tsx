import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardBody } from '../ui/Card';
import { FormGroup } from '../ui/Form';
import { Input } from '../ui/Input';
import './ToolSelector.css';

interface Tool {
  id: string;
  name: string;
  description: string;
  available: boolean;
  options?: {
    [key: string]: {
      type: 'text' | 'number' | 'select' | 'checkbox';
      label: string;
      default?: any;
      options?: string[];
      placeholder?: string;
    };
  };
}

interface ToolSelectorProps {
  selectedTools: string[];
  onSelectionChange: (tools: string[]) => void;
  onOptionsChange: (toolName: string, options: any) => void;
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({ 
  selectedTools, 
  onSelectionChange,
  onOptionsChange
}) => {
  const [tools, setTools] = useState<Tool[]>([
    {
      id: 'nmap',
      name: 'Nmap',
      description: 'Network discovery and security auditing tool',
      available: true,
      options: {
        scanType: {
          type: 'select',
          label: 'Scan Type',
          default: 'basic',
          options: ['basic', 'quick', 'full', 'vuln']
        },
        ports: {
          type: 'text',
          label: 'Ports',
          default: '1-1000',
          placeholder: 'e.g., 80,443 or 1-1000'
        }
      }
    },
    {
      id: 'gobuster',
      name: 'Gobuster',
      description: 'Directory/file & DNS busting tool',
      available: true,
      options: {
        mode: {
          type: 'select',
          label: 'Mode',
          default: 'dir',
          options: ['dir', 'dns', 'vhost']
        },
        wordlist: {
          type: 'text',
          label: 'Wordlist',
          default: '/usr/share/wordlists/dirb/common.txt',
          placeholder: 'Path to wordlist'
        }
      }
    },
    {
      id: 'dirb',
      name: 'Dirb',
      description: 'Web content scanner',
      available: true,
      options: {
        wordlist: {
          type: 'text',
          label: 'Wordlist',
          default: '/usr/share/dirb/wordlists/common.txt',
          placeholder: 'Path to wordlist'
        },
        extensions: {
          type: 'text',
          label: 'Extensions',
          default: 'php,html,txt',
          placeholder: 'e.g., php,html,txt'
        }
      }
    }
  ]);
  
  const [toolOptions, setToolOptions] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tool availability from the API
  useEffect(() => {
    const fetchToolAvailability = async () => {
      try {
        const response = await fetch('/api/scans/tools/availability', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (!data.error && data.data) {
            // Update tools with availability information
            setTools(prevTools => prevTools.map(tool => ({
              ...tool,
              available: data.data[tool.id]?.available || false
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching tool availability:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchToolAvailability();
  }, []);

  // Initialize tool options with defaults
  useEffect(() => {
    const initialOptions: Record<string, any> = {};
    
    tools.forEach(tool => {
      if (tool.options) {
        const toolDefaults: Record<string, any> = {};
        
        Object.entries(tool.options).forEach(([key, option]) => {
          if ('default' in option) {
            toolDefaults[key] = option.default;
          }
        });
        
        initialOptions[tool.id] = toolDefaults;
      }
    });
    
    setToolOptions(initialOptions);
  }, [tools]);

  const handleToolToggle = (toolId: string) => {
    const newSelectedTools = selectedTools.includes(toolId)
      ? selectedTools.filter(id => id !== toolId)
      : [...selectedTools, toolId];
    
    onSelectionChange(newSelectedTools);
  };

  const handleOptionChange = (toolId: string, optionKey: string, value: any) => {
    const updatedOptions = {
      ...toolOptions,
      [toolId]: {
        ...toolOptions[toolId],
        [optionKey]: value
      }
    };
    
    setToolOptions(updatedOptions);
    onOptionsChange(toolId, updatedOptions[toolId]);
  };

  return (
    <div className="tool-selector">
      <div className="tool-selector__grid">
        {tools.map(tool => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="tool-selector__item"
          >
            <Card 
              variant={selectedTools.includes(tool.id) ? 'elevated' : 'outlined'}
              hoverable
              className={`tool-selector__card ${!tool.available ? 'tool-selector__card--unavailable' : ''}`}
              onClick={() => tool.available && handleToolToggle(tool.id)}
            >
              <CardBody>
                <div className="tool-selector__header">
                  <div className="tool-selector__checkbox">
                    <input 
                      type="checkbox" 
                      checked={selectedTools.includes(tool.id)}
                      onChange={() => tool.available && handleToolToggle(tool.id)}
                      disabled={!tool.available}
                    />
                  </div>
                  <div className="tool-selector__title">
                    <h4>{tool.name}</h4>
                    {!tool.available && <span className="tool-selector__unavailable-badge">Unavailable</span>}
                  </div>
                </div>
                <p className="tool-selector__description">{tool.description}</p>
                
                {selectedTools.includes(tool.id) && tool.options && (
                  <motion.div 
                    className="tool-selector__options"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h5>Options</h5>
                    {Object.entries(tool.options).map(([key, option]) => (
                      <FormGroup key={`${tool.id}-${key}`}>
                        {option.type === 'select' ? (
                          <Input
                            as="select"
                            label={option.label}
                            value={toolOptions[tool.id]?.[key] || option.default}
                            onChange={(e) => handleOptionChange(tool.id, key, e.target.value)}
                          >
                            {option.options?.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </Input>
                        ) : option.type === 'checkbox' ? (
                          <label className="tool-selector__checkbox-label">
                            <input
                              type="checkbox"
                              checked={toolOptions[tool.id]?.[key] || false}
                              onChange={(e) => handleOptionChange(tool.id, key, e.target.checked)}
                            />
                            {option.label}
                          </label>
                        ) : (
                          <Input
                            type={option.type}
                            label={option.label}
                            placeholder={option.placeholder}
                            value={toolOptions[tool.id]?.[key] || ''}
                            onChange={(e) => handleOptionChange(tool.id, key, e.target.value)}
                          />
                        )}
                      </FormGroup>
                    ))}
                  </motion.div>
                )}
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};