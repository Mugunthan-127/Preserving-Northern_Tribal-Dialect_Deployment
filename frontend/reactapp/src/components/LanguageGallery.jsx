import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { Search, Play, Volume2, Globe, ArrowRight, Sparkles, BookOpen, Trash2 } from 'lucide-react';

export const LanguageGallery = () => {
    const [query, setQuery] = useState('');
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    useEffect(() => {
        handleSearch();
    }, []);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const url = query
                ? `${config.API_BASE_URL}/api/v1/search?query=${query}`
                : `${config.API_BASE_URL}/api/v1/search?query=`;

            const res = await axios.get(url);
            const verified = res.data.filter(a => a.status === 'verified');
            setAssets(verified);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    };

    const handleDelete = async (assetId) => {
        const pin = prompt("Enter Admin PIN to confirm deletion:");
        if (!pin) return;

        try {
            await axios.delete(`${config.API_BASE_URL}/api/v1/translate/${assetId}`, {
                headers: { 'X-Admin-Pin': pin }
            });
            alert("Asset deleted.");
            setAssets(prev => prev.filter(a => a.assetId !== assetId));
        } catch (err) {
            console.error("Delete failed", err);
            if (err.response && err.response.status === 403) {
                alert("Access Denied: Invalid Admin PIN");
            } else {
                alert("Failed to delete asset.");
            }
        }
    };

    const playTTS = async (text, id) => {
        try {
            // Updated to allow language passing if we had verified 'en' endpoint or target language
            await axios.get(`${config.API_BASE_URL}/api/v1/tts?text=${encodeURIComponent(text)}&lang=en`);
            alert("Playing Audio Preview...");
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            {/* Search Bar - Floating */}
            <div className="max-w-3xl mx-auto mb-20 relative z-20">
                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-500 animate-pulse-slow"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-full shadow-2xl flex items-center p-3 border border-white/20">
                        <Search className="text-gray-400 ml-4" size={24} />
                        <input
                            type="text"
                            className="flex-1 pl-4 pr-4 py-3 bg-transparent outline-none text-lg text-gray-700 dark:text-gray-200 placeholder-gray-400"
                            placeholder="Discover languages (e.g. Bodo, Mizo)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-3 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                        >
                            <Sparkles size={18} /> Search
                        </button>
                    </div>
                </form>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-80 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse"></div>
                    ))}
                </div>
            ) : assets.length === 0 ? (
                <div className="text-center py-24 glass-card border-dashed bg-white/50 dark:bg-gray-800/50">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Globe size={48} className="text-gray-300 dark:text-gray-500" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-700 dark:text-gray-300 mb-2">No verified assets found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">The library is empty for this search. Be the first to contribute to this language!</p>
                    <a href="/contribute" className="btn-primary inline-flex items-center gap-2">
                        Contribute Now <ArrowRight size={20} />
                    </a>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                    {assets.map((asset) => (
                        <div key={asset.assetId} className="group relative bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden hover:-translate-y-2 transition-all duration-500 shadow-xl hover:shadow-2xl dark:shadow-black/40 border border-gray-100 dark:border-gray-700">

                            {/* Card Header Illustration */}
                            <div className="h-32 bg-gradient-to-br from-orange-100 to-pink-100 dark:from-gray-700 dark:to-gray-800 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-700">
                                    <Globe size={120} className="text-orange-500 dark:text-gray-400" />
                                </div>
                                <div className="absolute bottom-4 left-6">
                                    <span className="inline-block bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 text-xs font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-sm mb-1">
                                        {asset.languageName}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 pt-4">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-orange-500 transition-colors">{asset.dialect || "Standard"}</h3>
                                        <p className="text-xs text-gray-400 font-medium">Verified Entry</p>
                                    </div>
                                    {asset.audioUrl && (
                                        <button className="w-12 h-12 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center hover:bg-orange-600 hover:scale-110 transition-all">
                                            <Play size={20} fill="currentColor" className="ml-1" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            <BookOpen size={12} /> Native Script / Transcript
                                        </div>
                                        <p className="text-gray-800 dark:text-gray-200 font-medium leading-relaxed font-serif italic text-lg">"{asset.transcript}"</p>
                                    </div>

                                    {asset.englishTranslation && (
                                        <div className="pl-2 border-l-2 border-orange-200 dark:border-gray-600">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Translation</h4>
                                                <button onClick={() => playTTS(asset.englishTranslation, asset.assetId)} className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 transition-colors flex items-center gap-1 text-xs font-bold">
                                                    <Volume2 size={14} /> Listen
                                                </button>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400">{asset.englishTranslation}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs text-gray-400 font-medium">
                                <div className="flex items-center gap-4">
                                    <span>ID: {asset.assetId.substring(0, 6)}</span>
                                    <span>{new Date(asset.createdAt || Date.now()).toLocaleDateString()}</span>
                                </div>
                                <button
                                    onClick={() => handleDelete(asset.assetId)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                    title="Delete Asset (Admin)"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
