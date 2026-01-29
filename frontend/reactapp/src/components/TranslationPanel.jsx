import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config';
import { Type, Check, RefreshCw, Wand2, MessageSquare, Trash2, ArrowRightLeft, Sparkles } from 'lucide-react';

export const TranslationPanel = () => {
    const [assets, setAssets] = useState([]);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [translation, setTranslation] = useState('');
    const [loading, setLoading] = useState(true);

    const [targetLang, setTargetLang] = useState('English');
    const [isPlaying, setIsPlaying] = useState(false);

    const INDIAN_LANGUAGES = [
        "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Gujarati", "Marathi", "Punjabi", "Odia", "Assamese", "Bodo", "Dogri", "Kashmiri", "Konkani", "Maithili", "Manipuri", "Nepali", "Sanskrit", "Santali", "Sindhi", "Urdu"
    ];

    useEffect(() => {
        fetchPendingAssets();
    }, []);

    const fetchPendingAssets = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${config.API_BASE_URL}/api/v1/translate/pending`);
            setAssets(res.data);
            if (res.data.length > 0 && !selectedAsset) {
                setSelectedAsset(res.data[0]);
                setTranslation(res.data[0].englishTranslation || '');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (asset) => {
        setSelectedAsset(asset);
        if (asset.targetLanguage && asset.targetLanguage !== 'English') {
            setTargetLang(asset.targetLanguage);
        } else {
            setTargetLang(asset.targetLanguage || 'English');
        }
    };

    // Auto-Translate Effect
    useEffect(() => {
        const autoTranslate = async () => {
            if (!selectedAsset) return;

            setLoading(true);
            try {
                const res = await axios.post(`${config.API_BASE_URL}/api/v1/translate/auto/${selectedAsset.assetId}?targetLang=${targetLang}`);
                setTranslation(res.data.translatedText);
            } catch (err) {
                console.error("Auto translate failed", err);
            } finally {
                setLoading(false);
            }
        };

        if (selectedAsset) {
            const timer = setTimeout(() => {
                autoTranslate();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [selectedAsset, targetLang]);

    const handleAutoTranslate = async () => {
        if (!selectedAsset) return;
        try {
            const res = await axios.post(`${config.API_BASE_URL}/api/v1/translate/auto/${selectedAsset.assetId}?targetLang=${targetLang}`);
            setTranslation(res.data.translatedText);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSpeak = async () => {
        if (!translation) return;
        setIsPlaying(true);
        try {
            const res = await axios.post(`${config.API_BASE_URL}/api/v1/translate/tts`, {
                text: translation,
                lang: targetLang
            });
            const audio = new Audio("data:audio/mp3;base64," + res.data.audioData);
            audio.onended = () => setIsPlaying(false);
            audio.play();
        } catch (err) {
            console.error("TTS Failed", err);
            alert("Text-to-Speech Failed");
            setIsPlaying(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedAsset) return;
        try {
            await axios.patch(`${config.API_BASE_URL}/api/v1/translate/${selectedAsset.assetId}`, {
                englishTranslation: translation
            });
            fetchPendingAssets();
            setSelectedAsset(null);
            setTranslation('');
            alert("Translation verified!");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!selectedAsset) return;

        const pin = prompt("Enter Admin PIN to confirm deletion:");
        if (!pin) return;

        try {
            await axios.delete(`${config.API_BASE_URL}/api/v1/translate/${selectedAsset.assetId}`, {
                headers: { 'X-Admin-Pin': pin }
            });
            alert("Asset deleted.");
            fetchPendingAssets();
            setSelectedAsset(null);
            setTranslation('');
        } catch (err) {
            console.error("Delete failed", err);
            if (err.response && err.response.status === 403) {
                alert("Access Denied: Invalid Admin PIN");
            } else {
                alert("Failed to delete asset.");
            }
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 text-gray-400">
            <RefreshCw className="animate-spin mb-4 text-orange-500" size={32} />
            <p className="font-medium text-orange-800">Syncing with community...</p>
        </div>
    );

    return (
        <div className="glass-card overflow-hidden grid lg:grid-cols-12 h-screen max-h-[90vh] shadow-2xl shadow-orange-100 dark:shadow-black/50">

            {/* Sidebar List */}
            <div className="lg:col-span-4 bg-white/60 dark:bg-gray-800/60 border-r border-white/50 dark:border-white/10 flex flex-col backdrop-blur-md">
                <div className="p-6 border-b border-white/50 dark:border-white/10 bg-white/40 dark:bg-gray-800/40 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Pending Review</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{assets.length} ITEMS QUEUED</p>
                    </div>
                    <button onClick={fetchPendingAssets} className="text-gray-400 hover:text-orange-500 transition-colors p-2 hover:bg-orange-50 dark:hover:bg-orange-500/20 rounded-full"><RefreshCw size={20} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar">
                    {assets.length === 0 && (
                        <div className="text-center py-20 px-6">
                            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={24} />
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 font-medium">All caught up!</p>
                            <p className="text-sm text-gray-400">No pending translations.</p>
                        </div>
                    )}
                    {assets.map(asset => (
                        <div
                            key={asset.assetId}
                            onClick={() => handleSelect(asset)}
                            className={`p-5 rounded-2xl cursor-pointer transition-all border group relative
                  ${selectedAsset?.assetId === asset.assetId
                                    ? 'bg-white dark:bg-gray-700 border-orange-200 dark:border-orange-500/30 shadow-lg scale-[1.02] z-10'
                                    : 'bg-white/50 dark:bg-gray-800/40 border-transparent hover:bg-white dark:hover:bg-gray-700/60 hover:border-orange-100 dark:hover:border-gray-600'}
                `}
                        >
                            {selectedAsset?.assetId === asset.assetId && (
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-pink-500 rounded-l-2xl" />
                            )}
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide
                                    ${selectedAsset?.assetId === asset.assetId ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
                                `}>
                                    {asset.languageName}
                                </span>
                                <span className="text-[10px] text-gray-400">{new Date(asset.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-gray-800 dark:text-gray-200 font-medium truncate mb-1">{asset.transcript || "No transcript"}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                {asset.dialect} Dialect
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor Area */}
            <div className="lg:col-span-8 bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl flex flex-col relative">
                {selectedAsset ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-white/50 dark:border-white/10 bg-white/40 dark:bg-gray-800/40 flex justify-between items-center z-20">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{selectedAsset.languageName}</h2>
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                    <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs text-gray-600 dark:text-gray-300">{selectedAsset.dialect}</span>
                                    <span>•</span>
                                    <span className="font-mono text-xs opacity-50">ID: {selectedAsset.assetId.substring(0, 8)}</span>
                                </div>
                            </div>
                            {selectedAsset.audioUrl && (
                                <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm border border-orange-100 dark:border-gray-700">
                                    <audio controls src={selectedAsset.audioUrl} className="h-10 rounded-full" />
                                </div>
                            )}
                        </div>

                        {/* Work Area */}
                        <div className="flex-1 p-8 grid grid-rows-2 gap-6 overflow-y-auto">

                            {/* Source Card */}
                            <div className="bg-white/60 dark:bg-gray-800/60 p-6 rounded-3xl border border-white/60 dark:border-white/10 shadow-sm flex flex-col">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                                    <MessageSquare size={14} /> Original Transcript (Source)
                                </label>
                                <div className="flex-1 text-2xl md:text-3xl leading-relaxed text-gray-800 dark:text-gray-200 font-light overflow-y-auto custom-scrollbar">
                                    {selectedAsset.transcript}
                                </div>
                            </div>

                            {/* Target Card */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-orange-100 dark:border-gray-700 shadow-xl shadow-orange-500/5 dark:shadow-none flex flex-col relative">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-xl">
                                        <div className="px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-bold uppercase flex items-center gap-2">
                                            Auto-Detect <ArrowRightLeft size={12} />
                                        </div>
                                        <select
                                            value={targetLang}
                                            onChange={(e) => setTargetLang(e.target.value)}
                                            className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 outline-none pr-2 cursor-pointer"
                                        >
                                            {INDIAN_LANGUAGES.map(lang => (
                                                <option key={lang} value={lang} className="text-gray-900 bg-white">{lang}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAutoTranslate}
                                            className="text-gray-400 hover:text-orange-500 p-2 rounded-full hover:bg-orange-50 dark:hover:bg-orange-500/20 transition-colors"
                                            title="Regenerate Translation"
                                        >
                                            <Wand2 size={16} />
                                        </button>
                                        <button
                                            onClick={handleSpeak}
                                            disabled={!translation}
                                            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${isPlaying
                                                ? 'bg-orange-500 text-white animate-pulse'
                                                : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20'}`}
                                        >
                                            {isPlaying ? <Sparkles size={12} /> : <MessageSquare size={12} />}
                                            {isPlaying ? 'Speaking...' : 'Listen'}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    className="flex-1 w-full text-2xl md:text-3xl leading-relaxed text-gray-800 dark:text-white focus:outline-none resize-none bg-transparent placeholder-gray-300 dark:placeholder-gray-600"
                                    placeholder="Translation will appear here..."
                                    value={translation}
                                    onChange={(e) => setTranslation(e.target.value)}
                                />
                                <div className="absolute bottom-4 right-6 text-xs text-gray-300 dark:text-gray-600 font-medium">
                                    AI Generated • Verify Accuracy
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer Actions */}
                        <div className="p-6 border-t border-white/50 bg-white/60 backdrop-blur flex justify-end gap-4 z-10 sticky bottom-0">
                            <button
                                onClick={handleDelete}
                                className="px-6 py-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors flex items-center gap-2 mr-auto"
                            >
                                <Trash2 size={20} /> <span className="hidden sm:inline">Delete Asset</span>
                            </button>
                            <button
                                onClick={() => setSelectedAsset(null)}
                                className="px-8 py-4 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-colors"
                            >
                                Skip
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!translation}
                                className={`px-10 py-4 rounded-2xl font-bold text-white flex items-center gap-3 shadow-xl transition-transform hover:-translate-y-1 active:translate-y-0
                  ${translation
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-green-200'
                                        : 'bg-gray-300 cursor-not-allowed shadow-none'}
                `}
                            >
                                <Check size={20} /> Verify & Save
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white/30 p-10 text-center">
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-orange-100 animate-float">
                            <Type size={64} className="text-orange-200" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to Verify?</h2>
                        <p className="text-lg text-gray-500 max-w-md">Select an item from the sidebar to review translations, listen to audio, and help build the database.</p>
                    </div>
                )}
            </div>

        </div>
    );
};
