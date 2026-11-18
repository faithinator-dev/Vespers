import { CloudRain, Coffee, Feather, Moon, Wind } from 'lucide-react';
import { MoodKey } from '../types/journal';

interface MoodIconProps {
  mood: MoodKey;
  className?: string;
}

export function MoodIcon({ mood, className = 'w-4 h-4' }: MoodIconProps) {
  switch (mood) {
    case 'serene':
      return <Moon className={className} aria-hidden="true" />;
    case 'reflective':
      return <Coffee className={className} aria-hidden="true" />;
    case 'inspired':
      return <Feather className={className} aria-hidden="true" />;
    case 'melancholy':
      return <CloudRain className={className} aria-hidden="true" />;
    case 'restless':
      return <Wind className={className} aria-hidden="true" />;
  }
}
