import React from 'react';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  className?: string;
}

const Progress: React.FC<ProgressProps> = ({ value = 0, className = '', ...props }) => (
  <div
    className={`w-full h-2 bg-slate-800 rounded-full overflow-hidden ${className}`}
    {...props}
  >
    <div
      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

export { Progress };
