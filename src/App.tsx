/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Users, ClipboardCheck, Settings, ShieldCheck, UserPlus, Trash2, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';
import { Person, AttendanceRecord } from './types';

// Components
import Registration from './components/Registration';
import DatasetUpload from './components/DatasetUpload';
import FaceRecognition from './components/FaceRecognition';
import AttendanceList from './components/AttendanceList';

export default function App() {
  const [activeTab, setActiveTab] = useState<'recognition' | 'registration' | 'attendance'>('recognition');
  const [registrationMode, setRegistrationMode] = useState<'manual' | 'bulk'>('manual');
  const [people, setPeople] = useState<Person[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      const LOCAL_MODEL_URL = '/models';
      const CDN_MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
      
      const tryLoad = async (url: string) => {
        await faceapi.nets.tinyFaceDetector.loadFromUri(url);
        await faceapi.nets.faceLandmark68Net.loadFromUri(url);
        await faceapi.nets.faceRecognitionNet.loadFromUri(url);
      };

      try {
        console.log('Attempting to load models from local storage...');
        await tryLoad(LOCAL_MODEL_URL);
        setModelsLoaded(true);
      } catch (localError) {
        console.warn('Local models failed to load, trying CDN fallback...', localError);
        try {
          await tryLoad(CDN_MODEL_URL);
          setModelsLoaded(true);
        } catch (cdnError) {
          console.error('All model loading attempts failed:', cdnError);
          // Set to false but allow UI to continue so we don't block the user
          setModelsLoaded(false);
        }
      } finally {
        setIsInitializing(false);
      }
    };
    loadModels();
  }, []);

  const handleAddPerson = (person: Person) => {
    setPeople(prev => [...prev, person]);
  };

  const handleDeletePerson = (id: string) => {
    setPeople(prev => prev.filter(p => p.id !== id));
  };

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [lastLogInfo, setLastLogInfo] = useState<{ name: string, time: Date } | null>(null);

  const handleMarkAttendance = (person: Person) => {
    if (isPausedRef.current) return;
    isPausedRef.current = true;
    setIsPaused(true);

    const now = new Date();
    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      personId: person.id,
      personName: person.name,
      timestamp: now,
      status: 'present'
    };
    setAttendance(prev => [newRecord, ...prev]);
    
    setLastLogInfo({ name: person.name, time: now });
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setIsPaused(false);
    setLastLogInfo(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-t-2 border-app-primary rounded-full mx-auto"
          />
          <p className="text-app-primary font-medium text-sm uppercase tracking-widest">Initializing Neural Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans selection:bg-app-primary/30">
      {/* Header */}
      <header className="h-[70px] border-b border-app-border bg-app-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-10 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-app-primary rounded-sm flex items-center justify-center">
              <ShieldCheck className="text-white w-4 h-4" />
            </div>
            <h1 className="font-bold text-lg tracking-tight uppercase">CNN Vision Attendance</h1>
          </div>

          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-1 bg-app-bg p-1 rounded-lg border border-app-border">
              {[
                { id: 'recognition', icon: Camera, label: 'Scan' },
                { id: 'registration', icon: UserPlus, label: 'Register' },
                { id: 'attendance', icon: ClipboardCheck, label: 'Logs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200",
                    activeTab === tab.id 
                      ? "bg-app-card text-app-primary shadow-sm border border-app-border" 
                      : "text-app-muted hover:text-app-text hover:bg-app-card/50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-app-info-bg text-app-info-text rounded-full text-[10px] font-bold uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-app-info-text animate-pulse" />
              System Live
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-10 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'recognition' && (
            <motion.div
              key="recognition"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <FaceRecognition 
                people={people} 
                onDetected={handleMarkAttendance}
                modelsLoaded={modelsLoaded}
                lastLogInfo={lastLogInfo}
                isPaused={isPaused}
                onNext={handleResume}
              />
            </motion.div>
          )}

          {activeTab === 'registration' && (
            <motion.div
              key="registration"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-6"
            >
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-app-card border border-app-border rounded-xl p-1 flex items-center justify-center max-w-fit">
                  <button
                    onClick={() => setRegistrationMode('manual')}
                    className={cn(
                      "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                      registrationMode === 'manual' 
                        ? "bg-app-bg text-app-primary border border-app-border shadow-sm"
                        : "text-app-muted hover:text-app-text"
                    )}
                  >
                    Manual Entry
                  </button>
                  <button
                    onClick={() => setRegistrationMode('bulk')}
                    className={cn(
                      "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                      registrationMode === 'bulk' 
                        ? "bg-app-bg text-app-primary border border-app-border shadow-sm"
                        : "text-app-muted hover:text-app-text"
                    )}
                  >
                    Dataset Drop
                  </button>
                </div>

                {registrationMode === 'manual' ? (
                  <Registration onAddPerson={handleAddPerson} modelsLoaded={modelsLoaded} />
                ) : (
                  <DatasetUpload onAddPerson={handleAddPerson} modelsLoaded={modelsLoaded} />
                )}
              </div>
              <div className="space-y-6">
                <div className="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
                  <h2 className="text-xs font-bold text-app-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-app-primary" />
                    Registered Database
                  </h2>
                  <div className="space-y-2">
                    {people.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-app-border rounded-lg">
                        <UserPlus className="w-8 h-8 text-app-subtle mx-auto mb-2" />
                        <p className="text-xs text-app-subtle">No faces registered yet</p>
                      </div>
                    ) : (
                      people.map(person => (
                        <div key={person.id} className="flex items-center justify-between p-3 bg-app-bg rounded-lg border border-app-border hover:border-app-primary/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-app-border border border-app-border">
                              <img src={person.images[0]} alt={person.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{person.name}</p>
                              <p className="text-[10px] text-app-subtle uppercase font-mono">{person.images.length} Samples</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeletePerson(person.id)}
                            className="p-2 text-app-subtle hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'attendance' && (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AttendanceList records={attendance} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Status */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-app-border bg-app-card/80 backdrop-blur-md px-10 py-2 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-app-subtle">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", modelsLoaded ? "bg-app-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500")} />
              <span>Models: {modelsLoaded ? 'Ready' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", people.length > 0 ? "bg-app-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-yellow-500")} />
              <span>Database: {people.length} Entities</span>
            </div>
          </div>
          <div>System Time: {new Date().toLocaleTimeString()}</div>
        </div>
      </footer>
    </div>
  );
}
