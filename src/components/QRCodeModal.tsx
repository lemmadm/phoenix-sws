import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, X, Copy, Check, ExternalLink, Smartphone, Share2, MessageCircle } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, sessionCode }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Audience URL is clean link directly opening the survey page
  const audienceUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/`
    : '';

  useEffect(() => {
    if (audienceUrl) {
      QRCode.toDataURL(audienceUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0e1f3d',
          light: '#ffffff'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [audienceUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(audienceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Join the Phoenix SWS live survey! Enter code: ${sessionCode} or tap this link to vote live: ${audienceUrl}`;

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Phoenix SWS Live Survey',
          text: `Join the live survey (Code: ${sessionCode})`,
          url: audienceUrl
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleShareWhatsApp();
    }
  };

  return (
    <div
      id="qr-code-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="qr-code-modal-card"
        className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full justify-between items-center mb-3">
          <div className="flex items-center gap-2 text-[#0c244d] font-bold text-lg">
            <Smartphone className="w-5 h-5 text-red-600" />
            <span>Join Live Survey</span>
          </div>
          <button
            id="close-qr-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Scan with your smartphone camera to open the Phoenix SWS survey page instantly.
        </p>

        {/* QR Code Graphic with direct link to open the survey */}
        {qrDataUrl ? (
          <a
            href={audienceUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative p-3 bg-white border-2 border-blue-100 hover:border-red-500 rounded-2xl shadow-inner mb-4 transition-colors block"
            title="Click or scan to open survey page"
          >
            <img
              src={qrDataUrl}
              alt="Scan to join survey"
              className="w-60 h-60 rounded-lg mx-auto"
              referrerPolicy="no-referrer"
            />
            <span className="text-[11px] font-semibold text-blue-600 group-hover:text-red-600 block mt-1">
              Tap or scan to open survey
            </span>
          </a>
        ) : (
          <div className="w-60 h-60 flex items-center justify-center bg-slate-100 rounded-xl mb-4 text-slate-400">
            Generating QR Code...
          </div>
        )}

        <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[11px] text-blue-700 font-medium block">Survey Session Code</span>
            <span className="text-lg font-black text-[#0c244d] tracking-wider font-mono">{sessionCode}</span>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-red-100 text-red-700 rounded-full border border-red-200">
            Live Now
          </span>
        </div>

        {/* Action Buttons: Copy, Open Mobile, Share via WhatsApp/Social */}
        <div className="w-full space-y-2">
          <div className="flex gap-2">
            <button
              id="copy-audience-url-btn"
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <a
              id="open-audience-new-tab"
              href={audienceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#0c244d] hover:bg-[#143975] text-white font-semibold text-xs rounded-xl transition"
            >
              <ExternalLink className="w-4 h-4 text-red-400" />
              <span>Open Survey</span>
            </a>
          </div>

          {/* Share with WhatsApp and others */}
          <button
            id="share-whatsapp-btn"
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Share via WhatsApp & Others</span>
          </button>
        </div>
      </div>
    </div>
  );
};
