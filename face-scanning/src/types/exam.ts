export interface Exam {
  id: string;
  name: string;
  createdAt: string;
  status: 'active' | 'draft' | 'completed';
  studentsCount: number;
  startTime?: string;
  endTime?: string;
}
