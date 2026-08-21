import React, { useMemo } from 'react';

type WorkerAnalysisProps = {
    logs: string[];
};

type ParsedWorkerLog = {
    time: string;
    level: string;
    msg: string;
    topic?: string;
    payload_size?: number;
    machine?: string;
    material_count?: number;
};

export default function WorkerAnalysis({ logs }: WorkerAnalysisProps) {
    const data = useMemo(() => {
        const parsed: ParsedWorkerLog[] = [];
        logs.forEach(line => {
            try {
                const obj = typeof line === 'string' ? JSON.parse(line) : line;
                parsed.push(obj);
            } catch (e) {
                // ignore unparseable
            }
        });

        let totalReceived = 0;
        let totalSaved = 0;
        let totalIgnored = 0;
        let totalWarnings = 0;
        let totalErrors = 0;
        
        const machineTraffic: Record<string, number> = {};

        parsed.forEach(log => {
            if (log.msg.includes('Menerima pesan MQTT')) {
                totalReceived++;
                // Extract machine from topic e.g. "cisangkan/batch-monitoring/FM5"
                if (log.topic) {
                    const parts = log.topic.split('/');
                    const machine = parts[parts.length - 1];
                    machineTraffic[machine] = (machineTraffic[machine] || 0) + 1;
                }
            } else if (log.msg.includes('Sukses menyimpan data Batch')) {
                totalSaved++;
            } else if (log.msg.includes('Data Batch diabaikan')) {
                totalIgnored++;
            }

            if (log.level === 'WARN') totalWarnings++;
            if (log.level === 'ERROR') totalErrors++;
        });

        return {
            totalReceived,
            totalSaved,
            totalIgnored,
            totalWarnings,
            totalErrors,
            machineTraffic
        };
    }, [logs]);

    if (data.totalReceived === 0 && data.totalSaved === 0 && data.totalWarnings === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No Worker activity logs found in the current dataset.
            </div>
        );
    }

    const maxMachineTraffic = Math.max(...Object.values(data.machineTraffic), 1);

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-6 relative">
            <h2 className="text-xl font-bold text-slate-200 mb-2">Worker Health & Throughput</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 shadow">
                    <div className="text-slate-400 text-xs mb-1">Messages Received</div>
                    <div className="text-3xl font-bold text-blue-400">{data.totalReceived}</div>
                </div>
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 shadow">
                    <div className="text-slate-400 text-xs mb-1">Successfully Saved</div>
                    <div className="text-3xl font-bold text-emerald-400">{data.totalSaved}</div>
                </div>
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 shadow">
                    <div className="text-slate-400 text-xs mb-1">Ignored (Zero Materials)</div>
                    <div className="text-3xl font-bold text-orange-400">{data.totalIgnored}</div>
                </div>
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 shadow">
                    <div className="text-slate-400 text-xs mb-1">Worker Errors</div>
                    <div className="text-3xl font-bold text-red-400">{data.totalErrors}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                {/* Pipeline Success Rate Funnel */}
                <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 flex flex-col">
                    <h3 className="text-sm font-semibold text-slate-300 mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        Pipeline Processing Funnel
                    </h3>
                    <div className="flex-1 flex flex-col justify-center gap-4 px-8">
                        <div className="relative">
                            <div className="w-full bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-center">
                                <span className="text-blue-400 font-bold text-lg">{data.totalReceived}</span>
                                <span className="text-slate-400 text-xs block">Payloads Received</span>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1 bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-3 text-center">
                                <span className="text-emerald-400 font-bold text-lg">{data.totalSaved}</span>
                                <span className="text-slate-400 text-xs block">Saved to DB</span>
                            </div>
                            <div className="flex-1 bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 text-center opacity-80">
                                <span className="text-orange-400 font-bold text-lg">{data.totalIgnored}</span>
                                <span className="text-slate-400 text-xs block">Ignored</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Machine Traffic */}
                <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-300 mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                        Traffic by Machine
                    </h3>
                    <div className="space-y-5">
                        {Object.entries(data.machineTraffic).sort((a,b) => b[1] - a[1]).map(([machine, count]) => {
                            const pct = (count / maxMachineTraffic) * 100;
                            const share = (count / data.totalReceived) * 100;
                            return (
                                <div key={machine}>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="font-mono text-slate-200 font-bold">{machine || 'Unknown'}</span>
                                        <span className="text-slate-400">{count} msgs ({share.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-900 rounded-full h-2">
                                        <div className="h-2 rounded-full bg-pink-500 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(data.machineTraffic).length === 0 && (
                            <div className="text-slate-500 text-center text-sm italic py-4">No machine identifiers found in logs.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
