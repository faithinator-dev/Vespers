import { useEffect, useRef, useState } from 'react';
import { CameraPreset } from '../types/journal';
import { CafeSceneController } from '../three/CafeSceneController';

interface CafeCanvasProps {
  preset: CameraPreset;
  lampWarmth: number;
  isWorkspaceOverlay: boolean;
}

export function CafeCanvas({
  preset,
  lampWarmth,
  isWorkspaceOverlay,
}: CafeCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<CafeSceneController | null>(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = new CafeSceneController(container, (lost) => {
      setContextLost(lost);
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setCameraPreset(preset, isWorkspaceOverlay);
  }, [preset, isWorkspaceOverlay]);

  useEffect(() => {
    controllerRef.current?.setLampWarmth(lampWarmth);
  }, [lampWarmth]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#140e0a]">
      <div
        ref={mountRef}
        className="w-full h-full"
        aria-label="Interactive 3D late-night café table scene"
      />
      {/* Warm ambient vignette when workspace panels are displayed over the 3D scene */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 transition-opacity duration-500 ${
          isWorkspaceOverlay
            ? 'opacity-100 bg-gradient-to-b from-[#140e0a]/65 via-[#140e0a]/55 to-[#140e0a]/80'
            : 'opacity-0'
        }`}
      />
      {contextLost && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#140e0a] text-[#c8b9a2] text-sm">
          Restoring evening café graphics…
        </div>
      )}
    </div>
  );
}
