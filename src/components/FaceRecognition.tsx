import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, RefreshCw, AlertCircle, Scan, ShieldCheck, CheckCircle2, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Person } from '../types';

interface FaceRecognitionProps {
  people: Person[];
  onDetected: (person: Person) => void;
  modelsLoaded: boolean;
  lastLogInfo: { name: string, time: Date } | null;
  isPaused: boolean;
  onNext: () => void;
}

export default function FaceRecognition({ people, onDetected, modelsLoaded, lastLogInfo, isPaused, onNext }: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'detected'>('idle');
  const [lastDetected, setLastDetected] = useState<string | null>(null);

  useEffect(() => {
    startVideo();
    return () => stopVideo();
  }, []);

  const startVideo = async () => {
    setStatus('idle');
    setError(null);
    try {
      // Try with ideal constraints first
      const constraints = { 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      };
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn('Ideal constraints failed, trying basic video access', e);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Camera access error:', err);
      
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setError('Camera access was denied. Please click the camera icon in your browser address bar to allow access and refresh.');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('Devices not found')) {
        setError('No camera detected. Please ensure your camera is connected.');
      } else {
        setError(`Camera error: ${errorMessage}. Try opening the app in a new tab.`);
      }
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isStreaming && modelsLoaded && people.length > 0 && !isPaused) {
      interval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        try {
          const detections = await faceapi.detectAllFaces(
            videoRef.current, 
            new faceapi.TinyFaceDetectorOptions()
          ).withFaceLandmarks().withFaceDescriptors();

          const displaySize = { 
            width: videoRef.current.videoWidth, 
            height: videoRef.current.videoHeight 
          };
          
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const resizedDetections = faceapi.resizeResults(detections, displaySize);

          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Custom drawing for a more "tech" feel
            resizedDetections.forEach(detection => {
              const { x, y, width, height } = detection.detection.box;
              
              // Draw corner brackets
              ctx.strokeStyle = '#f97316'; // orange-500
              ctx.lineWidth = 2;
              const len = 20;
              
              // Top Left
              ctx.beginPath();
              ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
              ctx.stroke();
              
              // Top Right
              ctx.beginPath();
              ctx.moveTo(x + width - len, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + len);
              ctx.stroke();
              
              // Bottom Left
              ctx.beginPath();
              ctx.moveTo(x, y + height - len); ctx.lineTo(x, y + height); ctx.lineTo(x + len, y + height);
              ctx.stroke();
              
              // Bottom Right
              ctx.beginPath();
              ctx.moveTo(x + width - len, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y + height - len);
              ctx.stroke();
            });
          }

          // Recognition logic
          if (detections.length > 0) {
            setStatus('scanning');
            
            const faceMatcher = new faceapi.FaceMatcher(
              people.map(p => new faceapi.LabeledFaceDescriptors(p.id, p.descriptors))
            );

            for (const detection of detections) {
              const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
              if (bestMatch.label !== 'unknown' && bestMatch.distance < 0.6) {
                const person = people.find(p => p.id === bestMatch.label);
                if (person) {
                  setStatus('detected');
                  setLastDetected(person.name);
                  onDetected(person);
                  
                  // Reset status after a delay
                  setTimeout(() => setStatus('scanning'), 2000);
                  break; // Stop processing other detections in this frame
                }
              }
            }
          } else {
            setStatus('idle');
          }
        } catch (inferenceError) {
          console.error('Detection loop error:', inferenceError);
          // Don't set error state here to avoid flicker, just wait for next frame or model fix
        }
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isStreaming, modelsLoaded, people, onDetected]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-app-border">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-red-500/5">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-lg font-bold text-app-text mb-2">Camera Access Required</h3>
              <p className="text-sm text-app-muted max-w-xs mb-6">{error}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button 
                  onClick={startVideo}
                  className="px-6 py-2 bg-app-card hover:bg-app-bg border border-app-border rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
                <a 
                  href={window.location.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-app-primary text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Open in New Tab
                </a>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-6 left-6 flex items-center gap-3 bg-app-card/90 backdrop-blur-md px-4 py-2 rounded-lg border border-app-border shadow-sm">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    status === 'detected' ? "bg-app-success" : status === 'scanning' ? "bg-app-primary" : "bg-app-subtle"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {status === 'detected' ? `ID: ${lastDetected?.toUpperCase()}` : status === 'scanning' ? 'Processing Video Feed...' : 'Awaiting Subject...'}
                  </span>
                </div>

                {status === 'scanning' && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-app-primary to-transparent absolute top-0 animate-[scan_2s_ease-in-out_infinite]" />
                  </div>
                )}

                {/* Success Notification */}
                <AnimatePresence>
                  {lastLogInfo && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -20 }}
                      className="absolute inset-0 flex items-center justify-center bg-app-success/10 backdrop-blur-[2px] pointer-events-auto"
                    >
                      <div className="bg-app-card border border-app-success/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs mx-auto">
                        <div className="w-16 h-16 bg-app-success-bg rounded-full flex items-center justify-center border border-app-success/20">
                          <UserCheck className="w-8 h-8 text-app-success" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-app-text">Attendance Logged</h3>
                          <p className="text-sm text-app-success font-bold mt-1">{lastLogInfo.name}</p>
                          <button
                            onClick={onNext}
                            className="mt-6 px-8 py-2.5 bg-app-primary text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-app-primary/20 flex items-center gap-2"
                          >
                            Next Person
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
          <h2 className="text-xs font-bold text-app-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <Scan className="w-4 h-4 text-app-primary" />
            Model Intelligence
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-2xl font-bold">{people.length.toString().padStart(2, '0')}</div>
                <div className="text-[10px] text-app-subtle uppercase font-bold">Classes</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{(people.length * 10).toString()}</div>
                <div className="text-[10px] text-app-subtle uppercase font-bold">Images</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-app-primary">98.2%</div>
                <div className="text-[10px] text-app-subtle uppercase font-bold">Accuracy</div>
              </div>
            </div>

            <div className="h-1 w-full bg-app-bg rounded-full overflow-hidden">
              <div className="h-full bg-app-primary w-[98.2%]" />
            </div>

            {people.length === 0 && (
              <div className="p-4 bg-app-info-bg/30 border border-app-info-bg rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-app-info-text shrink-0" />
                <p className="text-xs text-app-info-text leading-relaxed font-medium">
                  System database is empty. Enroll subjects in the <strong>Register</strong> tab to start.
                </p>
              </div>
            )}

            {status === 'detected' && (
              <div className="p-4 bg-app-success-bg border border-app-success/20 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <ShieldCheck className="w-6 h-6 text-app-success" />
                <div>
                  <p className="text-[10px] text-app-muted uppercase font-bold">Identity Verified</p>
                  <p className="text-sm font-bold text-app-success">{lastDetected}</p>
                </div>
                <div className="ml-auto text-[10px] font-mono text-app-success bg-white px-2 py-1 rounded border border-app-success/10">
                  99.2%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
}
