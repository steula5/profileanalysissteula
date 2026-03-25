import { useCallback, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const VALID_EXTENSIONS = new Set(['xlsx', 'xls', 'csv']);

interface UploadedFile {
  file: File;
  name: string;
  uploadedAt: Date;
}

interface FileUploadProps {
  onFilesReady: (files: File[]) => Promise<void> | void;
  isProcessing: boolean;
}

export function FileUpload({ onFilesReady, isProcessing }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const valid = Array.from(newFiles).filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return !!extension && VALID_EXTENSIONS.has(extension);
    });
    if (valid.length === 0) return;
    setFiles((prev) => {
      const existingKeys = new Set(prev.map(({ file }) => `${file.name}-${file.size}-${file.lastModified}`));
      const uploaded = valid
        .filter((file) => {
          const key = `${file.name}-${file.size}-${file.lastModified}`;
          return !existingKeys.has(key);
        })
        .map((file) => ({ file, name: file.name, uploadedAt: new Date() }));

      return [...prev, ...uploaded];
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;

    await onFilesReady(files.map((uploadedFile) => uploadedFile.file));
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Base de pedidos</p>
              <p className="text-xs text-muted-foreground">Arquivos .xlsx, .xls ou .csv</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>Selecionar arquivos</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
            </label>

            <Button onClick={handleAnalyze} disabled={isProcessing || files.length === 0} size="sm">
              {isProcessing ? 'Processando...' : 'Analisar'}
            </Button>
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {f.uploadedAt.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFile(i)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
