import { forwardRef } from 'react';

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}

const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ isLoading, children, disabled, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`gradient-btn-premium ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="gradient-btn-spinner"
            width="20"
            height="20"
            viewBox="0 0 20 20"
          >
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeDasharray="40"
              strokeDashoffset="10"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          children
        )}
      </button>
    );
  }
);

GradientButton.displayName = 'GradientButton';

export default GradientButton;
