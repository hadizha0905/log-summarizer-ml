// Типы для API ответов
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

// Базовый URL API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Общая функция для запросов
export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// API методы
export const api = {
  // Получение метрик дашборда
  getDashboardMetrics: async (timeRange: string): Promise<DashboardMetrics> => {
    // TODO: Заменить на реальный API endpoint
    // return fetchAPI<DashboardMetrics>(`/dashboard/metrics?range=${timeRange}`);
    
    // Временные моковые данные для разработки
    return new Promise((resolve) => {
      setTimeout(() => {
        const multiplier = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
        resolve({
          totalLogs: Math.floor((Math.random() * 50000 + 10000) * (multiplier / 7)),
          errorCount: Math.floor((Math.random() * 1000 + 100) * (multiplier / 7)),
          criticalCount: Math.floor((Math.random() * 100 + 10) * (multiplier / 7)),
          averageSeverity: Math.random() * 3 + 1,
          anomalyCount: Math.floor((Math.random() * 50 + 5) * (multiplier / 7)),
          uniqueErrors: Math.floor((Math.random() * 100 + 20) * (multiplier / 7)),
          recoveryRate: 85 + Math.random() * 10,
          systemHealth: 90 + Math.random() * 10,
        });
      }, 500);
    });
  },

  // Получение временного ряда данных
  getTimeSeries: async (timeRange: string): Promise<TimeSeriesPoint[]> => {
    // TODO: Заменить на реальный API endpoint
    // return fetchAPI<TimeSeriesPoint[]>(`/dashboard/timeseries?range=${timeRange}`);
    
    // Временные моковые данные
    return new Promise((resolve) => {
      const points: TimeSeriesPoint[] = [];
      const now = new Date();
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      
      for (let i = hours; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 3600000);
        points.push({
          timestamp: timestamp.toISOString(),
          errors: Math.floor(Math.random() * 50),
          warnings: Math.floor(Math.random() * 100),
          critical: Math.floor(Math.random() * 10),
          logs: Math.floor(Math.random() * 1000),
        });
      }
      resolve(points);
    });
  },

  // Получение распределения ошибок
  getErrorDistribution: async (): Promise<ErrorDistributionItem[]> => {
    // TODO: Заменить на реальный API endpoint с параметром timeRange
    // return fetchAPI<ErrorDistributionItem[]>(`/dashboard/error-distribution?range=${timeRange}`);
    
    // Временные моковые данные
    return new Promise((resolve) => {
      resolve([
        { name: 'Database', value: 35, color: '#ef4444' },
        { name: 'API', value: 28, color: '#f59e0b' },
        { name: 'Frontend', value: 20, color: '#3b82f6' },
        { name: 'Auth', value: 12, color: '#10b981' },
        { name: 'Network', value: 5, color: '#8b5cf6' },
      ]);
    });
  },

  // Получение топ ошибок
  getTopErrors: async (limit: number): Promise<TopError[]> => {
    // TODO: Заменить на реальный API endpoint с параметрами timeRange и limit
    // return fetchAPI<TopError[]>(`/dashboard/top-errors?range=${timeRange}&limit=${limit}`);
    
    // Временные моковые данные
    const mockErrors: TopError[] = [
      {
        id: '1',
        message: 'Database connection timeout after 30 seconds',
        count: 156,
        severity: 'critical',
      },
      {
        id: '2',
        message: 'API rate limit exceeded for user authentication',
        count: 89,
        severity: 'high',
      },
      {
        id: '3',
        message: 'Memory leak detected in background process',
        count: 67,
        severity: 'medium',
      },
      {
        id: '4',
        message: 'Failed to parse JSON response from external service',
        count: 45,
        severity: 'low',
      },
      {
        id: '5',
        message: 'JWT token expired during request processing',
        count: 34,
        severity: 'medium',
      },
    ];
    
    return new Promise((resolve) => {
      resolve(mockErrors.slice(0, limit));
    });
  },
};

export default api;