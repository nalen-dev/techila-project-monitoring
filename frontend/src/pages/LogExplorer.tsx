import { useState, useEffect } from 'react';
import BatchGapAnalysis from '../components/BatchGapAnalysis';
import ApiAnalysis from '../components/ApiAnalysis';
import WorkerAnalysis from '../components/WorkerAnalysis';

export default function LogExplorer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState('500');
  const [selectedFile, setSelectedFile] = useState('mqtt_raw_messages.txt');
  const [activeTab, setActiveTab] = useState<'log' | 'analysis'>('log');
  const [search, setSearch] = useState('');
  
  // Read from session storage for drill-down navigation
  useEffect(() => {
    const savedSearch = sessionStorage.getItem('logExplorerSearch');
    const savedFile = sessionStorage.getItem('logExplorerFile');
    
    if (savedFile) {
      setSelectedFile(savedFile);
      sessionStorage.removeItem('logExplorerFile');
    }
    if (savedSearch) {
      setSearch(savedSearch);
      sessionStorage.removeItem('logExplorerSearch');
    }
  }, []);

  // Ensure active tab defaults back to 'log' when api-server.log is selected
  useEffect(() => {
    if (selectedFile === 'api-server.log' && activeTab === 'analysis') {
      setActiveTab('log');
    }
    
    // Reset smart filters when not viewing MQTT logs
    if (selectedFile !== 'mqtt_raw_messages.txt') {
      setCategory('all');
      setIdentifier('all');
    }
  }, [selectedFile, activeTab]);

  // Smart filters for MQTT
  const [category, setCategory] = useState('all');
  const [identifier, setIdentifier] = useState('all');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tsStart, setTsStart] = useState('');
  const [tsEnd, setTsEnd] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8082/api/v1/logs?lines=${lines}&file=${selectedFile}&category=${category}&identifier=${identifier}&start_time=${startTime}&end_time=${endTime}&ts_start=${tsStart}&ts_end=${tsEnd}`);
      const json = await res.json();
      setLogs(json.data || []);
      setParsedData(json.parsedData || []);
    } catch (err) {
      console.error(err);
      setLogs(["[Error] Failed to connect to API server."]);
      setParsedData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [lines, selectedFile, category, identifier, startTime, endTime]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-[70vh]">
      
      <div className="bg-slate-900 p-4 border-b border-slate-700 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <select 
            className="bg-slate-800 text-white text-sm font-semibold px-3 py-1.5 rounded outline-none border border-slate-700"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            <option value="api-server.log">api-server.log</option>
            <option value="mqtt-worker.log">mqtt-worker.log</option>
            <option value="mqtt_raw_messages.txt">mqtt_raw_messages.txt</option>
          </select>
          
          <div className="w-[1px] h-6 bg-slate-700"></div>

          <button 
            onClick={fetchLogs} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-1.5 rounded-md font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'log' && (
            <input
              type="text"
              placeholder="Search in text logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-300 focus:outline-none focus:border-blue-500 w-64"
            />
          )}
        </div>
      </div>

      {/* Secondary Bar: Smart Filters & Time Range */}
      <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4">
        
        {/* Left Side: Topic/Identifier Filters & Global Time Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {selectedFile !== 'api-server.log' && (
            <>
              <span className="text-xs font-semibold text-slate-400 tracking-wider">SMART FILTER:</span>
              <select 
                className="bg-slate-700 text-white text-xs px-2 py-1 rounded outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All Topics</option>
                <option value="batch-monitoring">batch-monitoring</option>
                <option value="backup">backup</option>
              </select>
              <select 
                className="bg-slate-700 text-white text-xs px-2 py-1 rounded outline-none"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              >
                <option value="all">All Identifiers</option>
                <option value="CM3">CM3</option>
                <option value="CM4">CM4</option>
                <option value="FM5">FM5</option>
              </select>
              <div className="w-[1px] h-4 bg-slate-600 mx-1"></div>
            </>
          )}

          {/* Time Range Filter (Global) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Time Range:</span>
            <input 
              type="datetime-local" 
              className="bg-slate-700 text-white text-xs px-2 py-1 rounded outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              title="Start Time"
            />
            <span className="text-xs text-slate-500">-</span>
            <input 
              type="datetime-local" 
              className="bg-slate-700 text-white text-xs px-2 py-1 rounded outline-none"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              title="End Time"
            />
            {(startTime || endTime) && (
              <button 
                onClick={() => { setStartTime(''); setEndTime(''); }}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors ml-1"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Payload Time Filter (Only for MQTT Raw Messages) */}
          {selectedFile === 'mqtt_raw_messages.txt' && (
            <div className="flex items-center gap-2 border-l border-slate-600 pl-3 ml-1">
              <span className="text-xs text-slate-400">Payload TS:</span>
              <input 
                type="datetime-local" 
                className="bg-slate-700 text-white text-xs px-2 py-1 rounded outline-none"
                value={tsStart}
                onChange={(e) => setTsStart(e.target.value)}
                title="Payload Start Time"
              />
              <span className="text-xs text-slate-500">-</span>
              <input 
                type="datetime-local" 
                className="bg-slate-700 text-white text-xs px-2 py-1 rounded outline-none"
                value={tsEnd}
                onChange={(e) => setTsEnd(e.target.value)}
                title="Payload End Time"
              />
              {(tsStart || tsEnd) && (
                <button 
                  onClick={() => { setTsStart(''); setTsEnd(''); }}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Global Control for All Logs */}
        <select 
            className="bg-slate-700 text-white text-xs px-2 py-1 rounded outline-none"
            value={lines}
            onChange={(e) => setLines(e.target.value)}
          >
            <option value="10">Last 10 Lines</option>
            <option value="100">Last 100 Lines</option>
            <option value="500">Last 500 Lines</option>
            <option value="1000">Last 1000 Lines</option>
            <option value="5000">Last 5000 Lines</option>
        </select>
      </div>

      {/* Sub Tabs */}
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-4">
        <button 
          onClick={() => setActiveTab('log')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${activeTab === 'log' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
        >
          Text Log View
        </button>
        {selectedFile !== 'api-server.log' && (
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${activeTab === 'analysis' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
          >
            {selectedFile === 'mqtt_raw_messages.txt' ? 'Batch Gap Analysis' : 'Worker Health'}
          </button>
        )}
      </div>

      {activeTab === 'log' ? (
        <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-slate-300 leading-normal whitespace-pre-wrap custom-scrollbar flex flex-col relative">
          
          {search && (
             <div className="sticky top-0 bg-slate-800/90 backdrop-blur border border-blue-500/50 text-blue-300 px-3 py-1.5 rounded-md mb-4 text-xs font-sans font-medium flex justify-between items-center z-10 shadow-lg">
                <span>
                  Filtering results containing: <strong className="text-white bg-blue-500/30 px-1 py-0.5 rounded ml-1">{search}</strong>
                </span>
                <button onClick={() => setSearch('')} className="hover:text-white underline">Clear Search</button>
             </div>
          )}

          {loading && logs.length === 0 ? (
            <div className="text-slate-500 animate-pulse mt-2">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-slate-500 mt-2">No logs found matching criteria.</div>
          ) : (() => {
            const filteredLogs = logs.filter(line => {
              const lineStr = typeof line === 'string' ? line : JSON.stringify(line);
              if (!search) return true;
              return lineStr.toLowerCase().includes(search.toLowerCase());
            });

            if (filteredLogs.length === 0) {
              return <div className="text-slate-500 mt-2">No logs found matching search "{search}".</div>;
            }

            return filteredLogs.map((line, idx) => {
              const lineStr = typeof line === 'string' ? line : JSON.stringify(line);
              const isError = lineStr.toLowerCase().includes('error');
              const isWarn = lineStr.toLowerCase().includes('warn');
              return (
                <div key={idx} className="hover:bg-slate-800/50 px-1 py-1 rounded flex border-b border-slate-700/50 last:border-0">
                  <span className="text-slate-600 mr-4 select-none shrink-0">{String(idx + 1).padStart(3, '0')}</span>
                  <span className={`break-all ${isError ? 'text-red-400' : isWarn ? 'text-yellow-400' : ''}`}>
                    {/* Simple naive highlight if search is active */}
                    {search ? (
                      <>
                        {lineStr.split(new RegExp(`(${search})`, 'gi')).map((part, i) => 
                          part.toLowerCase() === search.toLowerCase() ? <span key={i} className="bg-blue-500/40 text-white rounded px-0.5">{part}</span> : part
                        )}
                      </>
                    ) : lineStr}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden bg-slate-900/50">
          {selectedFile === 'mqtt_raw_messages.txt' && <BatchGapAnalysis logs={parsedData} identifier={identifier} />}
          {selectedFile === 'mqtt-worker.log' && <WorkerAnalysis logs={logs} />}
        </div>
      )}
    </div>
  );
}
