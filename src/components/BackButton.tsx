import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BackButton() {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      onClick={() => window.history.back()}
      className="group flex items-center gap-2 px-0 text-muted-foreground hover:text-primary transition-all duration-300 hover:bg-transparent"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-300">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      </div>
      <span className="text-sm font-medium">Back</span>
    </Button>
  );
}
