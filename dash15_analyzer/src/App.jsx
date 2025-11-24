import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import UploadArea from './components/UploadArea';
import History from './components/History';
import Settings from './components/Settings';
import Login from './components/Login';
import Register from './components/Register';
import Layout from './components/Layout';
import Home from './components/Home';
import AgentProfile from './components/AgentProfile';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { supabase } from './lib/supabase';

const AppContent = () => {
  const { user, loading, isAdmin, profile } = useAuth();
  const [data, setData] = useState(null);
  const [allAgentsData, setAllAgentsData] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [showRegister, setShowRegister] = useState(false);

  // Fetch Data Logic (Same as before)
  const fetchData = async () => {
    try {
      const { data: latestReport, error: reportError } = await supabase
        .from('reports')
        .select('batch_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (reportError) {
        if (reportError.code === 'PGRST116') {
          console.log('Henüz hiç veri yok.');
          return;
        }
        throw reportError;
      }

      if (latestReport && latestReport.batch_id) {
        const latestBatch = { id: latestReport.batch_id };
        const { data: reports, error: reportsError } = await supabase
          .from('reports')
          .select('*')
          .eq('batch_id', latestBatch.id);

        if (reportsError) throw reportsError;

        const formattedData = reports.map(item => ({
          ...item,
          Agent: item.agent_name,
          Chats: item.chats_count,
          AvgChatTime: item.avg_chat_time,
          TotalChatTime: item.total_chat_time,
          LastMessage: item.last_message_sent,
          AvgScore: item.avg_score,
          RatingTimes: item.rating_times,
          Score1: item.score_1,
          Score2: item.score_2,
          Score3: item.score_3,
          Score4: item.score_4,
          Score5: item.score_5,
          Date: item.created_at
        }));

        setData(formattedData);
        setAllAgentsData(formattedData);
      }
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    }
  };

  const handleViewBatch = async (batchId) => {
    try {
      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .eq('batch_id', batchId);

      if (error) throw error;

      const formattedData = reports.map(item => ({
        ...item,
        Agent: item.agent_name,
        Chats: item.chats_count,
        AvgChatTime: item.avg_chat_time,
        TotalChatTime: item.total_chat_time,
        LastMessage: item.last_message_sent,
        AvgScore: item.avg_score,
        RatingTimes: item.rating_times,
        Score1: item.score_1,
        Score2: item.score_2,
        Score3: item.score_3,
        Score4: item.score_4,
        Score5: item.score_5,
        Date: item.created_at
      }));

      setData(formattedData);
      setAllAgentsData(formattedData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Geçmiş rapor yükleme hatası:', error);
    }
  };

  const fetchDataByRange = async (startDate, endDate) => {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      if (!reports || reports.length === 0) {
        setData([]);
        setAllAgentsData([]);
        return;
      }

      const formattedData = reports.map(item => ({
        ...item,
        Agent: item.agent_name,
        Chats: item.chats_count,
        AvgChatTime: item.avg_chat_time,
        TotalChatTime: item.total_chat_time,
        LastMessage: item.last_message_sent,
        AvgScore: item.avg_score,
        RatingTimes: item.rating_times,
        Score1: item.score_1,
        Score2: item.score_2,
        Score3: item.score_3,
        Score4: item.score_4,
        Score5: item.score_5,
        Date: item.created_at
      }));

      const uniqueMap = new Map();
      formattedData.forEach(item => {
        const key = `${item.Agent}-${item.Date.split('T')[0]}`;
        if (!uniqueMap.has(key) || item.id > uniqueMap.get(key).id) {
          uniqueMap.set(key, item);
        }
      });
      const uniqueData = Array.from(uniqueMap.values());

      setData(uniqueData);
      setAllAgentsData(uniqueData);
      setDateRange({ start: startDate, end: endDate });
      sessionStorage.setItem('dateRange', JSON.stringify({ start: startDate, end: endDate }));
    } catch (error) {
      console.error('Tarih aralığı veri çekme hatası:', error);
    }
  };

  useEffect(() => {
    if (user) {
      const savedRange = sessionStorage.getItem('dateRange');
      if (savedRange) {
        try {
          const { start, end } = JSON.parse(savedRange);
          // If we have a saved range, fetch that instead of default
          fetchDataByRange(start, end);
        } catch (e) {
          console.error('Error parsing saved date range', e);
          fetchData();
        }
      } else {
        fetchData();
      }
    }
  }, [user?.email]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {showRegister ? (
            <Register onLoginClick={() => setShowRegister(false)} />
          ) : (
            <Login onRegisterClick={() => setShowRegister(true)} />
          )}
        </div>
      </div>
    );
  }

  const handleProfileClick = () => {
    if (user && allAgentsData.length > 0) {
      const userEmailName = user.email.split('@')[0].toLowerCase();
      const profileName = profile?.agent_name?.toLowerCase();

      const myAgent = allAgentsData.find(agent => {
        const agentName = agent.Agent.toLowerCase();
        if (profileName) {
          return agentName === profileName || agentName.includes(profileName);
        }
        return agentName.includes(userEmailName) || userEmailName.includes(agentName.split(' ')[0]);
      });

      if (myAgent) {
        navigate(`/agent/${encodeURIComponent(myAgent.Agent)}`);
      } else {
        navigate('/settings');
      }
    } else {
      navigate('/settings');
    }
  };

  return (
    <Layout
      user={user}
      isAdmin={isAdmin}
      agentName={profile?.agent_name}
      onProfileClick={handleProfileClick}
    >
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="relative z-0"
            >
              {data ? (
                <Dashboard
                  data={data}
                  onAgentClick={(agent) => navigate(`/agent/${encodeURIComponent(agent.Agent)}`)}
                  isAdmin={isAdmin}
                  onUpdateAgent={() => {
                    fetchData();
                    setDateRange({ start: '', end: '' });
                    sessionStorage.removeItem('dateRange');
                  }}
                  onDateRangeChange={fetchDataByRange}
                  initialDateRange={dateRange}
                />
              ) : (
                <Home onUploadClick={() => navigate('/upload')} />
              )}
            </motion.div>
          } />

          <Route path="/analytics" element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="relative z-0"
            >
              <Analytics data={allAgentsData} />
            </motion.div>
          } />

          <Route path="/upload" element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="relative z-0"
            >
              <UploadArea onDataLoaded={() => {
                fetchData();
                setDateRange({ start: '', end: '' });
                sessionStorage.removeItem('dateRange');
                navigate('/dashboard');
              }} />
            </motion.div>
          } />

          <Route path="/history" element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="relative z-0"
            >
              <History onViewBatch={handleViewBatch} />
            </motion.div>
          } />

          <Route path="/settings" element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="relative z-0"
            >
              <Settings />
            </motion.div>
          } />

          <Route path="/agent/:agentName" element={
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="relative z-0"
            >
              <AgentProfile
                allData={allAgentsData}
                isAdmin={isAdmin}
                onBack={() => navigate('/dashboard')}
              />
            </motion.div>
          } />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PreferencesProvider>
            <AppContent />
          </PreferencesProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
