import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from './Button';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, rightElement, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[13px] font-medium text-[#5a6170] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              "flex h-9 w-full rounded-lg border border-[#e2e5ea] bg-white px-3 py-2 text-sm text-[#1a1d23] placeholder:text-[#9099a8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150",
              rightElement && "pr-10",
              error && "border-red-400 focus:ring-red-500/20 focus:border-red-500",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2.5">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-[13px] text-red-500">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

