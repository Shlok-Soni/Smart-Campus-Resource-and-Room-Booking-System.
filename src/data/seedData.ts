import { User, Resource, Booking, AuditLog } from '../types';

export const SEED_USERS: User[] = [
  {
    id: 1,
    name: 'Alex Chen',
    email: 'alex.chen@campus.edu',
    role: 'Student',
    studentId: 'STU102',
    password: 'password123',
  },
  {
    id: 2,
    name: 'Dr. Marcus Smith',
    email: 'm.smith@campus.edu',
    role: 'Admin',
    title: 'Campus Operations Manager',
    password: 'admin123',
  },
];

export const SEED_RESOURCES: Resource[] = [
  {
    id: 1,
    name: 'Seminar Hall A',
    category: 'Room',
    capacity: 120,
    specs: 'Dual 4K Laser Projectors, Dolby Atmos Audio, Shure Wireless Mics, Tiered Seating',
    guidelines: 'Food and beverages strictly prohibited. Requires 24-hour advance reservation and Faculty/Advisor sign-off.',
    imageUrl: '/src/assets/images/seminar_hall_a_1792169580592.jpg',
    location: 'North Wing, Hall 101',
    requiresProof: true,
  },
  {
    id: 2,
    name: 'GPU Server 1',
    category: 'Lab Gear',
    capacity: 1,
    specs: '8x NVIDIA A100 (80GB SXM4), 2TB DDR4 ECC RAM, High-speed InfiniBand',
    guidelines: 'Max reservation window is 4 hours per job. High-compute authorization or advisor proof required.',
    imageUrl: '/src/assets/images/gpu_server_cluster_1792169580615.jpg',
    location: 'Computer Science Data Center, Rack 04',
    requiresProof: true,
  },
  {
    id: 3,
    name: 'IoT Kit #4',
    category: 'Hardware',
    capacity: 1,
    specs: 'Raspberry Pi 5 (8GB), ESP32-S3 Dev Boards, LoRa Transceivers, Sensor Module Bundle',
    guidelines: 'Check all connector pins before and after use. Return in electrostatic protective case.',
    imageUrl: '/src/assets/images/iot_hardware_bench_1792169580724.jpg',
    location: 'Electrical Eng. Maker Lab, Locker 14',
    requiresProof: false,
  },
  {
    id: 4,
    name: 'Collaborative Robotics Lab',
    category: 'Room',
    capacity: 24,
    specs: 'Vicon Optical Motion Capture, 4x UR5 Robotic Arms, High-Current 3-Phase Workstations',
    guidelines: 'Safety certification & department head / lab supervisor permission proof required.',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
    location: 'Robotics Center, Room 204',
    requiresProof: true,
  },
];

export const getInitialBookings = (): Booking[] => {
  const today = new Date();
  
  // Tomorrow 10:00 - 12:00
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Day after tomorrow 14:00 - 18:00
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  // Next week Monday 09:00 - 11:00
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 5);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  return [
    {
      id: 1,
      resource_id: 1, // Seminar Hall A
      user_id: 1, // Alex Chen
      start_time: `${tomorrowStr}T10:00`,
      end_time: `${tomorrowStr}T12:00`,
      purpose: 'Robotics Society Guest Speaker Keynote & Live Hardware Demo',
      status: 'Approved',
      admin_notes: 'Approved for engineering guest lecture series. Stage AV technician assigned.',
      created_at: `${today.toISOString().split('T')[0]} 09:00:00`,
      proofFileName: 'dean_guest_keynote_authorization.pdf',
      proofFile: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    },
    {
      id: 2,
      resource_id: 2, // GPU Server 1
      user_id: 1, // Alex Chen
      start_time: `${dayAfterStr}T14:00`,
      end_time: `${dayAfterStr}T18:00`,
      purpose: 'Large Language Model LoRA Fine-Tuning for Senior Capstone Research',
      status: 'Pending',
      created_at: `${today.toISOString().split('T')[0]} 09:30:00`,
      proofFileName: 'advisor_thesis_compute_approval.pdf',
      proofFile: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    },
    {
      id: 3,
      resource_id: 4, // Collaborative Robotics Lab
      user_id: 1,
      start_time: `${nextWeekStr}T13:00`,
      end_time: `${nextWeekStr}T15:00`,
      purpose: 'Autonomous drone indoor localization experiments with Vicon optical tracking',
      status: 'Approved',
      admin_notes: 'Supervisor sign-off confirmed. Access badge granted.',
      created_at: `${today.toISOString().split('T')[0]} 11:20:00`,
      proofFileName: 'lab_safety_clearance_cert.pdf',
      proofFile: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    },
  ];
};

export const getInitialAuditLogs = (): AuditLog[] => {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: 1,
      booking_id: 1,
      action: 'Created',
      performed_by: 'Alex Chen (STU102)',
      timestamp: `${today} 09:00:00`,
      details: 'Initial booking submission with dean_guest_keynote_authorization.pdf attached.',
    },
    {
      id: 2,
      booking_id: 1,
      action: 'Approved',
      performed_by: 'Dr. Marcus Smith (Admin)',
      timestamp: `${today} 09:15:00`,
      details: 'Approved for engineering guest lecture series. Stage AV technician assigned.',
    },
    {
      id: 3,
      booking_id: 2,
      action: 'Created',
      performed_by: 'Alex Chen (STU102)',
      timestamp: `${today} 09:30:00`,
      details: 'Initial booking submission with advisor_thesis_compute_approval.pdf attached.',
    },
    {
      id: 4,
      booking_id: 3,
      action: 'Created',
      performed_by: 'Alex Chen (STU102)',
      timestamp: `${today} 11:20:00`,
      details: 'Initial reservation for Robotics Lab with lab_safety_clearance_cert.pdf attached.',
    },
    {
      id: 5,
      booking_id: 3,
      action: 'Approved',
      performed_by: 'Dr. Marcus Smith (Admin)',
      timestamp: `${today} 11:45:00`,
      details: 'Supervisor sign-off confirmed. Access badge granted.',
    },
  ];
};
