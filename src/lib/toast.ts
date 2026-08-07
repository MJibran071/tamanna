import { toast } from 'sonner';

export function showCopyToast() {
  toast.success('Copied to clipboard');
}

export function showPinToast(pinned: boolean) {
  toast.success(pinned ? 'Message pinned' : 'Message unpinned');
}

export function showExportToast() {
  toast.success('Conversation exported');
}

export function showDeleteToast() {
  toast.success('Conversation deleted');
}

export function showErrorToast(message: string) {
  toast.error(message);
}

export function showInfoToast(message: string) {
  toast.info(message);
}
