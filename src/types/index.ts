import firebase from 'firebase/app';

export interface Material {
  name: string;
  width: number;
  height: number;
  price: number;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}
