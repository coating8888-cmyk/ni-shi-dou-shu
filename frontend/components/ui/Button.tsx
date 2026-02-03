'use client';

import { clsx } from 'clsx';
import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          // Variants
          {
            'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500':
              variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500':
              variant === 'secondary',
            'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500':
              variant === 'outline',
          },
          // Sizes
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
