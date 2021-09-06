import firebase from 'firebase/app';

export interface Material {
  name: string;
  width: number;
  height: number;
  price: number;
  materialType: ['MDF', 'Compensado'];
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

export interface Customer {
  name: string;
  telephone: string;
  address: string;
  area: string;
  city: string;
  state: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

// Cutlist

export interface CutlistMaterial {
  materialId: string;
  name: string;
  width: number;
  height: number;
  price: number;
}

interface Cutlist {
  id: string;
  material: CutlistMaterial;
  amount: number;
  sideA: number;
  sideB: number;
  borderA: number;
  borderB: number;
  price: number;
}

export interface Estimate {
  name: string;
  telephone?: string;
  cutlist: Cutlist[];
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

export interface Order {
  cutlist: Cutlist[];
  customer: {
    name: string;
    telephone?: string;
    email?: string;
    address?: string;
    area?: string;
    city?: string;
    state?: string;
    customerId?: string;
  };
  orderStore: string;
  deliveryType: string;
  paymentType: string;
  seller: string;
  orderStatus: string;
  ps?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}
