# Smart Campus Resource & Room Booking System

A clean, modular, fully functional web prototype built with Python, Flask, SQLite, and Tailwind CSS.

## Architecture & Features

1. **Embedded SQLite Database (`campus_booking.db`)**:
   - Auto-initializes on startup with starter seed data (Users, Resources, Bookings, Audit Logs).
   - Strict Foreign Key relationships, status constraints, and ISO timestamps.

2. **Core Data Models**:
   - **User**: `id`, `name`, `email`, `role` (`'Student'` or `'Admin'`), `student_id`.
   - **Resource**: `id`, `name`, `category` (`'Room'`, `'Lab Gear'`, `'Hardware'`), `capacity`, `specs`, `guidelines`.
   - **Booking**: `id`, `resource_id`, `user_id`, `start_time`, `end_time`, `purpose`, `status` (`'Pending'`, `'Approved'`, `'Rejected'`, `'Cancelled'`), `admin_notes`, `created_at`.
   - **AuditLog**: `id`, `booking_id`, `action` (`'Created'`, `'Approved'`, `'Rejected'`, `'Cancelled'`), `performed_by`, `timestamp`, `details`.

3. **Slot Selector & Conflict Prevention Engine**:
   - Validates `start_time < end_time` and strictly prevents reservations in the past.
   - Detects time overlaps against existing **Approved** or **Pending** bookings for the same resource using mathematical interval overlap: `(new_start < existing_end) AND (new_end > existing_start)`.
   - Displays clear inline warning alerts on conflicting requests.

4. **Fast Role Switcher**:
   - Instant toggle in the top navbar between:
     - **Student View**: Alex Chen (Student ID: `STU102`)
     - **Admin View**: Dr. Marcus Smith (Campus Manager)

5. **Student & Admin Workflows**:
   - Student Dashboard with status badges (Pending: Amber, Approved: Green, Rejected: Rose, Cancelled: Slate) and 1-click booking cancellation.
   - Administrator Review Console with pending queue, custom decision note/instructions input, and instant Approve/Reject handlers.
   - Comprehensive Audit Log with complete historical timeline.

## Quick Start (Python Local Server)

```bash
# 1. Install Flask
pip install flask

# 2. Run the application
python app.py
```

Open your browser at `http://127.0.0.1:5000/`.
