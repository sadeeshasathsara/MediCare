import React from "react";
import BookingPipeline from "../components/BookingPipeline";

export default function BookConsultationPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Book Consultation</h1>
        <p className="text-muted-foreground">Follow the guided pipeline to schedule your medical appointment with a specialist.</p>
      </div>

      <div className="bg-card border-2 rounded-3xl p-8 shadow-sm">
        <BookingPipeline />
      </div>
    </div>
  );
}
