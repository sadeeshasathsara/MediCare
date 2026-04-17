import React from 'react';
import { Star, ShieldCheck, DollarSign, Award, ArrowRight, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DoctorSelectionCard({ doctor, onSelect, isSelected }) {
  const name = doctor.fullName || doctor.email || 'Doctor';
  const fee = doctor.consultationFee || 0;
  
  return (
    <Card 
      onClick={() => onSelect(doctor)}
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden relative ${
        isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:border-primary/50 bg-card'
      }`}
    >
      {isSelected && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold rounded-bl-lg flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Selected
        </div>
      )}
      
      <div className="p-4 flex flex-col h-full">
        {/* DOCTOR HEADER & PHOTO */}
        <div className="flex gap-3 items-start mb-3">
          <div className="h-12 w-12 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
            {doctor.profileImageUrl ? (
               <img src={doctor.profileImageUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
               <User className="text-primary h-6 w-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold flex items-center gap-1.5 truncate">
              <span className="truncate">{name}</span>
              {doctor.verified && (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" title="Verified Professional" />
              )}
            </h3>
            <Badge variant="secondary" className="mt-1 text-[10px] py-0 px-1.5 font-medium bg-primary/10 text-primary hover:bg-primary/20 truncate">
              {doctor.specialty || 'General Practitioner'}
            </Badge>
          </div>
        </div>
        
        {/* BIO & QUALIFICATIONS */}
        <div className="space-y-3 flex-1 flex flex-col justify-between">
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            "{doctor.bio || 'Experienced specialist dedicated to providing personalized patient care and innovative treatment solutions.'}"
          </p>
          
          <div className="flex flex-wrap gap-1 mt-auto">
            {doctor.qualifications?.slice(0, 2).map((q, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                <Award className="w-2.5 h-2.5" /> <span className="truncate max-w-[80px]">{q}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* FOOTER */}
        <div className="pt-3 mt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-1 text-foreground font-semibold text-sm">
            <DollarSign className="w-3 h-3 text-green-600" />
            <span>${fee.toFixed(2)}</span>
            <span className="text-[10px] text-muted-foreground font-normal">/ session</span>
          </div>
          
          <button 
            className={`flex items-center gap-1 text-xs font-bold transition-colors ${
              isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
            }`}
          >
            {isSelected ? 'Ready' : 'Profile'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
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
