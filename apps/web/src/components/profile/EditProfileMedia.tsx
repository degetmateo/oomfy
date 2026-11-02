import React, { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

interface Props {
  username: string;
  bannerPreview: string | null;
  iconPreview: string | null;
  onBannerChange: (file: File) => void;
  onBannerRemove: () => void;
  onIconChange: (file: File) => void;
}

export const EditProfileMedia: React.FC<Props> = ({
  username,
  bannerPreview,
  iconPreview,
  onBannerChange,
  onBannerRemove,
  onIconChange,
}) => {
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const resolvedBanner = bannerPreview?.startsWith('blob:') ? bannerPreview : resolveMediaUrl(bannerPreview);
  const resolvedIcon = iconPreview?.startsWith('blob:') ? iconPreview : resolveMediaUrl(iconPreview);

  return (
    <>
      <div className="relative h-32 bg-[#2a2a2a] flex items-center justify-center overflow-hidden">
        {resolvedBanner && <img src={resolvedBanner} alt="Banner" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="p-2 bg-black/60 hover:bg-black/80 border border-white/40 text-white"
          >
            <Camera className="w-5 h-5" />
          </button>
          {bannerPreview && (
            <button
              type="button"
              onClick={onBannerRemove}
              className="p-2 bg-black/60 hover:bg-black/80 border border-white/40 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <input
          type="file"
          ref={bannerInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onBannerChange(file);
          }}
        />
      </div>

      <div className="px-4 -mt-10 mb-4 relative z-10 flex">
        <div className="relative w-20 h-20 bg-[#161616] border-2 border-dark-border overflow-hidden group">
          {resolvedIcon ? (
            <img src={resolvedIcon} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand-400 font-bold text-xl bg-brand-950/40">
              {username.slice(0, 2).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => iconInputRef.current?.click()}
            className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-80 hover:opacity-100"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={iconInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onIconChange(file);
            }}
          />
        </div>
      </div>
    </>
  );
};

