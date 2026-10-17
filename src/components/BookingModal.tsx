import React, { useState, useEffect } from 'react';
import { Resource, Booking, User } from '../types';
import { validateBookingRequest, findNextAvailableSlot } from '../utils/bookingEngine';
import { AlertCircle, CheckCircle2, Clock, Calendar, Info, X, Sparkles, ChevronRight, Paperclip, FileText, Upload, Trash2 } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: Resource[];
  selectedResource?: Resource | null;
  initialDate?: string;
  initialStartTime?: string;
  existingBookings: Booking[];
  currentUser: User;
  onSubmitBooking: (
    resourceId: number,
    startTime: string,
    endTime: string,
    purpose: string,
    proofFile?: string,
    proofFileName?: string
  ) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  resources,
  selectedResource,
  initialDate,
  initialStartTime,
  existingBookings,
  currentUser,
  onSubmitBooking,
}) => {
  const [resourceId, setResourceId] = useState<number>(selectedResource ? selectedResource.id : resources[0]?.id || 1);
  
  const getDefaultDate = () => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().split('T')[0];
  };

  const [bookDate, setBookDate] = useState<string>(initialDate || getDefaultDate());
  const [startTime, setStartTime] = useState<string>(initialStartTime || '09:00');
  const [endTime, setEndTime] = useState<string>('11:00');
  const [purpose, setPurpose] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [proofFileUrl, setProofFileUrl] = useState<string>('');
  const [proofError, setProofError] = useState<string>('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (selectedResource) {
        setResourceId(selectedResource.id);
      }
      if (initialDate) {
        setBookDate(initialDate);
      }
      if (initialStartTime) {
        setStartTime(initialStartTime);
        const [h, m] = initialStartTime.split(':').map(Number);
        const endH = Math.min(20, h + 2);
        const endHStr = `${endH.toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')}`;
        setEndTime(endHStr);
      }
    }
  }, [isOpen, selectedResource, initialDate, initialStartTime]);

  if (!isOpen) return null;

  const currentResource = resources.find((r) => r.id === resourceId) || resources[0];

  const fullStartIso = `${bookDate}T${startTime}`;
  const fullEndIso = `${bookDate}T${endTime}`;

  // Evaluate conflict prevention engine & campus policies in real time
  const validation = validateBookingRequest(
    resourceId,
    fullStartIso,
    fullEndIso,
    existingBookings,
    currentUser.id
  );

  // Existing bookings on this selected date for this resource
  const dayBookings = existingBookings.filter((b) => {
    if (b.resource_id !== resourceId) return false;
    if (b.status !== 'Approved' && b.status !== 'Pending') return false;
    return b.start_time.startsWith(bookDate);
  });

  // Calculate duration in human readable form
  const getDurationText = () => {
    try {
      const s = new Date(fullStartIso).getTime();
      const e = new Date(fullEndIso).getTime();
      if (isNaN(s) || isNaN(e) || e <= s) return null;
      const diffMinutes = Math.round((e - s) / (1000 * 60));
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
      return `${mins} minutes`;
    } catch {
      return null;
    }
  };

  const durationText = getDurationText();

  // Quick preset handler
  const applyPreset = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  // Auto-find next free slot helper
  const handleAutoFindSlot = () => {
    const nextSlot = findNextAvailableSlot(resourceId, bookDate, 2, existingBookings, currentUser.id);
    if (nextSlot) {
      setStartTime(nextSlot.startTime);
      setEndTime(nextSlot.endTime);
    }
  };

  const userActiveCount = existingBookings.filter(
    (b) => b.user_id === currentUser.id && (b.status === 'Approved' || b.status === 'Pending')
  ).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setProofError('');

    if (!validation.isValid || !purpose.trim()) {
      return;
    }

    if (currentResource?.requiresProof && !proofFileName) {
      setProofError(`Proof document required: ${currentResource.name} requires an advisor approval letter or student ID verification (PDF or Image).`);
      return;
    }

    onSubmitBooking(
      resourceId,
      fullStartIso,
      fullEndIso,
      purpose.trim(),
      proofFileUrl || (proofFileName ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : undefined),
      proofFileName || undefined
    );
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFileName(file.name);
      setProofFileUrl(URL.createObjectURL(file));
      setProofError('');
    }
  };

  const attachDemoProof = () => {
    setProofFileName(`advisor_approval_${currentResource?.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`);
    setProofFileUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
    setProofError('');
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Visual Timeline hours from 8:00 to 20:00 (Operating Hours)
  const hoursTimeline = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  const getHourStatus = (hour: number) => {
    const hourStartStr = `${bookDate}T${hour.toString().padStart(2, '0')}:00`;
    const hourEndStr = `${bookDate}T${(hour + 1).toString().padStart(2, '0')}:00`;

    // Check if within user selection
    const userSelected = fullStartIso < hourEndStr && fullEndIso > hourStartStr;

    // Check if booked by existing
    const existing = dayBookings.find((b) => hourStartStr < b.end_time && hourEndStr > b.start_time);

    return {
      hour,
      isBooked: !!existing,
      status: existing?.status,
      bookingId: existing?.id,
      isSelected: userSelected,
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              New Resource Reservation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Requesting as <span className="font-semibold text-slate-700">{currentUser.name}</span> ({currentUser.role})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Campus Rules & Fair-Use Bar */}
        <div className="bg-indigo-50/60 px-6 py-2.5 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-indigo-900">
          <div className="flex items-center gap-3">
            <span>Operating: <strong>08:00 AM – 08:00 PM</strong></span>
            <span>&bull;</span>
            <span>Limit: <strong>30m – 4h</strong></span>
          </div>
          <div className="flex items-center gap-1 font-medium">
            <span>Active Quota:</span>
            <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${userActiveCount >= 2 ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-800'}`}>
              {userActiveCount}/2 active
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Resource Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Campus Resource
            </label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(Number(e.target.value))}
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
            >
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.category} {r.capacity ? `· Capacity ${r.capacity}` : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Quick info banner */}
          {currentResource && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-slate-500">
                <span>Category: <strong className="text-slate-700">{currentResource.category}</strong></span>
                <span>Location: <strong className="text-slate-700">{currentResource.location || 'Main Campus'}</strong></span>
              </div>
              <p className="text-slate-600 font-mono text-[11px] truncate">
                Specs: {currentResource.specs}
              </p>
            </div>
          )}

          {/* Date Picker & Quick Day Shortcuts */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Reservation Date
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const tmrw = new Date();
                    tmrw.setDate(tmrw.getDate() + 1);
                    setBookDate(tmrw.toISOString().split('T')[0]);
                  }}
                  className="text-indigo-600 hover:underline font-medium cursor-pointer"
                >
                  Tomorrow
                </button>
                <span className="text-slate-300">&bull;</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 2);
                    setBookDate(d.toISOString().split('T')[0]);
                  }}
                  className="text-indigo-600 hover:underline font-medium cursor-pointer"
                >
                  +2 Days
                </button>
              </div>
            </div>
            <input
              type="date"
              min={todayStr}
              value={bookDate}
              onChange={(e) => setBookDate(e.target.value)}
              required
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
            />
          </div>

          {/* Visual Interactive Day Schedule Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1.5">
              <span className="font-semibold">Schedule on {bookDate} (8:00 - 20:00):</span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-emerald-500"></span> Approved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-amber-400"></span> Pending
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-indigo-600"></span> Selected
                </span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-1 p-1.5 bg-slate-100 rounded-lg border border-slate-200">
              {hoursTimeline.map((h) => {
                const info = getHourStatus(h);
                let bgClass = 'bg-white hover:bg-slate-200 text-slate-600';
                if (info.isBooked) {
                  bgClass = info.status === 'Approved' ? 'bg-emerald-500 text-white font-bold' : 'bg-amber-400 text-amber-950 font-bold';
                } else if (info.isSelected) {
                  bgClass = 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400';
                }

                return (
                  <button
                    key={h}
                    type="button"
                    title={`${h}:00 - ${h + 1}:00 ${info.isBooked ? `(${info.status} #${info.bookingId})` : '(Available - Click to select)'}`}
                    onClick={() => {
                      if (!info.isBooked) {
                        const s = `${h.toString().padStart(2, '0')}:00`;
                        const e = `${(h + 2 <= 22 ? h + 2 : 22).toString().padStart(2, '0')}:00`;
                        applyPreset(s, e);
                      }
                    }}
                    className={`py-2 text-[10px] rounded transition-all text-center flex flex-col items-center justify-center font-mono cursor-pointer ${bgClass}`}
                  >
                    <span>{h}h</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Slot Presets */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Quick Slot Presets:</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('09:00', '11:00')}
                className="py-1.5 px-2 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors text-center cursor-pointer"
              >
                Morning 09:00-11:00
              </button>
              <button
                type="button"
                onClick={() => applyPreset('14:00', '16:00')}
                className="py-1.5 px-2 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors text-center cursor-pointer"
              >
                Afternoon 14:00-16:00
              </button>
              <button
                type="button"
                onClick={() => applyPreset('17:00', '19:00')}
                className="py-1.5 px-2 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors text-center cursor-pointer"
              >
                Evening 17:00-19:00
              </button>
            </div>
          </div>

          {/* Time Slot Inputs with Duration Display */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  End Time
                </span>
                {durationText && (
                  <span className="text-[11px] font-mono text-indigo-600 font-semibold">{durationText}</span>
                )}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
              />
            </div>
          </div>

          {/* Conflict Prevention Engine Real-Time Banner */}
          {!validation.isValid ? (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block text-rose-900">Conflict Detected (Slot Already Reserved):</span>
                  <p className="mt-0.5 leading-relaxed">{validation.errorMessage}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                <span className="text-[11px] text-rose-700">Need an open slot?</span>
                <button
                  type="button"
                  onClick={handleAutoFindSlot}
                  className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-Pick Next Available Slot
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold">Timeframe is Available!</span> No overlapping bookings for {currentResource?.name}.
              </div>
            </div>
          )}

          {/* Proof Document Requirement (for restricted resources) */}
          <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
            currentResource?.requiresProof
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                  Advisor Approval / Student ID Proof
                  {currentResource?.requiresProof ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-mono uppercase">
                      Required
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-normal">
                      (Optional for this resource)
                    </span>
                  )}
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {currentResource?.requiresProof
                    ? `Institutional policy requires an advisor sign-off letter or ID clearance for ${currentResource.name}.`
                    : 'Attach optional supporting syllabus or faculty authorization documents.'}
                </p>
              </div>
            </div>

            {proofFileName ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-800 text-xs font-mono truncate">
                    {proofFileName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProofFileName('');
                    setProofFileUrl('');
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  title="Remove attached file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg p-2.5 text-center cursor-pointer transition-colors bg-white flex items-center justify-center gap-1.5 text-xs text-slate-600">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>Choose PDF / Image File</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={attachDemoProof}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-200 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Attach Demo Approval PDF
                </button>
              </div>
            )}

            {proofError && (
              <p className="text-[11px] text-rose-700 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {proofError}
              </p>
            )}
          </div>

          {/* Purpose / Project Justification */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purpose / Academic Justification
            </label>
            <textarea
              rows={2}
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Senior Capstone Demo, Robotics Society Workshop, or Faculty Guest Keynote..."
              className="w-full text-xs px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            {hasAttemptedSubmit && !purpose.trim() && (
              <p className="text-[11px] text-rose-600 mt-1">Please enter the purpose of this reservation.</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.isValid}
              className={`px-5 py-2.5 text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 ${
                validation.isValid
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Confirm & Submit Request
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
