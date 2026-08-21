import { useState, useEffect } from 'react';

export default function Overview() {
  const [loading, setLoading] = useState(true);
  const [uptime, setUptime] = useState(100);
  const [avgResp, setAvgResp] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [cm3Count, setCm3Count] = useState(0);
  const [cm4Count, setCm4Count] = useState(0);
  const [fm5Count, setFm5Count] = useState(0);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        // Fetch API Logs (last 10,000 for a solid average)
        const apiRes = await fetch('http://localhost:8080/api/v1/logs?file=api-server.log&lines=10000');
        const apiJson = await apiRes.json();
        const apiLogs = apiJson.data || [];
        
        let totalResp = 0;
        let respCount = 0;
        let errors = 0;
        
        apiLogs.forEach((line: any) => {
          let str = typeof line === 'string' ? line : JSON.stringify(line);
          try {
            const parsed = typeof line === 'string' ? JSON.parse(line) : line;
            if (parsed.level === 'error' || parsed.status >= 500) errors++;
            if (parsed.duration_ms) {
              totalResp += parsed.duration_ms;
              respCount++;
            }
          } catch (e) {
            if (str.toLowerCase().includes('error')) errors++;
          }
        });

        if (apiLogs.length > 0) {
          const up = 100 - (errors / apiLogs.length) * 100;
          setUptime(up < 0 ? 0 : up);
        }
        if (respCount > 0) {
          setAvgResp(Math.round(totalResp / respCount));
        }

        // Fetch MQTT Logs (Batch Monitoring)
        const mqttRes = await fetch('http://localhost:8080/api/v1/logs?file=mqtt_raw_messages.txt&lines=10000');
        const mqttJson = await mqttRes.json();
        const mqttLogs = mqttJson.parsedData || [];
        
        setTotalBatches(mqttLogs.length);
        let cm3 = 0, cm4 = 0, fm5 = 0;
        mqttLogs.forEach((entry: any) => {
          if (entry.Identifier === 'CM3') cm3++;
          else if (entry.Identifier === 'CM4') cm4++;
          else if (entry.Identifier === 'FM5') fm5++;
        });
        setCm3Count(cm3);
        setCm4Count(cm4);
        setFm5Count(fm5);
        
      } catch (err) {
        console.error("Error fetching overview metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMetrics();
  }, []);

  return (
    <div className="mb-8">
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-slate-500 font-medium">Computing real-time metrics...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-12 h-12 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-1 15v-4H8l4-7v4h3l-4 7z"/></svg>
            </div>
            <div className="text-sm font-bold text-slate-400 tracking-wider uppercase">Global Uptime</div>
            <div className="text-4xl font-extrabold mt-3 text-slate-800">{uptime.toFixed(2)}%</div>
            <div className={`text-xs font-semibold mt-3 flex items-center gap-1 ${uptime >= 99 ? 'text-emerald-500' : 'text-amber-500'}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {uptime >= 99 ? 'Excellent Health' : 'Needs Attention'}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div className="text-sm font-bold text-slate-400 tracking-wider uppercase">Avg Response Time</div>
            <div className="text-4xl font-extrabold mt-3 text-slate-800">{avgResp} <span className="text-xl text-slate-500 font-medium">ms</span></div>
            <div className={`text-xs font-semibold mt-3 flex items-center gap-1 ${avgResp < 200 ? 'text-emerald-500' : 'text-red-500'}`}>
               <span className="w-2 h-2 rounded-full bg-current"></span>
               {avgResp < 200 ? 'Optimal Speed' : 'Slower than usual'}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div className="text-sm font-bold text-slate-400 tracking-wider uppercase">Total Active Batches</div>
            <div className="text-4xl font-extrabold mt-3 text-slate-800">{totalBatches}</div>
            <div className="text-xs font-medium text-slate-500 mt-3 flex items-center gap-3">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> CM3: {cm3Count}</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> CM4: {cm4Count}</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> FM5: {fm5Count}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
