import React, { useState, useRef } from 'react';
import { Mic, Square, Upload, Play, RefreshCw, AlertCircle, CheckCircle, Radio } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { incrementContribution } from '../services/GamificationService';
import config from '../config';

export const AudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [duration, setDuration] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
    const [statusMessage, setStatusMessage] = useState('');

    // Form State
    const [language, setLanguage] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('English');
    const [dialect, setDialect] = useState('');
    const [consent, setConsent] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Use AudioContext for raw PCM access (WAV export)
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);

            mediaRecorderRef.current = { stream, audioContext, source, processor };
            audioChunksRef.current = []; // Will hold raw float32 buffers

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                audioChunksRef.current.push(new Float32Array(inputData));
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev >= 30) {
                        stopRecording();
                        return 30;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setStatusMessage("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            const { stream, audioContext, source, processor } = mediaRecorderRef.current;

            processor.disconnect();
            source.disconnect();
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();

            clearInterval(timerRef.current);
            setIsRecording(false);

            // Encode to WAV
            const audioBlob = encodeWAV(audioChunksRef.current, audioContext.sampleRate);
            const url = URL.createObjectURL(audioBlob);

            setAudioBlob(audioBlob);
            setAudioUrl(url);
            audioChunksRef.current = [];
        }
    };

    // Simple WAV Encoder
    const encodeWAV = (buffers, sampleRate) => {
        const flatten = (buffers) => {
            let len = 0;
            for (let i = 0; i < buffers.length; i++) len += buffers[i].length;
            const result = new Float32Array(len);
            let offset = 0;
            for (let i = 0; i < buffers.length; i++) {
                result.set(buffers[i], offset);
                offset += buffers[i].length;
            }
            return result;
        };

        const floatTo16BitPCM = (output, offset, input) => {
            for (let i = 0; i < input.length; i++, offset += 2) {
                const s = Math.max(-1, Math.min(1, input[i]));
                output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
        };

        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        const samples = flatten(buffers);
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, 8, 'WAVE');
        // fmt sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true); // 16-bit
        // data sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, samples.length * 2, true);

        floatTo16BitPCM(view, 44, samples);

        return new Blob([view], { type: 'audio/wav' });
    };

    const handleUpload = async () => {
        if (!audioBlob || !consent || !language) {
            setStatusMessage("Please complete all fields and record audio.");
            return;
        }

        setUploadStatus('uploading');
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');
        formData.append('language', language);
        formData.append('targetLanguage', targetLanguage);
        formData.append('dialect', dialect);
        formData.append('consent', consent);

        try {
            const response = await axios.post(`${config.API_BASE_URL}/api/v1/preservation/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setUploadStatus('success');
            setStatusMessage(`Upload successful! ID: ${response.data.assetId}`);
            incrementContribution();
            window.dispatchEvent(new Event('storage')); // Trigger update for Navbar
            // Reset
            setAudioBlob(null);
            setAudioUrl(null);
            setDuration(0);
            // Optionally clear form
            // setLanguage('');
            // setDialect('');

        } catch (error) {
            setUploadStatus('error');
            const serverError = error.response?.data || error.message;
            setStatusMessage(`Upload failed: ${serverError}`);
            console.error("Full Error:", error);
            console.error("Server Response:", error.response?.data);
        }
    };

    // Generic Voice Input Logic
    const startVoiceInput = (setter) => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice input is not supported in this browser. Try Chrome/Edge.");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'en-IN'; // Default to English/Indian accent for names
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            // Optional: visual feedback
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const cleaned = transcript.replace(/\.$/, '').trim();
            setter(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
        };

        recognition.start();
    };

    const INDIAN_LANGUAGES = [
        "Assamese", "Bengali", "Bodo", "Dogri", "Gujarati", "Hindi", "Kannada", "Kashmiri", "Konkani", "Maithili", "Malayalam", "Manipuri", "Marathi", "Nepali", "Odia", "Punjabi", "Sanskrit", "Santali", "Sindhi", "Tamil", "Telugu", "Urdu",
        "Adi", "Aka", "Angami", "Ao", "Apatani", "Bhutia", "Bishnupriya Manipuri", "Bugun", "Chakma", "Chang", "Deori", "Dimasa", "Garo", "Hajong", "Hmar", "Karbi", "Khasi", "Khamti", "Koch", "Kokborok", "Konyak", "Kuki", "Ladakhi", "Lepcha", "Limbu", "Lotha", "Lushai", "Meitei", "Mishing", "Mishmi", "Mizo", "Monpa", "Munda", "Nocte", "Nyishi", "Phom", "Rabha", "Rengma", "Sangtam", "Sherdukpen", "Singpho", "Sumi", "Tagin", "Tangkhul", "Tangsa", "Tiwa", "Tripuri", "Wancho", "Yimkhiung", "Zeme"
    ];

    return (
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-start">

            {/* Left: Studio Recorder */}
            <div className={`relative rounded-3xl p-8 flex flex-col items-center justify-between min-h-[400px] transition-all duration-500 shadow-2xl ${isRecording ? 'bg-gray-900 border-2 border-red-500' : 'bg-gray-900 border border-gray-800'}`}>

                {/* Header */}
                <div className="w-full flex justify-between items-center text-gray-400 text-xs font-mono uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <Radio size={14} className={isRecording ? "text-red-500 animate-pulse" : "text-gray-600"} />
                        {isRecording ? "LIVE" : "READY"}
                    </div>
                    <span>{isRecording ? "REC" : "STUDIO MODE"}</span>
                </div>

                {/* Visualizer / Timer */}
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                    {isRecording ? (
                        <>
                            <div className="relative mb-8">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="absolute inset-0 bg-red-500 rounded-full blur-2xl"
                                />
                                <div className="relative z-10 w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-red-500/50 shadow-lg">
                                    <Mic size={40} className="text-white" />
                                </div>
                            </div>
                            <p className="font-mono text-5xl text-white font-bold mb-2 tabular-nums tracking-tighter">
                                00:{duration.toString().padStart(2, '0')}<span className="text-xl text-gray-500"> / 30</span>
                            </p>
                        </>
                    ) : audioUrl ? (
                        <div className="w-full">
                            <audio controls src={audioUrl} className="w-full mb-6 invert-[.95] sticky-audio" />
                            <div className="text-center">
                                <button onClick={() => { setAudioUrl(null); setAudioBlob(null) }} className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2 transition mx-auto hover:bg-white/10 px-4 py-2 rounded-full">
                                    <RefreshCw size={14} className="mr-1" /> Re-take Recording
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={startRecording}
                            className="group cursor-pointer flex flex-col items-center"
                        >
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-black border border-gray-700 rounded-full flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 group-hover:border-orange-500/50 transition-all duration-300">
                                <Mic size={40} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                            </div>
                            <p className="text-white font-bold text-lg mb-2 group-hover:text-orange-400 transition-colors">Tap to Record</p>
                            <p className="text-xs text-gray-500 font-mono">MAX 30 SEC</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="w-full mt-8">
                    {!isRecording && !audioUrl && (
                        <button
                            onClick={startRecording}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-pink-600 text-white font-bold hover:shadow-lg hover:shadow-orange-900/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Mic size={20} /> START
                        </button>
                    )}

                    {isRecording && (
                        <button
                            onClick={stopRecording}
                            className="w-full py-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-900/50 flex items-center justify-center gap-2"
                        >
                            <Square size={20} fill="currentColor" /> STOP
                        </button>
                    )}
                </div>
            </div>

            {/* Right: Details Form */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">MetaData</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Language Spoken</label>
                            <div className="relative">
                                <input
                                    list="indian-languages"
                                    type="text"
                                    className="w-full p-4 pr-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium shadow-sm transition-colors"
                                    placeholder="Select or type..."
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                />
                                <button
                                    onClick={() => startVoiceInput(setLanguage)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 p-2 rounded-full hover:bg-orange-50 dark:hover:bg-orange-500/20 transition-colors"
                                >
                                    <Mic size={20} />
                                </button>
                            </div>
                            <datalist id="indian-languages">
                                {INDIAN_LANGUAGES.map(lang => (
                                    <option key={lang} value={lang} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Dialect (Optional)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full p-4 pr-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium shadow-sm transition-colors"
                                    placeholder="e.g. Malvi"
                                    value={dialect}
                                    onChange={(e) => setDialect(e.target.value)}
                                />
                                <button
                                    onClick={() => startVoiceInput(setDialect)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 p-2 rounded-full hover:bg-orange-50 dark:hover:bg-orange-500/20 transition-colors"
                                >
                                    <Mic size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl">
                            <label className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                <RefreshCw size={12} /> Auto-Translation Target
                            </label>
                            <select
                                value={targetLanguage}
                                onChange={(e) => setTargetLanguage(e.target.value)}
                                className="w-full p-3 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-bold rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Translate to...</option>
                                {INDIAN_LANGUAGES.map(lang => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <label className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors bg-white dark:bg-gray-800 shadow-sm group">
                        <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${consent ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                            {consent && <CheckCircle size={16} />}
                        </div>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                        />
                        <div className="text-sm">
                            <p className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-orange-600 transition-colors">I Consent to Open Source</p>
                            <p className="leading-relaxed text-xs text-gray-600 dark:text-gray-400">My voice will help preserve this language for future generations.</p>
                        </div>
                    </label>
                </div>

                {uploadStatus === 'success' ? (
                    <div className="p-6 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-2xl flex items-center gap-4 border border-green-200 dark:border-green-800 shadow-sm animate-pulse-glow">
                        <div className="bg-green-100 dark:bg-green-800 p-3 rounded-full">
                            <CheckCircle size={24} className="text-green-600 dark:text-green-300" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">Contribution Verified!</p>
                            <p className="text-sm opacity-80">{statusMessage}</p>
                        </div>
                        <button onClick={() => setUploadStatus('idle')} className="ml-auto text-sm font-bold bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm hover:shadow text-green-700 dark:text-green-400 transition">
                            Next
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleUpload}
                        disabled={!audioBlob || !consent || uploadStatus === 'uploading'}
                        className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl hover:-translate-y-1
                            ${(!audioBlob || !consent)
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-gray-900 to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 hover:shadow-2xl'}
                        `}
                    >
                        {uploadStatus === 'uploading' ? (
                            <>
                                <RefreshCw size={24} className="animate-spin" /> Uploading to Cloud...
                            </>
                        ) : (
                            <>
                                <Upload size={24} /> Submit Contribution
                            </>
                        )}
                    </button>
                )}

                {uploadStatus === 'error' && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-center gap-2 border border-red-100 dark:border-red-800">
                        <AlertCircle size={18} />
                        {statusMessage}
                    </div>
                )}
            </div>
        </div>
    );
};
