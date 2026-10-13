import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import ReportIssue from './pages/ReportIssue';
import IssueTracking from './pages/IssueTracking';
import Facilities from './pages/Facilities';
import Assistant from './pages/Assistant';
import SettingsPage from './pages/Settings';
import { checkBackendHealth } from './api/client';

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [systemHealth, setSystemHealth] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cross-page navigation state
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [preloadedLocation, setPreloadedLocation] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Poll backend health
  const checkHealth = async () => {
    try {
      const res = await checkBackendHealth();
      setIsOnline(true);
      setSystemHealth(res);
    } catch {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    await checkHealth();
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          // Reset preloaded parameters when manually switching tabs
          if (tab !== 'tracking') setSelectedIssueId(null);
          if (tab !== 'report') setPreloadedLocation(null);
        }}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        systemHealth={systemHealth}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          setMobileOpen={setMobileOpen}
          isOnline={isOnline}
          onRefresh={handleGlobalRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <Overview
              key={refreshKey}
              setCurrentTab={setCurrentTab}
              setSelectedIssueId={setSelectedIssueId}
            />
          )}

          {currentTab === 'report' && (
            <ReportIssue
              key={refreshKey}
              setCurrentTab={setCurrentTab}
              setSelectedIssueId={setSelectedIssueId}
              initialLocation={preloadedLocation}
            />
          )}

          {currentTab === 'tracking' && (
            <IssueTracking
              key={refreshKey}
              initialIssueId={selectedIssueId}
              onStatusUpdated={() => setRefreshKey(prev => prev + 1)}
            />
          )}

          {currentTab === 'facilities' && (
            <Facilities
              key={refreshKey}
              setCurrentTab={setCurrentTab}
              setPreloadedLocation={setPreloadedLocation}
            />
          )}

          {currentTab === 'assistant' && (
            <Assistant
              key={refreshKey}
              setCurrentTab={setCurrentTab}
              setSelectedIssueId={setSelectedIssueId}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage
              key={refreshKey}
              onDataReset={() => setRefreshKey(prev => prev + 1)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
