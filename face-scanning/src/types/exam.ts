export interface Exam {
  id: number;
  name: string;
  createdAt: string;
  status: 'active' | 'draft' | 'completed' | 'suspended';
  studentsCount: number;
  startTime?: string;
  endTime?: string;
}
