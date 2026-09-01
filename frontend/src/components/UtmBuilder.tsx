import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  Sparkles,
  Plus,
  Trash2,
  Bookmark,
  X,
  SlidersHorizontal,
  HelpCircle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type UtmParams,
  type CustomParam,
  type UtmTemplate,
  POPULAR_UTM_PRESETS,
  getSavedUtmTemplates,
  saveUtmTemplate,
  deleteUtmTemplate,
} from '../utils/utmUtils';
import toast from 'react-hot-toast';

interface UtmBuilderProps {
  utms: UtmParams;
  customParams: CustomParam[];
  onChange: (utms: UtmParams, customParams: CustomParam[]) => void;
  onClear: () => void;
  defaultExpanded?: boolean;
}

export const UtmBuilder: React.FC<UtmBuilderProps> = ({
  utms,
  customParams,
  onChange,
  onClear,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [templates, setTemplates] = useState<UtmTemplate[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    setTemplates(getSavedUtmTemplates());
  }, []);

  const activeUtmCount =
    Object.values(utms).filter((val) => val.trim() !== '').length +
    customParams.filter((p) => p.key.trim() !== '').length;

  // Auto-expand if active parameters exist
  useEffect(() => {
    if (activeUtmCount > 0 && !isExpanded && defaultExpanded === false) {
      setIsExpanded(true);
    }
  }, [activeUtmCount]);

  const handleUtmChange = (field: keyof UtmParams, value: string) => {
    onChange(
      {
        ...utms,
        [field]: value,
      },
      customParams
    );
  };

  const handlePresetClick = (presetUtms: Partial<UtmParams>) => {
    onChange(
      {
        ...utms,
        ...presetUtms,
      },
      customParams
    );
    toast.success(`Applied ${presetUtms.source || 'preset'} UTM tags`);
  };

  const handleAddCustomParam = () => {
    const newParam: CustomParam = {
      id: Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
    };
    onChange(utms, [...customParams, newParam]);
  };

  const handleCustomParamChange = (id: string, field: 'key' | 'value', val: string) => {
    const updated = customParams.map((p) => (p.id === id ? { ...p, [field]: val } : p));
    onChange(utms, updated);
  };

  const handleRemoveCustomParam = (id: string) => {
    const updated = customParams.filter((p) => p.id !== id);
    onChange(utms, updated);
  };

  const handleRemoveSingleUtm = (field: keyof UtmParams) => {
    handleUtmChange(field, '');
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    const updated = saveUtmTemplate(newTemplateName, utms, customParams);
    setTemplates(updated);
    setNewTemplateName('');
    setIsTemplateModalOpen(false);
    toast.success('Template saved successfully');
  };

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const t = templates.find((item) => item.id === templateId);
    if (t) {
      const restoredCustom: CustomParam[] = (t.customParams || []).map((cp) => ({
        id: Math.random().toString(36).substring(2, 9),
        key: cp.key,
        value: cp.value,
      }));
      onChange(t.utms, restoredCustom);
      toast.success(`Applied template "${t.name}"`);
    }
  };

  const handleDeleteTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteUtmTemplate(templateId);
    setTemplates(updated);
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId('');
    }
    toast.success('Template deleted');
  };

  return (
    <div className="border border-border/80 rounded-xl bg-card overflow-hidden transition-all">
      {/* Header / Accordion Trigger */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">UTM Builder & Tracking</span>
          {activeUtmCount > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {activeUtmCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeUtmCount > 0 && (
            <button
              type="button"
              title="Clear all parameters"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                toast.success('Cleared UTM parameters');
              }}
              className="text-[11px] text-muted-foreground hover:text-rose-500 font-medium px-2 py-0.5 rounded hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Clear</span>
            </button>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Active Tags Quick Preview Pill Bar */}
      {activeUtmCount > 0 && !isExpanded && (
        <div className="px-3.5 py-1.5 border-t border-border/50 bg-secondary/10 flex flex-wrap gap-1.5 items-center">
          {Object.entries(utms).map(([key, val]) => {
            if (!val.trim()) return null;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-secondary border border-border text-foreground"
              >
                <span className="text-muted-foreground">{key.replace('utm_', '')}:</span>
                <span className="font-semibold text-primary">{val}</span>
              </span>
            );
          })}
          {customParams.map((p) => {
            if (!p.key.trim()) return null;
            return (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-secondary border border-border text-foreground"
              >
                <span className="text-muted-foreground">{p.key}:</span>
                <span className="font-semibold">{p.value}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Expandable Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="border-t border-border/60 p-3.5 space-y-4"
          >
            {/* 1. Quick Platform Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Quick Presets
                </span>

                {/* Templates Selector / Save Button */}
                <div className="flex items-center gap-1.5">
                  {templates.length > 0 && (
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleApplyTemplate(e.target.value)}
                      className="text-[11px] bg-secondary border border-border rounded-md px-2 py-0.5 text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="">Load Template...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    disabled={activeUtmCount === 0}
                    className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 px-2 py-0.5 rounded border border-border/60 hover:bg-secondary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Save current parameters as reusable template"
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {POPULAR_UTM_PRESETS.map((preset) => {
                  const isApplied =
                    utms.source.toLowerCase() === preset.utms.source?.toLowerCase() &&
                    utms.medium.toLowerCase() === preset.utms.medium?.toLowerCase();

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetClick(preset.utms)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                        isApplied
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm font-semibold'
                          : 'bg-secondary/40 hover:bg-secondary border-border text-foreground'
                      }`}
                    >
                      {isApplied && <Check className="w-3 h-3" />}
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Standard 5 UTM Parameter Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* utm_source */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <span>Referral / Source</span>
                    <span className="text-[10px] text-muted-foreground font-mono">(utm_source)</span>
                  </label>
                  {utms.source && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSingleUtm('source')}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={utms.source}
                  onChange={(e) => handleUtmChange('source', e.target.value)}
                  placeholder="e.g. twitter, newsletter, google"
                  className="w-full text-xs bg-background border border-input rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* utm_medium */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <span>Medium</span>
                    <span className="text-[10px] text-muted-foreground font-mono">(utm_medium)</span>
                  </label>
                  {utms.medium && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSingleUtm('medium')}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={utms.medium}
                  onChange={(e) => handleUtmChange('medium', e.target.value)}
                  placeholder="e.g. social, email, cpc, video"
                  className="w-full text-xs bg-background border border-input rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* utm_campaign */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <span>Campaign</span>
                    <span className="text-[10px] text-muted-foreground font-mono">(utm_campaign)</span>
                  </label>
                  {utms.campaign && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSingleUtm('campaign')}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={utms.campaign}
                  onChange={(e) => handleUtmChange('campaign', e.target.value)}
                  placeholder="e.g. summer_sale, product_launch"
                  className="w-full text-xs bg-background border border-input rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* utm_term */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <span>Term / Keyword</span>
                    <span className="text-[10px] text-muted-foreground font-mono">(utm_term)</span>
                  </label>
                  {utms.term && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSingleUtm('term')}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={utms.term}
                  onChange={(e) => handleUtmChange('term', e.target.value)}
                  placeholder="e.g. link_shortener, analytics"
                  className="w-full text-xs bg-background border border-input rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* utm_content */}
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <span>Content / Variant</span>
                    <span className="text-[10px] text-muted-foreground font-mono">(utm_content)</span>
                  </label>
                  {utms.content && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSingleUtm('content')}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={utms.content}
                  onChange={(e) => handleUtmChange('content', e.target.value)}
                  placeholder="e.g. top_cta_button, sidebar_promo, footer_link"
                  className="w-full text-xs bg-background border border-input rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* 3. Custom Query Parameters Section */}
            <div className="pt-2 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <span>Custom Query Parameters</span>
                  <span className="text-[10px] text-muted-foreground">(e.g. ref, affiliate_id)</span>
                </span>

                <button
                  type="button"
                  onClick={handleAddCustomParam}
                  className="text-xs text-primary hover:text-primary/90 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add parameter</span>
                </button>
              </div>

              {customParams.length > 0 && (
                <div className="space-y-1.5">
                  {customParams.map((param) => (
                    <div key={param.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Key (e.g. ref)"
                        value={param.key}
                        onChange={(e) => handleCustomParamChange(param.id, 'key', e.target.value)}
                        className="flex-1 text-xs bg-background border border-input rounded-md px-2.5 py-1.5 text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                      <span className="text-muted-foreground font-mono text-xs">=</span>
                      <input
                        type="text"
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => handleCustomParamChange(param.id, 'value', e.target.value)}
                        className="flex-1 text-xs bg-background border border-input rounded-md px-2.5 py-1.5 text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomParam(param.id)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove parameter"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Template Modal */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Save UTM Template</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Template Name</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Weekly Newsletter, Product Launch"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full text-xs bg-background border border-input rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors shadow-none"
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
