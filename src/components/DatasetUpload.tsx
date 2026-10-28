import React, { useState, useRef, ChangeEvent } from 'react';
import * as faceapi from 'face-api.js';
import { motion } from 'motion/react';
import { FolderUp, Loader2, CheckCircle2, AlertCircle, X, Terminal, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { Person } from '../types';

interface DatasetUploadProps {
  onAddPerson: (person: Person) => void;
  modelsLoaded: boolean;
}

interface ProcessingStatus {
  total: number;
  current: number;
  studentName: string;
  step: string;
}

export default function DatasetUpload({ onAddPerson, modelsLoaded }: DatasetUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('webkitdirectory', '');
      fileInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 50));
  };

  const handleFolderUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setLogs([]);
    addLog(`Scanning ${files.length} files...`);

    // Group files by student name (subfolder)
    // webkitRelativePath example: "dataset/John Doe/photo1.jpg"
    const groups: Record<string, File[]> = {};
    
    files.forEach((file: any) => {
      // Filter for image files only and ignore system/metadata files
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|avif)$/i);
      const isSystemFile = file.name.startsWith('.') || file.name.startsWith('_') || file.name.toLowerCase() === 'thumbs.db';
      
      if (!isImage || isSystemFile) {
        return;
      }

      const pathParts = file.webkitRelativePath.split('/');
      if (pathParts.length >= 2) {
        // Find the student name part
        // If we drop a folder "Root", path is "Root/Student/file.jpg" -> parts are ["Root", "Student", "file.jpg"]
        // The student name should be the part before the filename if we assume a standard structure.
        // Let's try to be smart: the student name is the folder name containing the file.
        const studentName = pathParts[pathParts.length - 2];
        if (studentName && studentName !== '.') {
          if (!groups[studentName]) groups[studentName] = [];
          groups[studentName].push(file);
        }
      }
    });

    const students = Object.keys(groups);
    addLog(`Detected ${students.length} students in dataset.`);

    if (students.length === 0) {
      setError("No valid student folders found. Please ensure the structure is: Folder/StudentName/Photos");
      setIsProcessing(false);
      return;
    }

    try {
      for (let i = 0; i < students.length; i++) {
        const name = students[i];
        try {
          const studentFiles = groups[name].slice(0, 10); // Limit to 10 photos as requested
          
          setStatus({
            total: students.length,
            current: i + 1,
            studentName: name,
            step: `Processing ${studentFiles.length} photos...`
          });
          addLog(`Training CNN for: ${name} (${studentFiles.length} samples)`);

          const descriptors: Float32Array[] = [];
          const base64Images: string[] = [];

          for (const file of studentFiles) {
            // Read file as data URL
            const imgData = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            
            // Check if read failed (e.g. not a valid data URL)
            if (!imgData.startsWith('data:image/')) {
              addLog(`Warning: File ${file.name} for ${name} is not a valid image format. Skipping.`);
              continue;
            }

            base64Images.push(imgData);

            const img = await faceapi.fetchImage(imgData);
            const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptor();
            
            if (detection) {
              descriptors.push(detection.descriptor);
            }
          }

          if (descriptors.length > 0) {
            const newPerson: Person = {
              id: crypto.randomUUID(),
              name,
              images: base64Images,
              descriptors
            };
            onAddPerson(newPerson);
            addLog(`Success: ${name} registered with ${descriptors.length} descriptors.`);
          } else {
            addLog(`Warning: No faces detected for ${name}. Skipping student.`);
          }
        } catch (studentErr) {
          console.error(`Error processing ${name}:`, studentErr);
          addLog(`Error: Failed to process ${name}. ${studentErr instanceof Error ? studentErr.message : 'Unknown error'}`);
        }
      }
      
      addLog("Dataset ingestion complete!");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error processing dataset');
    } finally {
      setIsProcessing(false);
      setStatus(null);
    }
  };

  return (
    <div className="bg-app-card border border-app-border rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="p-5 border-b border-app-border flex items-center justify-between bg-app-card">
        <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-tight">
          <FolderUp className="w-4 h-4 text-app-primary" />
          Bulk Dataset Ingestion
        </h2>
        <div className="text-[10px] font-bold text-app-subtle uppercase tracking-widest">
          CNN Automated Batch Training
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {!isProcessing ? (
          <div className="space-y-6">
            <div className="bg-app-info-bg/30 border border-app-info-text/20 rounded-lg p-4 flex gap-3">
              <FileText className="w-5 h-5 text-app-info-text shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-app-info-text uppercase">Structure Requirements</p>
                <div className="text-[10px] text-app-muted leading-relaxed font-mono">
                  dataset_folder/<br/>
                  ├── student_a/<br/>
                  │   └── photo1.jpg ... photo10.jpg<br/>
                  └── student_b/<br/>
                      └── photo1.jpg ... photo10.jpg
                </div>
              </div>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-app-border rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-app-bg hover:border-app-primary/30 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-app-bg flex items-center justify-center group-hover:scale-110 transition-transform border border-app-border">
                <FolderUp className="w-7 h-7 text-app-subtle group-hover:text-app-primary" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold">Select Dataset Root Folder</p>
                <p className="text-[10px] text-app-subtle mt-1 uppercase font-bold tracking-widest">Drop folder or click to browse</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFolderUpload}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-app-bg p-8 rounded-xl border border-app-border flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-app-primary" />
              <div>
                <p className="text-lg font-bold">Processing System Dataset</p>
                <p className="text-xs text-app-muted uppercase tracking-widest mt-1">
                  Student {status?.current} of {status?.total}
                </p>
              </div>
              
              <div className="w-full max-w-sm space-y-2 mt-4">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-app-primary">{status?.studentName}</span>
                  <span className="text-app-muted">{Math.round((status?.current || 0) / (status?.total || 1) * 100)}%</span>
                </div>
                <div className="w-full h-1 bg-app-border rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-app-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${((status?.current || 0) / (status?.total || 1)) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-app-subtle font-mono animate-pulse">{status?.step}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-app-muted flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                Processing Logs
              </label>
              <div className="bg-black/90 rounded-lg p-4 font-mono text-[10px] h-40 overflow-y-auto border border-white/5 space-y-1 scrollbar-hide">
                {logs.map((log, i) => (
                  <div key={i} className={cn(
                    log.includes('Success') ? "text-app-success" : 
                    log.includes('Warning') ? "text-yellow-500" : 
                    log.includes('Error') ? "text-red-500" : "text-white/60"
                  )}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs font-medium mt-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
