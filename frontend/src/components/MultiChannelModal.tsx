import React from 'react';
import CreateLinkModal from './CreateLinkModal';
import type { Tag as TagType, Folder as FolderType } from '../types';

export interface MultiChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  folders?: FolderType[];
  tags?: TagType[];
  defaultFolderId?: number | null;
}

export const MultiChannelModal: React.FC<MultiChannelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  folders = [],
  tags = [],
  defaultFolderId,
}) => {
  return (
    <CreateLinkModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess || (() => {})}
      folders={folders}
      tags={tags}
      defaultFolderId={defaultFolderId || undefined}
      initialMode="multi"
    />
  );
};

export default MultiChannelModal;
