import React, { useState } from 'react';
import { Upload, FileCheck, AlertCircle, X, Calendar } from 'lucide-react';
import { parseCSV, mergeData } from '../utils/csvParser';

import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { timeToSeconds } from '../utils/timeUtils';

const UploadArea = ({ onDataLoaded }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadStats, setUploadStats] = useState(null);

    const handleFileChange = (newFiles) => {
        const validFiles = Array.from(newFiles).filter(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
        if (validFiles.length !== newFiles.length) {
            setError('Bazı dosyalar CSV formatında değildi ve atlandı.');
        } else {
            setError('');
        }
        setFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };



    const handleChatLogUpload = async (file) => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    try {
                        const logs = results.data.map(row => {
                            const parseDate = (dateStr) => {
                                if (!dateStr) return null;
                                return new Date(dateStr).toISOString();
                            };

                            return {
                                chat_id: row['ID'],
                                agent_name: row['Agent'],
                                visitor_name: row['Name'],
                                department: row['Department'],
                                start_time: parseDate(row['Start Time']),
                                end_time: parseDate(row['End Time']),
                                duration_seconds: timeToSeconds(row['Duration']),
                                wait_time_seconds: timeToSeconds(row['Waiting Time']),
                                rating: parseInt(row['Rating']) || null,
                                transcript: row['Content'],
                                tags: row['Category'] ? [row['Category']] : []
                            };
                        }).filter(log => log.chat_id);

                        const BATCH_SIZE = 50;
                        for (let i = 0; i < logs.length; i += BATCH_SIZE) {
                            const batch = logs.slice(i, i + BATCH_SIZE);
                            const { error } = await supabase
                                .from('chat_logs')
                                .upsert(batch, { onConflict: 'chat_id' });

                            if (error) throw error;
                        }
                        resolve(logs.length);
                    } catch (err) {
                        reject(err);
                    }
                },
                error: (err) => reject(err)
            });
        });
    };

    const processFiles = async () => {
        if (files.length === 0) {
            setError('Lütfen en az bir CSV dosyası yükleyin.');
            return;
        }

        setLoading(true);
        setUploadStats(null);
        setError('');

        let successCount = 0;
        let chatLogCount = 0;

        try {
            // Check for Chat Logs first (by checking columns in first file)
            // If it has "Start Time", "Waiting Time", "Content" -> It's a Chat Log
            // We process files one by one to determine type

            for (const file of files) {
                try {
                    // Peek at header
                    const headerPromise = new Promise((resolve) => {
                        Papa.parse(file, {
                            preview: 1,
                            header: true,
                            complete: (res) => resolve(res.meta.fields || [])
                        });
                    });

                    const headers = await headerPromise;
                    const isChatLog = headers.includes('Start Time') && headers.includes('Waiting Time') && headers.includes('Content');

                    if (isChatLog) {
                        const count = await handleChatLogUpload(file);
                        chatLogCount += count;
                    } else {
                        // Regular Report Processing
                        const { data, date } = await parseCSV(file);
                        if (!date) {
                            console.warn(`Tarih bulunamadı: ${file.name}`);
                            continue;
                        }

                        // ... (Existing Report Logic)
                        const isRating = data.length > 0 && 'Avg. Score' in data[0];
                        const isPerformance = data.length > 0 && 'Chats' in data[0];

                        // For simplicity in this merged view, we'll process report files individually or grouped
                        // Re-using existing logic but adapted for single file loop if possible, 
                        // OR we keep the existing grouping logic for reports.

                        // Let's stick to the existing grouping logic for reports, but filter out chat logs first.
                    }
                } catch (err) {
                    console.error(`Dosya işleme hatası (${file.name}):`, err);
                }
            }

            // Separate Chat Logs from Reports
            const reportFiles = [];
            for (const file of files) {
                const headers = await new Promise((resolve) => {
                    Papa.parse(file, {
                        preview: 1,
                        header: true,
                        complete: (res) => resolve(res.meta.fields || [])
                    });
                });
                if (!headers.includes('Start Time') || !headers.includes('Content')) {
                    reportFiles.push(file);
                }
            }

            // Process Reports (Existing Logic)
            if (reportFiles.length > 0) {
                const parsedFiles = [];
                for (const file of reportFiles) {
                    const { data, date } = await parseCSV(file);
                    if (date) {
                        const isRating = data.length > 0 && 'Avg. Score' in data[0];
                        const isPerformance = data.length > 0 && 'Chats' in data[0];
                        parsedFiles.push({ file, data, date, type: isRating ? 'rating' : (isPerformance ? 'performance' : 'unknown') });
                    }
                }

                const groupedByDate = {};
                parsedFiles.forEach(item => {
                    if (!groupedByDate[item.date]) groupedByDate[item.date] = { performance: [], rating: [] };
                    if (item.type === 'performance') groupedByDate[item.date].performance = item.data;
                    if (item.type === 'rating') groupedByDate[item.date].rating = item.data;
                });

                for (const [date, group] of Object.entries(groupedByDate)) {
                    let perfData = group.performance || [];
                    let ratingData = group.rating || [];
                    if (perfData.length === 0 && ratingData.length > 0) perfData = ratingData;
                    if (ratingData.length === 0 && perfData.length > 0) ratingData = perfData;
                    if (perfData.length === 0 && ratingData.length === 0) continue;

                    const merged = mergeData(perfData, ratingData);
                    const batchId = crypto.randomUUID();
                    const selectedDate = new Date(date);
                    selectedDate.setHours(12, 0, 0, 0);
                    const timestamp = selectedDate.toISOString();

                    const { error: uploadError } = await supabase
                        .from('reports')
                        .insert(merged.map(item => ({
                            created_at: timestamp,
                            batch_id: batchId,
                            agent_name: item.Agent,
                            chats_count: item.Chats,
                            avg_chat_time: item.AvgChatTime,
                            total_chat_time: item.TotalChatTime,
                            last_message_sent: item.LastMessage,
                            avg_score: item.AvgScore,
                            rating_times: item.RatingTimes,
                            score_1: item.Score1,
                            score_2: item.Score2,
                            score_3: item.Score3,
                            score_4: item.Score4,
                            score_5: item.Score5
                        })));

                    if (!uploadError) successCount++;
                }
            }

            setUploadStats({
                total: files.length,
                success: successCount,
                chatLogs: chatLogCount
            });

            if (successCount > 0 || chatLogCount > 0) {
                setTimeout(() => {
                    onDataLoaded();
                }, 2000);
            } else {
                setError('Hiçbir veri yüklenemedi.');
            }

        } catch (err) {
            console.error(err);
            setError('Hata: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Toplu Veri Yükleme</h2>
                <p className="text-slate-400">Birden fazla CSV dosyasını sürükleyip bırakın. Sistem tarihleri otomatik algılayıp birleştirecektir.</p>
            </div>

            <div className="mb-8">
                <div className={`relative group rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center ${files.length > 0 ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 hover:border-blue-500 hover:bg-slate-800/50'}`}>
                    <input
                        type="file"
                        id="bulk-upload"
                        className="hidden"
                        accept=".csv"
                        multiple
                        onChange={(e) => handleFileChange(e.target.files)}
                    />
                    <label htmlFor="bulk-upload" className="cursor-pointer flex flex-col items-center h-full justify-center w-full">
                        <div className="w-20 h-20 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center mb-6 transition-colors">
                            <Upload className="w-10 h-10 text-blue-400" />
                        </div>
                        <p className="text-xl font-medium text-slate-200 mb-2">CSV Dosyalarını Buraya Bırakın</p>
                        <p className="text-slate-500">veya seçmek için tıklayın (Çoklu seçim yapılabilir)</p>
                    </label>
                </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="mb-8 bg-slate-900/50 rounded-xl border border-slate-800 p-4 max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="text-sm font-semibold text-slate-400">Seçilen Dosyalar ({files.length})</h3>
                        <button onClick={() => setFiles([])} className="text-xs text-red-400 hover:text-red-300">Tümünü Temizle</button>
                    </div>
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <FileCheck className="w-4 h-4 text-emerald-400" />
                                    <span className="text-sm text-slate-300 truncate max-w-xs">{file.name}</span>
                                </div>
                                <button onClick={() => removeFile(index)} className="text-slate-500 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center justify-center gap-2 text-red-400 bg-red-500/10 p-4 rounded-xl mb-8">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            {uploadStats && (
                <div className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 p-4 rounded-xl mb-8">
                    <FileCheck className="w-5 h-5" />
                    <span>
                        {uploadStats.success > 0 && `${uploadStats.success} rapor `}
                        {uploadStats.chatLogs > 0 && `${uploadStats.chatLogs} konuşma kaydı `}
                        başarıyla yüklendi!
                    </span>
                </div>
            )}

            <div className="flex justify-center">
                <button
                    onClick={processFiles}
                    disabled={files.length === 0 || loading}
                    className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${files.length === 0 || loading
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 transform hover:-translate-y-1'
                        }`}
                >
                    {loading ? 'İşleniyor...' : 'Verileri Analiz Et ve Yükle'}
                </button>
            </div>
        </div >
    );
};

export default UploadArea;
