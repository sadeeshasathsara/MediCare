import React, { useState, useMemo } from 'react';
// Removed date-fns import to use local vanilla JS utilities for deployment stability.
import { Calendar, Clock, ChevronLeft, ChevronRight, UserPlus, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Note: Using standard Date since child doesn't have date-fns installed yet.
// I will implement a small utility to avoid dependency issues.

const getNextDays = (count = 14) => {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

const formatDayName = (date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
const formatDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function HealthDatePicker({ selectedDate, selectedSlotId, onDateChange, onSlotChange, slots = [] }) {
  const days = useMemo(() => getNextDays(), []);
  const [activeTab, setActiveTab] = useState('Morning');

  const filteredSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    // Sort slots into categories
    return slots.filter(slot => {
      const hour = parseInt((slot.startTime || '00:00').split(':')[0]);
      if (activeTab === 'Morning') return hour < 12;
      if (activeTab === 'Afternoon') return hour >= 12 && hour < 17;
      if (activeTab === 'Evening') return hour >= 17;
      return true;
    });
  }, [slots, selectedDate, activeTab]);

  const handleDateClick = (date) => {
    onDateChange(formatDateStr(date));
    onSlotChange(''); // Reset slot when date changes
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. HORIZONTAL DATE STRIP */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Select Date
          </h3>
          <span className="text-xs font-medium text-primary">Next 2 Weeks</span>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-4 pt-2 -mx-2 px-2 no-scrollbar scroll-smooth">
          {days.map((date) => {
            const dateStr = formatDateStr(date);
            const isSelected = selectedDate === dateStr;
            const isDayToday = isToday(date);

            return (
              <button
                key={dateStr}
                onClick={() => handleDateClick(date)}
                className={`flex-shrink-0 w-20 h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' 
                    : 'bg-card border-muted hover:border-primary/40 text-foreground'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {formatDayName(date)}
                </span>
                <span className="text-2xl font-bold mt-1">
                  {date.getDate()}
                </span>
                {isDayToday && (
                  <div className={`mt-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. TIME SLOT CATEGORIES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Select Time Slot
          </h3>
          <div className="flex bg-muted p-1 rounded-lg">
            {['Morning', 'Afternoon', 'Evening'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {!selectedDate ? (
          <div className="text-center py-12 rounded-2xl border border-dashed bg-muted/20">
            <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Please select a date first</p>
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed bg-muted/20">
            <p className="text-sm text-muted-foreground">No {activeTab.toLowerCase()} slots available for this day</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredSlots.map((slot) => {
              const spotsLeft = (slot.maxCapacity || 1) - (slot.currentBookings || 0);
              const isFull = spotsLeft <= 0;
              const isSelected = selectedSlotId === slot.id;

              return (
                <button
                  key={slot.id}
                  disabled={isFull}
                  onClick={() => onSlotChange(slot.id, slot.startTime)}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                    isFull ? 'opacity-40 grayscale cursor-not-allowed' :
                    isSelected ? 'bg-primary/5 border-primary shadow-sm' :
                    'bg-card border-muted hover:border-primary/30'
                  }`}
                >
                  <div className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {slot.startTime}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {isFull ? (
                      <Badge variant="destructive" className="h-4 px-1 text-[8px] font-bold">FULL</Badge>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <UserPlus className="w-3 h-3" />
                        {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                       <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}
