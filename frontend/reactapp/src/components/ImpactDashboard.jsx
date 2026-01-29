import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Mic } from 'lucide-react';
import axios from 'axios';
import config from '../config';

const COLORS = ['#FF8042', '#0088FE', '#00C49F', '#FFBB28', '#8884d8'];

export const ImpactDashboard = () => {
    const [stats, setStats] = useState({
        totalHours: 0,
        totalAssets: 0,
        languageCount: 0,
        distribution: []
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${config.API_BASE_URL}/api/v1/stats`);
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch stats", err);
            }
        };
        fetchStats();
        // Poll every 30s for "Live" feel
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="py-20 relative overflow-hidden">
            {/* Background Blob */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                        Real-Time <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Impact</span>
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        See how the community is preserving heritage, one second at a time.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-8 items-center">
                    {/* Stat Cards */}
                    <div className="grid gap-6">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="bg-white/50 dark:bg-gray-800/50 p-8 rounded-3xl border border-white/20 shadow-xl flex items-center justify-between"
                        >
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-sm mb-1">Total Hours Preserved</p>
                                <h3 className="text-5xl font-black text-gray-900 dark:text-white">{stats.totalHours} <span className="text-lg text-green-500 font-bold">hrs</span></h3>
                            </div>
                            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <TrendingUp size={32} />
                            </div>
                        </motion.div>

                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="bg-white/50 dark:bg-gray-800/50 p-8 rounded-3xl border border-white/20 shadow-xl flex items-center justify-between"
                        >
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-sm mb-1">Total Contributions</p>
                                <h3 className="text-5xl font-black text-gray-900 dark:text-white">{stats.totalAssets} <span className="text-lg text-blue-500 font-bold">Clips</span></h3>
                            </div>
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Users size={32} />
                            </div>
                        </motion.div>

                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="bg-white/50 dark:bg-gray-800/50 p-8 rounded-3xl border border-white/20 shadow-xl flex items-center justify-between"
                        >
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-sm mb-1">Languages Covered</p>
                                <h3 className="text-5xl font-black text-gray-900 dark:text-white">{stats.languageCount} <span className="text-lg text-orange-500 font-bold">Dialects</span></h3>
                            </div>
                            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <Mic size={32} />
                            </div>
                        </motion.div>
                    </div>

                    {/* Charts */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700">
                        <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-6">Language Distribution</h4>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.distribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF' }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                        {stats.distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
