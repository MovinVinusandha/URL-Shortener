import React, { useState, useEffect } from 'react';
import {
  Search,
  MoreVertical,
  Trash2,
  SlidersHorizontal,
  Pen,
  Copy,
  Plus,
  CornerDownRight,
  Globe,
  Radio,
  Flag,
  FileText,
  Gift,
  Sparkles,
  Star,
  Layers,
} from 'lucide-react';
import {
  getSavedUtmTemplates,
  deleteUtmTemplate,
  deleteUtmTemplateApi,
  toggleDefaultUtmTemplate,
  toggleDefaultUtmTemplateApi,
  fetchUtmTemplatesApi,
  type UtmTemplate,
} from '../utils/utmUtils';
import { UtmTemplateModal } from '../components/UtmTemplateModal';
import { MultiChannelModal } from '../components/MultiChannelModal';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { useOutletContext } from 'react-router-dom';
import type { DashboardLayoutContext } from '../layouts/DashboardLayout';

export const UtmTemplatesPage: React.FC = () => {
  const outletCtx = useOutletContext<DashboardLayoutContext | undefined>();
  const [localTemplates, setLocalTemplates] = useState<UtmTemplate[]>([]);
  const [localTemplateToEdit, setLocalTemplateToEdit] = useState<UtmTemplate | null>(null);
  const [localTemplateToDuplicate, setLocalTemplateToDuplicate] = useState<UtmTemplate | null>(null);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isMultiChannelModalOpen, setIsMultiChannelModalOpen] = useState(false);

  const templates = outletCtx?.templates ?? localTemplates;
  const setTemplates = outletCtx?.setTemplates ?? setLocalTemplates;
  const setIsCreateUtmTemplateModalOpen = outletCtx?.setIsCreateUtmTemplateModalOpen;
  const setUtmTemplateToEdit = outletCtx?.setUtmTemplateToEdit;
  const setUtmTemplateToDuplicate = outletCtx?.setUtmTemplateToDuplicate;

  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<UtmTemplate | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (!outletCtx?.templates) {
      setLocalTemplates(getSavedUtmTemplates());
    }
  }, [outletCtx]);

  const handleDelete = async (id: string | number) => {
    try {
      await deleteUtmTemplateApi(id);
      const updated = await fetchUtmTemplatesApi();
      setTemplates(updated);
      toast.success('Template deleted');
    } catch {
      const updated = deleteUtmTemplate(id);
      setTemplates(updated);
      toast.success('Template deleted');
    } finally {
      setTemplateToDelete(null);
      setOpenMenuId(null);
    }
  };

  const handleToggleDefault = async (template: UtmTemplate) => {
    try {
      await toggleDefaultUtmTemplateApi(template.id);
      const updated = await fetchUtmTemplatesApi();
      setTemplates(updated);
      toast.success(template.isDefault ? 'Default template removed' : 'Default template updated');
    } catch {
      const updated = toggleDefaultUtmTemplate(template.id);
      setTemplates(updated);
      toast.success(template.isDefault ? 'Default template removed' : 'Default template updated');
    }
  };

  const handleOpenCreate = () => {
    if (setIsCreateUtmTemplateModalOpen) {
      if (setUtmTemplateToEdit) setUtmTemplateToEdit(null);
      if (setUtmTemplateToDuplicate) setUtmTemplateToDuplicate(null);
      setIsCreateUtmTemplateModalOpen(true);
    } else {
      setLocalTemplateToEdit(null);
      setLocalTemplateToDuplicate(null);
      setIsLocalModalOpen(true);
    }
  };

  const handleOpenEdit = (template: UtmTemplate) => {
    if (setIsCreateUtmTemplateModalOpen) {
      if (setUtmTemplateToDuplicate) setUtmTemplateToDuplicate(null);
      if (setUtmTemplateToEdit) setUtmTemplateToEdit(template);
      setIsCreateUtmTemplateModalOpen(true);
    } else {
      setLocalTemplateToDuplicate(null);
      setLocalTemplateToEdit(template);
      setIsLocalModalOpen(true);
    }
  };

  const handleOpenDuplicate = (template: UtmTemplate) => {
    if (setIsCreateUtmTemplateModalOpen) {
      if (setUtmTemplateToEdit) setUtmTemplateToEdit(null);
      if (setUtmTemplateToDuplicate) setUtmTemplateToDuplicate(template);
      setIsCreateUtmTemplateModalOpen(true);
    } else {
      setLocalTemplateToEdit(null);
      setLocalTemplateToDuplicate(template);
      setIsLocalModalOpen(true);
    }
  };

  const getTemplateParams = (template: UtmTemplate) => {
    const list: { key: string; label: string; value: string; icon: React.ReactNode }[] = [];
    if (template.utms.source) {
      list.push({
        key: 'source',
        label: 'Source',
        value: template.utms.source,
        icon: <Globe className="w-2.5 h-2.5 shrink-0" />,
      });
    }
    if (template.utms.medium) {
      list.push({
        key: 'medium',
        label: 'Medium',
        value: template.utms.medium,
        icon: <Radio className="w-2.5 h-2.5 shrink-0" />,
      });
    }
    if (template.utms.campaign) {
      list.push({
        key: 'campaign',
        label: 'Campaign',
        value: template.utms.campaign,
        icon: <Flag className="w-2.5 h-2.5 shrink-0" />,
      });
    }
    if (template.utms.term) {
      list.push({
        key: 'term',
        label: 'Term',
        value: template.utms.term,
        icon: <Search className="w-2.5 h-2.5 shrink-0" />,
      });
    }
    if (template.utms.content) {
      list.push({
        key: 'content',
        label: 'Content',
        value: template.utms.content,
        icon: <FileText className="w-2.5 h-2.5 shrink-0" />,
      });
    }
    if (template.utms.ref) {
      list.push({
        key: 'ref',
        label: 'Referral',
        value: template.utms.ref,
        icon: <Gift className="w-2.5 h-2.5 shrink-0" />,
      });
    }
    if (template.customParams && template.customParams.length > 0) {
      template.customParams.forEach((cp, idx) => {
        if (cp.key && cp.key.trim()) {
          list.push({
            key: `custom_${idx}_${cp.key}`,
            label: cp.key,
            value: cp.value ? `${cp.key}=${cp.value}` : cp.key,
            icon: <Sparkles className="w-2.5 h-2.5 shrink-0" />,
          });
        }
      });
    }
    return list;
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.utms.source.toLowerCase().includes(search.toLowerCase()) ||
    t.utms.campaign.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 py-4 flex flex-col gap-4 w-full"
    >
      {/* Top Search Bar & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search UTM templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors bg-background text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsMultiChannelModalOpen(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-background hover:bg-secondary text-foreground text-xs font-medium transition-all cursor-pointer shadow-xs"
        >
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span>Multi-Channel Campaign</span>
        </button>
      </div>

      {/* Templates List */}
      <div className="bg-background border border-border rounded-xl overflow-visible flex flex-col divide-y divide-border" ref={menuRef}>
        {filteredTemplates.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-secondary/60 border border-border/80 flex items-center justify-center mb-3.5 text-muted-foreground shadow-sm">
              <SlidersHorizontal className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No UTM templates found</h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              {search
                ? 'No templates match your search query.'
                : 'Create reusable UTM templates to standardize campaign tracking across your links.'}
            </p>
            {!search && (
              <button
                onClick={handleOpenCreate}
                className="btn-solid text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create template
              </button>
            )}
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const paramsList = getTemplateParams(template);
            const visibleParams = paramsList.slice(0, 3);
            const remainingCount = paramsList.length - 3;
            const remainingTooltip =
              remainingCount > 0
                ? paramsList
                    .slice(3)
                    .map((p) => `${p.label}: ${p.value}`)
                    .join(', ')
                : undefined;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                key={template.id}
                className="group relative flex items-center justify-between p-4 hover:bg-neutral-100/70 dark:hover:bg-[#111114] transition-all first:rounded-t-xl last:rounded-b-xl"
              >
                {/* Left: Template Name & Parameter Badges */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 bg-secondary/40 text-foreground">
                    <CornerDownRight className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground truncate">{template.name}</span>
                  </div>

                  {/* Parameter Tags Preview (Max 3, +count for extra) */}
                  <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto text-[11px] text-muted-foreground">
                    {visibleParams.map((param) => (
                      <span
                        key={param.key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border shrink-0"
                        title={`${param.label}: ${param.value}`}
                      >
                        {param.icon}
                        <span className="truncate max-w-[120px]">{param.value}</span>
                      </span>
                    ))}
                    {remainingCount > 0 && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-secondary/80 border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-default shrink-0"
                        title={remainingTooltip}
                      >
                        +{remainingCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Default Badge, Date & 3-Dot Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {template.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      <span>Default</span>
                    </span>
                  )}

                  <span className="text-xs text-muted-foreground hidden md:inline-block">
                    {template.createdAt ? format(new Date(template.createdAt), 'MMM d, yyyy') : 'Recently'}
                  </span>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === template.id ? null : template.id);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {openMenuId === template.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ duration: 0.1 }}
                          className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-xl shadow-lg z-50 p-1 flex flex-col gap-0.5"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleToggleDefault(template);
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors w-full text-left cursor-pointer"
                          >
                            <Star className={`w-3.5 h-3.5 ${template.isDefault ? 'fill-amber-500 text-amber-500' : ''}`} />
                            <span>{template.isDefault ? 'Remove Default' : 'Set as Default'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleOpenEdit(template);
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors w-full text-left cursor-pointer"
                          >
                            <Pen className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleOpenDuplicate(template);
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors w-full text-left cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setTemplateToDelete(template);
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors w-full text-left cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {templateToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4"
            >
              <div>
                <h3 className="text-sm font-semibold text-foreground">Delete Template</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete the "{templateToDelete.name}" template? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTemplateToDelete(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(templateToDelete.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors"
                >
                  Delete Template
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Local Fallback Modal (for testing or standalone rendering) */}
      {!setIsCreateUtmTemplateModalOpen && (
        <UtmTemplateModal
          isOpen={isLocalModalOpen}
          templateToEdit={localTemplateToEdit}
          templateToDuplicate={localTemplateToDuplicate}
          onClose={() => {
            setIsLocalModalOpen(false);
            setLocalTemplateToEdit(null);
            setLocalTemplateToDuplicate(null);
          }}
          onSuccess={(updated) => setTemplates(updated)}
        />
      )}

      {/* Multi-Channel Batch Modal */}
      {isMultiChannelModalOpen && (
        <MultiChannelModal
          isOpen={isMultiChannelModalOpen}
          onClose={() => setIsMultiChannelModalOpen(false)}
          onSuccess={() => setIsMultiChannelModalOpen(false)}
          folders={outletCtx?.folders}
          tags={outletCtx?.tags}
          defaultFolderId={outletCtx?.activeFolderId}
        />
      )}
    </motion.div>
  );
};

export default UtmTemplatesPage;
