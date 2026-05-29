/**
 * Dashboard главная страница
 * Отображает метрики, графики и анализ в реальном времени
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Server,
  Zap,
  Shield,
  Database,
  RefreshCw,
  Download,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart,
  Area,
  Line as ReLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
// Временные импорты - замените на реальные пути к вашим сервисам
// Исправлен путь импорта: используем абсолютный алиас '@/services/api'
import api from 'src/services/api';
import { useWebSocket } from 'src/hooks/useWebSocket';
import MetricsCard from '../components/dashboard/MetricsCard';
import ErrorTimeline from '../components/dashboard/ErrorTimeline';
import AnomalyAlert from '../components/dashboard/AnomalyAlert';

// Типы данных
interface DashboardMetrics {
  totalLogs: number;
  errorCount: number;
  criticalCount: number;
  averageSeverity: number;
  anomalyCount: number;
  uniqueErrors: number;
  recoveryRate: number;
  systemHealth: number;
}

interface TimeSeriesPoint {
  timestamp: string;
  errors: number;
  warnings: number;
  critical: number;
  logs: number;
}

interface ErrorDistributionItem {
  name: string;
  value: number;
  color: string;
}

interface TopError {
  id: string;
  message: string;
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // WebSocket для реального времени
  const { lastMessage, isConnected } = useWebSocket('/ws/dashboard');
  
  // Запрос метрик
  const { 
    data: metrics, 
    refetch: refetchMetrics, 
    isLoading: metricsLoading 
  } = useQuery<DashboardMetrics>({
    queryKey: ['dashboardMetrics', timeRange],
    queryFn: () => api.getDashboardMetrics(timeRange),
    refetchInterval: autoRefresh ? 10000 : false,
  });
  
  // Запрос временного ряда
  const { 
    data: timeSeries, 
    refetch: refetchTimeSeries 
  } = useQuery<TimeSeriesPoint[]>({
    queryKey: ['timeSeries', timeRange],
    queryFn: () => api.getTimeSeries(timeRange),
    refetchInterval: autoRefresh ? 10000 : false,
  });
  
  // Запрос распределения ошибок
  const { 
  data: errorDistribution, 
  refetch: refetchErrorDistribution 
} = useQuery<ErrorDistributionItem[]>({
  queryKey: ['errorDistribution', timeRange],
  queryFn: () => api.getErrorDistribution(), // Убрали timeRange
});
  
  // Запрос топ ошибок
  const { 
  data: topErrors, 
  refetch: refetchTopErrors 
} = useQuery<TopError[]>({
  queryKey: ['topErrors', timeRange],
  queryFn: () => api.getTopErrors(10), // Убрали timeRange, оставили только limit
});
  
  // Обновление при WebSocket сообщении
  useEffect(() => {
    if (lastMessage && autoRefresh) {
      refetchMetrics();
      refetchTimeSeries();
      refetchErrorDistribution();
      refetchTopErrors();
      // Avoid synchronous setState inside effect to prevent cascading renders
      // schedule update asynchronously
      const t = setTimeout(() => setLastUpdate(new Date()), 0);
      return () => clearTimeout(t);
    }
  }, [lastMessage, autoRefresh, refetchMetrics, refetchTimeSeries, refetchErrorDistribution, refetchTopErrors]);
  
  // Цвета для графиков
  const CHART_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
  
  // Форматирование метки времени для оси X
  const formatXAxisTick = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  // Форматирование подсказки для Tooltip
  const formatTooltipLabel = (label: unknown): string => {
    if (typeof label === 'string') {
      return format(new Date(label), 'dd MMM HH:mm');
    }
    if (label instanceof Date) {
      return format(label, 'dd MMM HH:mm');
    }
    return String(label || '');
  };

  // Получение текущих меток для аномалий
  const getAnomalyTimestamps = () => {
    const now = new Date();
    return {
      high: now,
      medium: new Date(now.getTime() - 5 * 60000),
      low: new Date(now.getTime() - 15 * 60000)
    };
  };
  
  // Показ загрузки
  if (metricsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header с градиентом */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-400 mt-1">
                Real-time system monitoring and error analysis
              </p>
            </div>
            
            <div className="flex gap-3">
              {/* Time range selector */}
              <div className="flex rounded-lg bg-slate-800/50 backdrop-blur-sm p-1">
                {(['24h', '7d', '30d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      timeRange === range
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
              
              {/* Auto-refresh toggle */}
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="icon"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="relative"
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin-slow' : ''}`} />
                {autoRefresh && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
                )}
              </Button>
              
              {/* Export button */}
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Connection status */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-400">
              {isConnected ? 'Live updates' : 'Reconnecting...'}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">
              Last updated: {format(lastUpdate, 'HH:mm:ss')}
            </span>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Metrics Cards Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          <MetricsCard
            title="Total Logs"
            value={metrics?.totalLogs?.toLocaleString() || '0'}
            icon={<Database className="h-5 w-5" />}
            trend={12.5}
            color="blue"
          />
          <MetricsCard
            title="Errors Detected"
            value={metrics?.errorCount?.toLocaleString() || '0'}
            icon={<AlertTriangle className="h-5 w-5" />}
            trend={-8.3}
            color="red"
          />
          <MetricsCard
            title="Critical Issues"
            value={metrics?.criticalCount?.toLocaleString() || '0'}
            icon={<AlertCircle className="h-5 w-5" />}
            trend={5.2}
            color="orange"
          />
          <MetricsCard
            title="System Health"
            value={`${metrics?.systemHealth || 98}%`}
            icon={<Activity className="h-5 w-5" />}
            trend={1.5}
            color="green"
          />
          
          <MetricsCard
            title="Avg Severity"
            value={metrics?.averageSeverity?.toFixed(2) || '0'}
            icon={<TrendingUp className="h-5 w-5" />}
            color="purple"
          />
          <MetricsCard
            title="Anomalies"
            value={metrics?.anomalyCount?.toLocaleString() || '0'}
            icon={<Zap className="h-5 w-5" />}
            trend={-15.7}
            color="yellow"
          />
          <MetricsCard
            title="Unique Errors"
            value={metrics?.uniqueErrors?.toLocaleString() || '0'}
            icon={<Shield className="h-5 w-5" />}
            color="cyan"
          />
          <MetricsCard
            title="Recovery Rate"
            value={`${metrics?.recoveryRate || 94}%`}
            icon={<CheckCircle className="h-5 w-5" />}
            trend={2.1}
            color="teal"
          />
        </motion.div>
        
        {/* Main Charts Section */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Time Series Chart */}
          <Card className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-400" />
                Error Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timeSeries}>
                  <defs>
                    <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#94a3b8"
                    tickFormatter={formatXAxisTick}
                  />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '0.5rem',
                    }}
                    labelFormatter={formatTooltipLabel}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke="#ef4444"
                    fill="url(#errorGradient)"
                    name="Errors"
                  />
                  <Area
                    type="monotone"
                    dataKey="warnings"
                    stroke="#f59e0b"
                    fill="url(#warningGradient)"
                    name="Warnings"
                  />
                  <ReLine
                    type="monotone"
                    dataKey="critical"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Critical"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Error Distribution Pie Chart */}
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-purple-400" />
                Error Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={errorDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {errorDistribution?.map((entry: ErrorDistributionItem, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
              
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {errorDistribution?.map((item: ErrorDistributionItem) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color || CHART_COLORS[0] }}
                    />
                    <span className="text-sm text-gray-300">{item.name}</span>
                    <span className="text-sm font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Detailed Analysis Section */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Errors */}
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                Top Error Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topErrors?.map((error: TopError, index: number) => (
                  <motion.div
                    key={error.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-all hover:border-slate-600 hover:bg-slate-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-400">
                            #{index + 1}
                          </span>
                          <Badge variant={error.severity === 'critical' ? 'destructive' : 'default'}>
                            {error.count} occurrences
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                          {error.message}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-500 transition-transform group-hover:translate-x-1" />
                    </div>
                    {topErrors[0] && (
                      <Progress value={(error.count / topErrors[0].count) * 100} className="mt-3" />
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Anomaly Alerts */}
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                Anomaly Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <AnomalyAlert
                  level="high"
                  message="Unusual spike in database connection errors detected"
                  timestamp={getAnomalyTimestamps().high}
                />
                <AnomalyAlert
                  level="medium"
                  message="Memory usage pattern deviates from normal baseline"
                  timestamp={getAnomalyTimestamps().medium}
                />
                <AnomalyAlert
                  level="low"
                  message="Increased response latency in API gateway"
                  timestamp={getAnomalyTimestamps().low}
                />
              </div>
              
              <Button variant="outline" className="mt-4 w-full">
                View All Anomalies
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Real-time Error Timeline */}
        <div className="mt-8">
          <ErrorTimeline timeRange={timeRange} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;