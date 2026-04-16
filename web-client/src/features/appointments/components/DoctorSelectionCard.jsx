import React from 'react';
import { Star, ShieldCheck, DollarSign, Award, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DoctorSelectionCard({ doctor, onSelect, isSelected }) {
  const name = doctor.fullName || doctor.email || 'Doctor';
  const fee = doctor.consultationFee || 0;
  
  return (
    <Card 
      onClick={() => onSelect(doctor)}
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden relative ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
      }`}
    >
      {isSelected && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-lg flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Selected
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              {name}
              {doctor.verified && (
                <ShieldCheck className="w-5 h-5 text-blue-500" title="Verified Professional" />
              )}
            </CardTitle>
            <Badge variant="secondary" className="mt-1 font-medium bg-primary/10 text-primary hover:bg-primary/20">
              {doctor.specialty || 'General Practitioner'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2 italic italic">
          "{doctor.bio || 'Experienced specialist dedicated to providing personalized patient care and innovative treatment solutions.'}"
        </p>
        
        <div className="flex flex-wrap gap-2">
          {doctor.qualifications?.slice(0, 2).map((q, i) => (
            <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              <Award className="w-3 h-3" /> {q}
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span>${fee.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground font-normal">/ session</span>
          </div>
          
          <button 
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
            }`}
          >
            {isSelected ? 'Ready to proceed' : 'View profile'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckCircle({ className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}
