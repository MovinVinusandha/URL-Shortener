import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Radio,
  Flag,
  Search,
  FileText,
  Gift,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type UtmParams,
  type CustomParam,
  type UtmTemplate,
  saveUtmTemplate,
  updateUtmTemplate,
  createUtmTemplateApi,
  updateUtmTemplateApi,
  fetchUtmTemplatesApi,
} from '../utils/utmUtils';
import toast from 'react-hot-toast';

interface UtmTemplateModalProps {
  isOpen: boolean;
  templateToEdit?: UtmTemplate | null;
  templateToDuplicate?: UtmTemplate | null;
  onClose: () => void;
  onSuccess: (updatedTemplates: UtmTemplate[]) => void;
}

export const UtmTemplateModal: React.FC<UtmTemplateModalProps> = ({
  isOpen,
  templateToEdit,
  templateToDuplicate,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [utms, setUtms] = useState<UtmParams>({
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
    ref: '',
  });
  const [customParams, setCustomParams] = useState<CustomParam[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (templateToEdit) {
        setName(templateToEdit.name);
        setUtms({ ...templateToEdit.utms });
        setCustomParams(
          (templateToEdit.customParams || []).map((cp) => ({
            id: Math.random().toString(36).substring(2, 9),
            key: cp.key,
            value: cp.value,
          }))
        );
      } else if (templateToDuplicate) {
        setName(`${templateToDuplicate.name} (Copy)`);
        setUtms({ ...templateToDuplicate.utms });
        setCustomParams(
          (templateToDuplicate.customParams || []).map((cp) => ({
            id: Math.random().toString(36).substring(2, 9),
            key: cp.key,
            value: cp.value,
          }))
        );
      } else {
        setName('');
        setUtms({
          source: '',
          medium: '',
          campaign: '',
          term: '',
          content: '',
          ref: '',
        });
        setCustomParams([]);
      }
    }
  }, [isOpen, templateToEdit, templateToDuplicate]);

  if (!isOpen) return null;

  const handleUtmChange = (field: keyof UtmParams, value: string) => {
    setUtms((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCustomParam = () => {
    setCustomParams((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), key: '', value: '' },
    ]);
  };

  const handleCustomParamChange = (id: string, field: 'key' | 'value', val: string) => {
    setCustomParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const handleRemoveCustomParam = (id: string) => {
    setCustomParams((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      if (templateToEdit) {
        await updateUtmTemplateApi(templateToEdit.id, name, utms, customParams);
        toast.success('Template updated');
      } else {
        await createUtmTemplateApi(name, utms, customParams);
        toast.success(templateToDuplicate ? 'Template duplicated' : 'Template created');
      }
      const updated = await fetchUtmTemplatesApi();
      onSuccess(updated);
      onClose();
    } catch {
      let fallback: UtmTemplate[];
      if (templateToEdit) {
        fallback = updateUtmTemplate(templateToEdit.id, name, utms, customParams);
        toast.success('Template updated');
      } else {
        fallback = saveUtmTemplate(name, utms, customParams);
        toast.success(templateToDuplicate ? 'Template duplicated' : 'Template created');
      }
      onSuccess(fallback);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl w-full max-w-[440px] overflow-visible flex flex-col z-[251] relative p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              {templateToEdit
                ? 'Edit UTM Template'
                : templateToDuplicate
                  ? 'Duplicate UTM Template'
                  : 'Create UTM Template'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Template Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Template Name</label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Google Search Ads, Weekly Digest"
                className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* 6 Unified Parameter Rows */}
            <div className="space-y-2 pt-1">
              {/* Source */}
              <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 transition-all">
                <div className="w-28 shrink-0 px-3 py-1.5 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Source</span>
                </div>
                <input
                  type="text"
                  value={utms.source}
                  onChange={(e) => handleUtmChange('source', e.target.value)}
                  placeholder="google"
                  className="flex-1 px-3 py-1.5 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Medium */}
              <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 transition-all">
                <div className="w-28 shrink-0 px-3 py-1.5 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
                  <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Medium</span>
                </div>
                <input
                  type="text"
                  value={utms.medium}
                  onChange={(e) => handleUtmChange('medium', e.target.value)}
                  placeholder="cpc"
                  className="flex-1 px-3 py-1.5 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Campaign */}
              <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 transition-all">
                <div className="w-28 shrink-0 px-3 py-1.5 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
                  <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Campaign</span>
                </div>
                <input
                  type="text"
                  value={utms.campaign}
                  onChange={(e) => handleUtmChange('campaign', e.target.value)}
                  placeholder="summer sale"
                  className="flex-1 px-3 py-1.5 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Term */}
              <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 transition-all">
                <div className="w-28 shrink-0 px-3 py-1.5 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Term</span>
                </div>
                <input
                  type="text"
                  value={utms.term}
                  onChange={(e) => handleUtmChange('term', e.target.value)}
                  placeholder="running shoes"
                  className="flex-1 px-3 py-1.5 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Content */}
              <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 transition-all">
                <div className="w-28 shrink-0 px-3 py-1.5 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Content</span>
                </div>
                <input
                  type="text"
                  value={utms.content}
                  onChange={(e) => handleUtmChange('content', e.target.value)}
                  placeholder="logo link"
                  className="flex-1 px-3 py-1.5 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Referral */}
              <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 transition-all">
                <div className="w-28 shrink-0 px-3 py-1.5 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
                  <Gift className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Referral</span>
                </div>
                <input
                  type="text"
                  value={utms.ref || ''}
                  onChange={(e) => handleUtmChange('ref', e.target.value)}
                  placeholder="yoursite.com"
                  className="flex-1 px-3 py-1.5 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Custom Params */}
              {customParams.map((param) => (
                <div
                  key={param.id}
                  className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 transition-all"
                >
                  <div className="w-28 shrink-0 px-3 py-1.5 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) => handleCustomParamChange(param.id, 'key', e.target.value)}
                      placeholder="Key"
                      className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none font-mono"
                    />
                  </div>
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => handleCustomParamChange(param.id, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-3 py-1.5 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomParam(param.id)}
                    className="px-2.5 py-1.5 text-muted-foreground hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handleAddCustomParam}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 transition-colors cursor-pointer py-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add custom parameter</span>
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors border border-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-all cursor-pointer shadow-none"
              >
                {templateToEdit ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
