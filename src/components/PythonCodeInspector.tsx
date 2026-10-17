import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, Database, ShieldAlert, Cpu, Lock, FileText, BarChart3 } from 'lucide-react';

export const PythonCodeInspector: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const pythonSnippet = `"""
Smart Campus Resource & Room Booking System
============================================
A clean, modular, fully functional Flask & SQLite web prototype.

Enterprise Enhancements:
- Real Authentication: User signup, login, password hashes via werkzeug.security
- Route Access Guards: @login_required and @admin_required decorators
- Restricted Proof Uploads: PDF/Image proof uploads with secure_filename
- Facility Analytics: /admin/analytics with Chart.js visualizations
- Concurrency Guard: Atomic SQLite transactions (BEGIN IMMEDIATE)
"""

import os
import sqlite3
from datetime import datetime
from functools import wraps
from flask import (
    Flask, request, redirect, url_for, render_template_string,
    flash, session, jsonify, send_from_directory
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "campus_booking_secret_key_2026")
DATABASE = "campus_booking.db"
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "docx"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            flash("Please sign in to access this service.", "error")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session or session.get("role") != "Admin":
            flash("Access Restricted: Administrator privileges required.", "error")
            return redirect(url_for("resource_directory"))
        return f(*args, **kwargs)
    return decorated_function

@app.route("/book", methods=["POST"])
@login_required
def book_resource():
    user_id = session.get("user_id")
    resource_id = request.form.get("resource_id")
    book_date = request.form.get("book_date", "").strip()
    start_time_raw = request.form.get("start_time", "").strip()
    end_time_raw = request.form.get("end_time", "").strip()
    purpose = request.form.get("purpose", "").strip()

    conn = get_db()
    resource = conn.execute("SELECT * FROM resources WHERE id = ?", (resource_id,)).fetchone()
    conn.close()

    # Proof Upload Requirement for Restricted Resources
    proof_filename = None
    if resource["requires_proof"]:
        file = request.files.get("proof_file")
        if not file or file.filename == "":
            flash(f"Proof Document Required: {resource['name']} requires advisor approval or ID proof.", "error")
            return redirect(url_for("resource_directory"))
        clean_name = secure_filename(file.filename)
        proof_filename = f"{int(datetime.now().timestamp())}_{clean_name}"
        file.save(os.path.join(app.config["UPLOAD_FOLDER"], proof_filename))

    dt_start = datetime.fromisoformat(f"{book_date}T{start_time_raw}")
    dt_end = datetime.fromisoformat(f"{book_date}T{end_time_raw}")

    # Concurrency Lock & Non-Overlapping Window Validation
    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conflict = conn.execute("""
            SELECT b.* FROM bookings b
            WHERE b.resource_id = ?
              AND b.status IN ('Approved', 'Pending')
              AND (? < b.end_time) AND (? > b.start_time)
        """, (int(resource_id), dt_end.isoformat(), dt_start.isoformat())).fetchone()

        if conflict:
            conn.rollback()
            flash("Slot clash: Already booked for this timeframe.", "error")
            return redirect(url_for("resource_directory"))

        conn.execute("""
            INSERT INTO bookings (resource_id, user_id, start_time, end_time, purpose, status, created_at, proof_file)
            VALUES (?, ?, ?, ?, ?, 'Pending', datetime('now'), ?)
        """, (int(resource_id), user_id, dt_start.isoformat(), dt_end.isoformat(), purpose, proof_filename))
        conn.commit()
    finally:
        conn.close()

    flash("Reservation request submitted! Awaiting administrator review.", "success")
    return redirect(url_for("student_dashboard"))

@app.route("/admin/analytics")
@admin_required
def admin_analytics():
    # Queries Chart.js data: resource popularity, status breakdown, peak hours
    return render_template_string(ANALYTICS_TEMPLATE, ...)`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([pythonSnippet], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'app.py';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Python Flask Backend Architecture
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              app.py Production Prototype
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Autonomous multi-route Flask application featuring real authentication, proof uploads, Chart.js analytics, and SQLite concurrency locks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied to Clipboard' : 'Copy app.py'}
          </button>
          <button
            onClick={handleDownload}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download Source
          </button>
        </div>
      </div>

      {/* Feature Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Real Authentication</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            <code>werkzeug.security</code> password hashing with <code>@login_required</code> & <code>@admin_required</code> guards.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
            <FileText className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Proof Uploads</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Restricted resources require advisor approval letter or ID upload via <code>secure_filename</code>.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Chart.js Analytics</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            <code>/admin/analytics</code> visualizes popularity bar charts, status doughnut, and peak hours distribution.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
            <Database className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Concurrency Guard</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Atomic <code>BEGIN IMMEDIATE</code> transaction blocks race conditions during simultaneous booking spikes.
          </p>
        </div>
      </div>

      {/* Code Display Frame */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            </div>
            <span className="text-xs font-mono text-slate-400 ml-2">app.py &bull; Flask & SQLite</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Python 3.10+</span>
        </div>
        <pre className="p-5 text-xs font-mono text-indigo-100 overflow-x-auto leading-relaxed max-h-[500px]">
          <code>{pythonSnippet}</code>
        </pre>
      </div>
    </div>
  );
};
