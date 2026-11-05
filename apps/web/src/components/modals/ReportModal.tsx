import React, { useState } from 'react';
import { Flag, X, AlertTriangle } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { useDialogStore } from '../../stores/dialogStore.js';
import { ReportTargetType } from '@oomfy/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetUsername?: string;
  targetContent?: string;
}

const REPORT_REASONS = [
  'Spam o publicidad no deseada',
  'Acoso, hostigamiento o agresiones',
  'Contenido explícito o inapropiado',
  'Desinformación o suplantación',
  'Infracción de términos o abuso',
  'Otro motivo',
];

export const ReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetUsername,
  targetContent,
}) => {
  const dialog = useDialogStore();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await ApiClient.post('/reports', {
        target_type: targetType,
        target_id: targetId,
        target_username: targetUsername,
        target_content: targetContent ? targetContent.slice(0, 300) : undefined,
        reason,
        details: details.trim() || undefined,
      });
      dialog.alert(
        'Tu reporte ha sido recibido y será revisado por el equipo de moderación.',
        'Reporte enviado'
      );
      onClose();
    } catch (err: any) {
      dialog.alert(err.message || 'Error al enviar el reporte.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 font-mono"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-dark-bg border-2 border-dark-border shadow-pixel overflow-hidden"
      >
        <div className="flex items-center justify-between p-3 border-b border-dark-border bg-dark-card/60">
          <div className="flex items-center gap-2 text-red-400">
            <Flag className="w-4 h-4" />
            <span className="font-bold text-xs uppercase tracking-wider text-white">
              Reportar {targetType === 'publication' ? 'publicación' : targetType === 'message' ? 'mensaje' : 'usuario'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-border text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div className="text-xs text-dark-muted font-sans flex items-start gap-2 bg-dark-card/40 p-2.5 border border-dark-border">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <span>
              {targetType === 'publication'
                ? `Estás reportando una publicación de @${targetUsername || 'usuario'}.`
                : targetType === 'message'
                ? `Estás reportando un mensaje de @${targetUsername || 'usuario'}.`
                : `Estás reportando al perfil de @${targetUsername || 'usuario'}.`}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-dark-muted uppercase mb-1.5">
              Motivo principal
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-dark-muted uppercase mb-1.5">
              Detalles adicionales (opcional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explica brevemente por qué consideras que incumple las normas..."
              className="w-full p-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-dark-border text-dark-muted hover:text-white text-xs font-bold pixel-button"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-black font-bold text-xs pixel-button flex items-center gap-1.5"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Enviando...' : 'Enviar reporte'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

