import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, ChevronRight, FileText } from 'lucide-react';

const History = ({ onViewBatch }) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            // Tüm raporları çekip client-side gruplama yapacağız
            // (Gerçek projede 'batches' tablosu olması daha iyi olurdu ama
            // mevcut yapıyı bozmadan böyle ilerliyoruz)
            const { data, error } = await supabase
                .from('reports')
                .select('batch_id, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Benzersiz batch'leri bul
            const uniqueBatches = [];
            const seenBatchIds = new Set();

            data.forEach(item => {
                if (item.batch_id && !seenBatchIds.has(item.batch_id)) {
                    seenBatchIds.add(item.batch_id);
                    uniqueBatches.push({
                        id: item.batch_id,
                        date: new Date(item.created_at),
                    });
                }
            });

            setBatches(uniqueBatches);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'long'
        }).format(date);
    };

    const formatTime = (date) => {
        return new Intl.DateTimeFormat('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-400" />
                Geçmiş Raporlar
            </h2>

            {loading ? (
                <div className="text-center text-slate-500 py-12">Yükleniyor...</div>
            ) : batches.length === 0 ? (
                <div className="text-center text-slate-500 py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz kaydedilmiş rapor yok.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {batches.map((batch) => (
                        <button
                            key={batch.id}
                            onClick={() => onViewBatch(batch.id)}
                            className="w-full bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 p-6 rounded-xl transition-all duration-300 group text-left flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Calendar className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-200 mb-1">
                                        {formatDate(batch.date)}
                                    </h3>
                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        {formatTime(batch.date)}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default History;
