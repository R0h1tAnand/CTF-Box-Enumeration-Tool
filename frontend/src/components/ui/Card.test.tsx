import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription } from './Card';

describe('Card Components', () => {
  it('renders basic card', () => {
    render(
      <Card>
        <div>Card content</div>
      </Card>
    );
    const card = screen.getByText('Card content').parentElement;
    expect(card).toHaveClass('card', 'card--default', 'card--padding-md');
  });

  it('renders card with different variants', () => {
    render(
      <Card variant="outlined">
        <div>Outlined card</div>
      </Card>
    );
    const card = screen.getByText('Outlined card').parentElement;
    expect(card).toHaveClass('card--outlined');
  });

  it('renders hoverable card', () => {
    render(
      <Card hoverable>
        <div>Hoverable card</div>
      </Card>
    );
    const card = screen.getByText('Hoverable card').parentElement;
    expect(card).toHaveClass('card--hoverable');
  });

  it('renders card with header, body, and footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardBody>
          <div>Body content</div>
        </CardBody>
        <CardFooter>
          <div>Footer content</div>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('renders card with different padding', () => {
    render(
      <Card padding="lg">
        <div>Large padding card</div>
      </Card>
    );
    const card = screen.getByText('Large padding card').parentElement;
    expect(card).toHaveClass('card--padding-lg');
  });
});