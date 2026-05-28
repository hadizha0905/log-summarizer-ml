import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AnomalyAlertProps {
  level: 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
}

const AnomalyAlert: React.FC<AnomalyAlertProps> = ({ level, message, timestamp }) => {
  const levelConfig = {
    high: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertCircle },
    low: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: AlertCircle },
  };

  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border border-slate-700 p-3 ${config.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${config.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.color}`}>{message}</p>
          <p className="text-xs text-gray-500 mt-1">{format(timestamp, 'HH:mm:ss')}</p>
        </div>
      </div>
    </div>
  );
};

export default AnomalyAlert;
