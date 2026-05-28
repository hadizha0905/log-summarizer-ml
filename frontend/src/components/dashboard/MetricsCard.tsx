/**
 * Карточка метрик с анимациями и градиентами
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'orange' | 'cyan' | 'teal';
}

const colorGradients = {
  blue: 'from-blue-500/20 to-blue-600/20',
  red: 'from-red-500/20 to-red-600/20',
  green: 'from-green-500/20 to-green-600/20',
  yellow: 'from-yellow-500/20 to-yellow-600/20',
  purple: 'from-purple-500/20 to-purple-600/20',
  orange: 'from-orange-500/20 to-orange-600/20',
  cyan: 'from-cyan-500/20 to-cyan-600/20',
  teal: 'from-teal-500/20 to-teal-600/20',
};

const iconColors = {
  blue: 'text-blue-400',
  red: 'text-red-400',
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
  orange: 'text-orange-400',
  cyan: 'text-cyan-400',
  teal: 'text-teal-400',
};

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'blue',
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card className={`relative overflow-hidden bg-gradient-to-br ${colorGradients[color]} backdrop-blur-sm border-slate-700`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">{title}</p>
              <p className="mt-2 text-3xl font-bold text-white">{value}</p>
              
              {trend !== undefined && (
                <div className="mt-2 flex items-center gap-1">
                  {trend > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      trend > 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {Math.abs(trend)}%
                  </span>
                  <span className="text-xs text-gray-500">vs last period</span>
                </div>
              )}
            </div>
            
            <div className={`rounded-full bg-black/20 p-3 ${iconColors[color]}`}>
              {icon}
            </div>
          </div>
          
          {/* Animated progress bar */}
          <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MetricsCard;