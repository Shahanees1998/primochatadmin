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

interface FestiveBoard {
  id: string;
  title: string;
  date?: string;
  isRSVP: boolean;
  maxAttendees?: number;
  description?: string;
}

interface UserRSVP {
  id: string;
  status: 'CONFIRMED' | 'PENDING' | 'DECLINED' | 'MAYBE';
  createdAt: string;
  updatedAt: string;
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
  festiveBoard: FestiveBoard;
  userRSVP: UserRSVP | null;
  rsvpCounts: RSVPCounts;
  isMaxAttendeesReached: boolean;
  participants: Array<{
    id: string;
    user: User;
    status: string;
    createdAt: string;
    updatedAt: string;
    signedUpBy?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface FestiveBoardRSVPProps {
  festiveBoardId: string;
}

export default function FestiveBoardRSVP({ festiveBoardId }: FestiveBoardRSVPProps) {
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
  }, [festiveBoardId]);

  const loadRSVPData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/festive-board/${festiveBoardId}/rsvp`);
      
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
      const response = await apiClient.post(`/festive-board/${festiveBoardId}/rsvp`, {
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
      const response = await apiClient.delete(`/festive-board/${festiveBoardId}/rsvp`);

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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <div className="flex justify-content-center align-items-center" style={{ height: '200px' }}>
          <ProgressSpinner />
        </div>
      </Card>
    );
  }

  if (error || !rsvpData) {
    return (
      <Card>
        <div className="text-center p-4">
          <i className="pi pi-exclamation-triangle text-4xl text-orange-500 mb-3"></i>
          <h3>Error Loading RSVP</h3>
          <p className="text-600">{error || 'No data available'}</p>
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

  // If RSVP is not enabled for this festive board
  if (!rsvpData.festiveBoard.isRSVP) {
    return (
      <Card>
        <div className="text-center p-4">
          <i className="pi pi-calendar-times text-4xl text-gray-500 mb-3"></i>
          <h3>RSVP Not Available</h3>
          <p className="text-600">RSVP is not enabled for this festive board.</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Toast ref={toast} />
      
      <Card>
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-2">RSVP for {rsvpData.festiveBoard.title}</h3>
          {rsvpData.festiveBoard.date && (
            <p className="text-600 mb-3">
              <i className="pi pi-calendar mr-2"></i>
              {new Date(rsvpData.festiveBoard.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
          {rsvpData.festiveBoard.description && (
            <p className="text-600 mb-3">{rsvpData.festiveBoard.description}</p>
          )}
        </div>

        {/* RSVP Status Summary */}
        <div className="grid mb-4">
          <div className="col-12 md:col-3">
            <div className="text-center p-3 border-1 surface-border border-round">
              <div className="text-2xl font-bold text-green-500">{rsvpData.rsvpCounts.CONFIRMED}</div>
              <div className="text-600">Confirmed</div>
            </div>
          </div>
          <div className="col-12 md:col-3">
            <div className="text-center p-3 border-1 surface-border border-round">
              <div className="text-2xl font-bold text-orange-500">{rsvpData.rsvpCounts.PENDING}</div>
              <div className="text-600">Pending</div>
            </div>
          </div>
          <div className="col-12 md:col-3">
            <div className="text-center p-3 border-1 surface-border border-round">
              <div className="text-2xl font-bold text-blue-500">{rsvpData.rsvpCounts.MAYBE}</div>
              <div className="text-600">Maybe</div>
            </div>
          </div>
          <div className="col-12 md:col-3">
            <div className="text-center p-3 border-1 surface-border border-round">
              <div className="text-2xl font-bold text-red-500">{rsvpData.rsvpCounts.DECLINED}</div>
              <div className="text-600">Declined</div>
            </div>
          </div>
        </div>

        {/* Max Attendees Warning */}
        {rsvpData.festiveBoard.maxAttendees && (
          <div className={`mb-4 p-3 border-round ${rsvpData.isMaxAttendeesReached ? 'bg-red-100 border-red-300' : 'bg-blue-100 border-blue-300'}`}>
            <div className="flex align-items-center gap-2">
              <i className={`pi ${rsvpData.isMaxAttendeesReached ? 'pi-exclamation-triangle text-red-500' : 'pi-info-circle text-blue-500'}`}></i>
              <span className={rsvpData.isMaxAttendeesReached ? 'text-red-700 font-medium' : 'text-blue-700'}>
                {rsvpData.isMaxAttendeesReached 
                  ? `Maximum attendees reached (${rsvpData.rsvpCounts.CONFIRMED}/${rsvpData.festiveBoard.maxAttendees})`
                  : `Attendees: ${rsvpData.rsvpCounts.CONFIRMED}/${rsvpData.festiveBoard.maxAttendees}`
                }
              </span>
            </div>
          </div>
        )}

        {/* Current RSVP Status */}
        {rsvpData.userRSVP && (
          <div className="mb-4 p-3 bg-blue-50 border-round">
            <div className="flex align-items-center gap-2 mb-2">
              <i className="pi pi-info-circle text-blue-500"></i>
              <span className="font-medium text-blue-700">Your Current RSVP Status</span>
            </div>
            <div className="flex align-items-center gap-2">
              <Tag 
                value={rsvpData.userRSVP.status} 
                severity={getStatusSeverity(rsvpData.userRSVP.status)}
                icon={getStatusIcon(rsvpData.userRSVP.status)}
              />
              <span className="text-sm text-600">
                RSVP'd on {formatDate(rsvpData.userRSVP.createdAt)}
              </span>
            </div>
          </div>
        )}

        {/* RSVP Form */}
        <div className="p-3 border-1 surface-border border-round">
          <h4 className="mb-3">Update Your RSVP</h4>
          
          <div className="mb-3">
            <label htmlFor="rsvpStatus" className="block text-600 mb-2">RSVP Status</label>
            <Dropdown
              id="rsvpStatus"
              value={selectedStatus}
              options={rsvpStatusOptions}
              onChange={(e) => setSelectedStatus(e.value)}
              className="w-full"
              disabled={saving}
            />
          </div>

          <div className="flex gap-2">
            <Button
              label={rsvpData.userRSVP ? "Update RSVP" : "Submit RSVP"}
              icon="pi pi-check"
              onClick={handleRSVPSubmit}
              loading={saving}
              className="p-button-success"
              disabled={selectedStatus === rsvpData.userRSVP?.status}
            />
            {rsvpData.userRSVP && (
              <Button
                label="Remove RSVP"
                icon="pi pi-trash"
                onClick={handleRemoveRSVP}
                loading={saving}
                className="p-button-outlined p-button-danger"
              />
            )}
          </div>
        </div>

        {/* Recent Participants */}
        {rsvpData.participants.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-3">Recent RSVPs</h4>
            <div className="grid">
              {rsvpData.participants.slice(0, 6).map((participant, index) => (
                <div key={participant.id} className="col-12 md:col-6 lg:col-4">
                  <div className="p-3 border-1 surface-border border-round">
                    <div className="flex align-items-center justify-content-between mb-2">
                      <span className="font-medium">
                        {participant.user.firstName} {participant.user.lastName}
                      </span>
                      <Tag 
                        value={participant.status} 
                        severity={getStatusSeverity(participant.status)}
                        icon={getStatusIcon(participant.status)}
                      />
                    </div>
                    <div className="text-xs text-600">
                      {formatDate(participant.createdAt)}
                    </div>
                    {participant.user.membershipNumber && (
                      <div className="text-xs text-500">
                        #{participant.user.membershipNumber}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {rsvpData.participants.length > 6 && (
              <div className="text-center mt-3">
                <span className="text-600">
                  And {rsvpData.participants.length - 6} more participants
                </span>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
