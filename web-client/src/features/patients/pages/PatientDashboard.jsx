import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { 
  getPatientProfile,
} from "@/features/patients/services/patientApi";
import { 
  Calendar, 
  ClipboardList, 
  ArrowRight,
  TrendingUp,
  User,
  Clock,
  Heart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function WelcomeHeader({ name }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">{greeting}, {name}!</h1>
      <p className="text-muted-foreground italic">"Your health is your greatest wealth. Let's keep it that way."</p>
    </div>
  );
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const userId = user?.id || "";

  useEffect(() => {
    if (userId) {
      getPatientProfile(userId).then(setProfile).catch(() => null);
    }
  }, [userId]);

  const displayName = profile?.name || user?.name || "Patient";

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      <WelcomeHeader name={displayName} />

      {/* QUICK ACTIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="group border-2 hover:border-primary/40 transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ClipboardList size={120} />
          </div>
          <CardHeader>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <ClipboardList className="text-primary h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Book a Consultation</CardTitle>
            <CardDescription>Schedule a session with our top medical specialists in just a few clicks.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/patient/book">
              <Button className="w-full h-12 text-lg font-bold flex items-center gap-2">
                Start Booking <ArrowRight size={18} />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="group border-2 hover:border-primary/40 transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Calendar size={120} />
          </div>
          <CardHeader>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="text-primary h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">My Appointments</CardTitle>
            <CardDescription>Track the status of your upcoming and previous medical consultations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/patient/appointments">
              <Button variant="outline" className="w-full h-12 text-lg font-bold flex items-center gap-2">
                View Schedule <Calendar size={18} />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* HEALTH SUMMARY WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Overall Health</p>
                <p className="text-lg font-bold">Stable</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Next Activity</p>
                <p className="text-lg font-bold">Pending Booking</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Profile Strength</p>
                <p className="text-lg font-bold">85%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
