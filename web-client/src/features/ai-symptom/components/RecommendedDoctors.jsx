import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Star, CalendarPlus, ChevronRight } from 'lucide-react'
import ProfileAvatar from '@/components/ProfileAvatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function DoctorCard({ doctor }) {
  const navigate = useNavigate()

  const handleBook = () => {
    navigate(`/patient/book?doctorId=${doctor.id}&specialty=${encodeURIComponent(doctor.specialization || doctor.specialty || '')}`)
  }

  return (
    <div className="group relative flex flex-col rounded-2xl border bg-card/80 backdrop-blur overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30">
      {/* Top gradient accent */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Avatar + name row */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-md">
              <ProfileAvatar
                src={`/doctors/${doctor.id}/profile-photo`}
                alt={`Dr. ${doctor.name}`}
                className="h-full w-full rounded-2xl"
                fallback={
                  <div className="h-full w-full flex items-center justify-center bg-primary/10">
                    <Stethoscope className="h-7 w-7 text-primary/60" />
                  </div>
                }
              />
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-card shadow-sm" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm leading-tight truncate">
              Dr. {doctor.name || doctor.fullName || 'Unknown'}
            </p>
            <p className="text-xs text-primary font-medium mt-0.5 truncate">
              {doctor.specialization || doctor.specialty || 'General Practice'}
            </p>
            {/* Star rating */}
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-3 w-3 ${n <= Math.round(doctor.rating || 4.5) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
                />
              ))}
              <span className="text-[10px] text-muted-foreground ml-0.5">
                {(doctor.rating || 4.5).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Experience / patients */}
        <div className="flex gap-3 text-[11px]">
          <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2 text-center">
            <p className="font-bold text-foreground">{doctor.yearsOfExperience || '5+'}y</p>
            <p className="text-muted-foreground">Experience</p>
          </div>
          <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2 text-center">
            <p className="font-bold text-foreground">{doctor.totalPatients || '200+'}+</p>
            <p className="text-muted-foreground">Patients</p>
          </div>
        </div>

        {/* Book button */}
        <Button
          onClick={handleBook}
          className="w-full mt-auto gap-2 font-semibold cursor-pointer group-hover:bg-primary h-10"
          size="sm"
        >
          <CalendarPlus className="h-4 w-4" />
          Book Appointment
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  )
}

function DoctorCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card/80 overflow-hidden">
      <div className="h-1 w-full bg-muted animate-pulse" />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-12 rounded-lg" />
          <Skeleton className="flex-1 h-12 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function RecommendedDoctors({ doctors, isLoading, specialty }) {
  const hasResults = Array.isArray(doctors) && doctors.length > 0

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border bg-card text-sm font-semibold text-muted-foreground">
          <Stethoscope className="h-3.5 w-3.5 text-primary" />
          {specialty ? `Recommended ${specialty} Specialists` : 'Recommended Doctors for You'}
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-border via-border to-transparent" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <DoctorCardSkeleton key={i} />)}
        </div>
      ) : hasResults ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.slice(0, 6).map((doc) => (
            <DoctorCard key={doc.id} doctor={doc} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center rounded-2xl border border-dashed bg-muted/10">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Stethoscope className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-semibold text-foreground/70">No doctors found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try describing your symptoms more specifically.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
