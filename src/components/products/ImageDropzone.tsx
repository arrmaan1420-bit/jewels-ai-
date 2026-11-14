import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/products';

interface ImageDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

function validateFiles(incoming: File[]): { valid: File[]; problem: string | null } {
  const valid: File[] = [];
  let problem: string | null = null;
  for (const file of incoming) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      problem = `"${file.name}" is not a JPG, PNG or WEBP image.`;
    } else if (file.size > MAX_IMAGE_BYTES) {
      problem = `"${file.name}" is larger than 10 MB.`;
    } else {
      valid.push(file);
    }
  }
  return { valid, problem };
}

export function ImageDropzone({ files, onChange, onError, disabled = false }: ImageDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const addFiles = (incoming: File[]) => {
    const { valid, problem } = validateFiles(incoming);
    if (problem) onError(problem);
    if (valid.length > 0) onChange([...files, ...valid]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    addFiles(Array.from(event.dataTransfer.files));
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click();
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-all duration-300 ${
          dragging
            ? 'border-emerald-400 bg-emerald-500/10 shadow-glow'
            : 'border-emerald-500/25 bg-onyx/40 hover:border-champagne/50 hover:bg-white/[0.02]'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <ImagePlus className={`mb-4 h-9 w-9 transition-transform duration-300 ${dragging ? 'scale-110 text-emerald-400' : 'text-champagne'}`} strokeWidth={1.4} />
        <p className="text-sm font-medium text-white">Drag and drop jewellery photographs here</p>
        <p className="mt-1 text-xs text-slate-500">or click to browse. JPG, PNG or WEBP, up to 10 MB each.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10">
              {previews[index] && <img src={previews[index]} alt={file.name} className="h-full w-full object-cover" />}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity duration-200 hover:bg-red-500 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
