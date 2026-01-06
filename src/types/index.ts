import { Timestamp } from 'firebase/firestore';

export interface Material {
  id?: string;
  name: string;
  width: number;
  height: number;
  price: number;
  materialType: 'MDF' | 'Compensado';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Customer {
  name: string;
  telephone: string;
  address: string;
  area: string;
  city: string;
  state: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CutlistMaterial {
  materialId: string;
  name: string;
  width: number;
  height: number;
  price: number;
}

export interface Cutlist {
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
  customerId?: string;
  cutlist: Cutlist[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Order {
  cutlist: Cutlist[];
  customer: {
    name: string;
    telephone?: string;
    email?: string;
    address?: string;
    area?: string;
    city?: string; // Mantido mas opcional
    state?: string;
    customerId?: string;
  };
  orderStore: string;
  deliveryType: string;
  paymentType: string;
  amountDue?: string; // Novo
  isUrgent?: boolean; // Novo
  seller: string;
  orderStatus: string;
  deliveryDate: Timestamp;
  ps?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MaterialRequest {
  material: string;
  requestStore: string;
  isSeparated: boolean;
  createdAt: Timestamp;
}
