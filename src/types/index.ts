// src/types/index.ts
import { Timestamp } from 'firebase/firestore';

export interface Area {
  name: string;
  freight: number;
}

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

export interface RoundedCorners {
  tl: boolean;
  tr: boolean;
  bl: boolean;
  br: boolean;
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
  // --- NOVOS CAMPOS PARA DOBRADIÇA ---
  hasHingeHoles?: boolean;
  hingeHolesSide?: 'Maior' | 'Menor';
  hingeHolesQuantity?: number; // Calculado automaticamente
  // --- NOVOS CAMPOS PARA RASGO DE GAVETA ---
  // Mutuamente exclusivo com hasHingeHoles. Quantidade deve ser par.
  hasDrawerSlot?: boolean;
  drawerSlotSide?: 'Maior' | 'Menor';
  // --- NOVOS CAMPOS PARA CANTO BOLEADO ---
  // Mutuamente exclusivo com furo e rasgo. Cantos referentes à peça
  // orientada com o lado maior na horizontal. R$5 por canto, por peça.
  hasRoundedCorners?: boolean;
  roundedCorners?: RoundedCorners;
}

export interface Estimate {
  name: string;
  telephone?: string;
  customerId?: string;
  cutlist: Cutlist[];
  area?: string;
  freightPrice?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrderEdit {
  editedAt: Timestamp;
  editedBy: string;
  previousCutlist: Cutlist[];
  previousOrderPrice: number;
  priceDifference: number;
  shouldCharge: boolean;
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
  deliveryType: string;
  paymentType: string;
  amountDue?: string;
  freightPrice?: number;
  isUrgent?: boolean;
  seller: string;
  orderStatus: string;
  deliveryDate: Timestamp;
  ps?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  edits?: OrderEdit[];
  isDeactivated?: boolean;
}

export interface MaterialRequest {
  material: string;
  requestStore: string;
  isSeparated: boolean;
  createdAt: Timestamp;
}
