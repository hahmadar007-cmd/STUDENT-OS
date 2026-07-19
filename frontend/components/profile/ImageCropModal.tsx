'use client';

import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const size = Math.min(pixelCrop.width, pixelCrop.height);
  canvas.width = size;
  canvas.height = size;

  // Draw circular clip
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  // Return as compressed WebP (max ~80KB)
  return canvas.toDataURL('image/webp', 0.82);
}

export default function ImageCropModal({ imageSrc, onClose, onSave }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const dataUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      onSave(dataUrl);
    } catch (e) {
      console.error('Crop failed', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md mx-4 bg-[#14141c] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Crop Profile Picture</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cropper */}
        <div className="relative w-full" style={{ height: 340 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            style={{
              containerStyle: { background: '#0d0d12' },
              cropAreaStyle: { border: '2px solid #7c5cfc', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)' },
            }}
          />
        </div>

        {/* Zoom controls */}
        <div className="px-6 py-4 border-t border-white/[0.06] space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom(Math.max(1, zoom - 0.1))}
              className="p-1.5 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1 appearance-none rounded-full cursor-pointer accent-[#7c5cfc]"
              style={{ background: `linear-gradient(to right, #7c5cfc ${((zoom - 1) / 2) * 100}%, rgba(255,255,255,0.1) ${((zoom - 1) / 2) * 100}%)` }}
            />
            <button
              type="button"
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-1.5 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
              className="p-1.5 text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[12px] font-medium text-white/50 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-[12px] font-semibold transition-all disabled:opacity-60 cursor-pointer shadow-[0_4px_20px_rgba(124,92,252,0.35)]"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
