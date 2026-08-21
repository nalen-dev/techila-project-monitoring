import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const getTabClass = (tabName: string) => {
    const isActive = activeTab === tabName;
    return `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ${
      isActive 
        ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    }`;
  };

  const getIconClass = (tabName: string) => {
    return `w-5 h-5 transition-colors ${activeTab === tabName ? 'text-indigo-600' : 'text-slate-400'}`;
  };

  return (
    <aside className="w-[240px] bg-white border-r border-slate-200 py-6 px-4 flex flex-col shrink-0 overflow-y-auto">
      <h2 className="text-indigo-600 font-extrabold text-xl mb-8 px-2 flex items-center gap-2 tracking-tight">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        OpsHub
      </h2>
      
      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-bold text-slate-400 tracking-wider mb-2 px-2 mt-2">MAIN MENU</div>
        
        <div onClick={() => setActiveTab('overview')} className={getTabClass('overview')}>
          <svg className={getIconClass('overview')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Overview
        </div>
        
        <div onClick={() => setActiveTab('api-analytics')} className={getTabClass('api-analytics')}>
          <svg className={getIconClass('api-analytics')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          API Analytics
        </div>
        
        <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 opacity-60 cursor-not-allowed" title="Coming Soon">
          <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Alerts & Incidents
        </div>
      </div>
      
      <div className="flex flex-col gap-1 mt-6">
        <div className="text-[11px] font-bold text-slate-400 tracking-wider mb-2 px-2">DIAGNOSTICS</div>
        
        <div onClick={() => setActiveTab('logs')} className={getTabClass('logs')}>
          <svg className={getIconClass('logs')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Log Explorer
        </div>
        
        <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 opacity-60 cursor-not-allowed" title="Coming Soon">
          <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          Error Tracking
        </div>
      </div>
    </aside>
  );
}
