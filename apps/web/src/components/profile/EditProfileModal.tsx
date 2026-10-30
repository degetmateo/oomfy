import React, { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { PublicUser } from '@oomfy/shared';
import { PixelField } from '../common/PixelField.js';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';

interface Props {
  user: PublicUser;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (user: PublicUser) => void;
}

export const EditProfileModal: React.FC<Props> = ({ user, isOpen, onClose, onUpdated }) => {
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [link, setLink] = useState(user.link || '');
  const [bannerPreview, setBannerPreview] = useState(user.banner_url || null);
  const [iconPreview, setIconPreview] = useState(user.icon_url || null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [bannerAction, setBannerAction] = useState<'none' | 'update' | 'delete'>('none');
  const [iconAction, setIconAction] = useState<'none' | 'update' | 'delete'>('none');
  const [isSaving, setIsSaving] = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const { setUser } = useAuthStore();

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('bio', bio);
      formData.append('location', location);
      formData.append('link', link);
      formData.append('banner_action', bannerAction);
      formData.append('icon_action', iconAction);
      if (bannerFile) formData.append('banner', bannerFile);
      if (iconFile) formData.append('icon', iconFile);

      const res = await ApiClient.put<any>('/members/me', formData);
      setUser(res.data);
      onUpdated(res.data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 font-mono">
      <div className="w-full max-w-lg bg-[#1a1a1a] border-2 border-dark-border shadow-pixel flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b-2 border-dark-border bg-[#141414]">
          <button onClick={onClose} className="p-1 hover:bg-dark-border border border-transparent hover:border-dark-muted">
            <X className="w-5 h-5 text-white" />
          </button>
          <span className="font-bold text-white tracking-wider text-sm">Editar perfil</span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1 text-xs font-bold text-brand-400 hover:text-white bg-dark-bg border border-brand-500 hover:bg-brand-600 transition-colors pixel-button disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        <div className="relative h-32 bg-[#2a2a2a] flex items-center justify-center overflow-hidden">
          {bannerPreview && <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-3">
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="p-2 bg-black/60 hover:bg-black/80 border border-white/40 text-white rounded-none"
            >
              <Camera className="w-5 h-5" />
            </button>
            {bannerPreview && (
              <button
                onClick={() => { setBannerPreview(null); setBannerFile(null); setBannerAction('delete'); }}
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
              if (file) { setBannerFile(file); setBannerPreview(URL.createObjectURL(file)); setBannerAction('update'); }
            }}
          />
        </div>

        <div className="px-4 -mt-10 mb-4 relative z-10 flex">
          <div className="relative w-20 h-20 bg-[#161616] border-2 border-dark-border overflow-hidden group">
            {iconPreview ? (
              <img src={iconPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-400 font-bold text-xl bg-brand-950/40">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <button
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
                if (file) { setIconFile(file); setIconPreview(URL.createObjectURL(file)); setIconAction('update'); }
              }}
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          <PixelField label="Nombre" value={name} onChange={setName} maxLength={16} />
          <PixelField label="Biografía" value={bio} onChange={setBio} maxLength={160} isTextarea />
          <PixelField label="Ubicación" value={location} onChange={setLocation} maxLength={30} />
          <PixelField label="Sitio web" value={link} onChange={setLink} maxLength={100} />
        </div>
      </div>
    </div>
  );
};
