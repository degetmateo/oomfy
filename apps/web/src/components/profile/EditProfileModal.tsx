import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PublicUser } from '@oomfy/shared';
import { PixelField } from '../common/PixelField.js';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { EditProfileMedia } from './EditProfileMedia.js';

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

  const { setUser } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setName(user.name || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      setLink(user.link || '');
      setBannerPreview(user.banner_url || null);
      setIconPreview(user.icon_url || null);
      setBannerFile(null);
      setIconFile(null);
      setBannerAction('none');
      setIconAction('none');
    }
  }, [user, isOpen]);

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

        <EditProfileMedia
          username={user.username}
          bannerPreview={bannerPreview}
          iconPreview={iconPreview}
          onBannerChange={(file) => {
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
            setBannerAction('update');
          }}
          onBannerRemove={() => {
            setBannerPreview(null);
            setBannerFile(null);
            setBannerAction('delete');
          }}
          onIconChange={(file) => {
            setIconFile(file);
            setIconPreview(URL.createObjectURL(file));
            setIconAction('update');
          }}
        />

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
