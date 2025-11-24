import React from 'react';
import { motion } from 'framer-motion';
import { Upload, History, Users, Activity, ArrowRight, ShieldCheck, Calendar } from 'lucide-react';

const Home = ({ onNavigateToUpload, onNavigateToHistory, dateRange, setDateRange }) => {
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

    return (
        <motion.div
            className="space-y-10"
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {/* Hero Section */}
            <motion.div variants={item} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-10 shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Activity className="w-64 h-64 text-blue-500" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium mb-6 border border-blue-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Sistem Çalışıyor</span>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Dash15 Analitik</span>'e Hoş Geldiniz
                    </h1>
                    <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                        Temsilci performans metrikleri ve müşteri memnuniyeti içgörüleri için merkezi komuta merkeziniz.
                        Gerçek zamanlı analizler oluşturmak için en son raporlarınızı yükleyin.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={onNavigateToUpload}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-1 flex items-center gap-2"
                        >
                            <Upload className="w-5 h-5" />
                            Yeni Rapor Yükle
                        </button>
                        <button
                            onClick={onNavigateToHistory}
                            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold border border-slate-700 transition-all flex items-center gap-2"
                        >
                            <History className="w-5 h-5" />
                            Geçmişi Görüntüle
                        </button>
                    </div>

                    {/* Quick Date Search */}
                    <div className="mt-8 pt-8 border-t border-slate-800/50">
                        <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Hızlı Tarih Sorgulama
                        </h3>
                        <div className="flex flex-wrap gap-4 items-end bg-slate-950/30 p-4 rounded-xl border border-slate-800/50 inline-flex">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1.5">Başlangıç Tarihi</label>
                                <input
                                    type="date"
                                    value={dateRange?.start || ''}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 block mb-1.5">Bitiş Tarihi</label>
                                <input
                                    type="date"
                                    value={dateRange?.end || ''}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            {dateRange?.start && dateRange?.end && (
                                <div className="text-xs text-emerald-400 font-medium px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 animate-in fade-in">
                                    Sorgulanıyor...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Quick Stats / Features Grid */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors group">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                        <Users className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Temsilci Performansı</h3>
                    <p className="text-slate-400 text-sm">Sohbet hacimleri, yanıt süreleri ve bireysel temsilci verimlilik metriklerine derinlemesine dalın.</p>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors group">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                        <Activity className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Canlı İzleme</h3>
                    <p className="text-slate-400 text-sm">Aktif kuyrukların, çevrimiçi temsilcilerin ve sistem durumunun gerçek zamanlı takibi (Beta).</p>
                </div>

                <div
                    onClick={onNavigateToHistory}
                    className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors group cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                        <History className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Geçmiş Veriler</h3>
                    <p className="text-slate-400 text-sm">Uzun vadeli eğilimleri belirlemek için geçmiş performans raporlarına erişin ve karşılaştırın.</p>
                </div>
            </motion.div>

            {/* Recent Activity Placeholder */}
            <motion.div variants={item} className="rounded-2xl bg-slate-900/50 border border-slate-800 p-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Son Sistem Aktivitesi</h3>
                    <button
                        onClick={onNavigateToHistory}
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        Tümünü Gör <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div>
                                    <p className="text-sm font-medium text-slate-200">Sistem Yedeklemesi Tamamlandı</p>
                                    <p className="text-xs text-slate-500">Otomatik bakım görevi</p>
                                </div>
                            </div>
                            <span className="text-xs text-slate-500 font-mono">0{i}:00 AM</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Home;
