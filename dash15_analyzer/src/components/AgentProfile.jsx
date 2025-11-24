import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare, Clock, Star, Award, TrendingUp, Save, Upload, Calendar, BrainCircuit, CheckCircle2, AlertTriangle, Target, Zap, Check, Reply, Download, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, LineChart, Line } from 'recharts';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../contexts/PreferencesContext';
import { analyzePerformance } from '../utils/aiAnalyzer';
import { Skeleton } from './Skeleton';
import { BADGES, calculateAutoBadges } from '../utils/BadgeManager';
import AICoach from './AICoach';
import { generateAgentReport } from '../utils/pdfGenerator';
import { timeToSeconds, secondsToTime } from '../utils/timeUtils';
import { useParams, useNavigate } from 'react-router-dom';

const AgentProfile = ({ allData, isAdmin }) => {
    const { agentName } = useParams();
    const navigate = useNavigate();
    const { badgeRules } = usePreferences();
    const [isLoading, setIsLoading] = useState(true);

    // Find agent data based on URL parameter
    const agent = useMemo(() => {
        if (!allData || !agentName) return null;
        const decodedName = decodeURIComponent(agentName);
        // Try exact match first
        let found = allData.find(a => a.Agent === decodedName);
        // If not found, try case-insensitive match
        if (!found) {
            found = allData.find(a => a.Agent.toLowerCase() === decodedName.toLowerCase());
        }
        return found;
    }, [allData, agentName]);

    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    // Manager Feedback State
    const [selectedDate, setSelectedDate] = useState(() => {
        if (agent && agent.Date) {
            return agent.Date.substring(0, 10);
        }
        // If no specific date in agent prop, try to find latest date for this agent in allData
        if (allData && allData.length > 0 && agent) {
            const agentData = allData.filter(d => d.Agent === agent.Agent);
            if (agentData.length > 0) {
                const sorted = [...agentData].sort((a, b) => new Date(b.Date) - new Date(a.Date));
                if (sorted[0].Date) {
                    return sorted[0].Date.substring(0, 10);
                }
            }
        }
        return new Date().toISOString().split('T')[0];
    });

    const [managerNote, setManagerNote] = useState('');
    const [noteImage, setNoteImage] = useState(null);
    const [dailyNotes, setDailyNotes] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [replyingToId, setReplyingToId] = useState(null);
    const [manualBadges, setManualBadges] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchedDailyData, setFetchedDailyData] = useState(null);
    const [trendData, setTrendData] = useState([]);

    // Goal System State
    const [goals, setGoals] = useState([]);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [newGoal, setNewGoal] = useState({ metric_type: 'score', target_value: '', deadline: '' });
    const [isAddingGoal, setIsAddingGoal] = useState(false);

    // Simulate loading
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [agentName]);

    // Fetch Goals
    const fetchGoals = async () => {
        if (!agent) return;
        try {
            const { data: goalsData, error } = await supabase
                .from('agent_goals')
                .select('*')
                .eq('agent_name', agent.Agent)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const goalsWithProgress = await Promise.all(goalsData.map(async (goal) => {
                const { data: reportData } = await supabase
                    .from('reports')
                    .select('chats_count, avg_score, avg_chat_time')
                    .eq('agent_name', agent.Agent);

                let current = 0;
                if (reportData && reportData.length > 0) {
                    if (goal.metric_type === 'chats') {
                        current = reportData.reduce((sum, r) => sum + r.chats_count, 0);
                    } else if (goal.metric_type === 'score') {
                        const totalChats = reportData.reduce((sum, r) => sum + r.chats_count, 0);
                        const weightedScore = reportData.reduce((sum, r) => sum + (r.avg_score * r.chats_count), 0);
                        current = totalChats > 0 ? weightedScore / totalChats : 0;
                    } else if (goal.metric_type === 'time') {
                        const totalChats = reportData.reduce((sum, r) => sum + r.chats_count, 0);
                        const weightedTime = reportData.reduce((sum, r) => sum + (timeToSeconds(r.avg_chat_time) * r.chats_count), 0);
                        current = totalChats > 0 ? weightedTime / totalChats : 0;
                    }
                }
                return { ...goal, current_value: current };
            }));

            setGoals(goalsWithProgress);
        } catch (err) {
            console.error('Error fetching goals:', err);
        }
    };

    const handleAddGoal = async () => {
        if (!newGoal.target_value) return;
        setIsAddingGoal(true);
        try {
            const { error } = await supabase
                .from('agent_goals')
                .insert([{
                    agent_name: agent.Agent,
                    metric_type: newGoal.metric_type,
                    target_value: parseFloat(newGoal.target_value),
                    deadline: newGoal.deadline || null,
                    status: 'active'
                }]);

            if (error) throw error;

            setShowGoalModal(false);
            setNewGoal({ metric_type: 'score', target_value: '', deadline: '' });
            fetchGoals();
        } catch (err) {
            console.error('Error adding goal:', err);
            alert('Hedef eklenirken hata oluştu.');
        } finally {
            setIsAddingGoal(false);
        }
    };

    useEffect(() => {
        if (agent) {
            fetchGoals();
        }
    }, [agent]);

    // Fetch Trend Data
    const fetchTrendData = async () => {
        if (!agent) return;

        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);

            const { data, error } = await supabase
                .from('reports')
                .select('created_at, avg_score, chats_count')
                .eq('agent_name', agent.Agent)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });

            if (data) {
                const formatted = data.map(d => ({
                    date: new Date(d.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                    score: d.avg_score,
                    chats: d.chats_count
                }));
                setTrendData(formatted);
            }
        } catch (err) {
            console.error('Error fetching trend data:', err);
        }
    };

    useEffect(() => {
        if (agent) {
            fetchTrendData();
        }
    }, [agent]);

    // Fetch Note and Data for selected date
    const fetchDataForDate = async () => {
        if (!agent || !selectedDate) return;

        try {
            // 1. Fetch Manager Notes
            const { data: notesData } = await supabase
                .from('agent_notes')
                .select('*')
                .eq('agent_name', agent.Agent)
                .eq('date', selectedDate)
                .order('created_at', { ascending: false });

            setDailyNotes(notesData || []);

            // 2. Fetch Manual Badges
            const { data: badgeData } = await supabase
                .from('agent_badges')
                .select('*')
                .eq('agent_name', agent.Agent);

            if (badgeData) {
                const badges = badgeData.map(b => {
                    const badgeDef = Object.values(BADGES).find(def => def.id === b.badge_id);
                    if (badgeDef) {
                        return { ...badgeDef, awardedAt: b.awarded_at };
                    }
                    return null;
                }).filter(Boolean);
                setManualBadges(badges);
            } else {
                setManualBadges([]);
            }

            // 3. Check local data
            const hasLocalData = allData && allData.some(d =>
                d.Agent === agent.Agent &&
                d.Date &&
                d.Date.substring(0, 10) === selectedDate
            );

            // If no local data, fetch from reports
            if (!hasLocalData) {
                const startDate = new Date(selectedDate);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(selectedDate);
                endDate.setHours(23, 59, 59, 999);

                const { data: reportData } = await supabase
                    .from('reports')
                    .select('*')
                    .eq('agent_name', agent.Agent)
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString());

                if (reportData && reportData.length > 0) {
                    const formatted = reportData.map(r => ({
                        id: r.id,
                        Date: r.created_at,
                        Agent: r.agent_name,
                        Chats: r.chats_count,
                        AvgChatTime: r.avg_chat_time,
                        TotalChatTime: r.total_chat_time,
                        LastMessage: r.last_message_sent,
                        AvgScore: r.avg_score,
                        Score1: r.score_1,
                        Score2: r.score_2,
                        Score3: r.score_3,
                        Score4: r.score_4,
                        Score5: r.score_5,
                    }));
                    setFetchedDailyData(formatted);
                } else {
                    setFetchedDailyData(null);
                }
            } else {
                setFetchedDailyData(null);
            }
        } catch (error) {
            console.error("Error fetching daily data:", error);
        }
    };

    useEffect(() => {
        fetchDataForDate();
    }, [selectedDate, agent]);

    const currentStats = useMemo(() => {
        if (!agent) return null;
        let sourceData = [];

        if (allData) {
            sourceData = allData.filter(d =>
                d.Agent === agent.Agent &&
                d.Date &&
                d.Date.substring(0, 10) === selectedDate
            );
        }

        if (sourceData.length === 0 && fetchedDailyData) {
            sourceData = fetchedDailyData;
        }

        if (sourceData.length === 0) return null;

        const stats = sourceData.reduce((acc, curr) => {
            acc.Chats += curr.Chats;
            acc.Score5 += curr.Score5 || 0;
            acc.Score4 += curr.Score4 || 0;
            acc.Score3 += curr.Score3 || 0;
            acc.Score2 += curr.Score2 || 0;
            acc.Score1 += curr.Score1 || 0;
            acc.TotalScore += (curr.AvgScore * curr.Chats);
            acc.TotalTime += timeToSeconds(curr.AvgChatTime) * curr.Chats;
            return acc;
        }, { Chats: 0, Score5: 0, Score4: 0, Score3: 0, Score2: 0, Score1: 0, TotalScore: 0, TotalTime: 0 });

        return {
            ...agent,
            Chats: stats.Chats,
            AvgScore: stats.Chats > 0 ? stats.TotalScore / stats.Chats : 0,
            AvgChatTime: stats.Chats > 0 ? secondsToTime(stats.TotalTime / stats.Chats) : '00:00:00',
            Score5: stats.Score5,
            Score4: stats.Score4,
            Score3: stats.Score3,
            Score2: stats.Score2,
            Score1: stats.Score1,
        };
    }, [allData, agent, selectedDate, fetchedDailyData]);

    const displayAgent = currentStats || (agent ? {
        ...agent,
        Chats: 0,
        AvgScore: 0,
        AvgChatTime: '00:00:00',
        Score5: 0, Score4: 0, Score3: 0, Score2: 0, Score1: 0
    } : null);

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const handleDownloadPDF = async () => {
        setIsGeneratingPDF(true);
        setTimeout(async () => {
            await generateAgentReport('agent-profile-content', agent.Agent);
            setIsGeneratingPDF(false);
        }, 500);
    };

    const handleSaveNote = async () => {
        if (!isAdmin) return;
        setIsSaving(true);

        try {
            let uploadedImageUrl = null;
            if (noteImage) {
                const fileExt = noteImage.name.split('.').pop();
                const sanitizedAgentName = agent.Agent.replace(/[^a-zA-Z0-9]/g, '_');
                const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${sanitizedAgentName}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('feedback-images')
                    .upload(filePath, noteImage);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('feedback-images')
                    .getPublicUrl(filePath);

                uploadedImageUrl = publicUrlData.publicUrl;
            }

            const noteData = {
                agent_name: agent.Agent,
                date: selectedDate,
                note: managerNote,
                image_url: uploadedImageUrl,
            };

            const { error: insertError } = await supabase
                .from('agent_notes')
                .insert([noteData]);

            if (insertError) throw insertError;

            alert('Not başarıyla kaydedildi!');
            setManagerNote('');
            setNoteImage(null);
            fetchDataForDate();

        } catch (error) {
            console.error('Error saving note:', error);
            alert('Not kaydedilirken bir hata oluştu: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMarkAsRead = async (noteId) => {
        try {
            const { error } = await supabase
                .from('agent_notes')
                .update({ read_at: new Date().toISOString() })
                .eq('id', noteId);

            if (error) throw error;
            fetchDataForDate();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleReply = async () => {
        if (!replyText.trim() || !replyingToId) return;

        try {
            const { error } = await supabase
                .from('agent_notes')
                .update({ agent_reply: replyText })
                .eq('id', replyingToId);

            if (error) throw error;

            setReplyText('');
            setReplyingToId(null);
            fetchDataForDate();
        } catch (error) {
            console.error('Error sending reply:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 mb-8">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-96 rounded-2xl" />
            </div>
        );
    }

    if (!agent) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
                <p>Temsilci bulunamadı.</p>
                <button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-400 hover:underline">
                    Dashboard'a Dön
                </button>
            </div>
        );
    }

    const ratingData = [
        { name: '5 Stars', value: displayAgent.Score5, color: '#10B981' },
        { name: '4 Stars', value: displayAgent.Score4, color: '#3B82F6' },
        { name: '3 Stars', value: displayAgent.Score3, color: '#F59E0B' },
        { name: '2 Stars', value: displayAgent.Score2, color: '#F97316' },
        { name: '1 Star', value: displayAgent.Score1, color: '#EF4444' },
    ];

    return (
        <motion.div
            className="space-y-8 pb-20"
            variants={container}
            initial="hidden"
            animate="visible"
            id="agent-profile-content"
        >
            {/* Header */}
            <motion.div variants={item} className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors no-print"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        {agent.Agent}
                        <span className="text-sm font-normal px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {selectedDate.split('-').reverse().join('.')}
                        </span>
                    </h1>
                    <p className="text-slate-400">Detaylı Performans Analizi</p>
                </div>

                {/* Actions */}
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 no-print border border-slate-700"
                    >
                        {isGeneratingPDF ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        PDF İndir
                    </button>

                    <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-2 no-print">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none text-white text-sm focus:outline-none"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Goal System & Badge Showcase */}
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Goals Card */}
                <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-400" />
                            Hedeflerim
                        </h3>
                        {isAdmin && (
                            <button
                                onClick={() => setShowGoalModal(true)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Target className="w-3 h-3" />
                                Hedef Ekle
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {goals.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                Henüz aktif bir hedef yok.
                            </div>
                        ) : (
                            goals.map(goal => {
                                const isTime = goal.metric_type === 'time';
                                const target = goal.target_value;
                                const current = goal.current_value;
                                let progress = 0;
                                if (isTime) {
                                    progress = (target / current) * 100;
                                } else {
                                    progress = (current / target) * 100;
                                }
                                progress = Math.min(100, Math.max(0, progress));

                                return (
                                    <div key={goal.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                {goal.metric_type === 'score' && <Star className="w-4 h-4 text-yellow-400" />}
                                                {goal.metric_type === 'chats' && <MessageSquare className="w-4 h-4 text-blue-400" />}
                                                {goal.metric_type === 'time' && <Clock className="w-4 h-4 text-orange-400" />}
                                                <span className="text-sm font-medium text-white capitalize">
                                                    {goal.metric_type === 'score' ? 'Ortalama Puan' :
                                                        goal.metric_type === 'chats' ? 'Sohbet Sayısı' : 'Ortalama Süre'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {goal.deadline ? `Bitiş: ${new Date(goal.deadline).toLocaleDateString('tr-TR')}` : 'Süresiz'}
                                            </span>
                                        </div>
                                        <div className="flex items-end justify-between mb-2">
                                            <span className="text-2xl font-bold text-white">
                                                {isTime ? secondsToTime(current) : current.toFixed(goal.metric_type === 'chats' ? 0 : 2)}
                                            </span>
                                            <span className="text-sm text-slate-400 mb-1">
                                                / {isTime ? secondsToTime(target) : target}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Badge Showcase (Vitrin) */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                    {/* Background Glow Effect */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6 relative z-10">
                        <Award className="w-5 h-5 text-yellow-400" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-400">
                            Rozet Vitrini
                        </span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10">
                        {[
                            ...manualBadges,
                            ...calculateAutoBadges(displayAgent, badgeRules)
                        ].map((badge, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ scale: 1.05, y: -5 }}
                                className="relative flex flex-col items-center p-4 rounded-xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-yellow-500/30 transition-all shadow-lg hover:shadow-yellow-500/10 group/badge"
                            >
                                {/* Badge Icon with Glow */}
                                <div className={`w-14 h-14 rounded-full ${badge.color.replace('text-', 'bg-')}/10 flex items-center justify-center mb-3 relative overflow-hidden ring-1 ring-white/10 group-hover/badge:ring-${badge.color.replace('text-', '')}/50 transition-all`}>
                                    <div className={`absolute inset-0 ${badge.color.replace('text-', 'bg-')}/20 blur-md opacity-0 group-hover/badge:opacity-100 transition-opacity`} />
                                    <badge.icon className={`w-7 h-7 ${badge.color} relative z-10 drop-shadow-lg`} />
                                </div>

                                <span className="text-xs font-bold text-slate-200 text-center mb-1 group-hover/badge:text-white transition-colors">
                                    {badge.label}
                                </span>
                                <span className="text-[10px] text-slate-500 text-center leading-tight px-1">
                                    {badge.description}
                                </span>

                                {/* Shine Effect */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none" />
                            </motion.div>
                        ))}

                        {manualBadges.length === 0 && calculateAutoBadges(displayAgent, badgeRules).length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-8 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                                <Award className="w-8 h-8 opacity-20 mb-2" />
                                <span className="text-xs">Henüz rozet kazanılmamış.</span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* AI Coach */}
            <motion.div variants={item}>
                <AICoach agent={displayAgent} />
            </motion.div>

            {/* Manager Feedback & Timeline */}
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Add Note Form (Admin Only) */}
                {isAdmin && (
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 h-fit">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-purple-400" />
                                Yeni Not Ekle
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <textarea
                                value={managerNote}
                                onChange={(e) => setManagerNote(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-all h-32 resize-none"
                                placeholder="Temsilci performansı hakkında notlar..."
                            />
                            <div className="flex items-center gap-4">
                                <label className="flex-1 cursor-pointer group">
                                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-950/50 border border-slate-800 border-dashed rounded-xl group-hover:border-purple-500/50 transition-colors">
                                        <Upload className="w-4 h-4 text-slate-400 group-hover:text-purple-400" />
                                        <span className="text-sm text-slate-400 group-hover:text-purple-400">
                                            {noteImage ? noteImage.name : 'Görsel Ekle'}
                                        </span>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setNoteImage(e.target.files[0])} />
                                </label>
                                <button
                                    onClick={handleSaveNote}
                                    disabled={!managerNote.trim() || isSaving}
                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-medium transition-all flex items-center gap-2"
                                >
                                    {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Timeline */}
                <div className={`${!isAdmin ? 'col-span-2' : ''} bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                            Geri Bildirim Geçmişi
                        </h3>
                    </div>

                    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-slate-800 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {dailyNotes.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm pl-8">
                                Bu tarih için not bulunmuyor.
                            </div>
                        ) : (
                            dailyNotes.map((note) => (
                                <div key={note.id} className="relative pl-8 group">
                                    <div className="absolute left-[11px] top-2 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-slate-900 z-10 group-hover:scale-125 transition-transform" />

                                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs text-slate-400 font-mono">
                                                {new Date(note.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {note.read_at && (
                                                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Okundu
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-slate-300 text-sm leading-relaxed mb-3">
                                            {note.note}
                                        </p>

                                        {note.image_url && (
                                            <div className="rounded-lg overflow-hidden border border-slate-800 mb-3">
                                                <img src={note.image_url} alt="Attachment" className="w-full h-auto object-cover" />
                                            </div>
                                        )}

                                        {note.agent_reply && (
                                            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 mt-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Reply className="w-3 h-3 text-blue-400" />
                                                    <span className="text-xs font-bold text-blue-400">Temsilci Yanıtı</span>
                                                </div>
                                                <p className="text-slate-400 text-xs">{note.agent_reply}</p>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 mt-2">
                                            {!isAdmin && !note.read_at && (
                                                <button
                                                    onClick={() => handleMarkAsRead(note.id)}
                                                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                                >
                                                    <Check className="w-3 h-3" />
                                                    Okudum
                                                </button>
                                            )}
                                            {!isAdmin && !note.agent_reply && (
                                                <button
                                                    onClick={() => setReplyingToId(note.id)}
                                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                                >
                                                    <Reply className="w-3 h-3" />
                                                    Yanıtla
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Key Stats */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <MessageSquare className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Toplam Sohbet</p>
                            <h3 className="text-2xl font-bold text-white">{displayAgent.Chats}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Star className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Ortalama Puan</p>
                            <h3 className="text-2xl font-bold text-white">{Number(displayAgent.AvgScore).toFixed(2)}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/10 rounded-xl">
                            <Clock className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Ort. Yanıt Süresi</p>
                            <h3 className="text-2xl font-bold text-white">{displayAgent.AvgChatTime}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Verimlilik Skoru</p>
                            <h3 className="text-2xl font-bold text-white">92/100</h3>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Charts */}
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Rating Distribution */}
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-semibold text-white mb-6">Puan Dağılımı</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ratingData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={60} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: '#334155', opacity: 0.2 }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {ratingData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Performance Trend */}
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-semibold text-white mb-6">30 Günlük Performans Trendi</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="left" stroke="#94a3b8" domain={[0, 5]} />
                                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="score" name="Ort. Puan" stroke="#10B981" strokeWidth={2} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="chats" name="Sohbet Sayısı" stroke="#3B82F6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </motion.div>

            {/* Add Goal Modal */}
            {showGoalModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Yeni Hedef Ekle</h3>
                            <button onClick={() => setShowGoalModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Hedef Tipi</label>
                                <select
                                    value={newGoal.metric_type}
                                    onChange={(e) => setNewGoal({ ...newGoal, metric_type: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="score">Ortalama Puan</option>
                                    <option value="chats">Sohbet Sayısı</option>
                                    <option value="time">Ortalama Süre (sn)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Hedef Değeri</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newGoal.target_value}
                                    onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                                    placeholder="Örn: 4.9 veya 1000"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Bitiş Tarihi (Opsiyonel)</label>
                                <input
                                    type="date"
                                    value={newGoal.deadline}
                                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <button
                                onClick={handleAddGoal}
                                disabled={isAddingGoal}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {isAddingGoal ? 'Ekleniyor...' : 'Hedefi Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reply Modal */}
            {replyingToId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Yöneticiye Yanıt Ver</h3>
                            <button onClick={() => setReplyingToId(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Mesajınız..."
                            className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-blue-500 resize-none mb-4"
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setReplyingToId(null)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleReply}
                                disabled={!replyText.trim()}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Gönder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default AgentProfile;
