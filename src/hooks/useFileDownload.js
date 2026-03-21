'use client';

import { useState } from 'react';
import { getFileUrl } from '@/actions/files/files';
import { toast } from 'sonner';

/**
 * Handles file download via signed URL.
 * @param {string} fileId
 */
export function useFileDownload(fileId) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e) => {
    e?.stopPropagation();
    setIsDownloading(true);
    try {
      const result = await getFileUrl(fileId);
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
