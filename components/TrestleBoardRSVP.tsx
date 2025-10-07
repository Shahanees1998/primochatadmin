'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import { Badge } from 'primereact/badge';
import { apiClient } from '@/lib/apiClient';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  membershipNumber?: string;
}

interface TrestleBoard {
  id: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  category: string;
  isRSVP: boolean;
  maxAttendees?: number;
}

interface UserRSVP {
  id: string;
  status: 'CONFIRMED' | 'PENDING' | 'DECLINED' | 'MAYBE';
  createdAt: string;
  signedUpBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface RSVPCounts {
  CONFIRMED: number;
  PENDING: number;
  DECLINED: number;
  MAYBE: number;
}

interface RSVPData {
  trestleBoard: TrestleBoard;
  userRSVP: UserRSVP | null;
  rsvpCounts: RSVPCounts;
  isMaxAttendeesReached: boolean;
  participants: Array<{
    id: string;
    user: User;
    status: string;
    createdAt: string;
    signedUpBy?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface TrestleBoardRSVPProps {
  trestleBoardId: string;
}

export default function TrestleBoardRSVP({ trestleBoardId }: TrestleBoardRSVPProps) {
  const [rsvpData, setRsvpData] = useState<RSVPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'CONFIRMED' | 'PENDING' | 'DECLINED' | 'MAYBE'>('PENDING');
  const toast = useRef<Toast>(null);

  const rsvpStatusOptions = [
    { label: 'Confirm Attendance', value: 'CONFIRMED' },
    { label: 'Maybe', value: 'MAYBE' },
    { label: 'Decline', value: 'DECLINED' },
  ];

  useEffect(() => {
    loadRSVPData();
  }, [trestleBoardId]);

  const loadRSVPData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/trestle-board/${trestleBoardId}/rsvp`);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setRsvpData(response.data as RSVPData);
      
      // Set initial status based on current RSVP
      if ((response.data as RSVPData).userRSVP) {
        setSelectedStatus((response.data as RSVPData).userRSVP!.status);
      }
    } catch (error) {
      console.error('Error loading RSVP data:', error);
      setError('Failed to load RSVP data');
      showToast('error', 'Error', 'Failed to load RSVP data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail });
  };

  const handleRSVPSubmit = async () => {
    if (!rsvpData) return;

    setSaving(true);
    try {
      const response = await apiClient.post(`/trestle-board/${trestleBoardId}/rsvp`, {
        status: selectedStatus,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      showToast('success', 'Success', 'RSVP updated successfully!');
      
      // Reload data to get updated information
      await loadRSVPData();
    } catch (error: any) {
      console.error('Error updating RSVP:', error);
      showToast('error', 'Error', error.message || 'Failed to update RSVP');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRSVP = async () => {
    setSaving(true);
    try {
      const response = await apiClient.delete(`/trestle-board/${trestleBoardId}/rsvp`);

      if (response.error) {
        throw new Error(response.error);
      }

      showToast('success', 'Success', 'RSVP removed successfully!');
      
      // Reload data to get updated information
      await loadRSVPData();
    } catch (error: any) {
      console.error('Error removing RSVP:', error);
      showToast('error', 'Error', error.message || 'Failed to remove RSVP');
    } finally {
      setSaving(false);
    }
  };

  const getStatusSeverity = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'success';
      case 'PENDING': return 'warning';
      case 'MAYBE': return 'info';
      case 'DECLINED': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'pi pi-check-circle';
      case 'PENDING': return 'pi pi-clock';
      case 'MAYBE': return 'pi pi-question-circle';
      case 'DECLINED': return 'pi pi-times-circle';
      default: return 'pi pi-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <div className="flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <ProgressSpinner />
        </div>
      </Card>
    );
  }

  if (error || !rsvpData) {
    return (
      <Card>
        <div className="text-center p-4">
          <i className="pi pi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
          <p className="text-lg">{error || 'Failed to load RSVP information'}</p>
          <Button 
            label="Retry" 
            icon="pi pi-refresh" 
            onClick={loadRSVPData}
            className="mt-3"
          />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card title="RSVP for this Trestle Board" className="mb-3">
        <div className="grid">
          {/* Trestle Board Info */}
          <div className="col-12 mb-3">
            <div className="flex align-items-center gap-3 mb-2">
              <i className="pi pi-calendar text-2xl text-primary"></i>
              <div>
                <h3 className="m-0 mb-1">{rsvpData.trestleBoard.title}</h3>
                <p className="text-600 m-0">
                  {formatDate(rsvpData.trestleBoard.date || '')}
                  {rsvpData.trestleBoard.time && ` at ${rsvpData.trestleBoard.time}`}
                </p>
                {rsvpData.trestleBoard.location && (
                  <p className="text-600 m-0">
                    <i className="pi pi-map-marker mr-1"></i>
                    {rsvpData.trestleBoard.location}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Current RSVP Status */}
          {rsvpData.userRSVP && (
            <div className="col-12 mb-3">
              <div className="p-3 border-round" style={{ backgroundColor: 'var(--surface-100)' }}>
                <div className="flex align-items-center justify-content-between">
                  <div>
                    <p className="text-600 m-0 mb-1">Your Current RSVP</p>
                    <Tag 
                      value={rsvpData.userRSVP.status} 
                      severity={getStatusSeverity(rsvpData.userRSVP.status)}
                      icon={getStatusIcon(rsvpData.userRSVP.status)}
                      className="text-lg"
                    />
                  </div>
                  {rsvpData.userRSVP.signedUpBy && (
                    <div className="text-right">
                      <p className="text-600 text-sm m-0">Added by</p>
                      <p className="font-semibold m-0">
                        {rsvpData.userRSVP.signedUpBy.firstName} {rsvpData.userRSVP.signedUpBy.lastName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RSVP Counts */}
          <div className="col-12 mb-3">
            <h4 className="mb-2">Attendance Summary</h4>
            <div className="grid">
              <div className="col-6 md:col-3">
                <div className="text-center p-3 border-round" style={{ backgroundColor: 'var(--green-50)' }}>
                  <Badge value={rsvpData.rsvpCounts.CONFIRMED} severity="success" size="xlarge"></Badge>
                  <p className="text-600 text-sm mt-2 mb-0">Confirmed</p>
                </div>
              </div>
              <div className="col-6 md:col-3">
                <div className="text-center p-3 border-round" style={{ backgroundColor: 'var(--blue-50)' }}>
                  <Badge value={rsvpData.rsvpCounts.MAYBE} severity="info" size="xlarge"></Badge>
                  <p className="text-600 text-sm mt-2 mb-0">Maybe</p>
                </div>
              </div>
              <div className="col-6 md:col-3">
                <div className="text-center p-3 border-round" style={{ backgroundColor: 'var(--red-50)' }}>
                  <Badge value={rsvpData.rsvpCounts.DECLINED} severity="danger" size="xlarge"></Badge>
                  <p className="text-600 text-sm mt-2 mb-0">Declined</p>
                </div>
              </div>
              <div className="col-6 md:col-3">
                <div className="text-center p-3 border-round" style={{ backgroundColor: 'var(--yellow-50)' }}>
                  <Badge value={rsvpData.rsvpCounts.PENDING} severity="warning" size="xlarge"></Badge>
                  <p className="text-600 text-sm mt-2 mb-0">Pending</p>
                </div>
              </div>
            </div>
            
            {rsvpData.trestleBoard.maxAttendees && (
              <div className="mt-3 p-3 border-round" style={{ backgroundColor: 'var(--surface-50)' }}>
                <div className="flex align-items-center justify-content-between">
                  <span className="font-semibold">
                    <i className="pi pi-users mr-2"></i>
                    Max Attendees: {rsvpData.trestleBoard.maxAttendees}
                  </span>
                  {rsvpData.isMaxAttendeesReached && (
                    <Tag value="Event Full" severity="danger" icon="pi pi-exclamation-circle" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RSVP Form */}
          <div className="col-12">
            <div className="p-fluid">
              <div className="field">
                <label htmlFor="rsvp-status" className="font-bold">Update Your RSVP</label>
                <Dropdown
                  id="rsvp-status"
                  value={selectedStatus}
                  options={rsvpStatusOptions}
                  onChange={(e) => setSelectedStatus(e.value)}
                  placeholder="Select your response"
                  disabled={saving || (selectedStatus === 'CONFIRMED' && rsvpData.isMaxAttendeesReached && rsvpData.userRSVP?.status !== 'CONFIRMED')}
                />
                {selectedStatus === 'CONFIRMED' && rsvpData.isMaxAttendeesReached && rsvpData.userRSVP?.status !== 'CONFIRMED' && (
                  <small className="text-red-500">
                    <i className="pi pi-exclamation-triangle mr-1"></i>
                    This event has reached maximum capacity
                  </small>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  label={saving ? "Saving..." : "Submit RSVP"}
                  icon={saving ? "pi pi-spin pi-spinner" : "pi pi-check"}
                  onClick={handleRSVPSubmit}
                  disabled={saving || (selectedStatus === 'CONFIRMED' && rsvpData.isMaxAttendeesReached && rsvpData.userRSVP?.status !== 'CONFIRMED')}
                  className="flex-1"
                />
                {rsvpData.userRSVP && (
                  <Button
                    label="Remove RSVP"
                    icon="pi pi-trash"
                    severity="danger"
                    outlined
                    onClick={handleRemoveRSVP}
                    disabled={saving}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Toast ref={toast} />
    </>
  );
}

