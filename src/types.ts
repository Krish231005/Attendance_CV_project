export interface Person {
  id: string;
  name: string;
  images: string[]; // Base64 or URLs
  descriptors: Float32Array[]; // Face descriptors
}

export interface AttendanceRecord {
  id: string;
  personId: string;
  personName: string;
  timestamp: Date;
  status: 'present' | 'absent';
}
