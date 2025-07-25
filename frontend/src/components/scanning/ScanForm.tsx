import React, { useState } from 'react';
import { 
  Form, 
  FormGroup, 
  FormRow, 
  FormActions, 
  FormSection,
  FormError
} from '../ui/Form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { FormValidation } from '../ui/FormValidation';
import { ToolSelector } from './ToolSelector';
import { ScanConfig } from '../../types/scanning';
import { ValidationRulesEnhanced, sanitizeString, validateScanTarget } from '../../utils/inputValidation';

interface ScanFormProps {
  onSubmit: (scanConfig: ScanConfig) => void;
  isLoading?: boolean;
}

export const ScanForm: React.FC<ScanFormProps> = ({ onSubmit, isLoading = false }) => {
  const [target, setTarget] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<string, any>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!target.trim()) {
      setError('Please enter a target IP or domain');
      return;
    }

    // Validate target format
    if (!validateScanTarget(target)) {
      setError('Please enter a valid IP address or hostname');
      return;
    }

    // Check for restricted targets
    const restrictedTargets = [
      'localhost', '127.0.0.1', '::1',  // Localhost
      '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', 
      '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', 
      '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.'  // Private IPs
    ];
    
    for (const restricted of restrictedTargets) {
      if (target.startsWith(restricted)) {
        setError('Scanning localhost or private networks is not allowed');
        return;
      }
    }

    if (selectedTools.length === 0) {
      setError('Please select at least one tool');
      return;
    }

    // Create scan configuration with sanitized input
    const scanConfig: ScanConfig = {
      target_ip: sanitizeString(target.trim()),
      tools: selectedTools,
      options: options
    };

    // Submit scan
    onSubmit(scanConfig);
  };

  const handleToolSelection = (tools: string[]) => {
    setSelectedTools(tools);
  };

  const handleToolOptionsChange = (toolName: string, toolOptions: any) => {
    setOptions({
      ...options,
      [toolName]: toolOptions
    });
  };

  return (
    <Card className="scan-form">
      <CardHeader>
        <CardTitle>Configure New Scan</CardTitle>
      </CardHeader>
      <CardBody>
        <Form onSubmit={handleSubmit}>
          {error && <FormError>{error}</FormError>}
          
          <FormSection title="Target Information">
            <FormGroup>
              <FormValidation
                value={target}
                rules={ValidationRulesEnhanced.scanTarget}
                realTime={true}
              >
                <Input
                  label="Target IP or Domain"
                  placeholder="e.g., example.com"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                  fullWidth
                  helperText="Enter the IP address or domain name to scan"
                />
              </FormValidation>
            </FormGroup>
          </FormSection>
          
          <FormSection title="Select Tools">
            <FormGroup>
              <ToolSelector 
                selectedTools={selectedTools} 
                onSelectionChange={handleToolSelection}
                onOptionsChange={handleToolOptionsChange}
              />
            </FormGroup>
          </FormSection>
          
          <FormActions>
            <Button 
              type="submit" 
              variant="primary" 
              loading={isLoading}
              disabled={isLoading}
            >
              Start Scan
            </Button>
          </FormActions>
        </Form>
      </CardBody>
    </Card>
  );
};