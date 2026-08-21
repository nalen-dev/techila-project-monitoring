import { useState, useEffect } from 'react';
import ApiAnalysis from '../components/ApiAnalysis';

export default function ApiAnalytics() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState('2000');

  // Fetch API logs when lines change
  useEffect(() => {
    const fetchApiLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8082/api/v1/logs?lines=${lines}&file=api-server.log&category=all&identifier=all&start_time=&end_time=&ts_start=&ts_end=`);
        const json = await res.json();
        setLogs(json.data || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchApiLogs();
  }, [lines]);

  const handleDrillDown = (query: string) => {
    sessionStorage.setItem('logExplorerSearch', query);
    sessionStorage.setItem('logExplorerFile', 'api-server.log');
    window.dispatchEvent(new CustomEvent('changeTab', { detail: 'logs' }));
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Analytics Toolbar */}
      <div className="flex justify-end mb-2">
        <div className="flex items-center shadow-sm rounded-md border border-indigo-100 bg-indigo-50/50 backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-1.5 text-indigo-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                {logs.length} Logs
              </span>
            )}
          </div>
          <select 
            value={lines}
            onChange={(e) => setLines(e.target.value)}
            disabled={loading}
            className="px-4 py-1.5 bg-white text-slate-700 text-sm font-semibold focus:outline-none hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 border-l border-indigo-100"
          >
            <option value="500">Last 500 requests</option>
            <option value="1000">Last 1,000 requests</option>
            <option value="2000">Last 2,000 requests</option>
            <option value="5000">Last 5,000 requests</option>
            <option value="10000">Last 10,000 requests</option>
          </select>
        </div>
      </div>

      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10 rounded-xl">
            <div className="text-blue-600 animate-pulse font-medium text-sm flex flex-col items-center gap-3">
              <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Fetching Logs...
            </div>
          </div>
        ) : null}
        
        <ApiAnalysis logs={logs} onDrillDown={handleDrillDown} />
      </div>
    </div>
  );
}
