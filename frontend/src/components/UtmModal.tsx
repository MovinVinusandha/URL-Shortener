import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Bookmark,
  Check,
  Globe,
  Radio,
  Flag,
  Search,
  FileText,
  Gift,
  CornerDownRight,
  ChevronDown,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type UtmParams,
  type CustomParam,
  type UtmTemplate,
  POPULAR_UTM_PRESETS,
  saveUtmTemplate,
  buildUrlWithUtms,
  fetchUtmTemplatesApi,
  createUtmTemplateApi,
} from '../utils/utmUtils';
import toast from 'react-hot-toast';

interface UtmModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string;
  initialUtms: UtmParams;
  initialCustomParams: CustomParam[];
  onSave: (utms: UtmParams, customParams: CustomParam[]) => void;
}

export const UtmModal: React.FC<UtmModalProps> = ({
  isOpen,
  onClose,
  baseUrl,
  initialUtms,
  initialCustomParams,
  onSave,
}) => {
  const [utms, setUtms] = useState<UtmParams>(initialUtms);
  const [customParams, setCustomParams] = useState<CustomParam[]>(initialCustomParams);
  const [templates, setTemplates] = useState<UtmTemplate[]>([]);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | number>('');
  const templatesRef = useRef<HTMLDivElement>(null);

  const previewUrl = React.useMemo(() => {
    const base = (baseUrl || '').trim() || 'https://example.com';
    return buildUrlWithUtms(base, utms, customParams);
  }, [baseUrl, utms, customParams]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUtms(initialUtms);
      setCustomParams(initialCustomParams);
      fetchUtmTemplatesApi().then((data) => setTemplates(data));
      setSelectedTemplateId('');
      setIsTemplatesOpen(false);
      setIsSaveTemplateOpen(false);
    }
  }, [isOpen, initialUtms, initialCustomParams]);

  // Click outside listener for templates dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(event.target as Node)) {
        setIsTemplatesOpen(false);
      }
    };
    if (isTemplatesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTemplatesOpen]);

  if (!isOpen) return null;

  const handleUtmChange = (field: keyof UtmParams, value: string) => {
    setUtms((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyPreset = (presetUtms: Partial<UtmParams>, presetName: string) => {
    setUtms((prev) => ({
      ...prev,
      ...presetUtms,
    }));
    setSelectedTemplateId(presetName);
    setIsTemplatesOpen(false);
    toast.success(`Applied ${presetName} template`);
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

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    try {
      await createUtmTemplateApi(newTemplateName, utms, customParams);
      const updated = await fetchUtmTemplatesApi();
      setTemplates(updated);
      setNewTemplateName('');
      setIsSaveTemplateOpen(false);
      toast.success('Template saved');
    } catch {
      const updated = saveUtmTemplate(newTemplateName, utms, customParams);
      setTemplates(updated);
      setNewTemplateName('');
      setIsSaveTemplateOpen(false);
      toast.success('Template saved');
    }
  };

  const handleApplyTemplate = (template: UtmTemplate) => {
    setSelectedTemplateId(template.id);
    setUtms(template.utms);
    setCustomParams(
      (template.customParams || []).map((cp) => ({
        id: Math.random().toString(36).substring(2, 9),
        key: cp.key,
        value: cp.value,
      }))
    );
    setIsTemplatesOpen(false);
    toast.success(`Applied template "${template.name}"`);
  };

  const handleSaveAndClose = () => {
    onSave(utms, customParams);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl w-full max-w-[440px] overflow-visible flex flex-col z-[251] relative p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold text-foreground">UTM Builder</h2>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              title="Add UTM tracking parameters to measure marketing performance"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6 Unified Dub.co Input Rows */}
        <div className="space-y-2.5">
          {/* Source */}
          <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <div className="w-28 shrink-0 px-3 py-2 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Source</span>
            </div>
            <input
              type="text"
              value={utms.source}
              onChange={(e) => handleUtmChange('source', e.target.value)}
              placeholder="google"
              className="flex-1 px-3 py-2 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Medium */}
          <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <div className="w-28 shrink-0 px-3 py-2 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
              <Radio className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Medium</span>
            </div>
            <input
              type="text"
              value={utms.medium}
              onChange={(e) => handleUtmChange('medium', e.target.value)}
              placeholder="cpc"
              className="flex-1 px-3 py-2 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Campaign */}
          <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <div className="w-28 shrink-0 px-3 py-2 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
              <Flag className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Campaign</span>
            </div>
            <input
              type="text"
              value={utms.campaign}
              onChange={(e) => handleUtmChange('campaign', e.target.value)}
              placeholder="summer sale"
              className="flex-1 px-3 py-2 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Term */}
          <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <div className="w-28 shrink-0 px-3 py-2 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Term</span>
            </div>
            <input
              type="text"
              value={utms.term}
              onChange={(e) => handleUtmChange('term', e.target.value)}
              placeholder="running shoes"
              className="flex-1 px-3 py-2 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Content */}
          <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <div className="w-28 shrink-0 px-3 py-2 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Content</span>
            </div>
            <input
              type="text"
              value={utms.content}
              onChange={(e) => handleUtmChange('content', e.target.value)}
              placeholder="logo link"
              className="flex-1 px-3 py-2 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Referral */}
          <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <div className="w-28 shrink-0 px-3 py-2 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
              <Gift className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Referral</span>
            </div>
            <input
              type="text"
              value={utms.ref || ''}
              onChange={(e) => handleUtmChange('ref', e.target.value)}
              placeholder="yoursite.com"
              className="flex-1 px-3 py-2 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Custom Parameters List */}
          {customParams.map((param) => (
            <div
              key={param.id}
              className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/20 transition-all"
            >
              <div className="w-28 shrink-0 px-3 py-2 bg-secondary/30 border-r border-input text-xs font-medium text-foreground flex items-center gap-2 select-none">
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
                className="flex-1 px-3 py-2 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => handleRemoveCustomParam(param.id)}
                className="px-2.5 py-2 text-muted-foreground hover:text-rose-500 transition-colors"
                title="Remove parameter"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add Custom Parameter Action */}
          <div className="pt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddCustomParam}
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add custom parameter</span>
            </button>
          </div>

          {/* URL Preview matching Dub.co */}
          <div className="pt-2 space-y-1.5">
            <label className="text-xs font-medium text-foreground">URL Preview</label>
            <div className="rounded-lg border border-input bg-secondary/30 px-3 py-2.5 text-xs font-mono text-muted-foreground/90 break-all select-all leading-relaxed whitespace-normal max-h-32 overflow-y-auto">
              {previewUrl}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 mt-2 relative">
          {/* Templates Tag-Style Dropdown Menu */}
          <div className="relative" ref={templatesRef}>
            <button
              type="button"
              onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-secondary/50 hover:bg-secondary border border-input text-foreground transition-all cursor-pointer select-none"
            >
              <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Templates</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
            </button>

            {/* Tag-Style Popover Menu */}
            <AnimatePresence>
              {isTemplatesOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.12 }}
                  className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-xl shadow-2xl p-2.5 space-y-2 z-[260]"
                >
                  {/* Save Current as Template Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTemplatesOpen(false);
                      setIsSaveTemplateOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save current as template</span>
                  </button>

                  <div className="border-t border-border pt-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 block mb-1.5">
                      Platform Presets
                    </span>
                    <div className="flex flex-wrap gap-1 px-1">
                      {POPULAR_UTM_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset.utms, preset.name)}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1 ${
                            selectedTemplateId === preset.name
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-secondary hover:bg-secondary/80 border-border text-foreground'
                          }`}
                        >
                          {selectedTemplateId === preset.name && <Check className="w-3 h-3 text-primary" />}
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {templates.length > 0 && (
                    <div className="border-t border-border pt-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 block mb-1.5">
                        Saved Templates
                      </span>
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {templates.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleApplyTemplate(t)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              selectedTemplateId === t.id
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-secondary text-foreground'
                            }`}
                          >
                            <span className="truncate">{t.name}</span>
                            {selectedTemplateId === t.id && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors border border-transparent cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-4 py-2 text-xs font-semibold text-foreground bg-secondary/80 hover:bg-secondary border border-border rounded-lg transition-all cursor-pointer shadow-none"
            >
              Save
            </button>
          </div>
        </div>
      </motion.div>

      {/* Save Template Modal */}
      <AnimatePresence>
        {isSaveTemplateOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Save as Template</h3>
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Template name (e.g. Summer Campaign)"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full text-xs bg-background border border-input focus:border-primary rounded-lg px-3 py-2 text-foreground focus:outline-none"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSaveTemplateOpen(false)}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                  >
                    Save Template
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
