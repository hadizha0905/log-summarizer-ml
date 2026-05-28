import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle } from 'lucide-react';

interface ErrorTimelineProps {
  timeRange: '24h' | '7d' | '30d';
}

const ErrorTimeline: React.FC<ErrorTimelineProps> = ({ timeRange }) => {
  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          Error Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-400">
          No errors in {timeRange}
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorTimeline;
