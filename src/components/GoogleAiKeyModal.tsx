import { useState, type FormEvent } from 'react';
import { Check, ExternalLink, KeyRound, Lock, Sparkles } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useToast } from '@/contexts/ToastContext';
import { clearGoogleAiKey, getGoogleAiKey, setGoogleAiKey } from '@/lib/googleAi';

interface GoogleAiKeyModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function GoogleAiKeyModal({ open, onClose, onSaved }: GoogleAiKeyModalProps) {
  const { notify } = useToast();
  const [apiKey, setApiKey] = useState(getGoogleAiKey());
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = apiKey.trim();
    if (!clean) {
      notify('Please enter a valid Google AI Studio API key.', 'error');
      return;
    }

    if (!clean.startsWith('AIza')) {
      notify('Note: Google AI Studio keys typically start with "AIza...". Saving anyway.', 'info');
    }

    setGoogleAiKey(clean);
    notify('Google AI Studio connected successfully! Generating creative now...');
    onClose();
    if (onSaved) {
      setTimeout(() => onSaved(), 200);
    }
  };

  const handleClear = () => {
    clearGoogleAiKey();
    setApiKey('');
    notify('Google AI Studio key removed.');
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect Google AI Studio" maxWidthClass="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Banner with explanations */}
        <div className="rounded-xl border border-champagne/40 bg-gradient-to-r from-emerald-950/80 to-black/80 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-champagne/20 text-champagne">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-xs text-slate-300">
              <p className="font-semibold text-white text-sm">Direct Photorealistic AI Generation</p>
              <p className="leading-relaxed">
                Connect your free Google AI Studio key to generate editorial-grade jewellery advertisements via <strong className="text-champagne">Imagen 3</strong> and luxury marketing captions via <strong className="text-champagne">Gemini 1.5 Flash</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Step Quick Guide */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs text-slate-300 space-y-2">
          <p className="font-medium text-white">How to get your free key (takes 30 seconds):</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-champagne hover:underline inline-flex items-center gap-1 font-medium">Google AI Studio <ExternalLink className="h-3 w-3 inline" /></a></li>
            <li>Click <strong>&quot;Create API Key&quot;</strong> and copy your key</li>
            <li>Paste your key below and click <strong>&quot;Save &amp; Generate&quot;</strong></li>
          </ol>
        </div>

        {/* Input box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="googleApiKeyModalInput" className="label-text mb-0">
              Google AI Studio API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-champagne hover:underline"
            >
              Get free key <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="relative">
            <input
              id="googleApiKeyModalInput"
              type={showKey ? 'text' : 'password'}
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-base pr-20 text-xs font-mono bg-black/70 border-white/20 focus:border-champagne"
              placeholder="Paste your key here (e.g. AIzaSy...)"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-white/10"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            Stored safely and privately in your browser storage. Never exposed or shared.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          {apiKey ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-400 hover:underline"
            >
              Remove key
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2.5 text-xs inline-flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Save &amp; Generate Now
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
