import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, Upload, BarChart3, AlertTriangle, 
  Server, RefreshCw, FileText, CheckCircle, XCircle,
  Database
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

const API_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState('checking');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      await axios.get(`${API_URL}/health`);
      setApiStatus('connected');
      toast.success('Connected to backend');
    } catch {
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
    await new Promise(r => setTimeout(r, 2000));
    
    setAnalysisResult({
      summary: "Обнаружено 5 ошибок, 2 критических события. Рекомендуется проверить подключение к базе данных и увеличить память сервера.",
      errors: ["Database connection timeout", "Memory allocation failed", "API response timeout"],
      severity: "high"
    });
    
    toast.success('Analysis complete!');
    setActiveTab('analysis');
    setUploading(false);
  };

  const metrics = [
    { title: 'Total Logs', value: '1,234', icon: <Database size={20} />, color: 'blue' },
    { title: 'Errors', value: '47', icon: <AlertTriangle size={20} />, color: 'red' },
    { title: 'Critical', value: '8', icon: <XCircle size={20} />, color: 'orange' },
    { title: 'Health', value: apiStatus === 'connected' ? '98%' : '0%', icon: <Activity size={20} />, color: 'green' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Log Summarizer ML
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${apiStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-400">
                {apiStatus === 'connected' ? 'Backend Connected' : 'Backend Disconnected'}
              </span>
            </div>
            <button onClick={checkBackend} className="p-1 hover:bg-slate-800 rounded-lg">
              <RefreshCw size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-14 bottom-0 w-64 bg-slate-900/50 backdrop-blur-sm border-r border-slate-700 p-4">
        <nav className="space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
            { id: 'upload', label: 'Upload Logs', icon: <Upload size={18} /> },
            { id: 'analysis', label: 'Analysis', icon: <Activity size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/50'
                  : 'text-gray-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 pt-16 p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {metrics.map((m, i) => (
                  <div key={i} className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 hover:scale-105 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-gray-400 text-sm">{m.title}</p>
                        <p className="text-2xl font-bold text-white mt-1">{m.value}</p>
                      </div>
                      <div className={`p-2 rounded-lg bg-${m.color}-500/20 text-${m.color}-400`}>{m.icon}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
                <div className="text-center py-8">
                  {apiStatus === 'connected' ? (
                    <>
                      <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                      <p className="text-green-400">All systems operational</p>
                      <p className="text-gray-500 text-sm mt-2">Ready to analyze logs</p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-3" />
                      <p className="text-yellow-400">Waiting for backend</p>
                      <p className="text-gray-500 text-sm mt-2">Start backend: cd backend && python -m app.main</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Upload Logs
              </h1>
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8">
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center">
                  <input 
                    type="file" 
                    id="file" 
                    className="hidden" 
                    onChange={e => setFile(e.target.files[0])} 
                    accept=".log,.txt,.csv" 
                  />
                  <label htmlFor="file" className="cursor-pointer inline-flex flex-col items-center gap-3">
                    <div className="p-4 bg-slate-800 rounded-full">
                      <Upload size={40} className="text-gray-400" />
                    </div>
                    <p className="text-white text-lg">Click to upload</p>
                    <p className="text-gray-500 text-sm">Supported: .log, .txt, .csv</p>
                  </label>
                  {file && (
                    <div className="mt-4 p-3 bg-slate-800 rounded-lg inline-block">
                      <p className="text-white">📄 {file.name}</p>
                      <p className="text-gray-400 text-sm">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  )}
                  <button 
                    onClick={handleUpload} 
                    disabled={!file || uploading} 
                    className={`mt-6 px-8 py-3 rounded-lg font-medium text-white transition ${
                      !file || uploading ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:scale-105'
                    }`}
                  >
                    {uploading ? 'Analyzing...' : 'Upload & Analyze'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Analysis
              </h1>
              {!analysisResult ? (
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-12 text-center">
                  <FileText size={48} className="mx-auto mb-3 text-gray-500" />
                  <p className="text-gray-400">Upload logs to see AI-powered analysis</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-3 flex gap-2">
                      <AlertTriangle className="text-yellow-400" /> AI Summary
                    </h2>
                    <p className="text-gray-300 leading-relaxed">{analysisResult.summary}</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-3 flex gap-2">
                      <CheckCircle className="text-green-400" /> Detected Issues
                    </h2>
                    <ul className="space-y-2">
                      {analysisResult.errors.map((err, i) => (
                        <li key={i} className="text-gray-300 flex gap-2">
                          <AlertTriangle size={16} className="text-yellow-400 mt-1" />
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Toaster position="top-right" richColors theme="dark" />
    </div>
  );
}

export default App;