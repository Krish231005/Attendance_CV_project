import React, { useState, useRef, ChangeEvent } from 'react';
import * as faceapi from 'face-api.js';
import { UserPlus, Upload, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Person } from '../types';

interface RegistrationProps {
  onAddPerson: (person: Person) => void;
  modelsLoaded: boolean;
}

export default function Registration({ onAddPerson, modelsLoaded }: RegistrationProps) {
  const [name, setName] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file: File) => {
      // Filter for image files only
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|avif)$/i);
      if (!isImage) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string].slice(0, 10));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }
    if (!modelsLoaded) {
      setError('Models are still loading...');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const descriptors: Float32Array[] = [];
      
      for (const imgData of images) {
        const img = await faceapi.fetchImage(imgData);
        const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        if (detection) {
          descriptors.push(detection.descriptor);
        }
      }

      if (descriptors.length === 0) {
        throw new Error('No faces detected in the uploaded images. Please try clearer photos.');
      }

      const newPerson: Person = {
        id: crypto.randomUUID(),
        name,
        images,
        descriptors
      };

      onAddPerson(newPerson);
      setName('');
      setImages([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process images');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-app-card border border-app-border rounded-xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-app-border flex items-center justify-between bg-app-card">
        <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-tight">
          <UserPlus className="w-4 h-4 text-app-primary" />
          Enroll New Subject
        </h2>
        <div className="text-[10px] font-bold text-app-subtle uppercase tracking-widest">
          Step 01: Data Acquisition
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter subject name..."
            className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-app-primary/50 transition-colors placeholder:text-app-subtle"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Dataset (Max 10 Images)</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-app-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-app-bg hover:border-app-primary/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-app-bg flex items-center justify-center group-hover:scale-110 transition-transform border border-app-border">
              <Upload className="w-5 h-5 text-app-subtle group-hover:text-app-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">Click to upload training samples</p>
              <p className="text-[10px] text-app-subtle mt-1 uppercase font-bold">PNG, JPG up to 10MB</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-5 gap-2">
            {images.map((img, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-app-border group">
                <img src={img} alt={`sample-${index}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { setName(''); setImages([]); }}
            className="px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest border border-app-border bg-app-card text-app-text hover:bg-app-bg transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleRegister}
            disabled={isProcessing || !modelsLoaded}
            className={cn(
              "flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              isProcessing || !modelsLoaded
                ? "bg-app-bg text-app-subtle cursor-not-allowed border border-app-border"
                : "bg-app-primary text-white hover:bg-blue-600 shadow-sm"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing CNN Model...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Train CNN Model
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
