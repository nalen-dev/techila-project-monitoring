import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Overview from '../../pages/Overview';
import LogExplorer from '../../pages/LogExplorer';
import ApiAnalytics from '../../pages/ApiAnalytics';

export default function AppLayout() {
  const { appId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const handleTabChange = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  // Format ID to Title (e.g. batchapp-mqtt-service -> Batchapp Mqtt Service)
  const appTitle = appId?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Application';

  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Overview Dashboard';
      case 'logs': return 'Log Explorer';
      case 'api-analytics': return 'API Analytics';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto relative">
        
        {/* Top Bar: Breadcrumb & App Identity */}
        <div className="mb-6 flex justify-between items-center">
          <Link to="/" className="text-sm font-medium text-slate-400 hover:text-blue-600 flex items-center gap-2 transition-colors w-fit">
            ← Back to All Applications
          </Link>
          <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            {appTitle}
          </div>
        </div>

        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-900">
              {getTabTitle()}
            </h1>
            <p className="text-sm text-slate-500">
              {activeTab === 'overview' && 'Monitoring real-time health and metrics.'}
              {activeTab === 'logs' && 'Tailing raw logs and telemetry in real-time.'}
              {activeTab === 'api-analytics' && 'Analyzing HTTP traffic, security, and performance.'}
            </p>
          </div>
        </header>

        {activeTab === 'overview' && <Overview />}
        {activeTab === 'logs' && <LogExplorer />}
        {activeTab === 'api-analytics' && <ApiAnalytics />}
      </main>
    </div>
  );
}
