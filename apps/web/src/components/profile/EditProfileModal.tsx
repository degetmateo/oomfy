import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { LIMITS, PublicUser } from '@oomfy/shared';
import { PixelField } from '../common/PixelField.js';
import { ApiClient } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { EditProfileMedia } from './EditProfileMedia.js';

interface Props { user: PublicUser; isOpen: boolean; onClose: () => void; onUpdated: (user: PublicUser) => void; }

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
  const dialog = useDialogStore();

  useEffect(() => {
    if (isOpen) {
      setName(user.name || ''); setBio(user.bio || ''); setLocation(user.location || ''); setLink(user.link || '');
      setBannerPreview(user.banner_url || null); setIconPreview(user.icon_url || null);
      setBannerFile(null); setIconFile(null); setBannerAction('none'); setIconAction('none');
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim()); formData.append('bio', bio);
      formData.append('location', location); formData.append('link', link.trim());
      formData.append('banner_action', bannerAction); formData.append('icon_action', iconAction);
      if (bannerFile) formData.append('banner', bannerFile);
      if (iconFile) formData.append('icon', iconFile);
      const res = await ApiClient.put<any>('/members/me', formData);
      setUser(res.data); onUpdated(res.data); onClose();
    } catch (err: any) {
      dialog.alert(err?.message || 'Error al guardar los cambios del perfil.', 'Error');
    } finally { setIsSaving(false); }
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="edit-profile-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 font-mono">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-[#1a1a1a] border-2 border-dark-border shadow-pixel flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b-2 border-dark-border bg-[#141414]">
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 hover:bg-dark-border border border-transparent hover:border-dark-muted"><X className="w-5 h-5 text-white" aria-hidden="true" /></button>
          <h2 id="edit-profile-modal-title" className="font-bold text-white tracking-wider text-sm">Editar perfil</h2>
          <button type="button" onClick={handleSave} disabled={isSaving} className="px-4 py-1 text-xs font-bold text-brand-400 hover:text-white bg-dark-bg border border-brand-500 hover:bg-brand-600 transition-colors pixel-button disabled:opacity-50">
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
        <EditProfileMedia
          username={user.username} bannerPreview={bannerPreview} iconPreview={iconPreview}
          onBannerChange={(f) => { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); setBannerAction('update'); }}
          onBannerRemove={() => { setBannerFile(null); setBannerPreview(null); setBannerAction('delete'); }}
          onIconChange={(f) => { setIconFile(f); setIconPreview(URL.createObjectURL(f)); setIconAction('update'); }}
        />
        <div className="p-4 space-y-3">
          <PixelField label="Nombre" value={name} onChange={setName} maxLength={LIMITS.NAME_MAX} />
          <PixelField label="Biografía" value={bio} onChange={setBio} maxLength={LIMITS.BIO_MAX} isTextarea />
          <PixelField label="Ubicación" value={location} onChange={setLocation} maxLength={LIMITS.LOCATION_MAX} />
          <PixelField label="Sitio web" value={link} onChange={setLink} maxLength={LIMITS.LINK_MAX} />
        </div>
      </div>
    </div>
  );
};
