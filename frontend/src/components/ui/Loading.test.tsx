import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loading, Spinner, LoadingOverlay } from './Loading';

describe('Loading Components', () => {
  describe('Loading', () => {
    it('renders spinner variant by default', () => {
      render(<Loading />);
      const loading = document.querySelector('.loading--spinner');
      expect(loading).toBeInTheDocument();
    });

    it('renders different variants', () => {
      render(<Loading variant="dots" />);
      const loading = document.querySelector('.loading--dots');
      expect(loading).toBeInTheDocument();
    });

    it('renders different sizes', () => {
      render(<Loading size="lg" />);
      const loading = document.querySelector('.loading--lg');
      expect(loading).toBeInTheDocument();
    });

    it('applies custom color', () => {
      render(<Loading color="red" />);
      const loading = document.querySelector('.loading');
      expect(loading).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });
  });

  describe('Spinner', () => {
    it('renders as spinner variant', () => {
      render(<Spinner />);
      const spinner = document.querySelector('.loading--spinner');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('LoadingOverlay', () => {
    it('renders children when not visible', () => {
      render(
        <LoadingOverlay visible={false}>
          <div>Child content</div>
        </LoadingOverlay>
      );
      expect(screen.getByText('Child content')).toBeInTheDocument();
      expect(document.querySelector('.loading-overlay__backdrop')).not.toBeInTheDocument();
    });

    it('shows overlay when visible', () => {
      render(
        <LoadingOverlay visible={true} message="Loading...">
          <div>Child content</div>
        </LoadingOverlay>
      );
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(document.querySelector('.loading-overlay__backdrop')).toBeInTheDocument();
    });

    it('renders without message', () => {
      render(
        <LoadingOverlay visible={true}>
          <div>Child content</div>
        </LoadingOverlay>
      );
      expect(document.querySelector('.loading-overlay__backdrop')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });
});