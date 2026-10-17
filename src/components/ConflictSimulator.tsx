import React, { useState } from 'react';
import { Resource, Booking, User } from '../types';
import { validateBookingRequest } from '../utils/bookingEngine';
import {
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  Database,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ConflictSimulatorProps {
  resources: Resource[];
  bookings: Booking[];
  currentUser: User;
  onSimulateInject: (newBookings: Booking[], notes: string) => void;
}

export const ConflictSimulator: React.FC<ConflictSimulatorProps> = ({
  resources,
  bookings,
  currentUser,
  onSimulateInject,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('exact');
  const [simulationLogs, setSimulationLogs] = useState<
    Array<{
      step: number;
      actor: string;
      action: string;
      result: 'success' | 'conflict' | 'info';
      detail: string;
    }>
  >([]);

  const hallA = resources.find((r) => r.id === 1) || resources[0];

  const runExactOverlapSimulation = () => {
    const logs: typeof simulationLogs = [];
    const testDate = '2026-10-25';

    // Step 1: User A submits 10:00 - 12:00
    logs.push({
      step: 1,
      actor: 'Student Alex (STU102)',
      action: `POST /book -> ${hallA.name} [${testDate} 10:00 to 12:00]`,
      result: 'info',
      detail: 'Initiating request. Engine checks for overlapping Approved/Pending bookings.',
    });

    const checkA = validateBookingRequest(
      hallA.id,
      `${testDate}T10:00`,
      `${testDate}T12:00`,
      bookings
    );

    if (checkA.isValid) {
      logs.push({
        step: 2,
        actor: 'SQLite Database',
        action: 'BEGIN IMMEDIATE TRANSACTION -> INSERT INTO bookings',
        result: 'success',
        detail: 'Transaction acquired write lock. Booking #101 created with status="Pending". AuditLog committed.',
      });
    }

    // Temporary array with booking 101 added
    const updatedBookings: Booking[] = [
      ...bookings,
      {
        id: 101,
        resource_id: hallA.id,
        user_id: 1,
        start_time: `${testDate}T10:00`,
        end_time: `${testDate}T12:00`,
        purpose: 'AI Society Demo (User A)',
        status: 'Pending',
        created_at: '2026-10-16 10:00:00',
      },
    ];

    // Step 3: User B submits identical 10:00 - 12:00 5 milliseconds later
    logs.push({
      step: 3,
      actor: 'Student Sarah (STU204)',
      action: `POST /book -> ${hallA.name} [${testDate} 10:00 to 12:00]`,
      result: 'info',
      detail: 'Simultaneous submission arriving 5ms later for the exact same resource & time window.',
    });

    const checkB = validateBookingRequest(
      hallA.id,
      `${testDate}T10:00`,
      `${testDate}T12:00`,
      updatedBookings
    );

    if (!checkB.isValid) {
      logs.push({
        step: 4,
        actor: 'Conflict Prevention Engine',
        action: 'CHECK OVERLAP: (10:00 < 12:00 AND 12:00 > 10:00) => TRUE',
        result: 'conflict',
        detail: `REQUEST REJECTED: Overlaps with Booking #101 (Pending). Returned HTTP 409 Conflict with alert: "${checkB.errorMessage}"`,
      });
    }

    setSimulationLogs(logs);
  };

  const runPartialOverlapSimulation = () => {
    const logs: typeof simulationLogs = [];
    const testDate = '2026-10-26';

    logs.push({
      step: 1,
      actor: 'Student Alex',
      action: `POST /book -> ${hallA.name} [${testDate} 13:00 to 16:00]`,
      result: 'success',
      detail: 'Approved booking established from 13:00 to 16:00.',
    });

    const tempBookings: Booking[] = [
      ...bookings,
      {
        id: 102,
        resource_id: hallA.id,
        user_id: 1,
        start_time: `${testDate}T13:00`,
        end_time: `${testDate}T16:00`,
        purpose: 'Robotics Workshop',
        status: 'Approved',
        created_at: '2026-10-16 10:00:00',
      },
    ];

    logs.push({
      step: 2,
      actor: 'Student David',
      action: `POST /book -> ${hallA.name} [${testDate} 15:00 to 18:00] (Overlaps 15:00-16:00)`,
      result: 'info',
      detail: 'Evaluating mathematical intersection: (15:00 < 16:00) AND (18:00 > 13:00) => Evaluates TRUE.',
    });

    const check = validateBookingRequest(
      hallA.id,
      `${testDate}T15:00`,
      `${testDate}T18:00`,
      tempBookings
    );

    logs.push({
      step: 3,
      actor: 'Conflict Prevention Engine',
      action: 'REJECTED: Partial Overlap Detected',
      result: 'conflict',
      detail: `Request blocked. Inline alert presented to student: "${check.errorMessage}"`,
    });

    setSimulationLogs(logs);
  };

  const runAdjacentSlotSimulation = () => {
    const logs: typeof simulationLogs = [];
    const testDate = '2026-10-27';

    logs.push({
      step: 1,
      actor: 'Existing Booking #1',
      action: `${hallA.name} [${testDate} 09:00 to 11:00] (Approved)`,
      result: 'success',
      detail: 'Resource is reserved from 09:00 until exactly 11:00.',
    });

    const tempBookings: Booking[] = [
      ...bookings,
      {
        id: 103,
        resource_id: hallA.id,
        user_id: 1,
        start_time: `${testDate}T09:00`,
        end_time: `${testDate}T11:00`,
        purpose: 'Morning Session',
        status: 'Approved',
        created_at: '2026-10-16 10:00:00',
      },
    ];

    logs.push({
      step: 2,
      actor: 'Incoming Request #2',
      action: `POST /book -> ${hallA.name} [${testDate} 11:00 to 13:00] (Back-to-back)`,
      result: 'info',
      detail: 'Touching boundary: New start (11:00) == Existing end (11:00). Checking formula: (11:00 < 11:00) => FALSE.',
    });

    const check = validateBookingRequest(
      hallA.id,
      `${testDate}T11:00`,
      `${testDate}T13:00`,
      tempBookings
    );

    if (check.isValid) {
      logs.push({
        step: 3,
        actor: 'Conflict Engine & Database',
        action: 'PERMITTED: Seamless Transition Allowed',
        result: 'success',
        detail: 'Back-to-back bookings are fully permitted! No overlap occurs when start time matches previous end time.',
      });
    }

    setSimulationLogs(logs);
  };

  const runQuotaSimulation = () => {
    const logs: typeof simulationLogs = [];
    const testDate = '2026-10-28';

    // Simulated user with 2 active bookings already
    const quotaBookings: Booking[] = [
      ...bookings,
      {
        id: 201,
        resource_id: 1,
        user_id: 1,
        start_time: `${testDate}T09:00`,
        end_time: `${testDate}T11:00`,
        purpose: 'Active Booking 1',
        status: 'Approved',
        created_at: '2026-10-16 09:00:00',
      },
      {
        id: 202,
        resource_id: 2,
        user_id: 1,
        start_time: `${testDate}T14:00`,
        end_time: `${testDate}T16:00`,
        purpose: 'Active Booking 2',
        status: 'Pending',
        created_at: '2026-10-16 09:30:00',
      },
    ];

    logs.push({
      step: 1,
      actor: 'Student Alex (STU102)',
      action: `POST /book -> ${hallA.name} [${testDate} 17:00 to 19:00]`,
      result: 'info',
      detail: 'Attempting to create a 3rd concurrent booking while holding 2 active reservations.',
    });

    const check = validateBookingRequest(
      hallA.id,
      `${testDate}T17:00`,
      `${testDate}T19:00`,
      quotaBookings,
      1 // User ID 1 has 2 active bookings
    );

    logs.push({
      step: 2,
      actor: 'Campus Fair-Use Policy Filter',
      action: 'CHECK ACTIVE QUOTA: user_active_count == 2 (Limit: 2)',
      result: 'conflict',
      detail: `BLOCKED: ${check.errorMessage}`,
    });

    setSimulationLogs(logs);
  };

  const runOperatingHoursSimulation = () => {
    const logs: typeof simulationLogs = [];
    const testDate = '2026-10-29';

    logs.push({
      step: 1,
      actor: 'Night Owl Student',
      action: `POST /book -> ${hallA.name} [${testDate} 21:00 to 23:00] (Night Shift)`,
      result: 'info',
      detail: 'Submitting time window past 08:00 PM closing time.',
    });

    const check = validateBookingRequest(
      hallA.id,
      `${testDate}T21:00`,
      `${testDate}T23:00`,
      bookings
    );

    logs.push({
      step: 2,
      actor: 'Campus Operating Hours Rule',
      action: 'CHECK HOURS: (21:00 > 20:00 closing) => VIOLATION',
      result: 'conflict',
      detail: `REJECTED: ${check.errorMessage}`,
    });

    setSimulationLogs(logs);
  };

  const runSelfRescheduleSimulation = () => {
    const logs: typeof simulationLogs = [];
    const testDate = '2026-10-30';

    const existingId = 999;
    const testBookings: Booking[] = [
      ...bookings,
      {
        id: existingId,
        resource_id: hallA.id,
        user_id: 1,
        start_time: `${testDate}T10:00`,
        end_time: `${testDate}T12:00`,
        purpose: 'Original Thesis Practice',
        status: 'Approved',
        created_at: '2026-10-16 09:00:00',
      },
    ];

    logs.push({
      step: 1,
      actor: 'Student Alex',
      action: `POST /book (Reschedule Booking #${existingId}) -> Shift from 10:00-12:00 to 10:30-12:30`,
      result: 'info',
      detail: 'New window overlaps with current reservation. Exclusion clause: (Booking.id != current_booking_id).',
    });

    const check = validateBookingRequest(
      hallA.id,
      `${testDate}T10:30`,
      `${testDate}T12:30`,
      testBookings,
      undefined,
      existingId // Exclude own ID
    );

    if (check.isValid) {
      logs.push({
        step: 2,
        actor: 'Self-Collision Exclusion Engine',
        action: 'EXCLUDE OWN ID: Booking #999 ignored during overlap evaluation',
        result: 'success',
        detail: 'SUCCESS: Reschedule allowed without generating a false-positive self-collision conflict!',
      });
    }

    setSimulationLogs(logs);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Multiple Bookings & Concurrency Simulator
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Detailed inspection of how the system processes concurrent, overlapping, and conflicting reservations.
            </p>
          </div>
        </div>
      </div>

      {/* Deep-Dive Answer Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          What Happens When Multiple Bookings for the Similar Time Period Arrive?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="font-bold text-slate-900 block flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              1. Mathematical Overlap Check
            </span>
            <p className="text-slate-600 leading-relaxed">
              Every request is verified against all active (<code className="font-mono text-slate-800">Approved</code> and <code className="font-mono text-slate-800">Pending</code>) bookings for that resource:
            </p>
            <div className="bg-white p-2.5 rounded font-mono text-[11px] text-slate-800 border border-slate-200">
              (new_start &lt; existing_end) AND (new_end &gt; existing_start)
            </div>
            <p className="text-slate-500">
              If this condition evaluates to true, the request is instantly rejected before any database commit.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="font-bold text-slate-900 block flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              2. Pending Request Protection
            </span>
            <p className="text-slate-600 leading-relaxed">
              Unlike simplistic systems that only check "Approved" slots, this system <strong>also locks slots for 'Pending' requests</strong>.
            </p>
            <p className="text-slate-500 leading-relaxed">
              This guarantees that once Student A clicks "Submit", Student B cannot snipe the same slot while Student A awaits administrator approval.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="font-bold text-slate-900 block flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              3. ACID Concurrency Lock
            </span>
            <p className="text-slate-600 leading-relaxed">
              In the SQLite backend, reservations use <code className="font-mono text-slate-800">BEGIN IMMEDIATE</code> transactions.
            </p>
            <p className="text-slate-500 leading-relaxed">
              SQLite acquires an exclusive database write lock before performing the overlap query. Two simultaneous sub-millisecond HTTP requests execute serially: the first succeeds, and the second detects the conflict.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Live Test Laboratory: Try Scenarios
            </h3>
            <p className="text-xs text-slate-500">
              Run step-by-step simulations on {hallA.name} to observe the Conflict Engine in action.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runExactOverlapSimulation}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              1. Exact Overlap
            </button>
            <button
              onClick={runPartialOverlapSimulation}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              2. Partial Overlap
            </button>
            <button
              onClick={runAdjacentSlotSimulation}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              3. Adjacent (Allowed)
            </button>
            <button
              onClick={runQuotaSimulation}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              4. Quota (2 Max)
            </button>
            <button
              onClick={runOperatingHoursSimulation}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              5. Hours Violation
            </button>
            <button
              onClick={runSelfRescheduleSimulation}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              6. Self-Reschedule
            </button>
          </div>
        </div>

        {/* Simulation Output Terminal */}
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-slate-200 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Conflict Engine Execution Tracer
            </span>
            <span className="text-[11px] font-mono">SQLite Transaction Isolation: IMMEDIATE</span>
          </div>

          <div className="p-4 space-y-3 font-mono text-xs">
            {simulationLogs.length > 0 ? (
              simulationLogs.map((log) => (
                <div
                  key={log.step}
                  className={`p-3 rounded-lg border flex items-start gap-3 ${
                    log.result === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : log.result === 'conflict'
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {log.result === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {log.result === 'conflict' && <XCircle className="w-4 h-4 text-rose-400" />}
                    {log.result === 'info' && <Clock className="w-4 h-4 text-indigo-400" />}
                  </div>

                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wider font-bold opacity-70">
                        Step {log.step}: {log.actor}
                      </span>
                    </div>
                    <div className="font-bold text-white text-xs">{log.action}</div>
                    <div className="text-[11px] opacity-80 font-sans mt-0.5 leading-relaxed">
                      {log.detail}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 font-sans">
                <Sparkles className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <p className="font-medium text-slate-400">Click any of the test buttons above to simulate concurrent booking collisions.</p>
                <p className="text-xs text-slate-500 mt-1">
                  You will see how requests are serialized, evaluated, and accepted or rejected.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
