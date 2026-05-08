import { useState, forwardRef } from 'react';

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ label, error, type = 'text', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="animated-input-group">
        <label
          className={`animated-input-label ${isFocused ? 'focused' : ''}`}
        >
          {label}
        </label>
        <input
          ref={ref}
          type={type}
          className={`animated-input ${error ? 'has-error' : ''}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {error && (
          <span className="animated-input-error">{error}</span>
        )}
      </div>
    );
  }
);

AnimatedInput.displayName = 'AnimatedInput';

export default AnimatedInput;
