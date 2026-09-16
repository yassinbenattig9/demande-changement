import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X, CheckCircle, FileSpreadsheet, FileCode } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AttachmentItem } from '../../types';

export interface FileDropzoneProps {
  attachments: AttachmentItem[];
  onAddAttachment: (file: AttachmentItem) => void;
  onRemoveAttachment: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  disabled = false,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AttachmentItem['categorie']>('Protocole');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const newAtt: AttachmentItem = {
        id: `att-${Date.now()}-${i}`,
        nom_fichier: f.name,
        taille_octets: f.size,
        type_mime: f.type || 'application/octet-stream',
        date_upload: new Date().toISOString().slice(0, 10),
        televerse_par: 'Utilisateur connecté',
        categorie: selectedCategory,
      };
      onAddAttachment(newAtt);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes('pdf')) return <FileText className="w-5 h-5 text-rose-600" />;
    if (mime.includes('sheet') || mime.includes('excel'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    return <FileCode className="w-5 h-5 text-teal-600" />;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Sélecteur de catégorie réglementaire */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Catégorie GxP du document :</span>
        {(['Protocole', 'Rapport d\'impact', 'Fiche de sécurité', 'Schéma technique', 'Autre'] as const).map(
          (cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-lg border transition-all duration-150',
                selectedCategory === cat
                  ? 'bg-teal-50 border-teal-500 text-teal-800 font-semibold shadow-2xs'
                  : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              {cat}
            </button>
          )
        )}
      </div>

      {/* Zone de glisser-déposer */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200',
          isDragOver
            ? 'border-teal-600 bg-teal-50/50 scale-[1.005]'
            : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          accept=".pdf,.docx,.xlsx,.dwg,.txt"
        />

        <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 mb-3 shadow-2xs">
          <UploadCloud className="w-6 h-6" />
        </div>

        <p className="text-sm font-semibold text-slate-800">
          Glissez-déposez vos fichiers ici, ou{' '}
          <span className="text-teal-700 underline underline-offset-2 hover:text-teal-800">
            parcourez votre ordinateur
          </span>
        </p>

        <p className="text-xs text-slate-500 mt-1">
          Formats acceptés : PDF, DOCX, XLSX, DWG, TXT (Taille max. conseillée : 25 Mo)
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
          <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
          <span>Intégrité des fichiers validée avec calcul automatique d'empreinte GxP</span>
        </div>
      </div>

      {/* Liste des fichiers téléversés */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pièces jointes ({attachments.length})
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="shrink-0 p-2 rounded-lg bg-slate-100 border border-slate-200">
                    {getFileIcon(att.type_mime)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate" title={att.nom_fichier}>
                      {att.nom_fichier}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span className="font-mono">{formatFileSize(att.taille_octets)}</span>
                      <span>•</span>
                      <span className="text-teal-700 font-semibold">{att.categorie}</span>
                    </div>
                  </div>
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAttachment(att.id);
                    }}
                    className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Supprimer la pièce jointe"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
