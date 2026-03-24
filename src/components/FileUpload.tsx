import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface UploadedFile {
  file: File;
  name: string;
  uploadedAt: Date;
}

interface FileUploadProps {
  onFilesReady: (files: File[]) => void;
  isProcessing: boolean;
}

export function FileUpload({ onFilesReady, isProcessing }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const valid = Array.from(newFiles).filter(f =>
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );
    if (valid.length === 0) return;
    const uploaded = valid.map(f => ({ file: f, name: f.name, uploadedAt: new Date() }));
    setFiles(prev => [...prev, ...uploaded]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    onFilesReady(files.map(f => f.file));
  };

  return (
    <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div
          className={`flex flex-col items-center gap-4 p-8 rounded-lg transition-colors ${dragOver ? 'bg-primary/5' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Upload de Base de Pedidos</h3>
            <p className="text-sm text-muted-foreground mt-1">Arraste arquivos .xlsx ou .csv aqui</p>
          </div>
          <label className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>Selecionar Arquivos</span>
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
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
            <Button onClick={handleAnalyze} disabled={isProcessing} className="w-full mt-3">
              {isProcessing ? 'Processando...' : 'Analisar Base de Pedidos'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
