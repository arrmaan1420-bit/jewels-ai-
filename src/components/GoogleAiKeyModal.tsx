import { useState, type FormEvent } from 'react';
import { ExternalLink, KeyRound, Lock } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useToast } from '@/contexts/ToastContext';
import { getGoogleAiKey, setGoogleAiKey } from '@/lib/googleAi';

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

    setGoogleAiKey(clean);
    notify('Google AI Studio connected successfully!');
    onClose();
    if (onSaved) onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect Google AI Studio">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-champagne/30 bg-emerald-deep/40 p-3.5">
          <KeyRound className="h-5 w-5 shrink-0 text-champagne mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-white">Direct Image & Caption Generation</p>
            <p>
              Connect your Google AI Studio API key to generate luxury jewellery advertisements, fashion models, and captions directly.
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="googleApiKey" className="label-text mb-0">Google AI Studio API Key</label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-champagne hover:underline"
            >
              Get free API key <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="relative">
            <input
              id="googleApiKey"
              type={showKey ? 'text' : 'password'}
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-base pr-16 text-xs font-mono"
              placeholder="AIzaSy..."
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
            <Lock className="h-3 w-3 text-emerald-400" />
            Stored securely on your private device. Never exposed publicly.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Connect & Save Key
          </button>
        </div>
      </form>
    </Modal>
  );
}
