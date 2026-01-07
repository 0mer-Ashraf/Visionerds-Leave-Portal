import { User } from './types';

// Simulating the "JSON file" requirement
export const INITIAL_USERS: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@visionerds.com',
    password: 'admin',
    role: 'admin',
    balance: {
      casual: 10,
      sick: 10,
      annual: 20
    },
    history: []
  },
  {
    id: '2',
    name: 'John Doe',
    email: 'john@visionerds.com',
    password: 'user',
    role: 'employee',
    balance: {
      casual: 8,
      sick: 5,
      annual: 15
    },
    history: [
      {
        id: 'hist_1',
        date: '2023-10-02',
        amount: 0.5,
        type: 'casual',
        timestamp: new Date('2023-10-02').getTime()
      }
    ]
  }
];

export const STORAGE_KEY = 'visionerds_hr_db_v1';

export const LEAVE_TYPES: { id: 'casual' | 'sick' | 'annual'; label: string; color: string }[] = [
  { id: 'casual', label: 'Casual Leave', color: 'bg-blue-500' },
  { id: 'sick', label: 'Sick Leave', color: 'bg-red-500' },
  { id: 'annual', label: 'Annual Leave', color: 'bg-green-500' },
];