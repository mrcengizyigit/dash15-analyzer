import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Download, ChevronDown, ChevronUp,
    MoreHorizontal, RefreshCw, Calendar, Star,
    TrendingUp, Users, MessageSquare, Clock,
    ArrowUpRight, ArrowDownRight, Minus, Edit2, X, Award, Save
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line,
    AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    RadialBarChart, RadialBar, Legend
} from 'recharts';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../contexts/PreferencesContext';
import { calculateAutoBadges } from '../utils/BadgeManager';
import { Skeleton } from './Skeleton';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { timeToSeconds, secondsToTime } from '../utils/timeUtils';

import TopPerformers from './TopPerformers';

const Dashboard = ({ data, onAgentClick, isAdmin, onUpdateAgent, isLoading, onDateRangeChange, initialDateRange }) => {
    const { hiddenAgents, thresholds, badgeRules } = usePreferences();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'AvgScore', direction: 'descending' });
    const [editingAgent, setEditingAgent] = useState(null);
    const [manualBadgesMap, setManualBadgesMap] = useState({});
    const [dateRange, setDateRange] = useState(initialDateRange || { start: '', end: '' });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [localData, setLocalData] = useState(data);
    const [viewMode, setViewMode] = useState('daily'); // 'daily', 'weekly', 'monthly'

    // Sync local dateRange with prop if it changes
    useEffect(() => {
        if (initialDateRange) {
            setDateRange(initialDateRange);
        }
    }, [initialDateRange]);

    // Fetch all manual badges on mount
    useEffect(() => {
        const fetchBadges = async () => {
            try {
                const { data: badges, error } = await supabase
                    .from('agent_badges')
                    .select('agent_name');

                if (error) throw error;

                // Group by agent name for easy lookup
                const badgeMap = {};
                if (badges) {
                    badges.forEach(b => {
                        badgeMap[b.agent_name] = true;
                    });
                }
                setManualBadgesMap(badgeMap);
            } catch (err) {
                console.error('Error fetching badges for dashboard:', err);
            }
        };

        fetchBadges();
    }, []);

    // Helper to check if agent has any badges
    const hasBadges = (agentRow) => {
        // 1. Check Manual Badges
        if (manualBadgesMap[agentRow.Agent]) return true;
        // 2. Check Auto Badges
        const autoBadges = calculateAutoBadges(agentRow);
        return autoBadges.length > 0;
    };

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

    // Update localData when props change
    useEffect(() => {
        if (!data) return;

        let filtered = data.filter(item => {
            const agentName = item.Agent || '';
            return !hiddenAgents.some(excluded => agentName.toLowerCase().includes(excluded.toLowerCase()));
        });

        // Date Filtering - REMOVED local filtering, now handled by server
        // if (dateRange.start && dateRange.end) {
        //     const start = new Date(dateRange.start);
        //     const end = new Date(dateRange.end);
        //     end.setHours(23, 59, 59); // End of day
        //
        //     filtered = filtered.filter(item => {
        //         if (!item.Date) return true; // Keep if no date (legacy)
        //         const itemDate = new Date(item.Date);
        //         return itemDate >= start && itemDate <= end;
        //     });
        // }

        // Aggregation Logic based on viewMode
        // For now, we just aggregate by Agent for the main table
        const aggregatedMap = {};

        filtered.forEach(item => {
            if (!aggregatedMap[item.Agent]) {
                aggregatedMap[item.Agent] = { ...item };
            } else {
                const existing = aggregatedMap[item.Agent];

                // Sum Mode: Aggregate values for the selected range
                // Note: Data is already deduplicated by Date in App.jsx, so summing here is safe for date ranges.

                // 1. Weighted Average for Chat Time
                const existingTime = timeToSeconds(existing.AvgChatTime);
                const newItemTime = timeToSeconds(item.AvgChatTime);
                const totalTime = (existingTime * existing.Chats) + (newItemTime * item.Chats);
                const newTotalChats = existing.Chats + item.Chats;

                existing.AvgChatTime = newTotalChats > 0 ? secondsToTime(totalTime / newTotalChats) : '0dk 0sn';

                // 2. Aggregate Total Chat Time
                const existingTotalTime = timeToSeconds(existing.TotalChatTime);
                const newItemTotalTime = timeToSeconds(item.TotalChatTime);
                existing.TotalChatTime = secondsToTime(existingTotalTime + newItemTotalTime);

                // 3. Weighted Average for Score
                const existingScoreSum = existing.AvgScore * existing.RatingTimes;
                const newItemScoreSum = item.AvgScore * item.RatingTimes;
                const newTotalRatingTimes = existing.RatingTimes + item.RatingTimes;

                existing.AvgScore = newTotalRatingTimes > 0 ? (existingScoreSum + newItemScoreSum) / newTotalRatingTimes : 0;

                // 4. Update Counts and Sums
                existing.Chats = newTotalChats;
                existing.RatingTimes = newTotalRatingTimes;
                existing.Score1 += item.Score1;
                existing.Score2 += item.Score2;
                existing.Score3 += item.Score3;
                existing.Score4 += item.Score4;
                existing.Score5 += item.Score5;

                // 5. Update Last Message (Sum the counts)
                // Assuming LastMessage is a count of messages sent
                const existingLastMsg = parseInt(existing.LastMessage) || 0;
                const newItemLastMsg = parseInt(item.LastMessage) || 0;
                existing.LastMessage = existingLastMsg + newItemLastMsg;

                // Update Date to latest for reference
                if (new Date(item.Date) > new Date(existing.Date)) {
                    existing.Date = item.Date;
                }
            }
        });

        setLocalData(Object.values(aggregatedMap));

    }, [data, dateRange, viewMode]);

    // Sorting Logic
    const sortedData = React.useMemo(() => {
        let sortableItems = [...localData];

        // Filter by search term
        if (searchTerm) {
            sortableItems = sortableItems.filter(item =>
                item.Agent.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Time string comparison (Prioritize this)
                if (sortConfig.key === 'AvgChatTime' || sortConfig.key === 'TotalChatTime') {
                    const aSeconds = timeToSeconds(aValue);
                    const bSeconds = timeToSeconds(bValue);

                    if (aSeconds < bSeconds) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aSeconds > bSeconds) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }

                // Numeric comparison
                if (typeof aValue === 'string' && !isNaN(parseFloat(aValue)) && !aValue.includes(':')) {
                    aValue = parseFloat(aValue);
                    bValue = parseFloat(bValue);
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [localData, sortConfig, searchTerm]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleEditClick = (e, agent) => {
        e.stopPropagation(); // Satır tıklamasını engelle
        setEditingAgent({ ...agent });
    };

    const handleSaveEdit = async () => {
        try {
            const { error } = await supabase
                .from('reports')
                .update({
                    chats_count: parseInt(editingAgent.Chats),
                    avg_chat_time: editingAgent.AvgChatTime,
                    avg_score: parseFloat(editingAgent.AvgScore)
                })
                .eq('id', editingAgent.id);

            if (error) throw error;

            // Yerel veriyi güncelle
            const updatedData = localData.map(item =>
                item.id === editingAgent.id ? editingAgent : item
            );
            setLocalData(updatedData);
            setEditingAgent(null);
            alert('Veri başarıyla güncellendi!');
        } catch (err) {
            console.error('Güncelleme hatası:', err);
            alert('Güncelleme başarısız: ' + err.message);
        }
    };

    const [isExporting, setIsExporting] = useState(false);

    const handleExportCSV = () => {
        if (localData.length === 0) return;

        const headers = ['Temsilci', 'Sohbet Sayısı', 'Ort. Süre', 'Toplam Süre', 'Son Mesaj', 'Ort. Puan', 'Puanlama Sayısı', '1 Yıldız', '2 Yıldız', '3 Yıldız', '4 Yıldız', '5 Yıldız', 'Tarih'];
        const csvContent = [
            headers.join(','),
            ...localData.map(row => [
                row.Agent,
                row.Chats,
                row.AvgChatTime,
                row.TotalChatTime,
                row.LastMessage,
                row.AvgScore,
                row.RatingTimes,
                row.Score1,
                row.Score2,
                row.Score3,
                row.Score4,
                row.Score5,
                row.Date ? new Date(row.Date).toLocaleDateString('tr-TR') : '-'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `performans_raporu_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();

        // Linki kaldırmadan önce biraz bekle (Tarayıcıların işlemi tamamlaması için)
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    };

    const handleExportPDF = async () => {
        const element = document.getElementById('dashboard-content');
        if (!element) return;

        setIsExporting(true);
        try {
            // Wait a bit for UI to settle
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await htmlToImage.toJpeg(element, {
                backgroundColor: '#0f172a',
                quality: 0.95, // JPEG for smaller size
                pixelRatio: 2
            });

            // Resim özelliklerini al
            const img = new Image();
            img.src = dataUrl;
            await new Promise(resolve => img.onload = resolve);

            // PDF boyutunu içeriğe göre ayarla (Pixel -> mm dönüşümü)
            // A4 genişliği 210mm. İçeriği buna sığdıracağız.
            const pdfWidth = 210;
            const pdfHeight = (img.height * pdfWidth) / img.width;

            const pdf = new jsPDF({
                orientation: pdfHeight > pdfWidth ? 'p' : 'l',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`dashboard_raporu_${new Date().toISOString().split('T')[0]}.pdf`);
            alert('PDF raporu başarıyla indirildi!');
        } catch (err) {
            console.error('PDF oluşturma hatası:', err);
            alert('PDF oluşturulurken bir hata oluştu: ' + err.message);
        } finally {
            setIsExporting(false);
        }
    };


    // Calculate Aggregates
    const totalChats = localData.reduce((acc, curr) => acc + curr.Chats, 0);
    const totalRatingTimes = localData.reduce((acc, curr) => acc + curr.RatingTimes, 0);
    const avgScore = (localData.reduce((acc, curr) => acc + (curr.AvgScore * curr.RatingTimes), 0) / totalRatingTimes || 0).toFixed(2);
    const activeAgents = localData.length;

    // Calculate avgTime for StatsCard
    const totalSeconds = localData.reduce((acc, curr) => acc + timeToSeconds(curr.AvgChatTime) * curr.Chats, 0);
    const avgSeconds = totalChats > 0 ? totalSeconds / totalChats : 0;
    const avgTime = secondsToTime(avgSeconds);

    // Top 5 Agents by Chats
    const topAgents = [...localData].sort((a, b) => b.Chats - a.Chats).slice(0, 5);

    // Rating Distribution (Aggregate)
    const ratingDist = [
        { name: '5 Stars', value: data.reduce((acc, curr) => acc + curr.Score5, 0), color: '#10B981' },
        { name: '4 Stars', value: data.reduce((acc, curr) => acc + curr.Score4, 0), color: '#3B82F6' },
        { name: '3 Stars', value: data.reduce((acc, curr) => acc + curr.Score3, 0), color: '#F59E0B' },
        { name: '2 Stars', value: data.reduce((acc, curr) => acc + curr.Score2, 0), color: '#F97316' },
        { name: '1 Star', value: data.reduce((acc, curr) => acc + curr.Score1, 0), color: '#EF4444' },
    ];

    // --- NEW CALCULATIONS ---
    const topScorer = useMemo(() => [...localData].sort((a, b) => b.AvgScore - a.AvgScore)[0], [localData]);
    const speedDemon = useMemo(() => [...localData].sort((a, b) => timeToSeconds(a.AvgChatTime) - timeToSeconds(b.AvgChatTime))[0], [localData]);
    const workhorse = useMemo(() => [...localData].sort((a, b) => b.Chats - a.Chats)[0], [localData]);

    const radarData = useMemo(() => {
        if (!localData.length) return [];
        const avgSpeed = localData.reduce((acc, curr) => acc + timeToSeconds(curr.AvgChatTime), 0) / localData.length;
        const avgQuality = localData.reduce((acc, curr) => acc + curr.AvgScore, 0) / localData.length;
        const avgVolume = localData.reduce((acc, curr) => acc + curr.Chats, 0) / localData.length;
        const avgConsistency = localData.reduce((acc, curr) => acc + (curr.RatingTimes / (curr.Chats || 1)), 0) / localData.length;

        return [
            { subject: 'Hız', A: Math.min(100, (120 / (avgSpeed || 1)) * 80), fullMark: 100 }, // 2 min benchmark
            { subject: 'Kalite', A: (avgQuality / 5) * 100, fullMark: 100 },
            { subject: 'Hacim', A: Math.min(100, (avgVolume / 100) * 100), fullMark: 100 }, // 100 chats benchmark
            { subject: 'Tutarlılık', A: Math.min(100, avgConsistency * 200), fullMark: 100 } // 50% rating rate benchmark
        ];
    }, [localData]);

    const gaugeData = [
        { name: 'Score', value: parseFloat(avgScore), fill: '#10B981' },
        { name: 'Remaining', value: 5 - parseFloat(avgScore), fill: '#334155' }
    ];

    if (isLoading) {
        return (
            <div className="space-y-8 p-4 animate-in fade-in duration-500">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex gap-3">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>

                {/* Leaderboard Skeleton */}
                <Skeleton className="h-48 w-full rounded-2xl" />

                {/* Stats Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
                    <Skeleton className="h-96 rounded-2xl" />
                </div>

                {/* Table Skeleton */}
                <Skeleton className="h-96 rounded-2xl" />
            </div>
        );
    }

    return (
        <motion.div
            id="dashboard-content"
            className="space-y-8 p-4"
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {/* Dashboard Header */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Performans Özeti</h2>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                        <Calendar className="w-4 h-4" />
                        <span>Son 30 Gün</span>
                        <span className="text-slate-600">•</span>
                        <span>Az önce güncellendi</span>
                    </div>
                </div>
                <div className="flex gap-3 relative">
                    <div className="relative">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}

                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <Calendar className="w-4 h-4" />
                            {dateRange.start && dateRange.end ? `${dateRange.start} - ${dateRange.end}` : 'Aralık Seç'}
                        </button>

                        {showDatePicker && (
                            <div className="absolute top-full right-0 mt-2 p-4 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 w-64 animate-in zoom-in-95">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Başlangıç</label>
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Bitiş</label>
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (dateRange.start && dateRange.end) {
                                                onDateRangeChange(dateRange.start, dateRange.end);
                                                setShowDatePicker(false);
                                            }
                                        }}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors mb-2"
                                    >
                                        Uygula
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDateRange({ start: '', end: '' });
                                            setShowDatePicker(false);
                                            onUpdateAgent(); // Reset to latest batch
                                        }}
                                        className="w-full py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        Filtreyi Temizle
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleExportCSV}
                            disabled={isExporting}
                            className={`px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="CSV Olarak İndir"
                        >
                            <Download className="w-4 h-4" />
                            CSV
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className={`px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-900/20 transition-colors flex items-center gap-2 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="PDF Olarak İndir"
                        >
                            {isExporting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            {isExporting ? 'Hazırlanıyor...' : 'PDF'}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Top Performers Podium */}
            <TopPerformers data={localData} />

            {/* Leaderboard Widgets */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">En Yüksek Puan</p>
                        <p className="text-lg font-bold text-white">{topScorer?.Agent || '-'}</p>
                        <p className="text-xs text-blue-400 font-medium">{topScorer?.AvgScore} Puan</p>
                    </div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Hız Canavarı</p>
                        <p className="text-lg font-bold text-white">{speedDemon?.Agent || '-'}</p>
                        <p className="text-xs text-emerald-400 font-medium">{speedDemon?.AvgChatTime}</p>
                    </div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">İşkolik</p>
                        <p className="text-lg font-bold text-white">{workhorse?.Agent || '-'}</p>
                        <p className="text-xs text-purple-400 font-medium">{workhorse?.Chats} Sohbet</p>
                    </div>
                </div>
            </motion.div>

            {/* Stats Overview */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Toplam Sohbet"
                    value={totalChats.toLocaleString()}
                    icon={MessageSquare}
                    trend="+12%"
                    color="blue"
                />
                <StatsCard
                    title="Ort. Memnuniyet"
                    value={avgScore}
                    icon={Star}
                    trend="+0.2"
                    color="yellow"
                />
                <StatsCard
                    title="Aktif Temsilciler"
                    value={activeAgents}
                    icon={Users}
                    color="purple"
                />
                <StatsCard
                    title="Yanıt Oranı"
                    value="98.5%"
                    icon={TrendingUp}
                    trend="+1.2%"
                    color="emerald"
                />
            </motion.div>

            {/* Team Performance & Radar */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team Gauge */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
                    <h3 className="text-lg font-semibold text-white mb-2 z-10">Takım Hedefi</h3>
                    <div className="h-48 w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={gaugeData}
                                    cx="50%"
                                    cy="70%"
                                    startAngle={180}
                                    endAngle={0}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={0}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill="#10B981" />
                                    <Cell fill="#334155" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 pointer-events-none">
                            <span className="text-4xl font-bold text-white">{avgScore}</span>
                            <span className="text-xs text-slate-400">/ 5.00</span>
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                </div>

                {/* Team Radar */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
                    <h3 className="text-lg font-semibold text-white mb-2 z-10">Takım Yetenek Radarı</h3>
                    <div className="h-64 w-full z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Takım Ortalaması"
                                    dataKey="A"
                                    stroke="#3B82F6"
                                    fill="#3B82F6"
                                    fillOpacity={0.3}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                </div>
            </motion.div>

            {/* Charts Section */}
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Bar Chart */}
                <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">En İyi Performans Gösterenler</h3>
                            <p className="text-xs text-slate-500">Sohbet hacmine göre temsilciler</p>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topAgents}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="Agent" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                    cursor={{ fill: '#334155', opacity: 0.2 }}
                                />
                                <Bar dataKey="Chats" radius={[4, 4, 0, 0]}>
                                    {topAgents.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'][index % 5]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rating Distribution */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white">Memnuniyet Dağılımı</h3>
                        <p className="text-xs text-slate-500">Puan dağılımı</p>
                    </div>
                    <div className="h-64 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={ratingDist}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {ratingDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-white">{avgScore}</span>
                            <span className="text-xs text-slate-500">Ort. Puan</span>
                        </div>
                    </div>
                    <div className="space-y-2 mt-4">
                        {ratingDist.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-slate-400">{item.name}</span>
                                </div>
                                <span className="text-slate-200 font-medium">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Detailed Table */}
            <motion.div variants={item} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Detaylı Performans</h3>
                        <p className="text-xs text-slate-500">Bireysel temsilci metrikleri</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Temsilci Ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-slate-950/50 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 w-64 transition-all"
                            />
                        </div>

                        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors whitespace-nowrap">
                            Tüm Temsilcileri Gör
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider font-medium">
                            <tr>
                                <th className="px-4 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('Agent')}>
                                    <div className="flex items-center gap-1">
                                        Temsilci
                                        {sortConfig.key === 'Agent' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-3 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('Chats')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        Sohbet
                                        {sortConfig.key === 'Chats' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-2 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('AvgChatTime')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        Ort.Süre
                                        {sortConfig.key === 'AvgChatTime' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-2 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('TotalChatTime')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        Top.Süre
                                        {sortConfig.key === 'TotalChatTime' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-2 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('LastMessage')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        Son Msj
                                        {sortConfig.key === 'LastMessage' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-2 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('RatingTimes')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        Değ.Sayısı
                                        {sortConfig.key === 'RatingTimes' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-3 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('AvgScore')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        Puan
                                        {sortConfig.key === 'AvgScore' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-2 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('Score5')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        5★
                                        {sortConfig.key === 'Score5' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-2 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('Score4')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        4★
                                        {sortConfig.key === 'Score4' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-2 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('Score3')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        3★
                                        {sortConfig.key === 'Score3' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-2 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('Score2')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        2★
                                        {sortConfig.key === 'Score2' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-2 py-3 cursor-pointer hover:text-white transition-colors text-center" onClick={() => requestSort('Score1')}>
                                    <div className="flex items-center gap-1 justify-center">
                                        1★
                                        {sortConfig.key === 'Score1' && (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                                <th className="px-2 py-3 text-center">Eğilim</th>
                                {isAdmin && <th className="px-2 py-3 text-center">Düzenle</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {sortedData.map((row, index) => (
                                <tr
                                    key={index}
                                    onClick={() => onAgentClick && onAgentClick(row)}
                                    className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                                >
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold text-xs border border-slate-600 group-hover:border-blue-500/50 transition-colors">
                                                {(row.Agent || '??').substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-200 group-hover:text-white transition-colors text-xs">{row.Agent || 'Bilinmeyen'}</span>
                                            {hasBadges(row) && (
                                                <Award className="w-3 h-3 text-yellow-400 ml-1" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-slate-300 font-mono text-xs text-center">{row.Chats}</td>
                                    <td className="px-2 py-2 text-slate-400 font-mono text-xs text-center">{row.AvgChatTime}</td>
                                    <td className="px-2 py-2 text-slate-400 font-mono text-xs text-center">{row.TotalChatTime || '-'}</td>
                                    <td className="px-2 py-2 text-slate-400 font-mono text-xs text-center">{row.LastMessage || '-'}</td>
                                    <td className="px-2 py-2 text-slate-400 font-mono text-xs text-center">{row.RatingTimes}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-1 justify-center">
                                            <span className={`font-bold text-xs ${row.AvgScore >= thresholds.excellent ? 'text-emerald-400' : row.AvgScore >= thresholds.good ? 'text-blue-400' : 'text-yellow-400'}`}>
                                                {Number(row.AvgScore).toFixed(1)}
                                            </span>
                                            <Star className={`w-3 h-3 fill-current ${row.AvgScore >= thresholds.excellent ? 'text-emerald-400' : row.AvgScore >= thresholds.good ? 'text-blue-400' : 'text-yellow-400'}`} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 text-emerald-400 font-mono text-xs text-center">{row.Score5}</td>
                                    <td className="px-2 py-2 text-blue-400 font-mono text-xs text-center">{row.Score4}</td>
                                    <td className="px-2 py-2 text-yellow-400 font-mono text-xs text-center">{row.Score3}</td>
                                    <td className="px-2 py-2 text-orange-400 font-mono text-xs text-center">{row.Score2}</td>
                                    <td className="px-2 py-2 text-red-400 font-mono text-xs text-center">{row.Score1}</td>
                                    <td className="px-2 py-2">
                                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mx-auto">
                                            <div
                                                className={`h-full rounded-full ${row.AvgScore >= thresholds.excellent ? 'bg-emerald-500' : row.AvgScore >= thresholds.good ? 'bg-blue-500' : 'bg-yellow-500'}`}
                                                style={{ width: `${(row.AvgScore / 5) * 100}%` }}
                                            />
                                        </div>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-2 py-2 text-center">
                                            <button
                                                onClick={(e) => handleEditClick(e, row)}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors inline-flex"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Edit Modal */}
            {
                editingAgent && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Veri Düzenle: {editingAgent.Agent}</h3>
                                <button onClick={() => setEditingAgent(null)} className="text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Sohbet Sayısı</label>
                                    <input
                                        type="number"
                                        value={editingAgent.Chats}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, Chats: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Ortalama Süre (dk:sn)</label>
                                    <input
                                        type="text"
                                        value={editingAgent.AvgChatTime}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, AvgChatTime: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Ortalama Puan</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        max="5"
                                        value={editingAgent.AvgScore}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, AvgScore: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setEditingAgent(null)}
                                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </motion.div >
    );
};

const StatsCard = ({ title, value, icon: Icon, trend, color }) => {
    const colors = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    };

    return (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl hover:border-slate-700 hover:bg-slate-800/30 transition-all group shadow-lg">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl border ${colors[color]} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/10">
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
        </div>
    );
};

export default Dashboard;
