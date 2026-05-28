import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'destructive';
  size?: 'default' | 'icon' | 'sm' | 'lg';
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500';
  
  const variantStyles = {
    default: 'bg-blue-500 text-white hover:bg-blue-600',
    outline: 'border border-slate-700 text-gray-400 hover:bg-slate-800',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
  };
  
  const sizeStyles = {
    default: 'px-4 py-2 text-sm',
    icon: 'p-2 h-10 w-10 flex items-center justify-center',
    sm: 'px-2 py-1 text-xs',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export { Button };
