import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'secondary' | 'outline';
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'default', className = '', children, ...props }) => {
  const variantStyles = {
    default: 'bg-blue-500/20 text-blue-400 border border-blue-500/50',
    destructive: 'bg-red-500/20 text-red-400 border border-red-500/50',
    secondary: 'bg-gray-500/20 text-gray-400 border border-gray-500/50',
    outline: 'border border-slate-700 text-gray-400',
  };
  
  return (
    <div
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export { Badge };
