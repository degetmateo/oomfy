import React, { useContext, useState, useEffect, useRef } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { LIMITS, PublicUser } from '@oomfy/shared';
import { PixelField } from '../common/PixelField.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { EditProfileMedia } from './EditProfileMedia.js';
import { ProfileController, ProfileEditDraft } from '../../controllers/ProfileController.js';

interface Props { user: PublicUser; isOpen: boolean; onClose: () => void; onUpdated: (user: PublicUser) => void; }

function detachFileBuffer(file: File, apply: (cloned: File) => void): void {
  if (typeof file.arrayBuffer !== 'function') return;
  file.arrayBuffer().then((buf) => {
    const bytes = new Uint8Array(buf);
    const isGifSig = bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
    const isGif = isGifSig || file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    const name = isGif && !file.name.toLowerCase().endsWith('.gif') ? `${file.name}.gif` : file.name;
    apply(new File([bytes], name, { type: isGif ? 'image/gif' : file.type, lastModified: file.lastModified }));
  }).catch(() => { });
}

export const EditProfileModal: React.FC<Props> = ({ user, isOpen, onClose, onUpdated }) => {
  const queryClient = useContext(QueryClientContext);
  const dialog = useDialogStore();
  const [draft, setDraft] = useState<ProfileEditDraft>(() => ProfileController.createDraft(user));
  const [isSaving, setIsSaving] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) setDraft(ProfileController.createDraft(user));
    wasOpenRef.current = isOpen;
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const setBanner = (file: File) => {
    const preview = URL.createObjectURL(file);
    setDraft((prev) => {
      if (prev.bannerPreview?.startsWith('blob:')) URL.revokeObjectURL(prev.bannerPreview);
      return { ...prev, bannerFile: file, bannerPreview: preview, bannerAction: 'update' };
    });
    detachFileBuffer(file, (cloned) => setDraft((p) => (p.bannerFile === file ? { ...p, bannerFile: cloned } : p)));
  };
  const removeBanner = () => setDraft((prev) => {
    if (prev.bannerPreview?.startsWith('blob:')) URL.revokeObjectURL(prev.bannerPreview);
    return { ...prev, bannerFile: null, bannerPreview: null, bannerAction: 'delete' };
  });
  const setIcon = (file: File) => {
    const preview = URL.createObjectURL(file);
    setDraft((prev) => {
      if (prev.iconPreview?.startsWith('blob:')) URL.revokeObjectURL(prev.iconPreview);
      return { ...prev, iconFile: file, iconPreview: preview, iconAction: 'update' };
    });
    detachFileBuffer(file, (cloned) => setDraft((p) => (p.iconFile === file ? { ...p, iconFile: cloned } : p)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await ProfileController.saveProfileDraft(user, draft, queryClient);
      onUpdated(updated);
      onClose();
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
        <EditProfileMedia username={user.username} bannerPreview={draft.bannerPreview} iconPreview={draft.iconPreview} onBannerChange={setBanner} onBannerRemove={removeBanner} onIconChange={setIcon} />
        <div className="p-4 space-y-3">
          <PixelField label="Nombre" value={draft.name} onChange={(v) => setDraft((p) => ({ ...p, name: v }))} maxLength={LIMITS.NAME_MAX} />
          <PixelField label="Biografía" value={draft.bio} onChange={(v) => setDraft((p) => ({ ...p, bio: v }))} maxLength={LIMITS.BIO_MAX} isTextarea />
          <PixelField label="Ubicación" value={draft.location} onChange={(v) => setDraft((p) => ({ ...p, location: v }))} maxLength={LIMITS.LOCATION_MAX} />
          <PixelField
            label="Sitio web"
            value={draft.link}
            onChange={(v) => setDraft((p) => ({ ...p, link: v }))}
            maxLength={LIMITS.LINK_MAX}
            placeholder="ej. tusitio.com o https://tusitio.com"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};
