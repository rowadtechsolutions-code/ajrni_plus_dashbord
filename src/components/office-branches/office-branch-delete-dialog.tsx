'use client';

import { useTranslation } from '@/i18n/provider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { OfficeBranch } from '@/types';

interface OfficeBranchDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  branch: OfficeBranch | null;
  loading: boolean;
}

export function OfficeBranchDeleteDialog({
  isOpen, onClose, onConfirm, branch, loading,
}: OfficeBranchDeleteDialogProps) {
  const { t } = useTranslation();
  const tb = t.officeBranches;

  if (!branch) return null;

  const message = tb.confirmDelete.replace('{branchName}', branch.branch_name);

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t.common.delete}
      message={`${message}\n${tb.confirmDeleteDescription}`}
      variant="danger"
      loading={loading}
    />
  );
}
