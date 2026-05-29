import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AnomalyAlertProps {
  level: 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
}

const AnomalyAlert: React.FC<AnomalyAlertProps> = ({
  level,
  message,
  timestamp,
}) => {
  const levelConfig = {
    high: {
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: AlertTriangle,
      label: 'Critical',
    },
    medium: {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      icon: AlertCircle,
      label: 'Warning',
    },
    low: {
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      icon: AlertCircle,
      label: 'Info',
    },
  };

  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <div
      className={`
        rounded-xl 
        border 
        ${config.border}
        ${config.bg}
        p-4
        backdrop-blur-sm
        transition-all
        hover:scale-[1.01]
        hover:shadow-lg
      `}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-slate-900/40 p-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span
              className={`
                text-xs 
                font-semibold 
                uppercase 
                tracking-wide 
                ${config.color}
              `}
            >
              {config.label}
            </span>

            <span className="text-xs text-gray-500">
              {format(timestamp, 'HH:mm:ss')}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-200 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnomalyAlert;