import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 md:p-16">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">☁️ OpsHub Central</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Welcome to the Central Observability Platform. Select an application or IoT edge node to monitor its real-time health, logs, and metrics.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Active App */}
          <Link to="/app/batchapp-mqtt-service" className="group block">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer h-full flex flex-col">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                🏭
              </div>
              <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">BatchApp MQTT Service</h2>
              <p className="text-slate-500 text-sm flex-1 leading-relaxed">
                Monitors cement batching metrics, aggregates source tracking, and tails raw MQTT telemetry.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-emerald-600 tracking-wider">ONLINE</span>
              </div>
            </div>
          </Link>

          {/* Placeholder App 1 */}
          <div className="bg-slate-100/50 p-8 rounded-2xl border border-slate-200 border-dashed opacity-75 h-full flex flex-col">
            <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center text-2xl mb-6">
              📦
            </div>
            <h2 className="text-xl font-bold mb-2 text-slate-700">Warehouse Inventory IoT</h2>
            <p className="text-slate-400 text-sm flex-1 leading-relaxed">
              Real-time stock tracking and sensor monitoring. (Integration in progress).
            </p>
            <div className="mt-6 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
              <span className="text-xs font-semibold text-slate-500 tracking-wider">OFFLINE</span>
            </div>
          </div>

          {/* Placeholder App 2 */}
          <div className="bg-slate-100/50 p-8 rounded-2xl border border-slate-200 border-dashed opacity-75 h-full flex flex-col">
            <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center text-2xl mb-6">
              💳
            </div>
            <h2 className="text-xl font-bold mb-2 text-slate-700">Payment Gateway API</h2>
            <p className="text-slate-400 text-sm flex-1 leading-relaxed">
              Monitors transaction latencies, error rates, and API throughput.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
              <span className="text-xs font-semibold text-slate-500 tracking-wider">PENDING SETUP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
