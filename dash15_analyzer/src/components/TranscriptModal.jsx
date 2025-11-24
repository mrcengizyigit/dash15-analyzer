import React, { useRef } from 'react';
import { X, Clock, User, MessageSquare, Star, Calendar, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

const TranscriptModal = ({ chat, onClose }) => {
    const modalRef = useRef(null);

    if (!chat) return null;

    const handleDownloadPDF = async () => {
        if (!modalRef.current) return;

        try {
            // Create a clone of the modal to manipulate for printing
            const clone = modalRef.current.cloneNode(true);

            // Remove animation classes that might hide the element
            clone.classList.remove('animate-in', 'zoom-in-95', 'duration-200', 'fade-in');

            // Style the clone to be full height and visible
            // We use a wrapper to ensure it doesn't interfere with the page
            clone.style.position = 'fixed';
            clone.style.top = '0';
            clone.style.left = '0'; // On-screen
            // Increase width to ensure content fits comfortably (desktop view)
            clone.style.width = '1000px';
            clone.style.height = 'auto';
            clone.style.maxHeight = 'none';
            clone.style.overflow = 'visible';
            clone.style.borderRadius = '0';
            clone.style.backgroundColor = '#0f172a'; // Ensure background color
            clone.style.zIndex = '9999'; // On top of everything
            clone.style.opacity = '0.01'; // Almost invisible to user
            clone.style.pointerEvents = 'none'; // Don't block clicks

            // Find the scrollable content area in the clone and expand it
            const scrollableContent = clone.querySelector('.overflow-y-auto');
            if (scrollableContent) {
                scrollableContent.style.overflow = 'visible';
                scrollableContent.style.height = 'auto';
                scrollableContent.style.maxHeight = 'none';
                scrollableContent.style.flex = 'none'; // Disable flex constraint
            }

            // Append to body
            document.body.appendChild(clone);

            // Wait for images/fonts and layout
            await new Promise(resolve => setTimeout(resolve, 800));

            // Measure the actual dimensions of the rendered clone
            const width = clone.offsetWidth;
            const height = clone.offsetHeight;

            const dataUrl = await toPng(clone, {
                backgroundColor: '#0f172a',
                cacheBust: true,
                width: width,
                height: height,
                style: {
                    visibility: 'visible',
                    opacity: '1', // Force fully visible for capture
                    transform: 'none'
                }
            });

            // Remove clone
            document.body.removeChild(clone);

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [width, height] // Use dynamic dimensions
            });

            pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
            pdf.save(`konusma_detayi_${chat.chat_id}.pdf`);
        } catch (error) {
            console.error('PDF export failed:', error);
            alert(`PDF oluşturulurken bir hata oluştu: ${error.message}`);
        }
    };

    // Parse transcript if it's a string (it might be JSON or plain text)
    // Assuming the CSV content is plain text or a specific format. 
    // If it's a JSON string representing messages, we'd parse it. 
    // For now, we'll display it as text, perhaps splitting by newlines if it looks like a log.

    const formatTranscript = (text) => {
        if (!text) return <p className="text-slate-500 italic">Konuşma içeriği bulunamadı.</p>;

        // Simple formatting: split by newlines
        return text.split('\n').map((line, i) => (
            <div key={i} className={`mb-2 p-2 rounded-lg ${line.includes('Visitor') || line.includes('Ziyaretçi')
                ? 'bg-slate-800/50 ml-4 border border-slate-700/50'
                : line.includes('Agent') || line.includes('Temsilci') || line.includes(chat.agent_name)
                    ? 'bg-blue-900/20 mr-4 border border-blue-500/20'
                    : 'bg-transparent text-slate-400 text-xs'
                }`}>
                <p className="text-sm text-slate-300">{line}</p>
            </div>
        ));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div ref={modalRef} className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                            Konuşma Detayı
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">ID: {chat.chat_id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-900/50 border-b border-slate-800">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Temsilci</span>
                        <span className="font-medium text-slate-200">{chat.agent_name}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Ziyaretçi</span>
                        <span className="font-medium text-slate-200">{chat.visitor_name}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Süre</span>
                        <span className="font-medium text-slate-200">
                            {Math.floor(chat.duration_seconds / 60)}dk {chat.duration_seconds % 60}sn
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Star className="w-3 h-3" /> Puan</span>
                        <span className={`font-bold ${chat.rating >= 4 ? 'text-emerald-400' : chat.rating >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {chat.rating ? `${chat.rating}/5` : '-'}
                        </span>
                    </div>
                    <div className="flex flex-col md:col-span-2">
                        <span className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Tarih</span>
                        <span className="text-sm text-slate-300">
                            {new Date(chat.start_time).toLocaleString('tr-TR')}
                        </span>
                    </div>
                    <div className="flex flex-col md:col-span-2">
                        <span className="text-xs text-slate-500 mb-1">Etiketler</span>
                        <div className="flex gap-2">
                            {chat.tags && chat.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Transcript Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-950/30 custom-scrollbar">
                    <div className="space-y-1">
                        {formatTranscript(chat.transcript)}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
                    <button
                        onClick={handleDownloadPDF}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        PDF İndir
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TranscriptModal;
