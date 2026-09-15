import { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X, MapPin } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (file: File, imageUrl: string) => void;
  hasImage: boolean;
  onClear: () => void;
}

export function ImageUploader({
  onImageUpload,
  hasImage,
  onClear,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      onImageUpload(file, url);
    },
    [onImageUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {!hasImage ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all ${
            isDragging
              ? 'border-accent-400 bg-accent-500/10'
              : 'border-ink-700 hover:border-ink-500 hover:bg-ink-900/50'
          }`}
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ink-800 transition-all group-hover:scale-110 group-hover:bg-accent-500/20">
            <Upload className="h-7 w-7 text-ink-400 group-hover:text-accent-400" />
          </div>
          <h3 className="font-display text-lg font-semibold text-white">
            Upload a map image
          </h3>
          <p className="mt-1 max-w-xs text-sm text-ink-400">
            Drag and drop a map image here, or click to browse. The AI will
            detect roads and generate navigation data.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-ink-500">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>PNG, JPG, WEBP — any map format</span>
          </div>
        </div>
      ) : (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-700 px-4 py-2.5 text-sm font-medium text-ink-200 transition-all hover:border-red-500/50 hover:text-red-400"
        >
          <X className="h-4 w-4" />
          Remove image & upload new
        </button>
      )}
    </div>
  );
}
