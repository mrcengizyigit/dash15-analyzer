import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Star, TrendingUp } from 'lucide-react';

const TopPerformers = ({ data }) => {
    // En az 5 sohbeti olanları filtrele ve puana göre sırala
    const topAgents = React.useMemo(() => {
        if (!data || data.length === 0) return [];

        return [...data]
            .filter(agent => agent.Chats >= 5) // Outlier'ları elemek için min sohbet
            .sort((a, b) => {
                // Önce puana bak
                if (b.AvgScore !== a.AvgScore) {
                    return b.AvgScore - a.AvgScore;
                }
                // Puanlar eşitse sohbet sayısına bak
                return b.Chats - a.Chats;
            })
            .slice(0, 3);
    }, [data]);

    if (topAgents.length < 3) return null;

    const [first, second, third] = topAgents;

    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 100 }
        }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end max-w-5xl mx-auto"
        >
            {/* 2nd Place */}
            <motion.div variants={item} className="order-2 md:order-1">
                <PodiumCard
                    agent={second}
                    rank={2}
                    color="text-slate-300"
                    bgColor="bg-slate-400/10"
                    borderColor="border-slate-400/30"
                    icon={Medal}
                />
            </motion.div>

            {/* 1st Place */}
            <motion.div variants={item} className="order-1 md:order-2 -mt-8 z-10">
                <PodiumCard
                    agent={first}
                    rank={1}
                    color="text-yellow-400"
                    bgColor="bg-yellow-500/10"
                    borderColor="border-yellow-500/50"
                    glow="shadow-yellow-500/20"
                    icon={Crown}
                    isFirst={true}
                />
            </motion.div>

            {/* 3rd Place */}
            <motion.div variants={item} className="order-3">
                <PodiumCard
                    agent={third}
                    rank={3}
                    color="text-orange-400"
                    bgColor="bg-orange-500/10"
                    borderColor="border-orange-500/30"
                    icon={Medal}
                />
            </motion.div>
        </motion.div>
    );
};

const PodiumCard = ({ agent, rank, color, bgColor, borderColor, glow = '', icon: Icon, isFirst = false }) => {
    return (
        <div className={`relative ${isFirst ? 'h-64' : 'h-56'} flex flex-col items-center justify-end`}>
            {/* Rank Badge */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full ${bgColor} border-2 ${borderColor} flex items-center justify-center z-20 shadow-xl backdrop-blur-md`}>
                <span className={`text-xl font-bold ${color}`}>#{rank}</span>
            </div>

            {/* Card Content */}
            <div className={`w-full h-full ${bgColor} backdrop-blur-xl border ${borderColor} rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-xl ${glow} transition-transform hover:scale-105 duration-300`}>

                {/* Background Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-b ${isFirst ? 'from-yellow-500/10' : 'from-white/5'} to-transparent opacity-50`} />

                {/* Avatar / Icon */}
                <div className={`w-20 h-20 rounded-full ${bgColor} border-2 ${borderColor} flex items-center justify-center mb-4 relative group`}>
                    <div className={`text-2xl font-bold ${color}`}>
                        {agent.Agent.substring(0, 2).toUpperCase()}
                    </div>
                    {isFirst && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                            <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400/20" />
                        </div>
                    )}
                </div>

                {/* Agent Name */}
                <h3 className="text-white font-bold text-lg text-center mb-1 truncate w-full px-2">
                    {agent.Agent}
                </h3>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 text-emerald-400 font-bold">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{Number(agent.AvgScore).toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Puan</span>
                    </div>
                    <div className="w-px h-8 bg-slate-700/50" />
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 text-blue-400 font-bold">
                            <TrendingUp className="w-4 h-4" />
                            <span>{agent.Chats}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Sohbet</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopPerformers;
