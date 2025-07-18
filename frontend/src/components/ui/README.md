# UI Components Library

This directory contains a comprehensive set of reusable UI components built with React, TypeScript, and Framer Motion. These components follow the cybersecurity toolkit platform's design system with support for both light and dark themes.

## Components Overview

### Button Component
- **Variants**: primary, secondary, outline, ghost, danger
- **Sizes**: sm, md, lg
- **Features**: Loading states, disabled states, full width, hover animations
- **File**: `Button.tsx`

### Card Components
- **Variants**: default, elevated, outlined, ghost
- **Features**: Hoverable effects, customizable padding, structured layout
- **Sub-components**: CardHeader, CardBody, CardFooter, CardTitle, CardDescription
- **File**: `Card.tsx`

### Input Components
- **Types**: Input, Textarea
- **Variants**: default, filled, outlined
- **Sizes**: sm, md, lg
- **Features**: Labels, error states, helper text, icons, validation feedback
- **File**: `Input.tsx`

### Form Components
- **Components**: Form, FormGroup, FormRow, FormActions, FormSection, FormError, FormSuccess
- **Features**: Structured layouts, responsive grids, animated feedback
- **File**: `Form.tsx`

### Loading Components
- **Variants**: spinner, dots, pulse, bars
- **Sizes**: sm, md, lg, xl
- **Components**: Loading, Spinner, LoadingOverlay, LoadingButton
- **Features**: Customizable colors, overlay functionality, button integration
- **File**: `Loading.tsx`

### Progress Components
- **Types**: ProgressBar, CircularProgress, StepProgress
- **Variants**: default, success, warning, error
- **Features**: Animated progress, labels, striped patterns, step indicators
- **File**: `ProgressBar.tsx`

## Key Features

### 🎨 Theme Support
- Full support for light and dark themes
- CSS custom properties for consistent theming
- Smooth theme transitions

### ⚡ Animations
- Framer Motion integration for smooth animations
- Hover effects and interactive feedback
- Loading and progress animations
- Reduced motion support for accessibility

### 📱 Responsive Design
- Mobile-first approach
- Flexible layouts and grid systems
- Touch-friendly interactions

### ♿ Accessibility
- WCAG 2.1 AA compliance
- Proper ARIA labels and roles
- Keyboard navigation support
- High contrast mode support

### 🔧 TypeScript Support
- Full TypeScript definitions
- Strict type checking
- IntelliSense support

## Usage Examples

### Basic Button
```tsx
import { Button } from '../components/ui';

<Button variant="primary" size="lg" onClick={handleClick}>
  Click Me
</Button>
```

### Card with Content
```tsx
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui';

<Card hoverable>
  <CardHeader>
    <CardTitle>My Card</CardTitle>
  </CardHeader>
  <CardBody>
    <p>Card content goes here</p>
  </CardBody>
</Card>
```

### Form with Validation
```tsx
import { Form, FormGroup, Input, Button } from '../components/ui';

<Form onSubmit={handleSubmit}>
  <FormGroup>
    <Input
      label="Email"
      type="email"
      error={errors.email}
      required
    />
  </FormGroup>
  <Button type="submit" loading={isSubmitting}>
    Submit
  </Button>
</Form>
```

### Progress Indicators
```tsx
import { ProgressBar, CircularProgress } from '../components/ui';

<ProgressBar value={75} variant="success" showLabel />
<CircularProgress value={60} size={80} />
```

## Testing

All components include comprehensive test suites:
- Unit tests for component rendering
- Interaction tests with user events
- Accessibility tests
- Theme switching tests

Run tests with:
```bash
npm run test:run -- --dir src/components/ui
```

## Styling System

### CSS Custom Properties
The components use CSS custom properties for theming:
```css
:root {
  --primary-bg: #0a0a0a;
  --accent-color: #00ff88;
  --text-primary: #ffffff;
  /* ... more variables */
}
```

### Component Classes
Each component follows a consistent naming convention:
- Base class: `.component-name`
- Variants: `.component-name--variant`
- Sizes: `.component-name--size`
- States: `.component-name--state`

## Integration

The components are exported from the main components index:
```tsx
import { Button, Card, Input } from '../components';
```

Or import directly from the UI module:
```tsx
import { Button, Card, Input } from '../components/ui';
```

## Demo

A comprehensive demo component (`UIDemo.tsx`) showcases all components and their variations. This can be used for:
- Visual testing
- Design system documentation
- Component showcase

## Requirements Fulfilled

✅ **Build Button, Card, Input, and Form components with TypeScript**
- All components implemented with full TypeScript support

✅ **Implement Loading, Spinner, and ProgressBar components**
- Multiple loading variants and progress indicators

✅ **Add hover effects and interactive animations using Framer Motion**
- Smooth animations and transitions throughout

✅ **Create consistent styling system with CSS modules**
- Consistent CSS architecture with theme support

✅ **Requirements 7.1, 7.2, 7.4 compliance**
- Modern UI with visual feedback
- Smooth animations and transitions
- Interactive hover effects and animations