import React, { useEffect, useRef } from 'react';

interface RadarVisualizerProps {
  isPlaying: boolean;
  analyser: AnalyserNode | null;
}

const RadarVisualizer: React.FC<RadarVisualizerProps> = ({ isPlaying, analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Gradient for Bars (Lime to Emerald to Green)
      const gradient = ctx.createLinearGradient(centerX - 100, centerY - 100, centerX + 100, centerY + 100);
      gradient.addColorStop(0, '#a3e635'); // Lime-400
      gradient.addColorStop(0.5, '#10b981'); // Emerald-500
      gradient.addColorStop(1, '#15803d'); // Green-700

      // Audio Data Processing
      let dataArray = new Uint8Array(0);
      let average = 0;

      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume for the "thump" effect
        let sum = 0;
        // We focus on the lower frequencies for the pulse (bass)
        const bassCount = Math.floor(bufferLength / 4); 
        for (let i = 0; i < bassCount; i++) {
          sum += dataArray[i];
        }
        average = sum / bassCount;
      }

      // Calculate Pulse Radius
      // If playing, pulse with music. If idle, breathe slowly.
      const baseRadius = 70;
      const pulseIntensity = isPlaying ? average / 3 : (Math.sin(Date.now() / 1500) * 5 + 5);
      const visualRadius = baseRadius + pulseIntensity;

      // Draw Center Glow (The Core)
      const glow = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.2, centerX, centerY, visualRadius * 1.5);
      glow.addColorStop(0, 'rgba(163, 230, 53, 0.3)'); // Inner Lime
      glow.addColorStop(1, 'rgba(16, 185, 129, 0)'); // Outer Transparent
      
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, visualRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw Inner Solid Circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, visualRadius - 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Spectrum Bars
      if (analyser && isPlaying) {
        const bars = 64; // Number of bars around the circle
        const step = Math.floor(analyser.frequencyBinCount / bars);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        for (let i = 0; i < bars; i++) {
          // Get frequency value
          const value = dataArray[i * step] || 0;
          
          // Map value to bar height (0 to 100px)
          const barHeight = Math.max(4, (value / 255) * 100); 

          const angle = (i / bars) * Math.PI * 2 - Math.PI / 2; // Start from top

          // Start point (on the radius)
          const x1 = centerX + Math.cos(angle) * (visualRadius + 10);
          const y1 = centerY + Math.sin(angle) * (visualRadius + 10);
          
          // End point (extending outward)
          const x2 = centerX + Math.cos(angle) * (visualRadius + 10 + barHeight);
          const y2 = centerY + Math.sin(angle) * (visualRadius + 10 + barHeight);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else {
        // Idle State: Rotating particles
        const time = Date.now() / 1000;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.5)'; // Emerald-500 with opacity
        for(let i=0; i<8; i++) {
          const angle = time + (i * (Math.PI * 2) / 8);
          const x = centerX + Math.cos(angle) * visualRadius;
          const y = centerY + Math.sin(angle) * visualRadius;
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI*2);
          ctx.fill();
        }
      }

      requestRef.current = requestAnimationFrame(draw);
    };

    requestRef.current = requestAnimationFrame(draw);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, analyser]);

  return (
    <div className="relative w-full max-w-md aspect-square mx-auto rounded-full flex items-center justify-center">
      {/* Background Blur Container - Green/Emerald Theme */}
      <div className="absolute inset-0 bg-emerald-500/5 rounded-full blur-3xl transform scale-75 animate-pulse"></div>
      
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={400} 
        className="relative z-10 w-full h-full"
      />
      
      {/* Center Text Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20 mix-blend-overlay">
        <div className="text-[10px] font-mono tracking-[0.3em] text-white/70">
          {isPlaying ? 'ACTIVE' : 'IDLE'}
        </div>
      </div>
    </div>
  );
};

export default RadarVisualizer;