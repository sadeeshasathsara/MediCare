import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getDoctorAvailability, createDoctorAvailability, deleteDoctorAvailabilitySlot } from '../services/doctorApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function ManageAvailabilityPage() {
  const { user } = useAuth();
  const doctorId = user?.id;

  const getErrorMessage = (err, fallback) => {
    const status = err?.response?.status;
    const message = err?.response?.data?.message || err?.response?.data?.error;

    if (message && typeof message === 'string') return message;
    if (status === 404) return "Doctor profile wasn't found yet. Try updating your profile first.";
    return fallback;
  };

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '10:00',
    maxCapacity: 5
  });

  const fetchSlots = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const data = await getDoctorAvailability(doctorId);
      setSlots(data);
    } catch (err) {
      // If the backend doesn't have any doctor profile data yet, treat it as an empty schedule.
      if (err?.response?.status === 404) {
        setSlots([]);
      } else {
        setError(getErrorMessage(err, 'Failed to load your availability schedule.'));
      }
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    if (!newSlot.startTime || !newSlot.endTime) {
      setError('Start time and end time are required.');
      setSubmitting(false);
      return;
    }

    // Works for HH:mm (and HH:mm:ss) values returned by <input type="time">.
    if (String(newSlot.endTime) <= String(newSlot.startTime)) {
      setError('End time must be after start time.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        slots: [{
          dayOfWeek: newSlot.dayOfWeek,
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
          maxCapacity: Number.parseInt(String(newSlot.maxCapacity), 10)
        }]
      };
      await createDoctorAvailability(doctorId, payload);
      setSuccess('Successfully added new availability slot!');
      fetchSlots();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add slot.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm('Remove this availability slot?')) return;
    setDeletingId(slotId);
    try {
      await deleteDoctorAvailabilitySlot(doctorId, slotId);
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } catch {
      setError('Failed to delete slot. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Manage Availability</h1>
        <p className="text-muted-foreground">Define your weekly sessions and limit the number of patients per slot.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ADD NEW SLOT FORM */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-2">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Add New Session
              </CardTitle>
              <CardDescription>Create a recurring time slot for your practice.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Day of Week</label>
                  <select
                    value={newSlot.dayOfWeek}
                    onChange={(e) => setNewSlot(s => ({ ...s, dayOfWeek: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Start Time</label>
                    <input
                      type="time"
                      value={newSlot.startTime}
                      onChange={(e) => setNewSlot(s => ({ ...s, startTime: e.target.value }))}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">End Time</label>
                    <input
                      type="time"
                      value={newSlot.endTime}
                      onChange={(e) => setNewSlot(s => ({ ...s, endTime: e.target.value }))}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Session Capacity</label>
                    <Badge variant="outline" className="text-primary">{newSlot.maxCapacity} Patients</Badge>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={newSlot.maxCapacity}
                    onChange={(e) => setNewSlot(s => ({ ...s, maxCapacity: e.target.value }))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">Max patients allowed to book in this specific time window.</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 p-2 rounded border border-destructive/10">
                    <AlertCircle className="h-4 w-4" /> {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 p-2 rounded border border-primary/10">
                    <CheckCircle2 className="h-4 w-4" /> {success}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create Session'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* LIST OF EXISTING SLOTS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Active Schedule
            </h2>
            <Badge variant="secondary">{slots.length} Active Sessions</Badge>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : slots.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-3xl bg-muted/10">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">You haven't added any availability yet.</p>
              <p className="text-sm text-muted-foreground">Use the form to start building your weekly schedule.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {slots.slice().sort((a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek)).map(slot => {
                const isFull = slot.currentBookings >= slot.maxCapacity;
                const fillPct = slot.maxCapacity > 0 ? Math.min(100, Math.round((slot.currentBookings / slot.maxCapacity) * 100)) : 0;
                return (
                  <Card key={slot.id} className="overflow-hidden border group transition-all hover:bg-muted/30">
                    <div className="flex flex-col sm:flex-row items-center">
                      <div className="w-full sm:w-32 bg-primary/5 p-4 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r">
                        <span className="text-xs font-bold text-primary">{slot.dayOfWeek.substring(0, 3)}</span>
                        <span className="text-lg font-bold text-foreground">{slot.dayOfWeek.charAt(0) + slot.dayOfWeek.substring(1).toLowerCase()}</span>
                      </div>

                      <div className="flex-1 p-4 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-center">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Time Window</p>
                              <p className="text-sm font-bold">{slot.startTime} - {slot.endTime}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Occupancy</p>
                              <p className="text-sm font-bold">
                                {slot.currentBookings ?? 0} / {slot.maxCapacity}
                                <span className="ml-2 text-[10px] font-normal text-muted-foreground">Filled</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right sm:text-center">
                            {isFull ? (
                              <Badge variant="destructive">FULL</Badge>
                            ) : (
                              <Badge variant={slot.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                                {slot.status}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Capacity progress bar */}
                        <div className="space-y-1">
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-destructive' : fillPct > 75 ? 'bg-amber-500' : 'bg-primary'}`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground font-medium">{fillPct}% capacity used</p>
                        </div>
                      </div>

                      <div className="p-4 border-t sm:border-t-0 sm:border-l flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={deletingId === slot.id}
                          onClick={() => handleDelete(slot.id)}
                        >
                          {deletingId === slot.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
