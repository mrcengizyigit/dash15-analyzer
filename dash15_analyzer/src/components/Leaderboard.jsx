import React from 'react';
import { Trophy, Medal, Star, TrendingUp } from 'lucide-react';

const Leaderboard = ({ data }) => {
    // Calculate scores and sort agents
    const sortedAgents = React.useMemo(() => {
        if (!data || data.length === 0) return [];

        // Group by Agent to get averages if multiple entries exist (though usually one per agent in dashboard view)
        // For simplicity, assuming 'data' passed here is the aggregated list from Dashboard or similar source
        // If data is raw reports, we might need aggregation. 
        // Let's assume 'data' is the list of unique agents with their stats.

        return [...data]
            .map(agent => {
                // Weighted Score Calculation
                // 70% AvgScore, 30% Volume (normalized)
                // We need a max volume to normalize
                return {
                    ...agent,
                    // Just use a simple composite score for now or rely on AvgScore primarily
                    // Let's use a mix: Score (0-5) * 20 = 100 base + (Chats / MaxChats * 20)
                    // For now, let's stick to a simple "Performance Score"
                    performanceScore: (agent.AvgScore * 20) + (agent.Chats * 0.1) // Simple weight
                };
            })
            .sort((a, b) => b.performanceScore - a.performanceScore)
            .slice(0, 3);
    }, [data]);

    if (sortedAgents.length === 0) return null;

    const getRankStyle = (index) => {
        switch (index) {
            case 0: return "from-yellow-400 to-amber-600 shadow-yellow-900/50"; // Gold
            case 1: return "from-slate-300 to-slate-500 shadow-slate-900/50";   // Silver
            case 2: return "from-orange-400 to-amber-700 shadow-orange-900/50"; // Bronze
            default: return "from-blue-500 to-indigo-600";
        }
    };

    const getRankIcon = (index) => {
        switch (index) {
            case 0: return <Trophy className="w-6 h-6 text-white" />;
            case 1: return <Medal className="w-6 h-6 text-white" />;
            case 2: return <Medal className="w-6 h-6 text-white" />;
            default: return <Star className="w-6 h-6 text-white" />;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {sortedAgents.map((agent, index) => (
                <div
                    key={agent.Agent}
                    className={`relative overflow-hidden rounded-2xl bg-slate-900/50 border border-slate-800 p-6 flex flex-col items-center text-center transform hover:scale-105 transition-all duration-300 ${index === 0 ? 'md:-mt-4 md:mb-4 z-10 border-yellow-500/30 shadow-xl' : ''}`}
                >
                    {/* Rank Badge */}
                    <div className={`absolute top-0 right-0 p-3 bg-gradient-to-bl ${getRankStyle(index)} rounded-bl-2xl`}>
                        <span className="text-white font-bold text-lg">#{index + 1}</span>
                    </div>

                    {/* Avatar / Icon */}
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getRankStyle(index)} flex items-center justify-center mb-4 shadow-lg`}>
                        {getRankIcon(index)}
                    </div>

                    {/* Agent Info */}
                    <h3 className="text-xl font-bold text-white mb-1">{agent.Agent}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                            {agent.Chats} Sohbet
                        </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full bg-slate-950/50 rounded-xl p-3">
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Ort. Puan</p>
                            <div className="flex items-center justify-center gap-1 text-yellow-400 font-bold">
                                <Star className="w-3 h-3 fill-yellow-400" />
                                {agent.AvgScore.toFixed(2)}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Verimlilik</p>
                            <div className="flex items-center justify-center gap-1 text-blue-400 font-bold">
                                <TrendingUp className="w-3 h-3" />
                                {agent.performanceScore.toFixed(0)}
                            </div>
                        </div>
                    </div>

                    {/* Decorative Glow */}
                    <div className={`absolute inset-0 bg-gradient-to-b ${getRankStyle(index)} opacity-5 pointer-events-none`}></div>
                </div>
            ))}
        </div>
    );
};

export default Leaderboard;
