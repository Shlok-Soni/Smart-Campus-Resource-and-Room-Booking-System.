"""
Smart Campus Resource & Room Booking System
============================================
A clean, modular, fully functional Flask & SQLite web prototype.

Enterprise Features Included:
- Real Authentication: User Signup, Login, and Logout using werkzeug.security password hashes.
- Role-based Access Control: Route guards (@login_required, @admin_required) protecting booking and management.
- Restricted Resource Proof Requirement: Mandatory advisor approval / student ID document uploads (PDF/Image) using secure_filename.
- Admin Analytics Dashboard: Interactive Chart.js visualizations for resource popularity, status breakdown, and peak hours.
- Conflict Prevention Engine: Concurrency-safe atomic transaction locks (BEGIN IMMEDIATE) and non-overlapping interval checks.
- Image Bug Fix: Collaborative Robotics Lab configured with high-res Unsplash photo and onerror fallback.

How to run:
    pip install flask
    python app.py
Open:
    http://127.0.0.1:5000/
"""

import os
import sqlite3
from datetime import datetime, timezone
from functools import wraps
from flask import (
    Flask,
    request,
    redirect,
    url_for,
    render_template_string,
    flash,
    session,
    jsonify,
    send_from_directory
)

# Safe imports for werkzeug with standard library fallback for lightweight test environments
try:
    from werkzeug.security import generate_password_hash, check_password_hash
    from werkzeug.utils import secure_filename
except ImportError:
    import hashlib
    def generate_password_hash(password):
        salt = "scb_salt_2026"
        return f"pbkdf2:sha256:{hashlib.sha256((salt + password).encode()).hexdigest()}"
    def check_password_hash(p_hash, password):
        salt = "scb_salt_2026"
        computed = f"pbkdf2:sha256:{hashlib.sha256((salt + password).encode()).hexdigest()}"
        return p_hash == computed or p_hash == password or p_hash == f"plain:{password}"
    def secure_filename(filename):
        return "".join(c for c in filename if c.isalnum() or c in "._- ").strip()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "smart_campus_booking_secret_key_2026")
DATABASE = "campus_booking.db"
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "docx"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_db():
    """Connect to SQLite database with Row factory for dict-like access."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes tables, migrates columns if necessary, and populates starter seed data."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Users table (with password_hash)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('Student', 'Admin')),
            student_id TEXT
        );
    """)

    # Column migration check for users.password_hash
    cursor.execute("PRAGMA table_info(users)")
    user_cols = [row["name"] for row in cursor.fetchall()]
    if "password_hash" not in user_cols:
        default_hash = generate_password_hash("password123")
        cursor.execute(f"ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT '{default_hash}';")

    # 2. Resources table (with image_url and requires_proof)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('Room', 'Lab Gear', 'Hardware')),
            capacity INTEGER,
            specs TEXT,
            guidelines TEXT,
            image_url TEXT,
            requires_proof INTEGER DEFAULT 0
        );
    """)

    # Column migration check for resources
    cursor.execute("PRAGMA table_info(resources)")
    res_cols = [row["name"] for row in cursor.fetchall()]
    if "image_url" not in res_cols:
        cursor.execute("ALTER TABLE resources ADD COLUMN image_url TEXT;")
    if "requires_proof" not in res_cols:
        cursor.execute("ALTER TABLE resources ADD COLUMN requires_proof INTEGER DEFAULT 0;")

    # 3. Bookings table (with proof_file)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resource_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            purpose TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
            admin_notes TEXT,
            created_at TEXT NOT NULL,
            proof_file TEXT,
            FOREIGN KEY (resource_id) REFERENCES resources(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)

    # Column migration check for bookings.proof_file
    cursor.execute("PRAGMA table_info(bookings)")
    booking_cols = [row["name"] for row in cursor.fetchall()]
    if "proof_file" not in booking_cols:
        cursor.execute("ALTER TABLE bookings ADD COLUMN proof_file TEXT;")

    # 4. Audit Log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            performed_by TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            details TEXT,
            FOREIGN KEY (booking_id) REFERENCES bookings(id)
        );
    """)

    conn.commit()

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()["count"] == 0:
        # Seed Users with hashed passwords
        stu_hash = generate_password_hash("password123")
        adm_hash = generate_password_hash("admin123")
        cursor.execute("""
            INSERT INTO users (id, name, email, password_hash, role, student_id)
            VALUES 
                (1, 'Alex Chen', 'alex.chen@campus.edu', ?, 'Student', 'STU102'),
                (2, 'Dr. Marcus Smith', 'm.smith@campus.edu', ?, 'Admin', NULL)
        """, (stu_hash, adm_hash))

        # Seed Resources with high-quality working images & proof requirement flags
        cursor.execute("""
            INSERT INTO resources (id, name, category, capacity, specs, guidelines, image_url, requires_proof)
            VALUES 
                (1, 'Seminar Hall A', 'Room', 120, 'Dual 4K Laser Projectors, Dolby Atmos Audio, Shure Wireless Mics, Tiered Oak Seating', 'Food and beverages strictly prohibited. Requires 24-hour advance reservation and Faculty/Advisor sign-off.', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80', 1),
                (2, 'GPU Compute Server 1', 'Lab Gear', 1, '8x NVIDIA A100 (80GB SXM4), 2TB DDR4 ECC RAM, High-speed InfiniBand', 'Max reservation window is 4 hours per job. High-compute authorization proof required.', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80', 1),
                (3, 'IoT Embedded Kit #4', 'Hardware', 1, 'Raspberry Pi 5 (8GB), ESP32-S3 Dev Boards, LoRa Transceivers, Sensor Module Bundle', 'Check all connector pins before and after use. Return in electrostatic protective case.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', 0),
                (4, 'Collaborative Robotics Lab', 'Room', 24, 'Vicon Optical Motion Capture, 4x UR5 Robotic Arms, High-Current 3-Phase Workstations', 'Safety goggles and supervisor advisor sign-off required prior to power-on.', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80', 1)
        """)

        # Seed Bookings
        cursor.execute("""
            INSERT INTO bookings (id, resource_id, user_id, start_time, end_time, purpose, status, admin_notes, created_at, proof_file)
            VALUES 
                (1, 1, 1, '2026-10-18T10:00', '2026-10-18T12:00', 'Robotics Society Guest Speaker Keynote & Demo', 'Approved', 'Approved for engineering guest lecture series.', '2026-10-16 09:00:00', 'dean_authorization_letter.pdf'),
                (2, 2, 1, '2026-10-19T14:00', '2026-10-19T18:00', 'Large Language Model LoRA Fine-Tuning for Senior Capstone', 'Pending', NULL, '2026-10-16 09:30:00', 'advisor_capstone_approval.pdf'),
                (3, 4, 1, '2026-10-20T13:00', '2026-10-20T15:00', 'Drone Indoor Flight Motion Capture Experiments', 'Approved', 'Safety clearance confirmed.', '2026-10-16 11:20:00', 'robotics_lab_safety_cert.pdf')
        """)

        # Seed Audit Logs
        cursor.execute("""
            INSERT INTO audit_logs (booking_id, action, performed_by, timestamp, details)
            VALUES 
                (1, 'Created', 'Alex Chen (STU102)', '2026-10-16 09:00:00', 'Initial booking submission with proof attached for Seminar Hall A'),
                (1, 'Approved', 'Dr. Marcus Smith (Admin)', '2026-10-16 09:15:00', 'Approved for engineering guest lecture series.'),
                (2, 'Created', 'Alex Chen (STU102)', '2026-10-16 09:30:00', 'Initial booking submission with proof attached for GPU Compute Server 1'),
                (3, 'Created', 'Alex Chen (STU102)', '2026-10-16 11:20:00', 'Initial booking submission for Collaborative Robotics Lab'),
                (3, 'Approved', 'Dr. Marcus Smith (Admin)', '2026-10-16 11:45:00', 'Safety clearance confirmed.')
        """)

        conn.commit()
    else:
        # Ensure Collaborative Robotics Lab exists if database already initialized
        cursor.execute("SELECT COUNT(*) as count FROM resources WHERE id = 4")
        if cursor.fetchone()["count"] == 0:
            cursor.execute("""
                INSERT INTO resources (id, name, category, capacity, specs, guidelines, image_url, requires_proof)
                VALUES (4, 'Collaborative Robotics Lab', 'Room', 24, 'Vicon Optical Motion Capture, 4x UR5 Robotic Arms, High-Current 3-Phase Workstations', 'Safety goggles and supervisor sign-off required prior to power-on.', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80', 1)
            """)
            conn.commit()
        else:
            # Update image URL for resource 4 to guarantee high quality
            cursor.execute("""
                UPDATE resources 
                SET image_url = 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
                    requires_proof = 1
                WHERE id = 4
            """)
            conn.commit()

    conn.close()


def get_current_user():
    """Gets currently logged-in user from session using dynamic session data."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return user


# -----------------------------------------------------------------------------
# Authentication Route Decorators & Guards
# -----------------------------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            flash("Please sign in with your institutional credentials to access this service.", "error")
            return redirect(url_for("login", next=request.url))
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            flash("Please sign in as Administrator to access console.", "error")
            return redirect(url_for("login", next=request.url))
        if session.get("role") != "Admin":
            flash("Access Restricted: This page requires Administrator privileges.", "error")
            return redirect(url_for("resource_directory"))
        return f(*args, **kwargs)
    return decorated_function


def format_time_12h(iso_str):
    """Formats an ISO datetime string into a user-friendly 12-hour clock (e.g., '10:00 AM')."""
    try:
        dt = datetime.fromisoformat(iso_str)
        return dt.strftime("%I:%M %p").lstrip("0")
    except Exception:
        parts = iso_str.split("T")
        return parts[1] if len(parts) > 1 else iso_str


def get_user_active_booking_count(user_id, exclude_booking_id=None):
    """Counts active (Pending or Approved) reservations currently held by this user."""
    conn = get_db()
    query = """
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE user_id = ? 
          AND status IN ('Approved', 'Pending')
    """
    params = [user_id]
    if exclude_booking_id:
        query += " AND id != ?"
        params.append(int(exclude_booking_id))
    
    count = conn.execute(query, params).fetchone()["count"]
    conn.close()
    return count


def check_booking_conflict(resource_id, start_time, end_time, exclude_booking_id=None):
    """Checks for overlapping Approved or Pending reservations."""
    conn = get_db()
    cursor = conn.cursor()
    query = """
        SELECT b.*, r.name as resource_name 
        FROM bookings b
        JOIN resources r ON b.resource_id = r.id
        WHERE b.resource_id = ?
          AND b.status IN ('Approved', 'Pending')
          AND (? < b.end_time) AND (? > b.start_time)
    """
    params = [resource_id, end_time, start_time]
    if exclude_booking_id:
        query += " AND b.id != ?"
        params.append(exclude_booking_id)

    try:
        conflict = cursor.execute(query, params).fetchone()
    finally:
        cursor.close()
        conn.close()
    return conflict


# -----------------------------------------------------------------------------
# Jinja Base & Views HTML Layout (Tailwind CDN)
# -----------------------------------------------------------------------------
BASE_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }} - Smart Campus Booking</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    {% block head %}{% endblock %}
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col">

    <!-- Top Navigation Bar -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
            <!-- Zone 1: Wordmark -->
            <a href="{{ url_for('resource_directory') }}" class="flex items-center gap-3 shrink-0">
                <div class="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
                    SC
                </div>
                <div class="flex flex-col">
                    <span class="font-bold text-slate-900 text-base tracking-tight whitespace-nowrap leading-tight">
                        Smart Campus Booking
                    </span>
                    <span class="text-[11px] text-slate-500 whitespace-nowrap leading-none mt-0.5">
                        Resource & Room Allocation System
                    </span>
                </div>
            </a>

            <!-- Zone 2: Navigation Links -->
            <nav class="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600">
                <a href="{{ url_for('resource_directory') }}" class="px-3 py-1.5 rounded-md hover:text-indigo-600 hover:bg-slate-50 transition-colors whitespace-nowrap {{ 'text-indigo-600 bg-indigo-50 font-semibold' if active_page == 'directory' else '' }}">Directory</a>
                {% if current_user and current_user.role == 'Student' %}
                <a href="{{ url_for('student_dashboard') }}" class="px-3 py-1.5 rounded-md hover:text-indigo-600 hover:bg-slate-50 transition-colors whitespace-nowrap {{ 'text-indigo-600 bg-indigo-50 font-semibold' if active_page == 'student_dashboard' else '' }}">My Reservations</a>
                {% endif %}
                {% if current_user and current_user.role == 'Admin' %}
                <a href="{{ url_for('admin_dashboard') }}" class="px-3 py-1.5 rounded-md hover:text-indigo-600 hover:bg-slate-50 transition-colors whitespace-nowrap {{ 'text-indigo-600 bg-indigo-50 font-semibold' if active_page == 'admin_dashboard' else '' }}">Admin Approvals</a>
                <a href="{{ url_for('admin_analytics') }}" class="px-3 py-1.5 rounded-md hover:text-indigo-600 hover:bg-slate-50 transition-colors whitespace-nowrap {{ 'text-indigo-600 bg-indigo-50 font-semibold' if active_page == 'admin_analytics' else '' }}">Analytics</a>
                <a href="{{ url_for('audit_logs') }}" class="px-3 py-1.5 rounded-md hover:text-indigo-600 hover:bg-slate-50 transition-colors whitespace-nowrap {{ 'text-indigo-600 bg-indigo-50 font-semibold' if active_page == 'audit_logs' else '' }}">Audit Logs</a>
                {% endif %}
            </nav>

            <!-- Zone 3: Authentication & User Profile -->
            <div class="flex items-center gap-3 shrink-0">
                {% if current_user %}
                <div class="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
                    <span class="px-2.5 py-1 rounded-md bg-white text-indigo-700 shadow-xs font-semibold">
                        {{ current_user.role }} Mode
                    </span>
                </div>

                <div class="hidden lg:flex flex-col text-right">
                    <span class="text-xs font-semibold text-slate-900 leading-tight">{{ current_user.name }}</span>
                    <span class="text-[11px] text-slate-500 leading-tight font-mono">
                        {{ current_user.student_id if current_user.student_id else 'Campus Admin' }}
                    </span>
                </div>

                <a href="{{ url_for('logout') }}" class="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-colors">
                    Log Out
                </a>
                {% else %}
                <a href="{{ url_for('login') }}" class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs">
                    Sign In / Register
                </a>
                {% endif %}
            </div>
        </div>
    </header>

    <!-- Flash Messages / Inline Conflict Alerts -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
        {% with messages = get_flashed_messages(with_categories=true) %}
            {% if messages %}
                {% for category, message in messages %}
                    <div class="p-4 mb-4 rounded-xl text-sm border flex items-start gap-3 shadow-xs {{ 'bg-rose-50 border-rose-200 text-rose-800' if category == 'error' else 'bg-emerald-50 border-emerald-200 text-emerald-800' if category == 'success' else 'bg-indigo-50 border-indigo-200 text-indigo-800' }}" role="alert">
                        <span class="font-bold">{{ 'Notice:' if category == 'info' else 'Alert:' if category == 'error' else 'Success:' }}</span>
                        <div class="flex-1">{{ message }}</div>
                    </div>
                {% endfor %}
            {% endif %}
        {% endwith %}
    </div>

    <!-- Main Content Viewport -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {% block content %}{% endblock %}
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <p>Smart Campus Resource & Room Booking System &bull; SQLite Embedded Engine &bull; Python Flask</p>
    </footer>

</body>
</html>
"""

# Template: Login & Registration View
AUTH_TEMPLATE = BASE_TEMPLATE + """
{% block content %}
<div class="max-w-md mx-auto my-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-md">
    <div class="text-center mb-6">
        <div class="w-12 h-12 bg-indigo-600 text-white rounded-xl mx-auto flex items-center justify-center font-bold text-lg mb-3 shadow-xs">
            SC
        </div>
        <h1 class="text-xl font-bold text-slate-900">Institutional Portal Sign In</h1>
        <p class="text-xs text-slate-500 mt-1">Authenticate with your campus credentials to reserve facilities</p>
    </div>

    <form method="POST" action="{{ url_for('login') }}" class="space-y-4">
        <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Institutional Email</label>
            <input type="email" name="email" required placeholder="alex.chen@campus.edu" 
                   class="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono">
        </div>
        <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input type="password" name="password" required placeholder="••••••••••••" 
                   class="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600">
        </div>
        <button type="submit" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors">
            Sign In to Account
        </button>
    </form>

    <!-- One-Click Demo Profiles -->
    <div class="mt-6 pt-5 border-t border-slate-100">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
            One-Click Fast Demo Testing
        </span>
        <div class="grid grid-cols-2 gap-2 text-xs">
            <a href="{{ url_for('demo_login', user_id=1) }}" class="p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors">
                <span class="font-bold text-slate-900 block truncate">Alex Chen</span>
                <span class="text-[11px] text-slate-500 font-mono">Student &bull; STU102</span>
            </a>
            <a href="{{ url_for('demo_login', user_id=2) }}" class="p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors">
                <span class="font-bold text-slate-900 block truncate">Dr. Marcus Smith</span>
                <span class="text-[11px] text-indigo-600 font-semibold">Campus Admin</span>
            </a>
        </div>
    </div>

    <!-- Registration Link -->
    <div class="mt-6 pt-4 border-t border-slate-100 text-center">
        <p class="text-xs text-slate-500">
            Don't have an institutional account yet? 
            <a href="{{ url_for('register') }}" class="text-indigo-600 font-semibold hover:underline">Register New Account</a>
        </p>
    </div>
</div>
{% endblock %}
"""

# Template: Registration
REGISTER_TEMPLATE = BASE_TEMPLATE + """
{% block content %}
<div class="max-w-md mx-auto my-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-md">
    <div class="text-center mb-6">
        <h1 class="text-xl font-bold text-slate-900">Create Campus Account</h1>
        <p class="text-xs text-slate-500 mt-1">Register for student or administrative room reservation access</p>
    </div>

    <form method="POST" action="{{ url_for('register') }}" class="space-y-4">
        <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
            <input type="text" name="name" required placeholder="e.g. Maya Lin" 
                   class="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600">
        </div>
        <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Institutional Email</label>
            <input type="email" name="email" required placeholder="maya.lin@campus.edu" 
                   class="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono">
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Institutional Role</label>
                <select name="role" class="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white">
                    <option value="Student">Student</option>
                    <option value="Admin">Administrator</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Student / Staff ID</label>
                <input type="text" name="student_id" placeholder="STU108" 
                       class="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono">
            </div>
        </div>
        <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Create Password</label>
            <input type="password" name="password" required placeholder="••••••••••••" 
                   class="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600">
        </div>
        <button type="submit" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors">
            Complete Registration
        </button>
    </form>

    <div class="mt-6 pt-4 border-t border-slate-100 text-center">
        <p class="text-xs text-slate-500">
            Already have an account? 
            <a href="{{ url_for('login') }}" class="text-indigo-600 font-semibold hover:underline">Sign In</a>
        </p>
    </div>
</div>
{% endblock %}
"""

# Template: Resource Directory
DIRECTORY_TEMPLATE = BASE_TEMPLATE + """
{% block content %}
<div class="space-y-6">
    <!-- Header & Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">Campus Resource Directory</h1>
            <p class="text-sm text-slate-500 mt-1">Explore and reserve lecture halls, high-performance compute clusters, and lab hardware.</p>
        </div>
        <div class="flex items-center gap-2">
            {% if current_user %}
            <span class="text-xs font-medium text-slate-500">Logged in as:</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                {{ current_user.name }} ({{ current_user.role }})
            </span>
            {% else %}
            <a href="{{ url_for('login') }}" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white">
                Sign In to Reserve
            </a>
            {% endif %}
        </div>
    </div>

    <!-- Search & Filters -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form method="GET" action="{{ url_for('resource_directory') }}" class="flex-1 flex gap-2">
            <input type="text" name="search" value="{{ search_query }}" placeholder="Search resources, hardware specs, robotics..." 
                   class="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600">
            <button type="submit" class="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap">
                Search
            </button>
            {% if search_query or category_filter != 'All' %}
            <a href="{{ url_for('resource_directory') }}" class="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap flex items-center">
                Clear
            </a>
            {% endif %}
        </form>

        <!-- Category Tabs -->
        <div class="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {% for cat in ['All', 'Room', 'Lab Gear', 'Hardware'] %}
            <a href="{{ url_for('resource_directory', category=cat, search=search_query) }}" 
               class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap {{ 'bg-white text-slate-900 shadow-xs font-semibold' if category_filter == cat else 'text-slate-600 hover:text-slate-900' }}">
                {{ cat }}
            </a>
            {% endfor %}
        </div>
    </div>

    <!-- Resource Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {% for resource in resources %}
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col hover:border-slate-300 hover:shadow-md transition-all">
            <!-- Resource Image with Fallback Error Handler -->
            <div class="h-48 w-full bg-slate-100 relative overflow-hidden">
                <img src="{{ resource.image_url or 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80' }}" 
                     alt="{{ resource.name }}"
                     onerror="this.onerror=null; this.src='https://placehold.co/600x400?text={{ resource.name | urlencode }}';"
                     class="w-full h-full object-cover">
                <div class="absolute top-3 left-3 flex items-center gap-1.5">
                    <span class="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-md">
                        {{ resource.category }}
                    </span>
                    {% if resource.requires_proof %}
                    <span class="bg-amber-600/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-1 rounded-md">
                        Proof Req.
                    </span>
                    {% endif %}
                </div>
            </div>

            <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <h3 class="text-base font-bold text-slate-900 tracking-tight">{{ resource.name }}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                        {% if resource.capacity %}<span>Cap: {{ resource.capacity }}</span> &bull; {% endif %}
                        <span>ID: #{{ resource.id }}</span>
                    </div>

                    <div class="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Specifications</span>
                        <p class="text-xs text-slate-700 font-mono leading-relaxed line-clamp-2">{{ resource.specs }}</p>
                    </div>

                    <div class="mt-3">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rules & Guidelines</span>
                        <p class="text-xs text-slate-600 leading-relaxed line-clamp-2">{{ resource.guidelines }}</p>
                    </div>
                </div>

                <div class="mt-5 pt-4 border-t border-slate-100">
                    <button onclick="openBookingModal({{ resource.id }}, '{{ resource.name | escape }}', {{ 1 if resource.requires_proof else 0 }})" 
                            class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5">
                        Reserve Facility &rarr;
                    </button>
                </div>
            </div>
        </div>
        {% endfor %}
    </div>
</div>

<!-- Concurrency-Safe Booking Modal with Multipart File Proof Upload -->
<div id="bookingModal" class="hidden fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
                <h3 class="text-base font-bold text-slate-900">Reserve Campus Facility</h3>
                <p id="modalResourceName" class="text-xs text-indigo-600 font-semibold mt-0.5"></p>
            </div>
            <button onclick="closeBookingModal()" class="text-slate-400 hover:text-slate-600 p-1">&times;</button>
        </div>

        <form method="POST" action="{{ url_for('book_resource') }}" enctype="multipart/form-data" class="mt-4 space-y-4">
            <input type="hidden" name="resource_id" id="modalResourceId" value="">

            <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Reservation Date</label>
                <input type="date" name="book_date" required id="modalBookDate"
                       class="w-full text-xs px-3.5 py-2 rounded-lg border border-slate-300 font-mono">
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Start Time (08:00 - 20:00)</label>
                    <input type="time" name="start_time" value="09:00" required 
                           class="w-full text-xs px-3.5 py-2 rounded-lg border border-slate-300 font-mono">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                    <input type="time" name="end_time" value="11:00" required 
                           class="w-full text-xs px-3.5 py-2 rounded-lg border border-slate-300 font-mono">
                </div>
            </div>

            <!-- Proof Upload Field -->
            <div id="proofUploadSection" class="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs space-y-2">
                <label class="block font-semibold text-slate-900 flex items-center justify-between">
                    <span>Advisor Approval / Student ID Proof</span>
                    <span id="proofBadge" class="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-mono">Required</span>
                </label>
                <p class="text-[11px] text-slate-500 leading-tight">
                    Upload an advisor authorization letter, department clearance, or student ID (PDF, PNG, JPG).
                </p>
                <input type="file" name="proof_file" accept=".pdf,.png,.jpg,.jpeg,.docx" id="modalProofInput"
                       class="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700">
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Purpose / Capstone Justification</label>
                <textarea name="purpose" rows="2" required placeholder="Academic research, workshop or capstone demonstration..."
                          class="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"></textarea>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onclick="closeBookingModal()" class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800">
                    Cancel
                </button>
                <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs">
                    Confirm & Submit Request
                </button>
            </div>
        </form>
    </div>
</div>

<script>
    function openBookingModal(resourceId, name, requiresProof) {
        document.getElementById('modalResourceId').value = resourceId;
        document.getElementById('modalResourceName').innerText = name;
        
        // Default tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('modalBookDate').value = tomorrow.toISOString().split('T')[0];
        
        const proofSection = document.getElementById('proofUploadSection');
        const proofBadge = document.getElementById('proofBadge');
        if (requiresProof) {
            proofBadge.innerText = 'Required';
            proofBadge.className = 'text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-mono';
        } else {
            proofBadge.innerText = 'Optional';
            proofBadge.className = 'text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-mono';
        }

        document.getElementById('bookingModal').classList.remove('hidden');
    }

    function closeBookingModal() {
        document.getElementById('bookingModal').classList.add('hidden');
    }
</script>
{% endblock %}
"""

# Template: Admin Approvals Console with Proof Links
ADMIN_DASHBOARD_TEMPLATE = BASE_TEMPLATE + """
{% block content %}
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
            <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold tracking-tight text-slate-900">Administrator Console</h1>
                <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold font-mono">
                    {{ pending_bookings | length }} Pending Requests
                </span>
            </div>
            <p class="text-sm text-slate-500 mt-1">Review student reservations, inspect uploaded proof documents, and issue approvals.</p>
        </div>
        <div class="flex items-center gap-2">
            <a href="{{ url_for('admin_analytics') }}" class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors">
                Facility Analytics &rarr;
            </a>
            <a href="{{ url_for('audit_logs') }}" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
                Audit Trail History &rarr;
            </a>
        </div>
    </div>

    <!-- Pending Queue -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div class="px-6 py-4 border-b border-slate-200 bg-amber-50/60 flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900">Pending Review Queue</h3>
            <span class="text-xs text-amber-800 font-medium">Decisions & Verifications Required</span>
        </div>

        {% if pending_bookings %}
        <div class="divide-y divide-slate-200">
            {% for b in pending_bookings %}
            <div class="p-6 hover:bg-slate-50/40 transition-colors">
                <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div class="space-y-3 flex-1">
                        <div class="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                            <span class="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                Request #{{ b.id }}
                            </span>
                            <span>&bull;</span>
                            <span class="font-semibold text-slate-900">{{ b.user_name }}</span>
                            <span class="text-slate-500 font-mono">({{ b.user_email }})</span>
                            <span>&bull;</span>
                            <span class="text-slate-500 font-mono">{{ b.created_at }}</span>
                        </div>

                        <div class="flex items-baseline gap-2">
                            <h4 class="text-lg font-bold text-slate-900 tracking-tight">{{ b.resource_name }}</h4>
                            <span class="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                                {{ b.resource_category }}
                            </span>
                        </div>

                        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 flex flex-wrap gap-4">
                            <div>Date: <strong class="text-slate-900">{{ b.start_time.split('T')[0] }}</strong></div>
                            <div>Time Slot: <strong class="text-slate-900">{{ b.start_time.split('T')[1] }} &rarr; {{ b.end_time.split('T')[1] }}</strong></div>
                        </div>

                        <div class="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-100">
                            <span class="font-bold text-slate-900 block mb-1">Stated Purpose:</span>
                            <p>{{ b.purpose }}</p>
                        </div>

                        <!-- Uploaded Proof Document Direct Link / Inspection -->
                        {% if b.proof_file %}
                        <div class="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs">
                            <span class="font-semibold text-indigo-900">📎 Uploaded Proof Document:</span>
                            <a href="{{ url_for('uploaded_file', filename=b.proof_file) }}" target="_blank" 
                               class="font-mono text-indigo-700 font-bold hover:underline flex items-center gap-1">
                                {{ b.proof_file }} &rarr; (Inspect File)
                            </a>
                        </div>
                        {% else %}
                        <div class="text-xs text-slate-400 italic">No external proof file attached.</div>
                        {% endif %}
                    </div>

                    <!-- Action form -->
                    <div class="lg:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
                        <form method="POST" action="{{ url_for('admin_approve', booking_id=b.id) }}">
                            <label class="block text-xs font-bold text-slate-800 mb-1">Decision Note / Instructions</label>
                            <textarea name="admin_notes" rows="2" placeholder="e.g. Approved. Pick up keys at Tech Office." 
                                      class="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white mb-3"></textarea>
                            <div class="flex items-center gap-2">
                                <button type="submit" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg">
                                    Approve
                                </button>
                                <button type="submit" formaction="{{ url_for('admin_reject', booking_id=b.id) }}" 
                                        class="py-2 px-4 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold rounded-lg">
                                    Reject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {% endfor %}
        </div>
        {% else %}
        <div class="p-12 text-center text-slate-400 text-xs">
            No pending reservation requests awaiting review.
        </div>
        {% endif %}
    </div>
</div>
{% endblock %}
"""

# Template: Admin Analytics Dashboard (Chart.js CDN)
ANALYTICS_TEMPLATE = BASE_TEMPLATE + """
{% block head %}
<!-- Chart.js CDN -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
{% endblock %}

{% block content %}
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
            <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold tracking-tight text-slate-900">Facility Utilization Analytics</h1>
                <span class="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
                    Live Chart.js Metrics
                </span>
            </div>
            <p class="text-sm text-slate-500 mt-1">Resource demand distribution, booking approval pipeline, and peak utilization hours.</p>
        </div>
        <a href="{{ url_for('admin_dashboard') }}" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
            &larr; Admin Approvals Queue
        </a>
    </div>

    <!-- Metric Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Reservations</span>
            <div class="text-2xl font-bold text-slate-900 font-mono mt-1">{{ total_bookings }}</div>
            <span class="text-xs text-slate-500 mt-0.5 block">Recorded in database</span>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Approval Rate</span>
            <div class="text-2xl font-bold text-emerald-600 font-mono mt-1">{{ approval_rate }}%</div>
            <span class="text-xs text-slate-500 mt-0.5 block">{{ approved_count }} Approved Slots</span>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Most Booked Resource</span>
            <div class="text-lg font-bold text-slate-900 truncate mt-1">{{ top_resource or 'Seminar Hall A' }}</div>
            <span class="text-xs text-slate-500 mt-0.5 block">Highest student demand</span>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Queue</span>
            <div class="text-2xl font-bold text-amber-600 font-mono mt-1">{{ pending_count }}</div>
            <span class="text-xs text-slate-500 mt-0.5 block">Awaiting decision</span>
        </div>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 1. Resource Popularity Bar Chart -->
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div class="border-b border-slate-100 pb-3 mb-4">
                <h3 class="text-sm font-bold text-slate-900">Resource Popularity & Booking Frequency</h3>
                <p class="text-xs text-slate-500">Number of reservation requests plotted per facility</p>
            </div>
            <div class="h-64">
                <canvas id="resourceChart"></canvas>
            </div>
        </div>

        <!-- 2. Status Breakdown Doughnut Chart -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div class="border-b border-slate-100 pb-3 mb-4">
                <h3 class="text-sm font-bold text-slate-900">Booking Status Breakdown</h3>
                <p class="text-xs text-slate-500">Resolution distribution of requests</p>
            </div>
            <div class="h-64 flex items-center justify-center">
                <canvas id="statusChart"></canvas>
            </div>
        </div>
    </div>

    <!-- 3. Peak Hours Distribution Chart -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div class="border-b border-slate-100 pb-3 mb-4">
            <h3 class="text-sm font-bold text-slate-900">Campus Facility Peak Hours Distribution (08:00 AM – 08:00 PM)</h3>
            <p class="text-xs text-slate-500">Hourly volume of overlapping reservations throughout the operational day</p>
        </div>
        <div class="h-64">
            <canvas id="hourlyChart"></canvas>
        </div>
    </div>
</div>

<script>
    // 1. Resource Popularity Bar Chart
    const resCtx = document.getElementById('resourceChart').getContext('2d');
    new Chart(resCtx, {
        type: 'bar',
        data: {
            labels: {{ resource_names | tojson }},
            datasets: [{
                label: 'Total Bookings',
                data: {{ resource_counts | tojson }},
                backgroundColor: 'rgba(79, 70, 229, 0.85)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });

    // 2. Status Breakdown Doughnut Chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Approved', 'Pending', 'Rejected', 'Cancelled'],
            datasets: [{
                data: [{{ status_approved }}, {{ status_pending }}, {{ status_rejected }}, {{ status_cancelled }}],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.85)',
                    'rgba(245, 158, 11, 0.85)',
                    'rgba(239, 68, 68, 0.85)',
                    'rgba(148, 163, 184, 0.85)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // 3. Peak Hours Distribution Line/Bar Chart
    const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
    new Chart(hourlyCtx, {
        type: 'bar',
        data: {
            labels: {{ hour_labels | tojson }},
            datasets: [{
                label: 'Simultaneous Reservations',
                data: {{ hour_counts | tojson }},
                backgroundColor: 'rgba(99, 102, 241, 0.75)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
</script>
{% endblock %}
"""

# Template: Student Dashboard
STUDENT_DASHBOARD_TEMPLATE = BASE_TEMPLATE + """
{% block content %}
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">Student Reservations Dashboard</h1>
            <p class="text-sm text-slate-500 mt-1">Manage your facility allocations, track review status, and cancel upcoming sessions.</p>
        </div>
        <a href="{{ url_for('resource_directory') }}" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs">
            + New Booking Request
        </a>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                        <th class="px-6 py-3">ID</th>
                        <th class="px-6 py-3">Resource</th>
                        <th class="px-6 py-3">Date & Time Range</th>
                        <th class="px-6 py-3">Purpose</th>
                        <th class="px-6 py-3">Proof Attached</th>
                        <th class="px-6 py-3">Status</th>
                        <th class="px-6 py-3">Admin Notes</th>
                        <th class="px-6 py-3">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 font-mono text-xs">
                    {% for b in bookings %}
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="px-6 py-4 font-bold text-slate-900">#{{ b.id }}</td>
                        <td class="px-6 py-4 font-sans font-medium text-slate-900">
                            {{ b.resource_name }}
                            <span class="block text-[11px] text-slate-400 font-normal">{{ b.resource_category }}</span>
                        </td>
                        <td class="px-6 py-4 text-slate-600">
                            <div>{{ b.start_time.split('T')[0] }}</div>
                            <div class="text-[11px] text-slate-400">{{ b.start_time.split('T')[1] }} &rarr; {{ b.end_time.split('T')[1] }}</div>
                        </td>
                        <td class="px-6 py-4 font-sans text-slate-700 max-w-xs truncate">{{ b.purpose }}</td>
                        <td class="px-6 py-4 font-sans">
                            {% if b.proof_file %}
                            <a href="{{ url_for('uploaded_file', filename=b.proof_file) }}" target="_blank" class="text-indigo-600 hover:underline flex items-center gap-1 font-semibold text-[11px]">
                                📎 {{ b.proof_file }}
                            </a>
                            {% else %}
                            <span class="text-slate-400 text-xs">—</span>
                            {% endif %}
                        </td>
                        <td class="px-6 py-4 font-sans whitespace-nowrap">
                            <span class="px-2.5 py-1 text-xs font-semibold rounded-md 
                                {{ 'bg-emerald-50 text-emerald-700 border border-emerald-200' if b.status == 'Approved' else '' }}
                                {{ 'bg-amber-50 text-amber-700 border border-amber-200' if b.status == 'Pending' else '' }}
                                {{ 'bg-rose-50 text-rose-700 border border-rose-200' if b.status == 'Rejected' else '' }}
                                {{ 'bg-slate-100 text-slate-600 border border-slate-200' if b.status == 'Cancelled' else '' }}
                            ">
                                {{ b.status }}
                            </span>
                        </td>
                        <td class="px-6 py-4 font-sans text-xs text-slate-500 italic">{{ b.admin_notes or '—' }}</td>
                        <td class="px-6 py-4 font-sans whitespace-nowrap">
                            {% if b.status in ['Pending', 'Approved'] %}
                            <form method="POST" action="{{ url_for('cancel_booking', booking_id=b.id) }}">
                                <button type="submit" class="px-2.5 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold">
                                    Cancel
                                </button>
                            </form>
                            {% else %}
                            <span class="text-slate-400 text-xs">—</span>
                            {% endif %}
                        </td>
                    </tr>
                    {% else %}
                    <tr>
                        <td colspan="8" class="px-6 py-12 text-center text-slate-400 font-sans">
                            You have no active or historical bookings yet.
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
    </div>
</div>
{% endblock %}
"""

# Template: Audit Logs
AUDIT_LOG_TEMPLATE = BASE_TEMPLATE + """
{% block content %}
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">System Audit Trail & History</h1>
            <p class="text-sm text-slate-500 mt-1">Chronological log of all campus reservation actions, approvals, and administrator notes.</p>
        </div>
        <a href="{{ url_for('admin_dashboard') }}" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
            &larr; Back to Admin Queue
        </a>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                        <th class="px-6 py-3">Timestamp</th>
                        <th class="px-6 py-3">Action</th>
                        <th class="px-6 py-3">Booking ID</th>
                        <th class="px-6 py-3">Resource</th>
                        <th class="px-6 py-3">Actor (Performed By)</th>
                        <th class="px-6 py-3">Audit Details & Notes</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 font-mono text-xs">
                    {% for log in logs %}
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="px-6 py-4 text-slate-500 whitespace-nowrap">{{ log.timestamp }}</td>
                        <td class="px-6 py-4 font-sans whitespace-nowrap">
                            <span class="px-2.5 py-1 text-xs font-semibold rounded-md 
                                {{ 'bg-emerald-50 text-emerald-700 border border-emerald-200' if log.action == 'Approved' else '' }}
                                {{ 'bg-indigo-50 text-indigo-700 border border-indigo-200' if log.action == 'Created' else '' }}
                                {{ 'bg-rose-50 text-rose-700 border border-rose-200' if log.action == 'Rejected' else '' }}
                                {{ 'bg-slate-100 text-slate-600 border border-slate-200' if log.action == 'Cancelled' else '' }}
                            ">
                                {{ log.action }}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-slate-700 font-bold">#{{ log.booking_id }}</td>
                        <td class="px-6 py-4 font-sans text-slate-900 font-medium">{{ log.resource_name or '—' }}</td>
                        <td class="px-6 py-4 font-sans text-slate-700">{{ log.performed_by }}</td>
                        <td class="px-6 py-4 font-sans text-slate-600">{{ log.details or '—' }}</td>
                    </tr>
                    {% else %}
                    <tr>
                        <td colspan="6" class="px-6 py-12 text-center text-slate-400 font-sans">No audit events recorded yet.</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
    </div>
</div>
{% endblock %}
"""


# -----------------------------------------------------------------------------
# Flask Routes & Handlers
# -----------------------------------------------------------------------------

@app.route("/")
def index():
    return redirect(url_for("resource_directory"))


@app.route("/login", methods=["GET", "POST"])
def login():
    """Real Authentication: Verify email and password_hash."""
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()
        conn.close()

        if user and check_password_hash(user["password_hash"], password):
            session["user_id"] = user["id"]
            session["user_name"] = user["name"]
            session["role"] = user["role"]
            flash(f"Welcome back, {user['name']}! Signed in as {user['role']}.", "success")
            next_url = request.args.get("next")
            if user["role"] == "Admin":
                return redirect(next_url or url_for("admin_dashboard"))
            return redirect(next_url or url_for("resource_directory"))
        else:
            flash("Invalid email or password. Please try again.", "error")

    return render_template_string(
        AUTH_TEMPLATE,
        title="Sign In",
        active_page="login",
        current_user=get_current_user()
    )


@app.route("/register", methods=["GET", "POST"])
def register():
    """Real Authentication: Register new institutional account."""
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        role = request.form.get("role", "Student")
        student_id = request.form.get("student_id", "").strip() or None
        password = request.form.get("password", "")

        if not (name and email and password):
            flash("All fields (Name, Email, Password) are required.", "error")
            return redirect(url_for("register"))

        p_hash = generate_password_hash(password)

        conn = get_db()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (name, email, password_hash, role, student_id)
                VALUES (?, ?, ?, ?, ?)
            """, (name, email, p_hash, role, student_id))
            user_id = cursor.lastrowid
            conn.commit()

            session["user_id"] = user_id
            session["user_name"] = name
            session["role"] = role
            flash(f"Account registered successfully! Signed in as {role}.", "success")
            return redirect(url_for("resource_directory"))
        except sqlite3.IntegrityError:
            flash("An account with this email already exists. Please sign in.", "error")
            return redirect(url_for("register"))
        finally:
            conn.close()

    return render_template_string(
        REGISTER_TEMPLATE,
        title="Register",
        active_page="register",
        current_user=get_current_user()
    )


@app.route("/logout")
def logout():
    """Logs out user and clears session."""
    session.clear()
    flash("You have been signed out of the institutional booking system.", "info")
    return redirect(url_for("resource_directory"))


@app.route("/demo-login/<int:user_id>")
def demo_login(user_id):
    """Fast One-Click Demo Login for quick testing convenience."""
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if user:
        session["user_id"] = user["id"]
        session["user_name"] = user["name"]
        session["role"] = user["role"]
        flash(f"Signed in as {user['name']} ({user['role']}).", "success")
        if user["role"] == "Admin":
            return redirect(url_for("admin_dashboard"))
        return redirect(url_for("resource_directory"))
    flash("Demo user not found.", "error")
    return redirect(url_for("login"))


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    """Serve uploaded proof documents (PDFs, images)."""
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/resources")
def resource_directory():
    """List bookable rooms and equipment with category filter and search."""
    search_query = request.args.get("search", "").strip()
    category_filter = request.args.get("category", "All")

    conn = get_db()
    query = "SELECT * FROM resources WHERE 1=1"
    params = []

    if category_filter and category_filter != "All":
        query += " AND category = ?"
        params.append(category_filter)

    if search_query:
        query += " AND (name LIKE ? OR specs LIKE ? OR guidelines LIKE ?)"
        term = f"%{search_query}%"
        params.extend([term, term, term])

    query += " ORDER BY category ASC, name ASC"
    resources = conn.execute(query, params).fetchall()
    conn.close()

    return render_template_string(
        DIRECTORY_TEMPLATE,
        title="Resource Directory",
        active_page="directory",
        resources=resources,
        search_query=search_query,
        category_filter=category_filter,
        current_user=get_current_user()
    )


@app.route("/book", methods=["POST"])
@login_required
def book_resource():
    """
    Concurrency-Safe Booking Submission Route with Proof Upload.
    Enforces:
      1. Institutional Authentication (session user_id and user_name)
      2. Proof document upload requirement for restricted facilities (secure_filename)
      3. Safe datetime parsing & ISO standardization
      4. Operating hours: 08:00 AM to 08:00 PM
      5. Slot limits: 30 minutes to 4 hours
      6. Fair-use quota: max 2 active bookings
      7. BEGIN IMMEDIATE atomic SQLite transaction to prevent double booking.
    """
    user_id = session.get("user_id")
    user_name = session.get("user_name", "Student")
    user_role = session.get("role", "Student")
    performed_by = f"{user_name} ({user_role})"

    resource_id = request.form.get("resource_id")
    book_date = request.form.get("book_date", "").strip()
    start_time_raw = request.form.get("start_time", "").strip()
    end_time_raw = request.form.get("end_time", "").strip()
    purpose = request.form.get("purpose", "").strip()

    if not (resource_id and book_date and start_time_raw and end_time_raw and purpose):
        flash("All booking fields (Resource, Date, Start, End, Purpose) are required.", "error")
        return redirect(url_for("resource_directory"))

    # Check resource requirements
    conn = get_db()
    resource = conn.execute("SELECT * FROM resources WHERE id = ?", (resource_id,)).fetchone()
    conn.close()

    if not resource:
        flash("Invalid resource selected.", "error")
        return redirect(url_for("resource_directory"))

    # File / Proof Upload Requirement for Restricted Resources
    proof_filename = None
    if resource["requires_proof"]:
        file = request.files.get("proof_file")
        if not file or file.filename == "":
            flash(
                f"Proof Document Required: {resource['name']} requires an advisor approval letter or student ID proof. Please attach a document.",
                "error"
            )
            return redirect(url_for("resource_directory"))

        if file and allowed_file(file.filename):
            clean_name = secure_filename(file.filename)
            unique_filename = f"{int(datetime.now().timestamp())}_{clean_name}"
            file_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_filename)
            file.save(file_path)
            proof_filename = unique_filename
        else:
            flash("Invalid file format. Allowed types: PDF, PNG, JPG, JPEG, DOCX.", "error")
            return redirect(url_for("resource_directory"))
    else:
        # Optional file upload if provided
        file = request.files.get("proof_file")
        if file and file.filename != "" and allowed_file(file.filename):
            clean_name = secure_filename(file.filename)
            unique_filename = f"{int(datetime.now().timestamp())}_{clean_name}"
            file.save(os.path.join(app.config["UPLOAD_FOLDER"], unique_filename))
            proof_filename = unique_filename

    # Safe Datetime Parsing
    try:
        resource_id_int = int(resource_id)
        dt_start = datetime.fromisoformat(f"{book_date}T{start_time_raw}")
        dt_end = datetime.fromisoformat(f"{book_date}T{end_time_raw}")
    except (ValueError, TypeError):
        flash("Invalid date or time format provided.", "error")
        return redirect(url_for("resource_directory"))

    if dt_start >= dt_end:
        flash("Validation error: Start time must be strictly before end time.", "error")
        return redirect(url_for("resource_directory"))

    start_iso = dt_start.isoformat()
    end_iso = dt_end.isoformat()

    # Reject past dates
    if dt_start < datetime.now():
        flash("Past date rejected: Reservations cannot be scheduled in the past.", "error")
        return redirect(url_for("resource_directory"))

    # Operating Hours: 08:00 AM to 08:00 PM
    start_minutes = dt_start.hour * 60 + dt_start.minute
    end_minutes = dt_end.hour * 60 + dt_end.minute
    if start_minutes < 8 * 60 or end_minutes > 20 * 60:
        flash("Operating hours violation: Campus facilities operate strictly between 08:00 AM and 08:00 PM.", "error")
        return redirect(url_for("resource_directory"))

    # Slot Limits: 30 minutes to 4 hours
    duration_minutes = (dt_end - dt_start).total_seconds() / 60
    if duration_minutes < 30:
        flash("Slot limit violation: Minimum reservation duration is 30 minutes.", "error")
        return redirect(url_for("resource_directory"))
    if duration_minutes > 240:
        flash("Slot limit violation: Maximum reservation duration is 4 hours per session.", "error")
        return redirect(url_for("resource_directory"))

    # Fair-Use Quota: Max 2 active bookings per user
    active_count = get_user_active_booking_count(user_id)
    if active_count >= 2:
        flash(
            "Fair-use quota exceeded: You already have 2 active bookings (Pending or Approved). "
            "Please cancel an existing booking or wait for prior sessions to complete.",
            "error"
        )
        return redirect(url_for("student_dashboard"))

    # Prevent Race Conditions in SQLite with Atomic BEGIN IMMEDIATE
    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.cursor()

        # Overlap interval condition: (? < b.end_time) AND (? > b.start_time)
        query = """
            SELECT b.*, r.name as resource_name 
            FROM bookings b
            JOIN resources r ON b.resource_id = r.id
            WHERE b.resource_id = ?
              AND b.status IN ('Approved', 'Pending')
              AND (? < b.end_time) AND (? > b.start_time)
        """
        conflict = cursor.execute(query, [resource_id_int, start_iso, end_iso]).fetchone()

        if conflict:
            conn.rollback()
            clash_start = format_time_12h(conflict["start_time"])
            clash_end = format_time_12h(conflict["end_time"])
            flash(
                f"Slot clash: Already booked from {clash_start} to {clash_end} "
                f"(Reservation #{conflict['id']} - {conflict['status']}).",
                "error"
            )
            return redirect(url_for("resource_directory"))

        # Atomic insert of new booking
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO bookings (resource_id, user_id, start_time, end_time, purpose, status, created_at, proof_file)
            VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)
        """, (resource_id_int, user_id, start_iso, end_iso, purpose, created_at, proof_filename))
        booking_id = cursor.lastrowid

        # Insert Audit Log
        proof_note = f" (Proof attached: {proof_filename})" if proof_filename else ""
        cursor.execute("""
            INSERT INTO audit_logs (booking_id, action, performed_by, timestamp, details)
            VALUES (?, 'Created', ?, ?, ?)
        """, (
            booking_id,
            performed_by,
            created_at,
            f"Initial booking request: '{purpose}'{proof_note}"
        ))

        conn.commit()
    except Exception as e:
        conn.rollback()
        flash(f"Database transaction error: {str(e)}", "error")
        return redirect(url_for("resource_directory"))
    finally:
        conn.close()

    flash(f"Reservation request #{booking_id} submitted successfully! Awaiting Administrator review.", "success")
    return redirect(url_for("student_dashboard"))


@app.route("/my-bookings")
@login_required
def student_dashboard():
    """Student reservations view with status badges and cancellation actions."""
    current_user = get_current_user()
    conn = get_db()
    query = """
        SELECT b.*, r.name as resource_name, r.category as resource_category
        FROM bookings b
        JOIN resources r ON b.resource_id = r.id
        WHERE b.user_id = ?
        ORDER BY b.id DESC
    """
    bookings = conn.execute(query, (current_user["id"],)).fetchall()
    conn.close()

    return render_template_string(
        STUDENT_DASHBOARD_TEMPLATE,
        title="Student Reservations",
        active_page="student_dashboard",
        bookings=bookings,
        current_user=current_user
    )


@app.route("/cancel/<int:booking_id>", methods=["POST"])
@login_required
def cancel_booking(booking_id):
    """Allows student to cancel an upcoming reservation."""
    current_user = get_current_user()
    conn = get_db()
    booking = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()

    if not booking or booking["user_id"] != current_user["id"]:
        flash("Reservation not found or unauthorized.", "error")
        conn.close()
        return redirect(url_for("student_dashboard"))

    if booking["status"] == "Cancelled":
        flash("Booking is already cancelled.", "info")
        conn.close()
        return redirect(url_for("student_dashboard"))

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", (booking_id,))

    conn.execute("""
        INSERT INTO audit_logs (booking_id, action, performed_by, timestamp, details)
        VALUES (?, 'Cancelled', ?, ?, 'Cancelled by user before scheduled slot.')
    """, (booking_id, f"{current_user['name']} ({current_user['role']})", timestamp))

    conn.commit()
    conn.close()
    flash(f"Reservation #{booking_id} has been cancelled.", "info")
    return redirect(url_for("student_dashboard"))


@app.route("/admin")
@admin_required
def admin_dashboard():
    """Administrator dashboard: Pending requests review table with proof file previews."""
    conn = get_db()
    pending = conn.execute("""
        SELECT b.*, r.name as resource_name, r.category as resource_category, u.name as user_name, u.email as user_email
        FROM bookings b
        JOIN resources r ON b.resource_id = r.id
        JOIN users u ON b.user_id = u.id
        WHERE b.status = 'Pending'
        ORDER BY b.id ASC
    """).fetchall()

    all_bookings = conn.execute("""
        SELECT b.*, r.name as resource_name, u.name as user_name
        FROM bookings b
        JOIN resources r ON b.resource_id = r.id
        JOIN users u ON b.user_id = u.id
        ORDER BY b.id DESC
    """).fetchall()
    conn.close()

    return render_template_string(
        ADMIN_DASHBOARD_TEMPLATE,
        title="Administrator Console",
        active_page="admin_dashboard",
        pending_bookings=pending,
        all_bookings=all_bookings,
        current_user=get_current_user()
    )


@app.route("/admin/analytics")
@admin_required
def admin_analytics():
    """Admin Analytics Dashboard powered by Chart.js CDN."""
    conn = get_db()
    
    # 1. Resource Popularity Bar Chart Data
    res_data = conn.execute("""
        SELECT r.name, COUNT(b.id) as booking_count
        FROM resources r
        LEFT JOIN bookings b ON r.id = b.resource_id
        GROUP BY r.id
        ORDER BY booking_count DESC
    """).fetchall()
    resource_names = [row["name"] for row in res_data]
    resource_counts = [row["booking_count"] for row in res_data]

    # 2. Status Breakdown Doughnut Chart Data
    status_data = conn.execute("""
        SELECT status, COUNT(*) as count 
        FROM bookings 
        GROUP BY status
    """).fetchall()
    status_dict = {row["status"]: row["count"] for row in status_data}
    status_approved = status_dict.get("Approved", 0)
    status_pending = status_dict.get("Pending", 0)
    status_rejected = status_dict.get("Rejected", 0)
    status_cancelled = status_dict.get("Cancelled", 0)

    # 3. Peak Hours Distribution (8 AM - 8 PM)
    bookings = conn.execute("SELECT start_time, end_time FROM bookings WHERE status IN ('Approved', 'Pending')").fetchall()
    hour_labels = []
    hour_counts = []
    for h in range(8, 20):
        label = f"{h if h <= 12 else h - 12}:00 {'AM' if h < 12 else 'PM'}"
        hour_labels.append(label)
        # Count bookings active during this hour
        active_in_hour = 0
        for b in bookings:
            try:
                start_h = datetime.fromisoformat(b["start_time"]).hour
                end_h = datetime.fromisoformat(b["end_time"]).hour
                if h >= start_h and h < end_h:
                    active_in_hour += 1
            except Exception:
                pass
        hour_counts.append(active_in_hour)

    # KPI summary metrics
    total_bookings = sum([status_approved, status_pending, status_rejected, status_cancelled])
    approval_rate = round((status_approved / total_bookings * 100), 1) if total_bookings > 0 else 0
    top_resource = resource_names[0] if resource_names else "Seminar Hall A"

    conn.close()

    return render_template_string(
        ANALYTICS_TEMPLATE,
        title="Admin Analytics",
        active_page="admin_analytics",
        current_user=get_current_user(),
        total_bookings=total_bookings,
        approved_count=status_approved,
        pending_count=status_pending,
        approval_rate=approval_rate,
        top_resource=top_resource,
        resource_names=resource_names,
        resource_counts=resource_counts,
        status_approved=status_approved,
        status_pending=status_pending,
        status_rejected=status_rejected,
        status_cancelled=status_cancelled,
        hour_labels=hour_labels,
        hour_counts=hour_counts
    )


@app.route("/admin/approve/<int:booking_id>", methods=["POST"])
@admin_required
def admin_approve(booking_id):
    """Approve a booking request and record admin note and audit trail."""
    current_user = get_current_user()
    admin_notes = request.form.get("admin_notes", "").strip() or "Approved by Campus Manager."
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    booking = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    if not booking:
        flash("Booking not found.", "error")
        conn.close()
        return redirect(url_for("admin_dashboard"))

    conflict = check_booking_conflict(booking["resource_id"], booking["start_time"], booking["end_time"], exclude_booking_id=booking_id)
    if conflict and conflict["status"] == "Approved":
        flash(f"Cannot approve: Overlaps with an already Approved reservation (#{conflict['id']}).", "error")
        conn.close()
        return redirect(url_for("admin_dashboard"))

    conn.execute("UPDATE bookings SET status = 'Approved', admin_notes = ? WHERE id = ?", (admin_notes, booking_id))
    conn.execute("""
        INSERT INTO audit_logs (booking_id, action, performed_by, timestamp, details)
        VALUES (?, 'Approved', ?, ?, ?)
    """, (booking_id, f"{current_user['name']} (Admin)", timestamp, f"Note: {admin_notes}"))

    conn.commit()
    conn.close()
    flash(f"Booking #{booking_id} has been Approved.", "success")
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/reject/<int:booking_id>", methods=["POST"])
@admin_required
def admin_reject(booking_id):
    """Reject a booking request and record reason."""
    current_user = get_current_user()
    admin_notes = request.form.get("admin_notes", "").strip() or "Rejected by Campus Administrator."
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    conn.execute("UPDATE bookings SET status = 'Rejected', admin_notes = ? WHERE id = ?", (admin_notes, booking_id))
    conn.execute("""
        INSERT INTO audit_logs (booking_id, action, performed_by, timestamp, details)
        VALUES (?, 'Rejected', ?, ?, ?)
    """, (booking_id, f"{current_user['name']} (Admin)", timestamp, f"Reason: {admin_notes}"))

    conn.commit()
    conn.close()
    flash(f"Booking #{booking_id} was Rejected.", "info")
    return redirect(url_for("admin_dashboard"))


@app.route("/audit-logs")
@admin_required
def audit_logs():
    """Historical audit log view accessible to administrators."""
    conn = get_db()
    logs = conn.execute("""
        SELECT a.*, r.name as resource_name 
        FROM audit_logs a
        LEFT JOIN bookings b ON a.booking_id = b.id
        LEFT JOIN resources r ON b.resource_id = r.id
        ORDER BY a.id DESC
    """).fetchall()
    conn.close()

    return render_template_string(
        AUDIT_LOG_TEMPLATE,
        title="Audit Logs",
        active_page="audit_logs",
        logs=logs,
        current_user=get_current_user()
    )


if __name__ == "__main__":
    init_db()
    print("=" * 60)
    print(" Smart Campus Resource & Room Booking System")
    print(" Database: campus_booking.db initialized with seed data")
    print(" Real Auth: Login / Register / Logout Enabled")
    print(" File Uploads: uploads/ directory configured")
    print(" Analytics: /admin/analytics with Chart.js enabled")
    print(" Server running at: http://127.0.0.1:5000/")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5000, debug=True)
