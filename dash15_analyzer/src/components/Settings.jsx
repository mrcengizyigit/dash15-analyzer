import React from 'react';
import { Download, Trash2, Settings as SettingsIcon, Shield, Bell, Award, Check, X } from 'lucide-react';
import { BADGES } from '../utils/BadgeManager';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../contexts/PreferencesContext';

const Settings = ({ data }) => {
    const [confirmDelete, setConfirmDelete] = React.useState(false);
    const [selectedAgentForBadge, setSelectedAgentForBadge] = React.useState('');
    const [selectedBadgeType, setSelectedBadgeType] = React.useState('');
    const [uniqueAgents, setUniqueAgents] = React.useState([]);
    const {
        highContrast, toggleHighContrast,
        notificationsEnabled, toggleNotifications,
        hiddenAgents, addHiddenAgent, removeHiddenAgent,
        thresholds, updateThresholds,
        badgeRules, updateBadgeRules
    } = usePreferences();

    React.useEffect(() => {
        const fetchAgents = async () => {
            let agents = [];
            if (data && data.length > 0) {
                agents = [...new Set(data.map(d => d.Agent))];
            }

            if (agents.length === 0) {
                const { data: reportData } = await supabase
                    .from('reports')
                    .select('agent_name')
                    .order('created_at', { ascending: false })
                    .limit(1000);

                if (reportData) {
                    agents = [...new Set(reportData.map(r => r.agent_name))];
                }
            }
            setUniqueAgents(agents.sort());
        };
        fetchAgents();
    }, [data]);

    const handleAwardBadge = async () => {
        if (!selectedAgentForBadge || !selectedBadgeType) {
            alert('Lütfen bir temsilci ve bir rozet seçin.');
            return;
        }

        const badge = BADGES[selectedBadgeType];
        if (!badge) return;

        try {
            const { error } = await supabase
                .from('agent_badges')
                .insert({
                    agent_name: selectedAgentForBadge,
                    badge_id: badge.id,
                    awarded_at: new Date().toISOString()
                });

            if (error) throw error;

            alert(`${selectedAgentForBadge} isimli temsilciye "${badge.name}" rozeti verildi!`);
            setSelectedAgentForBadge('');
            setSelectedBadgeType('');
        } catch (err) {
            console.error('Rozet verme hatası:', err);
            alert('Rozet verilirken bir hata oluştu: ' + err.message);
        }
    };

    const handleExport = () => {
        if (!data || data.length === 0) {
            alert('Dışa aktarılacak veri yok.');
            return;
        }
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'dash15_merged_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-white">Sistem Ayarları</h2>

            {/* Data Management */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Download className="w-5 h-5 text-blue-400" />
                        Veri Yönetimi
                    </h3>
                </div>
                <div className="p-6 space-y-6">


                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-200 font-medium">Birleştirilmiş Raporu Dışa Aktar</p>
                            <p className="text-sm text-slate-500">Birleştirilmiş performans ve puanlama verilerini CSV dosyası olarak indirin.</p>
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={!data || data.length === 0}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            CSV Dışa Aktar
                        </button>
                    </div>
                    <div className="h-px bg-slate-800" />
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-200 font-medium text-red-400">Uygulama Verilerini Temizle</p>
                            <p className="text-sm text-slate-500">Paneli sıfırlayın ve yüklenen tüm dosyaları hafızadan silin.</p>
                        </div>
                        <button
                            onClick={async () => {
                                if (!confirmDelete) {
                                    setConfirmDelete(true);
                                    setTimeout(() => setConfirmDelete(false), 3000); // 3 saniye sonra iptal et
                                    return;
                                }

                                try {
                                    // count: 'exact' ile silinen satır sayısını alalım
                                    const { error, count } = await supabase
                                        .from('reports')
                                        .delete({ count: 'exact' })
                                        .not('created_at', 'is', null); // Tüm kayıtları seçmek için güvenli filtre

                                    if (error) throw error;

                                    if (count === 0) {
                                        alert('Hiçbir kayıt silinemedi! Muhtemelen Supabase RLS (Güvenlik) ayarları silme işlemine izin vermiyor. Lütfen SQL Editor\'den DELETE izni verin.');
                                    } else {
                                        alert(`${count} adet veri başarıyla silindi.`);
                                        window.location.reload();
                                    }
                                } catch (err) {
                                    console.error('Silme hatası:', err);
                                    alert('Hata: ' + err.message);
                                }
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border ${confirmDelete
                                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                }`}
                        >
                            <Trash2 className="w-4 h-4" />
                            {confirmDelete ? 'Emin misiniz? (Tekrar Tıkla)' : 'Veritabanını Temizle'}
                        </button>
                    </div>
                </div>
            </div>

            {/* App Preferences */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-purple-400" />
                        Tercihler
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    {/* Notifications */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-200 font-medium">Bildirimler</p>
                            <p className="text-sm text-slate-500">Sistem uyarılarını ve performans kilometre taşlarını etkinleştirin.</p>
                        </div>
                        <div
                            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${notificationsEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                            onClick={toggleNotifications}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${notificationsEnabled ? 'right-1' : 'left-1'}`} />
                        </div>
                    </div>
                    <div className="h-px bg-slate-800" />

                    {/* High Contrast */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-200 font-medium">Yüksek Karşıtlık Modu</p>
                            <p className="text-sm text-slate-500">Erişilebilirlik için görünürlüğü artırın.</p>
                        </div>
                        <div
                            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${highContrast ? 'bg-blue-600' : 'bg-slate-700'}`}
                            onClick={toggleHighContrast}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${highContrast ? 'right-1' : 'left-1'}`} />
                        </div>
                    </div>
                    <div className="h-px bg-slate-800" />

                    {/* Hidden Agents Management */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-slate-200 font-medium">Gizlenen Temsilciler</p>
                                <p className="text-sm text-slate-500">Listelerde görünmesini istemediğiniz kişileri yönetin (Örn: Yöneticiler).</p>
                            </div>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                id="new-hidden-agent"
                                placeholder="İsim girin (Örn: Ahmet)"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 flex-1"
                            />
                            <button
                                onClick={() => {
                                    const input = document.getElementById('new-hidden-agent');
                                    if (input.value.trim()) {
                                        addHiddenAgent(input.value.trim());
                                        input.value = '';
                                    }
                                }}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Ekle
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {hiddenAgents.map(agent => (
                                <div key={agent} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1 rounded-full text-sm text-slate-300">
                                    <span>{agent}</span>
                                    <button onClick={() => removeHiddenAgent(agent)} className="text-slate-500 hover:text-red-400">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="h-px bg-slate-800" />

                    {/* Performance Thresholds */}
                    <div>
                        <p className="text-slate-200 font-medium mb-4">Performans Hedefleri (Puan)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">İyi Performans (Mavi)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={thresholds.good}
                                    onChange={(e) => updateThresholds({ good: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Mükemmel Performans (Yeşil)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={thresholds.excellent}
                                    onChange={(e) => updateThresholds({ excellent: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="h-px bg-slate-800" />

                    {/* Badge Rules */}
                    <div>
                        <p className="text-slate-200 font-medium mb-4">Otomatik Rozet Kuralları</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Hızlı Çözümcü Süresi (Saniye)</label>
                                <input
                                    type="number"
                                    value={badgeRules.fastSolver}
                                    onChange={(e) => updateBadgeRules({ fastSolver: parseInt(e.target.value) })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Bu sürenin altındaki ortalamalar rozet kazanır.</p>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Yıldız Rozeti İçin 5★ Sayısı</label>
                                <input
                                    type="number"
                                    value={badgeRules.star}
                                    onChange={(e) => updateBadgeRules({ star: parseInt(e.target.value) })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badge Management */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-400" />
                        Rozet Yönetimi
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-slate-200 font-medium mb-4">Manuel Rozet Ver</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Temsilci Seç</label>
                                <select
                                    value={selectedAgentForBadge}
                                    onChange={(e) => setSelectedAgentForBadge(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Seçiniz...</option>
                                    {uniqueAgents.map(agent => (
                                        <option key={agent} value={agent}>{agent}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Rozet Seç</label>
                                <select
                                    value={selectedBadgeType}
                                    onChange={(e) => setSelectedBadgeType(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Seçiniz...</option>
                                    {Object.entries(BADGES).filter(([_, b]) => b.type === 'manual').map(([key, badge]) => (
                                        <option key={key} value={key}>{badge.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedBadgeType && (
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4 flex items-center gap-4">
                                <div className={`p-3 rounded-full ${BADGES[selectedBadgeType].bgColor} ${BADGES[selectedBadgeType].color}`}>
                                    {React.createElement(BADGES[selectedBadgeType].icon, { className: "w-6 h-6" })}
                                </div>
                                <div>
                                    <h4 className={`font-bold ${BADGES[selectedBadgeType].color}`}>{BADGES[selectedBadgeType].name}</h4>
                                    <p className="text-sm text-slate-400">{BADGES[selectedBadgeType].description}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={handleAwardBadge}
                                disabled={!selectedAgentForBadge || !selectedBadgeType}
                                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Award className="w-4 h-4" />
                                Rozeti Ver
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin Tools: Bulk Messaging */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-emerald-400" />
                        Toplu Duyuru Gönder
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-slate-200 font-medium mb-2">Tüm Temsilcilere Mesaj</p>
                        <p className="text-sm text-slate-500 mb-4">Bu mesaj sistemdeki tüm kayıtlı temsilcilere "Yönetici Notu" olarak iletilecektir.</p>

                        <textarea
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-4 text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all h-32 resize-none"
                            placeholder="Duyuru metnini buraya yazın..."
                            id="bulk-message-input"
                        ></textarea>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={async () => {
                                const input = document.getElementById('bulk-message-input');
                                const message = input.value.trim();
                                if (!message) return alert('Lütfen bir mesaj girin.');

                                if (!confirm('Bu mesajı tüm temsilcilere göndermek istediğinize emin misiniz?')) return;

                                try {
                                    // 1. Get all unique agents
                                    let uniqueAgents = [];

                                    // Try to get from local data first
                                    if (data && data.length > 0) {
                                        uniqueAgents = [...new Set(data.map(d => d.Agent))];
                                    }

                                    // If no local data, fetch from Supabase reports table (fallback)
                                    if (uniqueAgents.length === 0) {
                                        // Fetch distinct agents from recent reports (heuristic: last 1000 rows)
                                        const { data: reportData, error: fetchError } = await supabase
                                            .from('reports')
                                            .select('agent_name')
                                            .order('created_at', { ascending: false })
                                            .limit(1000);

                                        if (fetchError) throw fetchError;

                                        if (reportData) {
                                            uniqueAgents = [...new Set(reportData.map(r => r.agent_name))];
                                        }
                                    }

                                    if (uniqueAgents.length === 0) throw new Error('Hiçbir temsilci bulunamadı. Lütfen önce bir rapor yükleyin.');

                                    // 2. Prepare inserts
                                    const inserts = uniqueAgents.map(agent => ({
                                        agent_name: agent,
                                        note: message,
                                        created_at: new Date().toISOString(),
                                        date: new Date().toISOString()
                                    }));

                                    // 3. Insert into agent_notes
                                    const { error } = await supabase
                                        .from('agent_notes')
                                        .insert(inserts);

                                    if (error) throw error;

                                    alert(`${uniqueAgents.length} temsilciye mesaj başarıyla gönderildi.`);
                                    input.value = '';
                                } catch (err) {
                                    console.error('Bulk send error:', err);
                                    alert('Gönderim hatası: ' + err.message);
                                }
                            }}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Bell className="w-4 h-4" />
                            Gönder
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Settings;
