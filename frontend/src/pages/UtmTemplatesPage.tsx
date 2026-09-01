import React, { useState, useEffect } from 'react';
import {
  Search,
  MoreVertical,
  Trash2,
  SlidersHorizontal,
  Pen,
  Plus,
  CornerDownRight,
  Globe,
  Radio,
  Flag,
} from 'lucide-react';
import {
  getSavedUtmTemplates,
  deleteUtmTemplate,
  deleteUtmTemplateApi,
  fetchUtmTemplatesApi,
  type UtmTemplate,
} from '../utils/utmUtils';
import { UtmTemplateModal } from '../components/UtmTemplateModal';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { useOutletContext } from 'react-router-dom';
import type { DashboardLayoutContext } from '../layouts/DashboardLayout';

export const UtmTemplatesPage: React.FC = () => {
  const outletCtx = useOutletContext<DashboardLayoutContext | undefined>();
  const [localTemplates, setLocalTemplates] = useState<UtmTemplate[]>([]);
  const [localTemplateToEdit, setLocalTemplateToEdit] = useState<UtmTemplate | null>(null);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  const templates = outletCtx?.templates ?? localTemplates;
  const setTemplates = outletCtx?.setTemplates ?? setLocalTemplates;
  const setIsCreateUtmTemplateModalOpen = outletCtx?.setIsCreateUtmTemplateModalOpen;
  const setUtmTemplateToEdit = outletCtx?.setUtmTemplateToEdit;

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

  const handleOpenCreate = () => {
    if (setIsCreateUtmTemplateModalOpen && setUtmTemplateToEdit) {
      setUtmTemplateToEdit(null);
      setIsCreateUtmTemplateModalOpen(true);
    } else {
      setLocalTemplateToEdit(null);
      setIsLocalModalOpen(true);
    }
  };

  const handleOpenEdit = (template: UtmTemplate) => {
    if (setIsCreateUtmTemplateModalOpen && setUtmTemplateToEdit) {
      setUtmTemplateToEdit(template);
      setIsCreateUtmTemplateModalOpen(true);
    } else {
      setLocalTemplateToEdit(template);
      setIsLocalModalOpen(true);
    }
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
      {/* Top Search Bar */}
      <div className="flex items-center justify-between gap-4">
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
            const hasSource = Boolean(template.utms.source);
            const hasMedium = Boolean(template.utms.medium);
            const hasCampaign = Boolean(template.utms.campaign);

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

                  {/* Parameter Tags Preview */}
                  <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto text-[11px] text-muted-foreground">
                    {hasSource && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border">
                        <Globe className="w-2.5 h-2.5" />
                        <span>{template.utms.source}</span>
                      </span>
                    )}
                    {hasMedium && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border">
                        <Radio className="w-2.5 h-2.5" />
                        <span>{template.utms.medium}</span>
                      </span>
                    )}
                    {hasCampaign && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border">
                        <Flag className="w-2.5 h-2.5" />
                        <span>{template.utms.campaign}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Date & 3-Dot Actions */}
                <div className="flex items-center gap-3">
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
                          className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-xl shadow-lg z-50 p-1 flex flex-col gap-0.5"
                        >
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
          onClose={() => {
            setIsLocalModalOpen(false);
            setLocalTemplateToEdit(null);
          }}
          onSuccess={(updated) => setTemplates(updated)}
        />
      )}
    </motion.div>
  );
};

export default UtmTemplatesPage;
