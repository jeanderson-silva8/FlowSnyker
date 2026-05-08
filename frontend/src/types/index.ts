export type User = {
  _id: string;
  name: string;
  email: string;
  avatar: string;
};

export type Label = {
  text: string;
  color: string;
};

export type Comment = {
  _id: string;
  author: User;
  text: string;
  createdAt: string;
};

export type Card = {
  _id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  labels: Label[];
  assignees: User[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  comments: Comment[];
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Column = {
  _id: string;
  title: string;
  order: number;
};

export type Board = {
  _id: string;
  title: string;
  owner: User;
  members: User[];
  columns: Column[];
  cardCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type OnlineUser = {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
};

export const LABEL_COLORS = [
  { name: 'Red', color: '#FF6B6B' },
  { name: 'Orange', color: '#FFA94D' },
  { name: 'Yellow', color: '#FFD43B' },
  { name: 'Green', color: '#51CF66' },
  { name: 'Blue', color: '#339AF0' },
  { name: 'Purple', color: '#CC5DE8' },
  { name: 'Pink', color: '#F06595' },
];

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
