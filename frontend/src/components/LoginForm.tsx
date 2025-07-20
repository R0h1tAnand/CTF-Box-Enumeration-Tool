import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { FormValidation, ValidationRules, Button, Input, useToastHelpers } from './ui';
import type { LoginCredentials } from '../types/auth';
import './Auth.css';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const { success, error: showError } = useToastHelpers();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>();

  const onSubmit = async (data: LoginCredentials) => {
    setIsLoading(true);

    try {
      await login(data);
      success('Welcome back!', 'You have successfully signed in.');
      onSuccess?.();
    } catch (err: any) {
      showError(
        'Login Failed', 
        err.response?.data?.message || 'Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-form">
      <h2>Sign In</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <FormValidation
            value={formData.username}
            rules={[
              ValidationRules.required('Username is required'),
              ValidationRules.minLength(3, 'Username must be at least 3 characters')
            ]}
            realTime={true}
          >
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              {...register('username', { 
                required: 'Username is required',
                minLength: { value: 3, message: 'Username must be at least 3 characters' }
              })}
              disabled={isLoading}
              placeholder="Enter your username"
            />
          </FormValidation>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <FormValidation
            value={formData.password}
            rules={[
              ValidationRules.required('Password is required'),
              ValidationRules.minLength(6, 'Password must be at least 6 characters')
            ]}
            realTime={true}
          >
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              {...register('password', { 
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' }
              })}
              disabled={isLoading}
              placeholder="Enter your password"
            />
          </FormValidation>
        </div>

        <Button 
          type="submit" 
          disabled={isLoading}
          loading={isLoading}
          fullWidth
          variant="primary"
          size="lg"
        >
          Sign In
        </Button>
      </form>

      {onSwitchToRegister && (
        <p className="switch-form">
          Don't have an account?{' '}
          <Button 
            variant="ghost"
            size="sm"
            onClick={onSwitchToRegister}
          >
            Sign Up
          </Button>
        </p>
      )}
    </div>
  );
};