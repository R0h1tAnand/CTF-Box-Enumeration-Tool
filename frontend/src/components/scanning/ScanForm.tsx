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
import { ToolSelector } from './ToolSelector';
import { ScanConfig } from '../../types/scanning';

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

    if (selectedTools.length === 0) {
      setError('Please select at least one tool');
      return;
    }

    // Create scan configuration
    const scanConfig: ScanConfig = {
      target_ip: target.trim(),
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
              <Input
                label="Target IP or Domain"
                placeholder="e.g., 192.168.1.1 or example.com"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
                fullWidth
                helperText="Enter the IP address or domain name to scan"
              />
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