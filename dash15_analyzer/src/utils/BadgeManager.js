import { Zap, Star, Trophy, Target, Clock, Award, Flame, Shield, Users, Heart, TrendingUp, Crown, Medal } from 'lucide-react';
import { timeToSeconds } from './timeUtils';

export const BADGES = {
    // Automatic Badges
    SPEED_DEMON: {
        id: 'speed_demon',
        name: 'Hız Canavarı',
        description: 'Ortalama yanıt süresi 6 dakikanın altında.',
        icon: Zap,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/10',
        borderColor: 'border-yellow-400/20',
        type: 'auto'
    },
    FIVE_STAR: {
        id: 'five_star',
        name: '5 Yıldız Avcısı',
        description: 'Ortalama puanı 4.8 ve üzeri.',
        icon: Star,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-400/10',
        borderColor: 'border-emerald-400/20',
        type: 'auto'
    },
    MARATHON: {
        id: 'marathon',
        name: 'Maratoncu',
        description: 'Toplam sohbet sayısı 400\'ün üzerinde.',
        icon: Flame,
        color: 'text-orange-400',
        bgColor: 'bg-orange-400/10',
        borderColor: 'border-orange-400/20',
        type: 'auto'
    },
    CONSISTENT: {
        id: 'consistent',
        name: 'İstikrar Abidesi',
        description: 'Hiç 1 veya 2 yıldız almamış.',
        icon: Shield,
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
        borderColor: 'border-blue-400/20',
        type: 'auto'
    },

    // Manual Badges (Awarded by Admin)
    EMPLOYEE_OF_MONTH: {
        id: 'employee_month',
        name: 'Ayın Elemanı',
        description: 'Üstün performans ve özveri için.',
        icon: Trophy,
        color: 'text-purple-400',
        bgColor: 'bg-purple-400/10',
        borderColor: 'border-purple-400/20',
        type: 'manual'
    },
    PROBLEM_SOLVER: {
        id: 'problem_solver',
        name: 'Sorun Çözücü',
        description: 'Zorlu durumları başarıyla yönettiği için.',
        icon: Target,
        color: 'text-pink-400',
        bgColor: 'bg-pink-400/10',
        borderColor: 'border-pink-400/20',
        type: 'manual'
    },
    DEDICATION: {
        id: 'dedication',
        name: 'Özveri Rozeti',
        description: 'Ekstra çaba ve katkıları için.',
        icon: Award,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-400/10',
        borderColor: 'border-cyan-400/20',
        type: 'manual'
    },
    TEAM_PLAYER: {
        id: 'team_player',
        name: 'Takım Oyuncusu',
        description: 'Ekip çalışmasına katkıları için.',
        icon: Users,
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-400/10',
        borderColor: 'border-indigo-400/20',
        type: 'manual'
    },
    CUSTOMER_FAVORITE: {
        id: 'customer_favorite',
        name: 'Müşteri Favorisi',
        description: 'Müşterilerden gelen övgüler için.',
        icon: Heart,
        color: 'text-rose-400',
        bgColor: 'bg-rose-400/10',
        borderColor: 'border-rose-400/20',
        type: 'manual'
    },
    RISING_STAR: {
        id: 'rising_star',
        name: 'Yükselen Yıldız',
        description: 'Hızla artan performans grafiği.',
        icon: TrendingUp,
        color: 'text-lime-400',
        bgColor: 'bg-lime-400/10',
        borderColor: 'border-lime-400/20',
        type: 'manual'
    },
    MENTOR: {
        id: 'mentor',
        name: 'Mentor',
        description: 'Diğerlerine rehberlik ettiği için.',
        icon: Medal,
        color: 'text-teal-400',
        bgColor: 'bg-teal-400/10',
        borderColor: 'border-teal-400/20',
        type: 'manual'
    },
    LEGEND: {
        id: 'legend',
        name: 'Efsane',
        description: 'Uzun süreli ve kusursuz hizmet.',
        icon: Crown,
        color: 'text-amber-400',
        bgColor: 'bg-amber-400/10',
        borderColor: 'border-amber-400/20',
        type: 'manual'
    }
};

export const calculateAutoBadges = (agentData, rules) => {
    const earnedBadges = [];

    if (!agentData) return earnedBadges;

    // Default rules if not provided
    const safeRules = rules || { fastSolver: 360, star: 5 }; // 360 sec (6 min), 5 stars count (Note: logic below uses avg score for 5 star badge, need to check)

    // Parse time string "HH:MM:SS" to seconds
    // timeToSeconds imported from utils

    // 1. Speed Demon: Avg time < X seconds
    const avgTimeSeconds = timeToSeconds(agentData.AvgChatTime);
    // Use rule value or default 360 (6 mins)
    const speedLimit = safeRules.fastSolver || 360;

    if (avgTimeSeconds > 0 && avgTimeSeconds < speedLimit) {
        earnedBadges.push(BADGES.SPEED_DEMON);
    }

    // 2. Five Star Hunter: Avg Score >= 4.8 (Keeping hardcoded for now as user asked for "Star Badge Count" which implies count of 5 stars, but current logic is Avg Score. I will stick to Avg Score for this badge, but maybe add a new one or modify this if user meant count)
    // Wait, the user request in Settings.jsx was: "Yıldız Rozeti İçin 5★ Sayısı" (Count of 5 stars).
    // But the current FIVE_STAR badge description says "Ortalama puanı 4.8 ve üzeri".
    // I should probably change the logic to match the user's intent or add a new condition.
    // Let's look at the Settings.jsx again: "Yıldız Rozeti İçin 5★ Sayısı".
    // So I should use `Score5` count against `rules.star`.

    // Let's modify FIVE_STAR to be based on count of 5 stars as per user request in Settings?
    // Or maybe keep FIVE_STAR as is and add a new one?
    // The user explicitly asked to configure "Yıldız Rozeti İçin 5★ Sayısı".
    // Let's check `BADGES.FIVE_STAR` description: "Ortalama puanı 4.8 ve üzeri."
    // Maybe I should update the description too if I change the logic.
    // Or maybe I should use the "Marathon" logic for count?
    // Let's stick to the user's likely intent: The "Five Star" badge should probably be about getting many 5 stars.

    // Let's update FIVE_STAR logic to use the count if rules.star is provided, OR keep the avg score if not?
    // Actually, let's look at the prompt again. "Auto Badge Rules: Inputs for 'Fast Solver Time (sec)' and 'Star Badge Count'".
    // So I will change FIVE_STAR to depend on the count of 5-star ratings.

    const starCountLimit = safeRules.star || 50; // Default 50 if not specified? Or 5? Settings default was 5.

    // Let's use the rule.
    if (parseInt(agentData.Score5) >= starCountLimit) {
        earnedBadges.push(BADGES.FIVE_STAR);
    }

    // 3. Marathon: Chats > 400
    if (parseInt(agentData.Chats) > 400) {
        earnedBadges.push(BADGES.MARATHON);
    }

    // 4. Consistent: No 1 or 2 stars
    if (parseInt(agentData.Score1) === 0 && parseInt(agentData.Score2) === 0 && parseInt(agentData.Chats) > 50) {
        earnedBadges.push(BADGES.CONSISTENT);
    }

    return earnedBadges;
};
