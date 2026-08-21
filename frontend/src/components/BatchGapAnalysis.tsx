import { useState, useMemo, useRef } from 'react';
import { ScatterChart, Scatter, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ZAxis, ReferenceArea } from 'recharts';

interface MqttParsedPayload {
    timestamp: string;
    raw_topic: string;
    payload: any;
    Identifier: string;
    Category: string;
}

interface Props {
    logs: MqttParsedPayload[];
    identifier: string;
}

interface ShiftData {
    shiftLabel: string;
    batches: { [key: number]: MqttParsedPayload[] };
    maxBatch: number;
}

export default function BatchGapAnalysis({ logs, identifier }: Props) {
    const [selectedPayloads, setSelectedPayloads] = useState<MqttParsedPayload[] | null>(null);
    const [activeView, setActiveView] = useState<'gap' | 'scatter'>('scatter');
    const [timeField, setTimeField] = useState<'system' | 'payload'>('system');
    
    // Toggle for FM5
    const [fm5Mixer, setFm5Mixer] = useState<'A' | 'B'>('A');

    // Zoom state
    const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
    const [xDomain, setXDomain] = useState<[any, any]>(['dataMin', 'dataMax']);
    const [yDomain, setYDomain] = useState<[any, any]>(['dataMin', 'dataMax']);
    
    // Scroll Zoom State
    const [hoveredX, setHoveredX] = useState<number | null>(null);

    const parseTime = (entry: MqttParsedPayload) => {
        if (timeField === 'payload' && entry.payload?.ts) {
            return new Date(entry.payload.ts).getTime();
        }
        return new Date(entry.timestamp).getTime();
    };

    const formatTimestamp = (ts: string) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + d.getMilliseconds().toString().padStart(3, '0');
    };

    // Calculate Data for Charts
    const chartData = useMemo(() => {
        if (!logs || logs.length === 0 || identifier === 'all') return { valid: [], missing: [], all: [] };

        const targetField = identifier.startsWith('FM') 
            ? (fm5Mixer === 'A' ? 'batch_number_a' : 'batch_number_b') 
            : 'batch_number';
            
        let validLogs = logs.filter(l => l.payload && typeof l.payload[targetField] === 'number');
        
        let scatter = validLogs.map(l => ({
            x: parseTime(l),
            y: l.payload[targetField],
            entry: l,
            isMissing: false
        }));

        scatter.sort((a, b) => a.y - b.y);
        
        let finalScatter: any[] = [];
        let missingScatter: any[] = [];
        
        for (let i = 0; i < scatter.length; i++) {
            finalScatter.push(scatter[i]);
            
            if (i < scatter.length - 1) {
                const current = scatter[i];
                const next = scatter[i + 1];
                const gap = next.y - current.y;
                
                if (gap > 1 && gap < 1000) { 
                    const timeDiff = next.x - current.x;
                    const timePerBatch = timeDiff / gap;
                    
                    for (let j = 1; j < gap; j++) {
                        const missingBatch = current.y + j;
                        const interpolatedTime = current.x + (timePerBatch * j);
                        missingScatter.push({
                            x: interpolatedTime,
                            y: missingBatch,
                            entry: null,
                            isMissing: true
                        });
                    }
                }
            }
        }

        return { valid: finalScatter, missing: missingScatter, all: [...finalScatter, ...missingScatter] };
    }, [logs, identifier, timeField, fm5Mixer]);

    // GAP ANALYSIS LOGIC (Legacy)
    const { shiftsA, shiftsB } = useMemo(() => {
        if (!logs || identifier === 'all') return { shiftsA: [], shiftsB: [] };

        const processShift = (batchField: string): ShiftData[] => {
            let s1: { [key: number]: MqttParsedPayload[] } = {};
            let s2: { [key: number]: MqttParsedPayload[] } = {};
            let max1 = 0;
            let max2 = 0;

            logs.forEach(log => {
                if (log.payload && typeof log.payload[batchField] === 'number') {
                    const bNum = log.payload[batchField];
                    if (bNum <= 0) return;
                    
                    const d = new Date(log.timestamp);
                    const hour = d.getHours();
                    const isShift1 = hour >= 6 && hour < 18;

                    if (isShift1) {
                        if (!s1[bNum]) s1[bNum] = [];
                        s1[bNum].push(log);
                        if (bNum > max1) max1 = bNum;
                    } else {
                        if (!s2[bNum]) s2[bNum] = [];
                        s2[bNum].push(log);
                        if (bNum > max2) max2 = bNum;
                    }
                }
            });

            const result: ShiftData[] = [];
            if (max1 > 0) result.push({ shiftLabel: 'Shift 1 (06:00 - 18:00)', batches: s1, maxBatch: max1 });
            if (max2 > 0) result.push({ shiftLabel: 'Shift 2 (18:00 - 06:00)', batches: s2, maxBatch: max2 });
            return result;
        };

        if (identifier.startsWith('FM')) {
            return { shiftsA: processShift('batch_number_a'), shiftsB: processShift('batch_number_b') };
        } else {
            return { shiftsA: processShift('batch_number'), shiftsB: [] };
        }
    }, [logs, identifier]);

    if (identifier === 'all') {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Please select a specific Identifier (e.g. CM3, CM4, FM5) in the Smart Filter to view Analytics.
            </div>
        );
    }

    if (chartData.valid.length === 0 && shiftsA.length === 0 && shiftsB.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No batch numbers found in the current logs for Identifier '{identifier}'.
            </div>
        );
    }

    const CustomScatterTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const date = new Date(data.x);
            
            if (data.isMissing) {
                return (
                    <div className="bg-red-950/90 border border-red-800 p-3 rounded-lg shadow-xl text-xs backdrop-blur">
                        <p className="text-red-300 font-bold mb-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            Missing Batch: {data.y}
                        </p>
                        <p className="text-red-400/80">Estimated Time: {date.toLocaleTimeString()}</p>
                        <p className="text-red-500 mt-2 italic text-[10px]">No data received for this batch.</p>
                    </div>
                );
            }

            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs backdrop-blur">
                    <p className="text-slate-300 font-bold mb-1">Batch: <span className="text-blue-400">{data.y}</span></p>
                    <p className="text-slate-400">Time: {date.toLocaleTimeString()} ({date.getMilliseconds()}ms)</p>
                    <p className="text-slate-500 mt-2 italic text-[10px]">Click dot to view payload</p>
                </div>
            );
        }
        return null;
    };

    // --- ZOOM LOGIC ---
    
    // 1. Drag to Zoom
    const zoom = () => {
        let left = refAreaLeft;
        let right = refAreaRight;

        if (left === right || left === null || right === null) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        if (left > right) [left, right] = [right, left];

        setRefAreaLeft(null);
        setRefAreaRight(null);
        
        applyZoom(left, right);
    };

    const applyZoom = (left: number, right: number) => {
        const dataInZoom = chartData.all.filter(d => d.x >= left && d.x <= right);
        if (dataInZoom.length > 0) {
            const yValues = dataInZoom.map(d => d.y);
            const yMin = Math.min(...yValues);
            const yMax = Math.max(...yValues);
            const yPadding = Math.max(1, Math.floor((yMax - yMin) * 0.1));
            setXDomain([left, right]);
            setYDomain([yMin - yPadding, yMax + yPadding]);
        } else {
            setXDomain([left, right]);
        }
    };

    // 2. Scroll to Zoom
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (chartData.all.length === 0) return;
        
        const absoluteMin = Math.min(...chartData.all.map(d => d.x));
        const absoluteMax = Math.max(...chartData.all.map(d => d.x));
        
        let L = typeof xDomain[0] === 'number' ? xDomain[0] : absoluteMin;
        let R = typeof xDomain[1] === 'number' ? xDomain[1] : absoluteMax;
        
        // Calculate mouse position relative to chart exactly
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        // Approximate plot area (Y-Axis is ~60px + left margin 20px = 80px)
        const plotLeft = 80;
        const plotRight = rect.width - 20;
        const plotWidth = plotRight - plotLeft;
        
        let P;
        if (mouseX <= plotLeft) P = L;
        else if (mouseX >= plotRight) P = R;
        else {
            const pixelFraction = (mouseX - plotLeft) / plotWidth;
            P = L + pixelFraction * (R - L);
        }
        
        const zoomFactor = e.deltaY < 0 ? 0.8 : 1.25; // scroll up = zoom in
        
        let W = R - L;
        let newW = W * zoomFactor;
        
        // Bounds
        if (newW > (absoluteMax - absoluteMin)) newW = (absoluteMax - absoluteMin);
        if (newW < 1000) newW = 1000; // max zoom in = 1 second
        
        const fraction = (P - L) / W;
        let newL = P - fraction * newW;
        let newR = newL + newW;
        
        // Clamp to absolute bounds if completely zoomed out
        if (zoomFactor > 1 && (newL <= absoluteMin && newR >= absoluteMax)) {
            zoomOut();
            return;
        }
        
        applyZoom(newL, newR);
    };

    const zoomOut = () => {
        setXDomain(['dataMin', 'dataMax']);
        setYDomain(['dataMin', 'dataMax']);
        setRefAreaLeft(null);
        setRefAreaRight(null);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 relative rounded-tl-xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-800/50 gap-4">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveView('gap')} 
                        className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${activeView === 'gap' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        1. Gap Matrix
                    </button>
                    <button 
                        onClick={() => setActiveView('scatter')} 
                        className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${activeView === 'scatter' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        2. Scatter Plot (Time vs Batch)
                    </button>
                </div>
                
                {identifier.startsWith('FM') && (
                    <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                        <button 
                            onClick={() => { setFm5Mixer('A'); zoomOut(); }}
                            className={`text-xs font-bold px-3 py-1 rounded transition-colors ${fm5Mixer === 'A' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Mixer A
                        </button>
                        <button 
                            onClick={() => { setFm5Mixer('B'); zoomOut(); }}
                            className={`text-xs font-bold px-3 py-1 rounded transition-colors ${fm5Mixer === 'B' ? 'bg-purple-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Mixer B
                        </button>
                    </div>
                )}

                {activeView === 'scatter' && (
                    <div className="flex items-center gap-4">
                        {(xDomain[0] !== 'dataMin' || yDomain[0] !== 'dataMin') && (
                            <button 
                                onClick={zoomOut}
                                className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                                Zoom Out
                            </button>
                        )}
                        <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
                            <span className="text-xs text-slate-500 font-bold tracking-wider">TIME SOURCE:</span>
                            <select 
                                value={timeField} 
                                onChange={(e: any) => { setTimeField(e.target.value); zoomOut(); }}
                                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2 py-1 rounded outline-none focus:border-indigo-500"
                            >
                                <option value="system">System Received Time</option>
                                <option value="payload">Payload internal 'ts'</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                {activeView === 'gap' && (
                    <div className="text-slate-300">
                        {[shiftsA, shiftsB].map((shifts, sidx) => {
                            if (shifts.length === 0) return null;
                            const title = identifier.startsWith('FM') ? (sidx === 0 ? 'Mixer A' : 'Mixer B') : 'Batch Sequence';
                            return (
                                <div key={sidx} className="mb-8">
                                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        {title}
                                    </h3>
                                    <div className="flex flex-col gap-6 pl-4 border-l border-slate-700/50">
                                        {shifts.map((shift, i) => (
                                            <div key={i} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 shadow-lg">
                                                <div className="text-xs text-slate-400 mb-4 flex justify-between border-b border-slate-700/50 pb-2">
                                                    <span className="font-semibold text-slate-300">{shift.shiftLabel}</span>
                                                    <span>Max: {shift.maxBatch}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {Array.from({ length: shift.maxBatch }, (_, n) => n + 1).map(num => {
                                                        const payloads = shift.batches[num] || [];
                                                        const count = payloads.length;
                                                        let bg = count === 0 ? "bg-slate-800 text-slate-600" : (count === 1 ? "bg-indigo-900/60 text-indigo-300 hover:bg-indigo-700 cursor-pointer" : "bg-indigo-500 text-white cursor-pointer z-10");
                                                        return (
                                                            <div key={num} onClick={() => count > 0 && setSelectedPayloads(payloads)} className={`w-8 h-8 rounded border flex items-center justify-center text-[10px] font-bold ${bg} border-slate-700/50 hover:scale-110 transition-transform`}>
                                                                {num}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeView === 'scatter' && (
                    <div 
                        className="w-full h-full min-h-[400px] flex flex-col relative group"
                        onWheel={handleWheel}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 text-[10px] text-slate-400 bg-slate-800/90 px-3 py-1.5 rounded-full border border-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Drag to select area • Scroll to zoom in/out
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart 
                                margin={{ top: 30, right: 20, bottom: 20, left: 20 }}
                                onMouseDown={(e) => e && setRefAreaLeft(e.xValue as number)}
                                onMouseMove={(e) => {
                                    if (e && e.xValue) {
                                        setHoveredX(e.xValue as number);
                                        if (refAreaLeft !== null) {
                                            setRefAreaRight(e.xValue as number);
                                        }
                                    } else {
                                        setHoveredX(null);
                                    }
                                }}
                                onMouseUp={zoom}
                                onMouseLeave={() => { setHoveredX(null); setRefAreaLeft(null); setRefAreaRight(null); }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis 
                                    type="number" 
                                    dataKey="x" 
                                    name="Time" 
                                    domain={xDomain} 
                                    allowDataOverflow
                                    tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                    stroke="#94a3b8"
                                    tick={{fontSize: 10}}
                                />
                                <YAxis 
                                    type="number" 
                                    dataKey="y" 
                                    name="Batch" 
                                    domain={yDomain}
                                    allowDataOverflow
                                    stroke="#94a3b8"
                                    tick={{fontSize: 10}}
                                />
                                <ZAxis type="number" range={[40, 40]} />
                                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />
                                
                                <Scatter 
                                    name="Valid Batches" 
                                    data={xDomain[0] !== 'dataMin' ? chartData.valid.filter(d => d.x >= xDomain[0] && d.x <= xDomain[1]) : chartData.valid} 
                                    fill={fm5Mixer === 'B' ? '#a855f7' : '#818cf8'} 
                                    opacity={0.7} 
                                    isAnimationActive={false}
                                    onClick={(data) => {
                                        // Robust matching to bypass Recharts wrapper objects
                                        const match = chartData.valid.find(d => d.x === data.x && d.y === data.y);
                                        if (match && match.entry) {
                                            setSelectedPayloads([match.entry]);
                                        } else if (data && data.entry) {
                                            setSelectedPayloads([data.entry]);
                                        } else if (data && data.payload && data.payload.entry) {
                                            setSelectedPayloads([data.payload.entry]);
                                        }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                />
                                
                                <Scatter 
                                    name="Missing Batches" 
                                    data={xDomain[0] !== 'dataMin' ? chartData.missing.filter(d => d.x >= xDomain[0] && d.x <= xDomain[1]) : chartData.missing} 
                                    fill="#ef4444" 
                                    opacity={0.9} 
                                    shape="square" 
                                    isAnimationActive={false} 
                                />

                                {refAreaLeft && refAreaRight ? (
                                    <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill={fm5Mixer === 'B' ? '#c084fc' : '#4f46e5'} fillOpacity={0.2} />
                                ) : null}
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {selectedPayloads && (
                <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 transition-all">
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-3xl max-h-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                <span className={`text-white px-2 py-0.5 rounded text-xs ${fm5Mixer === 'B' ? 'bg-purple-600' : 'bg-indigo-600'}`}>{selectedPayloads.length}</span> Payloads Found
                            </h3>
                            <button 
                                onClick={() => setSelectedPayloads(null)}
                                className="text-slate-500 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-full p-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-400 whitespace-pre-wrap leading-relaxed custom-scrollbar">
                            {selectedPayloads.map((p, idx) => (
                                <div key={idx} className="mb-6 last:mb-0 pb-6 border-b border-slate-800 last:border-0">
                                    <div className={`${fm5Mixer === 'B' ? 'text-purple-400' : 'text-indigo-400'} font-semibold mb-2 flex flex-col gap-1`}>
                                        <span className="text-slate-300 bg-slate-800 inline-block px-2 py-1 rounded w-max">{formatTimestamp(p.timestamp)}</span>
                                        <span className="text-emerald-400 mt-1">Topic: {p.raw_topic}</span>
                                    </div>
                                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                        {JSON.stringify(p.payload, null, 2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
