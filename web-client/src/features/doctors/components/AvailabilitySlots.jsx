import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

export default function AvailabilitySlots({ slots }) {
  if (slots.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground text-sm">
          No availability slots configured.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
      {slots.map((slot) => (
        <Card key={slot.id} className="transition-all hover:bg-muted/20 h-full min-w-[200px]">
          <CardHeader className="p-4 flex flex-row flex-wrap items-center justify-between gap-2 pb-2 border-b text-left">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {slot.dayOfWeek}
            </CardTitle>
            <Badge variant={slot.isBooked ? "outline" : "default"}>
              {slot.isBooked ? "Booked" : "Open"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm font-medium">Time: {slot.startTime} - {slot.endTime}</p>
            <p className="text-xs text-muted-foreground mt-1 tracking-tight">Capacity: {slot.maxPatients || 1}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
