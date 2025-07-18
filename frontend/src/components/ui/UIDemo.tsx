import React, { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  CardDescription,
  Input,
  Textarea,
  Form,
  FormGroup,
  FormRow,
  FormActions,
  FormSection,
  Loading,
  LoadingOverlay,
  ProgressBar,
  CircularProgress,
  StepProgress
} from './index';

export const UIDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(45);
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const steps = [
    { label: 'Setup', completed: true },
    { label: 'Configuration', completed: true },
    { label: 'Scanning', active: true },
    { label: 'Results', completed: false }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>UI Components Demo</h1>
      
      {/* Buttons Section */}
      <Card hoverable padding="lg" style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Various button styles and states</CardDescription>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button fullWidth>Full Width</Button>
          </div>
        </CardBody>
      </Card>

      {/* Cards Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card variant="default" hoverable>
          <CardHeader>
            <CardTitle>Default Card</CardTitle>
            <CardDescription>This is a default card with hover effects</CardDescription>
          </CardHeader>
          <CardBody>
            <p>Card content goes here. This card has the default styling with shadow.</p>
          </CardBody>
          <CardFooter>
            <Button size="sm" variant="outline">Action</Button>
          </CardFooter>
        </Card>

        <Card variant="outlined" hoverable>
          <CardHeader>
            <CardTitle>Outlined Card</CardTitle>
            <CardDescription>This card uses outlined styling</CardDescription>
          </CardHeader>
          <CardBody>
            <p>This card has a border instead of a shadow for a different visual style.</p>
          </CardBody>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Elevated Card</CardTitle>
          </CardHeader>
          <CardBody>
            <p>This card has enhanced shadow for more prominence.</p>
          </CardBody>
        </Card>
      </div>

      {/* Form Section */}
      <Card padding="lg" style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <CardTitle>Form Components</CardTitle>
          <CardDescription>Input fields and form layouts</CardDescription>
        </CardHeader>
        <CardBody>
          <Form onSubmit={handleSubmit} spacing="md">
            <FormSection title="Personal Information" description="Enter your basic details">
              <FormRow columns={2}>
                <FormGroup>
                  <Input
                    label="First Name"
                    placeholder="Enter your first name"
                    required
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </FormGroup>
                <FormGroup>
                  <Input
                    label="Last Name"
                    placeholder="Enter your last name"
                    required
                  />
                </FormGroup>
              </FormRow>
              
              <FormGroup>
                <Input
                  label="Email"
                  type="email"
                  placeholder="Enter your email"
                  helperText="We'll never share your email"
                  fullWidth
                />
              </FormGroup>
            </FormSection>

            <FormSection title="Additional Details">
              <FormGroup>
                <Textarea
                  label="Bio"
                  placeholder="Tell us about yourself"
                  value={textareaValue}
                  onChange={(e) => setTextareaValue(e.target.value)}
                  rows={4}
                  fullWidth
                />
              </FormGroup>
            </FormSection>

            <FormActions align="right">
              <Button variant="ghost" type="button">Cancel</Button>
              <Button variant="primary" type="submit" loading={loading}>
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
            </FormActions>
          </Form>
        </CardBody>
      </Card>

      {/* Loading Section */}
      <Card padding="lg" style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <CardTitle>Loading Components</CardTitle>
          <CardDescription>Various loading indicators and states</CardDescription>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h4>Spinner</h4>
              <Loading variant="spinner" size="lg" />
            </div>
            <div>
              <h4>Dots</h4>
              <Loading variant="dots" size="lg" />
            </div>
            <div>
              <h4>Pulse</h4>
              <Loading variant="pulse" size="lg" />
            </div>
            <div>
              <h4>Bars</h4>
              <Loading variant="bars" size="lg" />
            </div>
          </div>
          
          <LoadingOverlay visible={loading} message="Processing your request...">
            <div style={{ padding: '2rem', background: 'var(--secondary-bg)', borderRadius: '8px' }}>
              <p>This content will be overlaid when loading is active.</p>
              <Button onClick={() => setLoading(!loading)}>
                Toggle Loading Overlay
              </Button>
            </div>
          </LoadingOverlay>
        </CardBody>
      </Card>

      {/* Progress Section */}
      <Card padding="lg" style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <CardTitle>Progress Components</CardTitle>
          <CardDescription>Progress bars and indicators</CardDescription>
        </CardHeader>
        <CardBody>
          <div style={{ marginBottom: '2rem' }}>
            <h4>Linear Progress</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <ProgressBar value={progress} showLabel />
              <ProgressBar value={75} variant="success" label="Upload Progress" />
              <ProgressBar value={30} variant="warning" striped animated />
              <ProgressBar value={90} variant="error" size="lg" />
            </div>
            
            <div style={{ marginTop: '1rem' }}>
              <Button onClick={() => setProgress(Math.min(progress + 10, 100))}>
                Increase Progress
              </Button>
              <Button 
                onClick={() => setProgress(Math.max(progress - 10, 0))} 
                style={{ marginLeft: '0.5rem' }}
              >
                Decrease Progress
              </Button>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h4>Circular Progress</h4>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <CircularProgress value={progress} />
              <CircularProgress value={85} variant="success" size={60} />
              <CircularProgress value={45} variant="warning" size={100} />
            </div>
          </div>

          <div>
            <h4>Step Progress</h4>
            <StepProgress steps={steps} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
};