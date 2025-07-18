import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input, Textarea } from './Input';

describe('Input Components', () => {
  describe('Input', () => {
    it('renders with label', () => {
      render(<Input label="Test Label" />);
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('shows required indicator', () => {
      render(<Input label="Required Field" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(<Input label="Test" error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input-field--error');
    });

    it('displays helper text', () => {
      render(<Input label="Test" helperText="This is helper text" />);
      expect(screen.getByText('This is helper text')).toBeInTheDocument();
    });

    it('handles different sizes', () => {
      render(<Input size="lg" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input-field--lg');
    });

    it('handles different variants', () => {
      render(<Input variant="outlined" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input-field--outlined');
    });

    it('can be full width', () => {
      render(<Input fullWidth />);
      const wrapper = screen.getByRole('textbox').closest('.input-wrapper');
      expect(wrapper).toHaveClass('input-field--full-width');
    });

    it('handles user input', async () => {
      const user = userEvent.setup();
      render(<Input placeholder="Type here" />);
      const input = screen.getByPlaceholderText('Type here');
      
      await user.type(input, 'Hello World');
      expect(input).toHaveValue('Hello World');
    });
  });

  describe('Textarea', () => {
    it('renders textarea with label', () => {
      render(<Textarea label="Message" />);
      expect(screen.getByLabelText('Message')).toBeInTheDocument();
    });

    it('handles different resize options', () => {
      render(<Textarea resize="none" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('textarea-field--resize-none');
    });

    it('displays error for textarea', () => {
      render(<Textarea error="Too long" />);
      expect(screen.getByText('Too long')).toBeInTheDocument();
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('textarea-field--error');
    });

    it('handles user input in textarea', async () => {
      const user = userEvent.setup();
      render(<Textarea placeholder="Enter message" />);
      const textarea = screen.getByPlaceholderText('Enter message');
      
      await user.type(textarea, 'This is a long message');
      expect(textarea).toHaveValue('This is a long message');
    });
  });
});