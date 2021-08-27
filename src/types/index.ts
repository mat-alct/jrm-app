import firebase from 'firebase/app';

export interface Material {
  name: string;
  width: number;
  height: number;
  price: number;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

export interface Customer {
  name: string;
  telephone?: string[];
  email?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}
