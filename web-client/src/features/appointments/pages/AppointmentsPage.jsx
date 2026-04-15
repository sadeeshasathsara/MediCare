import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAppointments, updateAppointmentStatus } from '../services/appointmentApi';
import AppointmentsList from '../components/AppointmentsList';

export default function AppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!user?.id) return;
            try {
                const params = user.role === 'DOCTOR' ? { doctorId: user.id } : { patientId: user.id };
                const data = await getAppointments(params);
                setAppointments(data);
            } catch (error) {
                console.error('Failed to fetch appointments:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, [user]);

    const handleStatusUpdate = async (id, status) => {
        try {
            await updateAppointmentStatus(id, status);
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    if (loading) {
        return <div className="p-10 text-center animate-pulse text-muted-foreground font-medium">Loading your appointments...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
                <p className="text-muted-foreground text-sm">
                    Manage your schedule, confirmations, and general consultation requests.
                </p>
            </div>
            
            <AppointmentsList 
                appointments={appointments} 
                handleStatusUpdate={handleStatusUpdate} 
                isDoctor={user?.role === 'DOCTOR'} 
            />
        </div>
    )
}
