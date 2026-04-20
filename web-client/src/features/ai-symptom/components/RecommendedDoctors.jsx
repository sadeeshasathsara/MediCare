import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stethoscope,
  Star,
  CalendarPlus,
  ChevronRight,
  ShieldCheck,
  Users,
  Award,
  DollarSign,
  Briefcase,
  Zap
} from 'lucide-react'
import ProfileAvatar from '@/components/ProfileAvatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function hashStringToUint32(value) {
  const str = String(value || '')
  let hash = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function numberInRange(seed, min, max) {
  const a = Number(min)
  const b = Number(max)
  const low = Math.min(a, b)
  const high = Math.max(a, b)
  const span = high - low + 1
  if (!Number.isFinite(span) || span <= 0) return low
  return low + (seed % span)
}

function DoctorCard({ doctor }) {
  const navigate = useNavigate()

  const handleBook = () => {
    navigate(`/patient/book?doctorId=${doctor.id}&specialty=${encodeURIComponent(doctor.specialization || doctor.specialty || '')}`)
  }

  const name = doctor.fullName || doctor.name || 'Unknown'
  const specialty = doctor.specialization || doctor.specialty || 'General Practice'
  const rating = doctor.rating || 4.8
  const seed = hashStringToUint32(doctor.id || doctor.userId || name)
  const experience = doctor.yearsOfExperience ?? numberInRange(seed, 5, 14)
  const patientCount = doctor.totalPatients ?? numberInRange(hashStringToUint32(`${seed}:patients`), 100, 599)
  const fee = doctor.consultationFee ?? numberInRange(hashStringToUint32(`${seed}:fee`), 30, 79)

  return (
    <div className="group relative flex flex-col rounded-[2.2rem] border border-primary/10 bg-card/40 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:shadow-[0_22px_60px_-15px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-2 hover:border-primary/30">
      {/* Decorative background element */}
      <div className="absolute -top-12 -right-12 h-32 w-32 bg-primary/5 rounded-full blur-3xl transition-all duration-500 group-hover:bg-primary/10" />

      <div className="p-6 flex flex-col flex-1 gap-6 relative z-10">
        {/* Floating Specialty Tag */}
        <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-700">
          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{specialty}</span>
          </div>
        </div>

        {/* Profile Section */}
        <div className="flex items-center gap-5 pt-2">
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-[1.8rem] overflow-hidden p-1 bg-gradient-to-br from-primary/30 via-primary/5 to-transparent shadow-inner">
              <ProfileAvatar
                src={`/doctors/${doctor.id}/profile-photo`}
                alt={`Dr. ${name}`}
                className="h-full w-full rounded-[1.6rem] object-cover"
                fallback={
                  <div className="h-full w-full flex items-center justify-center bg-primary/5 text-primary/40 rounded-[1.6rem]">
                    <Stethoscope className="h-9 w-9" />
                  </div>
                }
              />
            </div>
            {/* Status Status Indicator with Glow */}
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-4 border-card/80 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-[17px] tracking-tight truncate text-foreground/90">
                Dr. {name}
              </h3>
              {doctor.verified !== false && (
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 drop-shadow-sm" />
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold">{rating.toFixed(1)}</span>
              </div>
              <div className="h-3 w-px bg-border/60" />
              <div className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-[11px] font-medium">98% Satisfied</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/20 border border-border/40 transition-colors group-hover:bg-muted/40">
            <Briefcase className="h-4 w-4 text-primary/60 mb-1.5" />
            <p className="text-[13px] font-black text-foreground/90">{experience}+</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Exp Yrs</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/20 border border-border/40 transition-colors group-hover:bg-muted/40">
            <Users className="h-4 w-4 text-primary/60 mb-1.5" />
            <p className="text-[13px] font-black text-foreground/90">{patientCount}+</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Patients</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/20 border border-border/40 transition-colors group-hover:bg-muted/40">
            <DollarSign className="h-4 w-4 text-primary/60 mb-1.5" />
            <p className="text-[13px] font-black text-foreground/90">${fee}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Per Session</p>
          </div>
        </div>

        {/* Booking Action */}
        <Button
          onClick={handleBook}
          className="w-full mt-auto rounded-2xl bg-primary h-12 gap-3 text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group/btn cursor-pointer"
        >
          {/* Shine effect on button */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite]" />

          <CalendarPlus className="h-5 w-5" />
          <span>Select Specialist</span>
          <ChevronRight className="h-4 w-4 ml-auto opacity-40 group-hover/btn:translate-x-1 group-hover/btn:opacity-100 transition-all" />
        </Button>
      </div>
    </div>
  )
}

function DoctorCardSkeleton() {
  return (
    <div className="rounded-[2.2rem] border bg-card/40 overflow-hidden">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-5">
          <Skeleton className="h-20 w-20 rounded-[1.8rem] shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  )
}

export default function RecommendedDoctors({ doctors, isLoading }) {
  const hasResults = Array.isArray(doctors) && doctors.length > 0

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-primary rounded-full" />
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground/80">Available Specialists</h2>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium pl-3">Top-rated matches based on your reported symptoms</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => <DoctorCardSkeleton key={i} />)}
        </div>
      ) : hasResults ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {doctors.slice(0, 6).map((doc) => (
            <DoctorCard key={doc.id} doctor={doc} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center rounded-[2.5rem] border-2 border-dashed border-primary/10 bg-primary/5 group transition-all duration-500 hover:bg-primary/10">
          <div className="h-20 w-20 rounded-full bg-card/60 backdrop-blur shadow-inner flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
            <Stethoscope className="h-10 w-10 text-primary/40" />
          </div>
          <div className="space-y-1">
            <p className="font-black text-xl text-foreground/80 tracking-tight">No Specialists Found</p>
            <p className="text-xs text-muted-foreground font-medium max-w-[240px]">
              We couldn't find an exact match. Try adjusting your description for better results.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
