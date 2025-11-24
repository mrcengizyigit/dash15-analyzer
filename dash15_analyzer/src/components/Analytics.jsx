import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, AlertCircle, Clock, Activity, Search, Download, Star, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { timeToSeconds } from '../utils/timeUtils';
import { usePreferences } from '../contexts/PreferencesContext';
import { supabase } from '../lib/supabase';
import TranscriptModal from './TranscriptModal';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

const Analytics = ({ data, dateRange, viewMode }) => {
    // Filter out managers
    const { hiddenAgents } = usePreferences();
    const [chatLogs, setChatLogs] = React.useState([]);
    const [loadingLogs, setLoadingLogs] = React.useState(false);
    const [selectedChat, setSelectedChat] = React.useState(null);
    const [filterMode, setFilterMode] = React.useState('all'); // 'all', 'critical', 'perfect'
    const [searchQuery, setSearchQuery] = React.useState('');
    const [sortConfig, setSortConfig] = React.useState({ key: 'start_time', direction: 'desc' });
    const tableRef = React.useRef(null);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleExport = async () => {
        if (!tableRef.current) return;

        try {
            const dataUrl = await toPng(tableRef.current, {
                backgroundColor: '#0f172a', // Match slate-900
                style: {
                    transform: 'scale(1)', // Avoid potential scaling issues
                }
            });

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [tableRef.current.offsetWidth, tableRef.current.offsetHeight]
            });

            pdf.addImage(dataUrl, 'PNG', 0, 0, tableRef.current.offsetWidth, tableRef.current.offsetHeight);
            pdf.save(`konusma_kayitlari_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error('PDF export failed:', error);
            alert(`PDF oluşturulurken bir hata oluştu: ${error.message}`);
        }
    };

    const filteredData = React.useMemo(() => {
        if (!data) return [];
        return data.filter(item => {
            const agentName = item.Agent || '';
            return !hiddenAgents.some(excluded => agentName.toLowerCase().includes(excluded.toLowerCase()));
        });
    }, [data, hiddenAgents]);

    // Fetch Chat Logs from Supabase
    React.useEffect(() => {
        const fetchChatLogs = async () => {
            setLoadingLogs(true);
            try {
                let query = supabase
                    .from('chat_logs')
                    .select('*');

                // Apply date filter if exists
                if (dateRange?.start && dateRange?.end) {
                    query = query
                        .gte('start_time', dateRange.start.toISOString())
                        .lte('start_time', dateRange.end.toISOString());
                }

                const { data: logs, error } = await query;

                if (error) throw error;

                if (logs) {
                    // Filter hidden agents from logs too
                    const filteredLogs = logs.filter(log =>
                        !hiddenAgents.some(excluded => (log.agent_name || '').toLowerCase().includes(excluded.toLowerCase()))
                    );
                    setChatLogs(filteredLogs);
                }
            } catch (err) {
                console.error('Error fetching chat logs:', err);
            } finally {
                setLoadingLogs(false);
            }
        };

        fetchChatLogs();
    }, [dateRange, hiddenAgents]);

    // Process Hourly Activity
    const hourlyActivity = React.useMemo(() => {
        const hours = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
        chatLogs.forEach(log => {
            if (log.start_time) {
                const date = new Date(log.start_time);
                const hour = date.getHours();
                hours[hour].count++;
            }
        });
        return hours.map(h => ({
            name: `${h.hour}:00`,
            chats: h.count
        }));
    }, [chatLogs]);

    // Process Response Time Distribution
    const responseTimeDist = React.useMemo(() => {
        const buckets = {
            '<30s': 0,
            '30s-1m': 0,
            '1m-2m': 0,
            '2m-5m': 0,
            '>5m': 0
        };

        chatLogs.forEach(log => {
            const wait = log.wait_time_seconds || 0;
            if (wait < 30) buckets['<30s']++;
            else if (wait < 60) buckets['30s-1m']++;
            else if (wait < 120) buckets['1m-2m']++;
            else if (wait < 300) buckets['2m-5m']++;
            else buckets['>5m']++;
        });

        return Object.entries(buckets).map(([name, value]) => ({ name, value }));
    }, [chatLogs]);

    // Prepare Trend Data
    const [trendMetric, setTrendMetric] = React.useState('Chats'); // Chats, AvgScore, AvgChatTime

    const trendData = React.useMemo(() => {
        const groupedByDate = {};

        if (!filteredData) return [];

        filteredData.forEach(item => {
            if (!item.Date) return;
            const dateStr = item.Date.substring(0, 10); // YYYY-MM-DD

            if (!groupedByDate[dateStr]) {
                groupedByDate[dateStr] = {
                    date: dateStr,
                    totalChats: 0,
                    totalScore: 0,
                    totalRatingTimes: 0,
                    totalSeconds: 0,
                    count: 0
                };
            }

            const group = groupedByDate[dateStr];
            group.totalChats += item.Chats;
            group.totalRatingTimes += item.RatingTimes;
            group.totalScore += (item.AvgScore * item.RatingTimes);

            group.totalSeconds += (timeToSeconds(item.AvgChatTime) * item.Chats);
            group.count += 1;
        });

        return Object.values(groupedByDate)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(group => ({
                date: new Date(group.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                Chats: group.totalChats,
                AvgScore: group.totalRatingTimes > 0 ? parseFloat((group.totalScore / group.totalRatingTimes).toFixed(2)) : 0,
                AvgChatTime: group.totalChats > 0 ? Math.round(group.totalSeconds / group.totalChats / 60) : 0 // Dakika cinsinden
            }));
    }, [filteredData]);

    // Prepare Scatter Data (Volume vs Satisfaction) - Aggregated by Agent
    const scatterData = React.useMemo(() => {
        const agentStats = {};

        filteredData.forEach(d => {
            if (!agentStats[d.Agent]) {
                agentStats[d.Agent] = {
                    name: d.Agent,
                    totalChats: 0,
                    weightedScoreSum: 0,
                    totalRatingTimes: 0
                };
            }
            agentStats[d.Agent].totalChats += d.Chats;
            agentStats[d.Agent].weightedScoreSum += (d.AvgScore * d.RatingTimes);
            agentStats[d.Agent].totalRatingTimes += d.RatingTimes;
        });

        return Object.values(agentStats).map(stat => ({
            name: stat.name,
            x: stat.totalChats,
            y: stat.totalRatingTimes > 0 ? stat.weightedScoreSum / stat.totalRatingTimes : 0,
            z: stat.totalRatingTimes // Bubble size
        }));
    }, [filteredData]);

    // Calculate Averages for Quadrants
    const avgVolume = React.useMemo(() => {
        if (scatterData.length === 0) return 0;
        return scatterData.reduce((acc, curr) => acc + curr.x, 0) / scatterData.length;
    }, [scatterData]);

    const avgScore = React.useMemo(() => {
        if (scatterData.length === 0) return 0;
        return scatterData.reduce((acc, curr) => acc + curr.y, 0) / scatterData.length;
    }, [scatterData]);

    // Veri yoksa veya (Tüm Veriler modunda ve Tarih seçilmemişse)
    if (!filteredData || filteredData.length === 0 || (viewMode === 'all' && (!dateRange?.start || !dateRange?.end))) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>Analiz için lütfen Dashboard üzerinden bir tarih aralığı seçin veya Geçmiş Raporlardan birini yükleyin.</p>
            </div>
        );
    }

    // Top Lists - CHANGED FROM 5 TO 10
    const topRated = [...filteredData].filter(d => d.RatingTimes > 5).sort((a, b) => b.AvgScore - a.AvgScore).slice(0, 10);
    const mostActive = [...filteredData].sort((a, b) => b.Chats - a.Chats).slice(0, 10);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Gelişmiş Analitik</h2>
                <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm border border-blue-500/20">
                    {filteredData.length} Kayıt Analiz Edildi
                </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Performans Trendi</h3>
                        <p className="text-xs text-slate-500">Zaman içindeki değişim analizi</p>
                    </div>
                    <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setTrendMetric('Chats')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${trendMetric === 'Chats' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Sohbet Hacmi
                        </button>
                        <button
                            onClick={() => setTrendMetric('AvgScore')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${trendMetric === 'AvgScore' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Memnuniyet
                        </button>
                        <button
                            onClick={() => setTrendMetric('AvgChatTime')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${trendMetric === 'AvgChatTime' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Ort. Süre (Dk)
                        </button>
                    </div>
                </div>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={trendMetric === 'Chats' ? '#3B82F6' : trendMetric === 'AvgScore' ? '#10B981' : '#8B5CF6'} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={trendMetric === 'Chats' ? '#3B82F6' : trendMetric === 'AvgScore' ? '#10B981' : '#8B5CF6'} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area
                                type="monotone"
                                dataKey={trendMetric}
                                stroke={trendMetric === 'Chats' ? '#3B82F6' : trendMetric === 'AvgScore' ? '#10B981' : '#8B5CF6'}
                                fillOpacity={1}
                                fill="url(#colorMetric)"
                                strokeWidth={3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Scatter Plot */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-lg">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white">Hacim ve Memnuniyet Matrisi</h3>
                    <p className="text-xs text-slate-500">Temsilci bazlı performans dağılımı (Ortalamalar: {Math.round(avgVolume)} Sohbet, {avgScore.toFixed(2)} Puan)</p>
                </div>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis type="number" dataKey="x" name="Chats" stroke="#94a3b8" label={{ value: 'Toplam Sohbet Hacmi', position: 'bottom', fill: '#94a3b8', offset: 0 }} />
                            <YAxis type="number" dataKey="y" name="Score" stroke="#94a3b8" domain={[0, 5]} label={{ value: 'Ort. Puan', angle: -90, position: 'left', fill: '#94a3b8' }} />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                                                <p className="font-bold text-white">{data.name}</p>
                                                <p className="text-sm text-blue-400">Total Chats: {data.x}</p>
                                                <p className="text-sm text-yellow-400">Avg Score: {data.y.toFixed(2)}</p>
                                                <p className="text-xs text-slate-500 mt-1">{data.z} ratings</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <ReferenceLine x={avgVolume} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Ort. Hacim', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
                            <ReferenceLine y={avgScore} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Ort. Puan', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
                            <Scatter name="Agents" data={scatterData} fill="#3B82F6">
                                {scatterData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.y >= 4.5 ? '#10B981' : entry.y >= 4.0 ? '#3B82F6' : '#EF4444'} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Lists Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Highest Rated */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-lg font-semibold text-white">En Yüksek Puanlı Temsilciler</h3>
                    </div>
                    <div className="space-y-4">
                        {topRated.map((agent, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-200">{agent.Agent}</p>
                                        <p className="text-xs text-slate-500">{agent.RatingTimes} puanlama</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-400">{agent.AvgScore.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Most Active */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">En Aktif Temsilciler</h3>
                    </div>
                    <div className="space-y-4">
                        {mostActive.map((agent, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-200">{agent.Agent}</p>
                                        <p className="text-xs text-slate-500">{agent.AvgChatTime} ort. süre</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-400">{agent.Chats}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Detailed Analytics Section (New) */}
            {chatLogs.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    {/* Hourly Activity */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Clock className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Saatlik Yoğunluk</h3>
                                <p className="text-xs text-slate-500">Günün saatlerine göre sohbet dağılımı</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={hourlyActivity}>
                                    <defs>
                                        <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Area type="monotone" dataKey="chats" stroke="#3B82F6" fillOpacity={1} fill="url(#colorChats)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Response Time Distribution */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Activity className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Yanıt Süresi Dağılımı</h3>
                                <p className="text-xs text-slate-500">Bekleme sürelerine göre sohbetler</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={responseTimeDist}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                        cursor={{ fill: '#334155', opacity: 0.2 }}
                                    />
                                    <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]}>
                                        {responseTimeDist.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#10B981', '#34D399', '#FBBF24', '#F87171', '#EF4444'][index]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Heatmap Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-lg overflow-x-auto">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white">Yoğunluk Isı Haritası</h3>
                    <p className="text-xs text-slate-500">Son 14 gün için Temsilci bazlı sohbet yoğunluğu</p>
                </div>

                <div className="min-w-[800px]">
                    {/* Heatmap Header (Dates) */}
                    <div className="flex">
                        <div className="w-32 flex-shrink-0"></div> {/* Spacer for Agent Names */}
                        {(() => {
                            // Get last 14 days
                            const dates = [];
                            for (let i = 13; i >= 0; i--) {
                                const d = new Date();
                                d.setDate(d.getDate() - i);
                                dates.push(d);
                            }
                            return dates.map((date, i) => (
                                <div key={i} className="flex-1 text-center text-xs text-slate-500 rotate-0">
                                    {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                </div>
                            ));
                        })()}
                    </div>

                    {/* Heatmap Rows (Agents) */}
                    <div className="space-y-2 mt-2">
                        {(() => {
                            // Get Unique Agents (using filteredData)
                            const uniqueAgents = [...new Set(filteredData.map(d => d.Agent))].sort();

                            // Prepare Data Map for quick lookup: [Agent][DateStr] = Chats
                            const dataMap = {};
                            filteredData.forEach(d => {
                                if (!d.Date) return;
                                const dateStr = d.Date.substring(0, 10);
                                if (!dataMap[d.Agent]) dataMap[d.Agent] = {};
                                if (!dataMap[d.Agent][dateStr]) dataMap[d.Agent][dateStr] = 0;
                                dataMap[d.Agent][dateStr] += d.Chats;
                            });

                            // Max value for color scaling
                            const maxChats = Math.max(...filteredData.map(d => d.Chats)) || 1;

                            const dates = [];
                            for (let i = 13; i >= 0; i--) {
                                const d = new Date();
                                d.setDate(d.getDate() - i);
                                dates.push(d.toISOString().split('T')[0]);
                            }

                            return uniqueAgents.map(agent => (
                                <div key={agent} className="flex items-center hover:bg-slate-800/30 rounded-lg transition-colors p-1">
                                    <div className="w-32 flex-shrink-0 text-xs font-medium text-slate-300 truncate pr-2" title={agent}>
                                        {agent}
                                    </div>
                                    {dates.map(dateStr => {
                                        const value = dataMap[agent]?.[dateStr] || 0;
                                        const intensity = Math.min(value / maxChats, 1); // 0 to 1

                                        // Color calculation (Blue scale)
                                        if (value > 0) {
                                            return (
                                                <div key={dateStr} className="flex-1 h-8 mx-0.5 rounded flex items-center justify-center group relative">
                                                    <div
                                                        className="w-full h-full rounded bg-blue-500 transition-all"
                                                        style={{ opacity: Math.max(intensity, 0.1) }}
                                                    ></div>
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-slate-900 text-white text-xs p-2 rounded shadow-xl border border-slate-700 whitespace-nowrap">
                                                        {value} Sohbet
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={dateStr} className="flex-1 h-8 mx-0.5 rounded bg-slate-800/30 flex items-center justify-center">
                                                <span className="text-[10px] text-slate-600">-</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>
            {/* Chat Logs Table */}
            {chatLogs.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                    <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Konuşma Kayıtları</h3>
                            <p className="text-xs text-slate-500">Detaylı inceleme için kayıtlara tıklayın</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Temsilci veya Ziyaretçi Ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 w-64"
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex bg-slate-950/50 rounded-lg p-1 border border-slate-800">
                                <button
                                    onClick={() => setFilterMode('all')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterMode === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Tümü
                                </button>
                                <button
                                    onClick={() => setFilterMode('critical')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${filterMode === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'text-slate-500 hover:text-red-400'}`}
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    Kritik
                                </button>
                                <button
                                    onClick={() => setFilterMode('perfect')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${filterMode === 'perfect' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'text-slate-500 hover:text-emerald-400'}`}
                                >
                                    <Star className="w-3 h-3" />
                                    Mükemmel
                                </button>
                            </div>

                            {/* Export */}
                            <button
                                onClick={handleExport}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
                                title="Listeyi İndir (PDF)"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto" ref={tableRef}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-950/30 text-xs uppercase text-slate-400">
                                    <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('start_time')}>
                                        <div className="flex items-center gap-1">
                                            Tarih
                                            {sortConfig.key === 'start_time' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('agent_name')}>
                                        <div className="flex items-center gap-1">
                                            Temsilci
                                            {sortConfig.key === 'agent_name' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('visitor_name')}>
                                        <div className="flex items-center gap-1">
                                            Ziyaretçi
                                            {sortConfig.key === 'visitor_name' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('duration_seconds')}>
                                        <div className="flex items-center gap-1">
                                            Süre
                                            {sortConfig.key === 'duration_seconds' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('rating')}>
                                        <div className="flex items-center gap-1">
                                            Puan
                                            {sortConfig.key === 'rating' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-4 font-medium text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-sm">
                                {chatLogs
                                    .filter(log => {
                                        const matchesSearch = searchQuery.toLowerCase() === '' ||
                                            log.agent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            log.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase());

                                        if (filterMode === 'critical') return matchesSearch && log.rating === 1;
                                        if (filterMode === 'perfect') return matchesSearch && log.rating === 5;
                                        return matchesSearch;
                                    })
                                    .sort((a, b) => {
                                        // Priority to critical/perfect filters if active, but let's respect manual sort if user clicked
                                        // Actually, let's make manual sort override everything for better UX

                                        let valA = a[sortConfig.key];
                                        let valB = b[sortConfig.key];

                                        // Handle dates
                                        if (sortConfig.key === 'start_time') {
                                            valA = new Date(valA).getTime();
                                            valB = new Date(valB).getTime();
                                        }

                                        // Handle strings
                                        if (typeof valA === 'string') {
                                            valA = valA.toLowerCase();
                                            valB = valB.toLowerCase();
                                        }

                                        if (valA < valB) {
                                            return sortConfig.direction === 'asc' ? -1 : 1;
                                        }
                                        if (valA > valB) {
                                            return sortConfig.direction === 'asc' ? 1 : -1;
                                        }
                                        return 0;
                                    })
                                    .slice(0, 50)
                                    .map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="p-4 text-slate-300">
                                                {new Date(log.start_time).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-4 text-white font-medium">{log.agent_name}</td>
                                            <td className="p-4 text-slate-400">{log.visitor_name}</td>
                                            <td className="p-4 text-slate-400">
                                                {Math.floor(log.duration_seconds / 60)}dk {log.duration_seconds % 60}sn
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${log.rating >= 4 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    log.rating >= 3 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                        log.rating ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                            'bg-slate-800 text-slate-500'
                                                    }`}>
                                                    {log.rating || '-'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => setSelectedChat(log)}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    İncele
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                    {chatLogs.length > 50 && (
                        <div className="p-4 border-t border-slate-800 text-center">
                            <p className="text-xs text-slate-500">Son 50 kayıt gösteriliyor. Daha fazlası için tarih aralığını daraltın.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Transcript Modal */}
            {selectedChat && (
                <TranscriptModal
                    chat={selectedChat}
                    onClose={() => setSelectedChat(null)}
                />
            )}
        </div>
    );
};

export default Analytics;
