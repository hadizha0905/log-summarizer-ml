import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';

const API_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState('checking');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      await axios.get(`${API_URL}/health`);
      setApiStatus('connected');
      toast.success('Connected to backend');
    } catch (error) {
      setApiStatus('disconnected');
      toast.error('Backend not running on port 8000');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Select a file first');
      return;
    }
    
    setUploading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAnalysisResult({
      summary: "Обнаружено 5 ошибок, 2 критических события. Рекомендуется проверить подключение к базе данных и увеличить память сервера.",
      errors: ["Database connection timeout", "Memory allocation failed", "API response timeout"],
      recommendations: ["Increase connection pool size", "Optimize memory usage", "Add retry logic for API calls"]
    });
    
    toast.success('Analysis complete!');
    setActiveTab('analysis');
    setUploading(false);
  };

  const metrics = [
    { title: 'Total Logs', value: '1,234', change: '+12%', color: '#3b82f6' },
    { title: 'Errors', value: '47', change: '-8%', color: '#ef4444' },
    { title: 'Critical', value: '8', change: '+5%', color: '#f59e0b' },
    { title: 'System Health', value: apiStatus === 'connected' ? '98%' : '0%', change: '+2%', color: '#10b981' },
    { title: 'Avg Response', value: '234ms', change: '-15%', color: '#8b5cf6' },
    { title: 'CPU Usage', value: '45%', change: '-3%', color: '#06b6d4' },
    { title: 'Memory', value: '3.2GB', change: '+8%', color: '#eab308' },
    { title: 'Active Users', value: '1,847', change: '+23%', color: '#14b8a6' },
  ];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'upload', label: 'Upload Logs' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'monitoring', label: 'Monitoring' },
    { id: 'settings', label: 'Settings' },
  ];

  const styles = {
    container: {
      minHeight: '100vh',
      background: darkMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)',
    },
    header: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: darkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sidebar: {
      position: 'fixed',
      left: 0,
      top: 57,
      bottom: 0,
      width: '240px',
      background: darkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(12px)',
      borderRight: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      padding: '16px',
      overflowY: 'auto',
    },
    main: {
      marginLeft: '240px',
      paddingTop: '73px',
      padding: '73px 24px 24px 24px',
    },
    card: {
      background: darkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
      border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      borderRadius: '12px',
      padding: '20px',
      transition: 'all 0.3s',
    },
    metricCard: {
      background: darkMode ? 'rgba(15, 23, 42, 0.6)' : 'white',
      border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      borderRadius: '12px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
    },
    button: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 500,
      transition: 'all 0.2s',
    },
  };

  const MetricCard = ({ metric }) => (
    <div 
      style={styles.metricCard}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: '14px' }}>{metric.title}</p>
          <p style={{ color: darkMode ? 'white' : '#1e293b', fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{metric.value}</p>
          <p style={{ color: metric.change.startsWith('+') ? '#10b981' : '#ef4444', fontSize: '12px', marginTop: '8px' }}>
            {metric.change} from last period
          </p>
        </div>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '10px', 
          background: `${metric.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: metric.color }} />
        </div>
      </div>
      <div style={{ marginTop: '12px', height: '4px', background: darkMode ? '#1e293b' : '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: '65%', height: '100%', background: `linear-gradient(90deg, ${metric.color}, ${metric.color}dd)`, borderRadius: '4px' }} />
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <span style={{ color: 'white', fontSize: '20px' }}>📊</span>
          </div>
          <h1 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Log Summarizer ML
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: apiStatus === 'connected' ? '#10b981' : '#ef4444', animation: 'pulse 2s infinite' }} />
            <span style={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: '14px' }}>
              {apiStatus === 'connected' ? 'Backend Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: darkMode ? '#1e293b' : '#f1f5f9',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>AD</span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === item.id 
                  ? darkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'
                  : 'transparent',
                color: activeTab === item.id 
                  ? darkMode ? 'white' : '#1e293b'
                  : darkMode ? '#94a3b8' : '#64748b',
                borderLeft: activeTab === item.id ? `3px solid #3b82f6` : '3px solid transparent',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item.id) {
                  e.currentTarget.style.background = darkMode ? '#1e293b' : '#f1f5f9';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        
        <div style={{ position: 'absolute', bottom: '20px', left: '16px', right: '16px', paddingTop: '16px', borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
          <div style={{ padding: '12px', borderRadius: '8px', background: darkMode ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc', textAlign: 'center' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <p style={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: '12px', marginTop: '4px' }}>System Protected</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h1 style={{ color: darkMode ? 'white' : '#1e293b', fontSize: '28px', fontWeight: 'bold' }}>Welcome back, Admin</h1>
                  <p style={{ color: darkMode ? '#94a3b8' : '#64748b', marginTop: '4px' }}>Here's what's happening with your system today</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ ...styles.button, background: darkMode ? '#1e293b' : 'white', color: darkMode ? 'white' : '#1e293b', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                    Export Report
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {metrics.map((metric, i) => (
                  <MetricCard key={i} metric={metric} />
                ))}
              </div>

              {/* Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '24px' }}>
                <div style={styles.card}>
                  <h3 style={{ color: darkMode ? 'white' : '#1e293b', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>System Status</h3>
                  {[
                    { name: 'API Gateway', status: 'operational' },
                    { name: 'Database', status: 'degraded' },
                    { name: 'Cache Service', status: 'operational' },
                  ].map(service => (
                    <div key={service.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: service.status === 'operational' ? '#10b981' : '#f59e0b' }} />
                        <span style={{ color: darkMode ? '#cbd5e1' : '#475569' }}>{service.name}</span>
                      </div>
                      <span style={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: '12px' }}>{service.status === 'operational' ? 'Operational' : 'Degraded'}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.card}>
                  <h3 style={{ color: darkMode ? 'white' : '#1e293b', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Top Errors</h3>
                  {[
                    { msg: 'Database connection timeout', count: 156 },
                    { msg: 'API rate limit exceeded', count: 89 },
                    { msg: 'Memory leak detected', count: 67 },
                  ].map((error, i) => (
                    <div key={i} style={{ padding: '12px 0', borderBottom: i < 2 ? `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` : 'none' }}>
                      <p style={{ color: darkMode ? '#cbd5e1' : '#475569', fontSize: '14px' }}>{error.msg}</p>
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{error.count} occurrences</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div>
              <h1 style={{ color: darkMode ? 'white' : '#1e293b', fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Upload Logs</h1>
              <p style={{ color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '24px' }}>Upload your log files for AI-powered analysis</p>

              <div style={styles.card}>
                <div style={{ border: `2px dashed ${darkMode ? '#334155' : '#cbd5e1'}`, borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
                  <input type="file" id="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} accept=".log,.txt,.csv,.json" />
                  <label htmlFor="file" style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '16px', borderRadius: '50%', background: darkMode ? '#1e293b' : '#f1f5f9' }}>
                      <span style={{ fontSize: '32px' }}>📁</span>
                    </div>
                    <p style={{ color: darkMode ? 'white' : '#1e293b', fontSize: '16px', fontWeight: 500 }}>Click to upload or drag and drop</p>
                    <p style={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: '14px' }}>Supported formats: .log, .txt, .csv, .json</p>
                  </label>
                  
                  {file && (
                    <div style={{ marginTop: '24px', padding: '16px', background: darkMode ? '#1e293b' : '#f1f5f9', borderRadius: '8px', display: 'inline-block' }}>
                      <p style={{ color: darkMode ? 'white' : '#1e293b' }}>📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
                    </div>
                  )}
                  
                  <button 
                    onClick={handleUpload} 
                    disabled={!file || uploading}
                    style={{
                      marginTop: '24px',
                      padding: '12px 32px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 500,
                      cursor: !file || uploading ? 'not-allowed' : 'pointer',
                      background: !file || uploading ? '#64748b' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!(!file || uploading)) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {uploading ? 'Analyzing...' : 'Upload & Analyze'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div>
              <h1 style={{ color: darkMode ? 'white' : '#1e293b', fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>AI Analysis</h1>
              <p style={{ color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '24px' }}>AI-powered log analysis and insights</p>

              {!analysisResult ? (
                <div style={styles.card}>
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <span style={{ fontSize: '48px' }}>🤖</span>
                    <p style={{ color: darkMode ? '#94a3b8' : '#64748b', marginTop: '16px' }}>Upload logs to see AI-powered analysis</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                  <div style={styles.card}>
                    <h3 style={{ color: darkMode ? 'white' : '#1e293b', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>AI Summary</h3>
                    <p style={{ color: darkMode ? '#cbd5e1' : '#475569', lineHeight: 1.6 }}>{analysisResult.summary}</p>
                  </div>
                  <div style={styles.card}>
                    <h3 style={{ color: darkMode ? 'white' : '#1e293b', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Detected Issues</h3>
                    {analysisResult.errors.map((err, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                        <span>⚠️</span>
                        <span style={{ color: darkMode ? '#cbd5e1' : '#475569' }}>{err}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...styles.card, gridColumn: '1/-1' }}>
                    <h3 style={{ color: darkMode ? 'white' : '#1e293b', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Recommendations</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                      {analysisResult.recommendations.map((rec, i) => (
                        <div key={i} style={{ padding: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', borderRadius: '8px' }}>
                          <span style={{ color: '#3b82f6', fontWeight: 600 }}>#{i + 1}</span>
                          <p style={{ color: darkMode ? '#cbd5e1' : '#475569', marginTop: '8px' }}>{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      
      <Toaster position="top-right" richColors theme={darkMode ? 'dark' : 'light'} />
    </div>
  );
}

export default App;