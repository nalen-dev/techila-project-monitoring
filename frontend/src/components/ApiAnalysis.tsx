import React, { useMemo } from 'react';

type ApiAnalysisProps = {
    logs: string[];
    onDrillDown?: (query: string) => void;
};

type ParsedApiLog = {
    time: string;
    level: string;
    msg: string;
    method?: string;
    uri?: string;
    status?: number;
    ip?: string;
    latency?: number;
    error?: string;
};

export default function ApiAnalysis({ logs, onDrillDown }: ApiAnalysisProps) {
    const data = useMemo(() => {
        const parsed: ParsedApiLog[] = [];
        logs.forEach(line => {
            try {
                const obj = typeof line === 'string' ? JSON.parse(line) : line;
                parsed.push(obj);
            } catch (e) {
                // ignore unparseable
            }
        });

        let totalRequests = 0;
        let totalLatency = 0;
        let latencyCount = 0;
        
        const statusMap: Record<number, number> = {};
        const ipMap: Record<string, { total: number; errors: number }> = {};
        const uriMap: Record<string, number> = {};

        parsed.forEach(log => {
            if (log.status) {
                totalRequests++;
                statusMap[log.status] = (statusMap[log.status] || 0) + 1;
                
                if (log.uri) {
                    uriMap[log.uri] = (uriMap[log.uri] || 0) + 1;
                }

                if (log.ip) {
                    if (!ipMap[log.ip]) ipMap[log.ip] = { total: 0, errors: 0 };
                    ipMap[log.ip].total++;
                    if (log.status >= 400) ipMap[log.ip].errors++;
                }
            }

            if (typeof log.latency === 'number') {
                totalLatency += log.latency;
                latencyCount++;
            }
        });

        // Top URIs
        const topUris = Object.entries(uriMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Suspicious IPs (sorted by errors)
        const suspiciousIps = Object.entries(ipMap)
            .filter(([, stats]) => stats.errors > 0)
            .sort((a, b) => b[1].errors - a[1].errors)
            .slice(0, 5);

        const avgLatency = latencyCount > 0 ? (totalLatency / latencyCount).toFixed(2) : 0;

        return {
            totalRequests,
            statusMap,
            topUris,
            suspiciousIps,
            avgLatency
        };
    }, [logs]);

    if (data.totalRequests === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No API request logs found in the current dataset.
            </div>
        );
    }

    const successCount = (data.statusMap[200] || 0) + (data.statusMap[201] || 0);
    const errorCount = (data.statusMap[404] || 0) + (data.statusMap[500] || 0);

    return (
        <div className="h-full flex flex-col gap-6 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-semibold tracking-wider mb-2">TOTAL REQUESTS</div>
                    <div className="text-3xl font-bold text-slate-800">{data.totalRequests}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-semibold tracking-wider mb-2">AVG LATENCY</div>
                    <div className="text-3xl font-bold text-blue-600">{data.avgLatency} <span className="text-sm font-normal text-slate-500">ms</span></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-semibold tracking-wider mb-2">SUCCESS RATE</div>
                    <div className="text-3xl font-bold text-emerald-500">
                        {((successCount / data.totalRequests) * 100).toFixed(1)}%
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-semibold tracking-wider mb-2">ERROR RATE</div>
                    <div className="text-3xl font-bold text-rose-500">
                        {((errorCount / data.totalRequests) * 100).toFixed(1)}%
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                {/* Status Distribution */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        HTTP Status Distribution
                    </h3>
                    <div className="space-y-5">
                        {Object.entries(data.statusMap).sort((a,b) => b[1] - a[1]).map(([status, count]) => {
                            const pct = (count / data.totalRequests) * 100;
                            const isError = parseInt(status) >= 400;
                            return (
                                <div key={status} 
                                     onClick={() => onDrillDown && onDrillDown(`"status":${status}`)}
                                     className="group cursor-pointer p-2 -mx-2 rounded hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className={`font-mono font-bold ${isError ? 'text-rose-600' : 'text-emerald-600'} group-hover:underline`}>{status}</span>
                                        <span className="text-slate-500">{count} reqs ({pct.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${isError ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top URIs */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                        Top Requested Endpoints
                    </h3>
                    <div className="space-y-5">
                        {data.topUris.map(([uri, count]) => {
                            const pct = (count / data.totalRequests) * 100;
                            return (
                                <div key={uri}
                                     onClick={() => onDrillDown && onDrillDown(uri)}
                                     className="group cursor-pointer p-2 -mx-2 rounded hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="font-mono text-slate-600 truncate max-w-[200px] group-hover:text-blue-600 group-hover:underline" title={uri}>{uri}</span>
                                        <span className="text-slate-500">{count} reqs</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Suspicious IPs */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        Suspicious IP Radar (Top Error Generators)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg font-semibold">IP Address</th>
                                    <th className="px-4 py-3 font-semibold">Total Requests</th>
                                    <th className="px-4 py-3 font-semibold">Errors (4xx/5xx)</th>
                                    <th className="px-4 py-3 rounded-tr-lg font-semibold">Error Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.suspiciousIps.length === 0 ? (
                                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No suspicious IPs detected.</td></tr>
                                ) : (
                                    data.suspiciousIps.map(([ip, stats]) => {
                                        const errRate = (stats.errors / stats.total) * 100;
                                        return (
                                            <tr key={ip} 
                                                onClick={() => onDrillDown && onDrillDown(ip)}
                                                className="border-b border-slate-100 last:border-0 hover:bg-blue-50 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-4 py-3 font-mono font-medium text-rose-600 group-hover:underline">{ip}</td>
                                                <td className="px-4 py-3 font-medium group-hover:text-blue-600">{stats.total}</td>
                                                <td className="px-4 py-3 font-bold text-rose-500 group-hover:text-blue-600">{stats.errors}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-10 text-xs font-semibold text-slate-500 group-hover:text-blue-600">{errRate.toFixed(0)}%</span>
                                                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[100px]">
                                                            <div className="h-1.5 rounded-full bg-rose-500" style={{ width: `${errRate}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
