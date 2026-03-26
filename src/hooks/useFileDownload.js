'use client';

import { createContext, useContext, useState } from 'react';
import { getFileUrl } from '@/actions/files/files';
import { toast } from 'sonner';

/**
 * Context for injecting a custom getFileUrl action.
 * Defaults to the standard anagrafica getFileUrl.
 * Use FileDownloadProvider to override for structure files.
 */
export const FileDownloadContext = createContext(getFileUrl);

/**
 * Handles file download via signed URL.
 * Reads the URL action from context, allowing structure pages to inject getStructureFileUrl.
 * @param {string} fileId
 */
export function useFileDownload(fileId) {
  const getUrlAction = useContext(FileDownloadContext);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e) => {
    e?.stopPropagation();
    setIsDownloading(true);
    try {
      const result = await getUrlAction(fileId);
      if (result.error) {
        toast.error(result.message || 'Failed to get download URL');
        return;
      }
      window.open(result.url, '_blank');
      toast.success('Opening file...');
    } catch (error) {
      console.error('[DOWNLOAD_ERROR]:', error);
      toast.error('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  };

  return { handleDownload, isDownloading };
}
