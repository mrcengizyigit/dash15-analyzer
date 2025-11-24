/**
 * Analyzes agent performance against global averages and generates insights.
 * @param {Object} agent - The specific agent's data object.
 * @param {Array} allData - Array of all agents' data objects for comparison.
 * @returns {Object} - Contains { strengths: [], weaknesses: [], focus: '' }
 */
import { timeToSeconds } from './timeUtils';

export const analyzePerformance = (agent, allData) => {
    if (!agent || !allData || allData.length === 0) {
        return {
            strengths: ['Henüz yeterli verimiz yok, ama harika işler çıkaracağına eminim! 🚀'],
            weaknesses: [],
            focus: 'Veri toplandıkça burası şekillenecek.'
        };
    }

    // 1. Calculate Global Averages
    const totalChats = allData.reduce((sum, item) => sum + item.Chats, 0);
    const avgChats = totalChats / allData.length;

    const totalScore = allData.reduce((sum, item) => sum + item.AvgScore, 0);
    const avgScore = totalScore / allData.length;

    // Helper to convert "HH:MM:SS" or "MM:SS" to seconds
    // timeToSeconds imported from utils

    const totalDuration = allData.reduce((sum, item) => sum + timeToSeconds(item.AvgChatTime), 0);
    const avgDurationSeconds = totalDuration / allData.length;
    const agentDurationSeconds = timeToSeconds(agent.AvgChatTime);

    // 2. Analyze Metrics
    const strengths = [];
    const weaknesses = [];
    let focus = '';

    // Volume Analysis
    if (agent.Chats > avgChats * 1.2) {
        strengths.push('Harika bir enerji! ⚡ Sohbet hacmin ortalamanın çok üzerinde, takımı sırtlıyorsun.');
    } else if (agent.Chats < avgChats * 0.8) {
        weaknesses.push('Biraz daha aktif olabiliriz, sohbet sayın ortalamanın biraz altında kalmış.');
    }

    // Satisfaction Analysis
    if (agent.AvgScore >= 4.8) {
        strengths.push('Müşteriler sana bayılıyor! 🌟 4.8 üzeri puanınla gerçek bir yıldızsın.');
    } else if (agent.AvgScore > avgScore) {
        strengths.push('Müşteri memnuniyetin gayet iyi, güven veriyorsun. 👍');
    } else if (agent.AvgScore < 3.5) {
        weaknesses.push('Müşteri puanlarında düşüş var, iletişim dilini biraz daha ısıtabiliriz. 🤝');
    } else if (agent.AvgScore < avgScore) {
        weaknesses.push('Puanların ortalamanın biraz altında, küçük dokunuşlarla yükseltebiliriz.');
    }

    // Duration Analysis
    if (agentDurationSeconds < avgDurationSeconds * 0.8 && agent.AvgScore > 4.0) {
        strengths.push('Hem hızlı hem kalitelisin! 🚀 Sorunları şimşek hızıyla çözüyorsun.');
    } else if (agentDurationSeconds > avgDurationSeconds * 1.3) {
        weaknesses.push('Sohbet sürelerin biraz uzuyor, belki hazır yanıtları daha sık kullanabilirsin. ⏱️');
    }

    // 3. Determine Focus Area
    if (agent.AvgScore < 4.0) {
        focus = 'Önceliğimiz müşterilerin kalbini kazanmak! ❤️ Biraz daha empati ve sabırla puanlarını yukarı taşıyabilirsin. Sana güveniyoruz!';
    } else if (agentDurationSeconds > avgDurationSeconds * 1.2) {
        focus = 'Hızına hız katalım! 🏎️ Sohbetleri biraz daha seri sonuçlandırmaya odaklanırsan kimse seni tutamaz.';
    } else if (agent.Chats < avgChats * 0.7) {
        focus = 'Sahne senin! 🎤 Biraz daha fazla çağrı alarak enerjini takıma yansıtabilirsin.';
    } else {
        focus = 'Böyle devam! 🌟 İstikrarın ve performansınla takıma harika bir örnek oluyorsun. Belki zorlu vakalarda arkadaşlarına destek olabilirsin?';
    }

    // Fallbacks
    if (strengths.length === 0) strengths.push('Dengeli ve istikrarlı bir performans sergiliyorsun. 👌');
    if (weaknesses.length === 0) weaknesses.push('Gözüme çarpan belirgin bir eksik yok, harikasın! ✨');

    return { strengths, weaknesses, focus };
};
