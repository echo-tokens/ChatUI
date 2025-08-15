import React, { useRef } from 'react';
import { PlusIcon } from 'lucide-react';
import { FileSources, FileContext } from 'librechat-data-provider';
import type { TFile } from 'librechat-data-provider';
import { OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle, Button, FileUpload } from '~/components';
import { useGetFiles } from '~/data-provider';
import { DataTable, columns } from './Table';
import { useLocalize, useFileHandling } from '~/hooks';

export default function Files({ open, onOpenChange }) {
  const localize = useLocalize();
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleFileChange } = useFileHandling();

  const { data: files = [] } = useGetFiles<TFile[]>({
    select: (files) =>
      files.map((file) => {
        file.context = file.context ?? FileContext.unknown;
        file.filterSource = file.source === FileSources.firebase ? FileSources.local : file.source;
        return file;
      }),
  });

  const handleUploadClick = () => {
    if (!inputRef.current) {
      return;
    }
    inputRef.current.value = '';
    inputRef.current.click();
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent
        title={localize('com_nav_my_files')}
        className="w-11/12 bg-background text-text-primary shadow-2xl"
      >
        <OGDialogHeader className="flex items-center justify-between">
          <OGDialogTitle>{localize('com_nav_my_files')}</OGDialogTitle>
          <FileUpload ref={inputRef} handleFileChange={handleFileChange}>
            <Button 
              className="bg-surface-primary text-text-primary border border-border-medium hover:bg-surface-hover transition-colors"
              onClick={handleUploadClick}
              size="sm"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {localize('com_ui_upload_files')}
            </Button>
          </FileUpload>
        </OGDialogHeader>
        <DataTable columns={columns} data={files} />
      </OGDialogContent>
    </OGDialog>
  );
}
