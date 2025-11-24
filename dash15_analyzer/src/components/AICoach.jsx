import React from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Clock, MessageSquare, Target, Heart, Zap, AlertTriangle } from 'lucide-react';
import { timeToSeconds } from '../utils/timeUtils';

const AICoach = ({ agent }) => {
    const generateInsights = () => {
        const insights = [];
        const avgScore = parseFloat(agent.AvgScore);
        const chats = parseInt(agent.Chats);

        // Parse time string "HH:MM:SS" to seconds
        // timeToSeconds imported from utils
        const avgTimeSeconds = timeToSeconds(agent.AvgChatTime);

        // 1. High Volume, Low Score (Burnout Risk)
        if (chats > 300 && avgScore < 3.5) {
            insights.push({
                type: 'warning',
                title: 'Tükenmişlik Riski',
                message: 'Çok yüksek sohbet hacmi kaliteyi düşürüyor olabilir. Kısa bir mola veya iş yükü dengelemesi önerilir.',
                icon: TrendingDown,
                color: 'text-red-400',
                bgColor: 'bg-red-400/10',
                borderColor: 'border-red-400/20'
            });
        }

        // 2. Low Volume, High Score (Hidden Gem)
        if (chats < 150 && avgScore > 4.5) {
            insights.push({
                type: 'success',
                title: 'Gizli Cevher',
                message: 'Mükemmel kalite! Daha fazla sorumluluk alabilir ve diğerlerine mentorluk yapabilir.',
                icon: Target,
                color: 'text-emerald-400',
                bgColor: 'bg-emerald-400/10',
                borderColor: 'border-emerald-400/20'
            });
        }

        // 3. High Speed, Low Score (Rushing)
        if (avgTimeSeconds < 180 && avgScore < 3.8) {
            insights.push({
                type: 'warning',
                title: 'Aceleci Yaklaşım',
                message: 'Yanıtlar çok hızlı ama memnuniyet düşük. Kaliteye odaklanmak için biraz yavaşlamalı.',
                icon: Clock,
                color: 'text-orange-400',
                bgColor: 'bg-orange-400/10',
                borderColor: 'border-orange-400/20'
            });
        }

        // 4. Slow Speed, High Score (Perfectionist)
        if (avgTimeSeconds > 600 && avgScore > 4.5) {
            insights.push({
                type: 'info',
                title: 'Mükemmeliyetçi',
                message: 'Kalite harika ama süreler uzun. Hazır şablonlar kullanarak hızlanabilir.',
                icon: TrendingUp,
                color: 'text-blue-400',
                bgColor: 'bg-blue-400/10',
                borderColor: 'border-blue-400/20'
            });
        }

        // 5. Low Volume (Underutilized)
        if (chats < 100) {
            insights.push({
                type: 'info',
                title: 'Düşük Aktivite',
                message: 'Sohbet sayısı ortalamanın altında. Daha aktif saatlerde görevlendirilebilir.',
                icon: MessageSquare,
                color: 'text-purple-400',
                bgColor: 'bg-purple-400/10',
                borderColor: 'border-purple-400/20'
            });
        }

        // 6. High Score & High Volume (Star Performer)
        if (chats > 200 && avgScore > 4.6) {
            insights.push({
                type: 'success',
                title: 'Yıldız Performans',
                message: 'Hem hız hem kalite mükemmel seviyede. Örnek gösterilecek bir performans.',
                icon: Lightbulb,
                color: 'text-yellow-400',
                bgColor: 'bg-yellow-400/10',
                borderColor: 'border-yellow-400/20'
            });
        }

        // 7. Customer Focus (High Score, Low Speed)
        if (avgScore > 4.7 && avgTimeSeconds > 400) {
            insights.push({
                type: 'success',
                title: 'Müşteri Odaklılık',
                message: 'Müşteri memnuniyetini her şeyin önünde tutuyor. Zorlu müşteriler için ideal.',
                icon: Heart,
                color: 'text-rose-400',
                bgColor: 'bg-rose-400/10',
                borderColor: 'border-rose-400/20'
            });
        }

        // 8. Efficiency Master (High Volume, Good Score)
        if (chats > 250 && avgScore > 4.2) {
            insights.push({
                type: 'success',
                title: 'Verimlilik Ustası',
                message: 'Yüksek iş hacmini kaliteden ödün vermeden yönetebiliyor.',
                icon: Zap,
                color: 'text-cyan-400',
                bgColor: 'bg-cyan-400/10',
                borderColor: 'border-cyan-400/20'
            });
        }

        // 9. Training Needed (Low Score, Low Volume)
        if (chats < 100 && avgScore < 3.5) {
            insights.push({
                type: 'warning',
                title: 'Eğitim İhtiyacı',
                message: 'Hem hız hem kalite düşük. Temel süreç eğitimleri tekrarlanmalı.',
                icon: AlertTriangle,
                color: 'text-red-400',
                bgColor: 'bg-red-400/10',
                borderColor: 'border-red-400/20'
            });
        }

        // Default Insight if no specific issues found but performing decently
        if (insights.length === 0 && avgScore >= 4.0) {
            insights.push({
                type: 'success',
                title: 'İstikrarlı Performans',
                message: 'Her şey yolunda görünüyor. Bu tempoyu korumalı!',
                icon: Lightbulb,
                color: 'text-yellow-400',
                bgColor: 'bg-yellow-400/10',
                borderColor: 'border-yellow-400/20'
            });
        }

        // Fallback for low scores with no specific pattern
        if (insights.length === 0 && avgScore < 4.0) {
            insights.push({
                type: 'info',
                title: 'Gelişim Fırsatı',
                message: 'Henüz belirgin bir desen oluşmadı ancak puanlar artırılabilir. Temel eğitimlerin tekrarı faydalı olabilir.',
                icon: Lightbulb,
                color: 'text-slate-400',
                bgColor: 'bg-slate-400/10',
                borderColor: 'border-slate-400/20'
            });
        }

        return insights;
    };

    const insights = generateInsights();

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Yapay Zeka Koçluk Analizi</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, index) => (
                    <div
                        key={index}
                        className={`p-4 rounded-xl border ${insight.bgColor} ${insight.borderColor} backdrop-blur-sm transition-all hover:scale-[1.02]`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-slate-950/30 ${insight.color}`}>
                                {React.createElement(insight.icon, { className: "w-5 h-5" })}
                            </div>
                            <div>
                                <h4 className={`font-bold text-sm mb-1 ${insight.color}`}>{insight.title}</h4>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {insight.message}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AICoach;
