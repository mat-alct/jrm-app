import type { EstimateDocument, OrderDocument, OrderListItem } from '@/types';

export type OrderListCallbacks = {
  onPrintResume: (data: OrderListItem, type: 'order' | 'estimate') => void;
  onPrintLabels: (data: OrderDocument) => void;
  onPrintCuttingPlan: (data: OrderDocument) => void;
  onDownloadMachineFiles: (data: OrderDocument) => void;
  onApproveEstimate: (id: string) => void;
  onShowHistory: (item: OrderDocument) => void;
  onConfirmStatus: (item: OrderDocument) => void;
  onEdit: (id: string) => void;
  onDeactivate: (item: OrderDocument) => void;
};

export type OrderListProps = OrderListCallbacks & {
  items: OrderListItem[];
  isEstimateList: boolean;
  isLoading: boolean;
  searchQuery?: string;
};

export type { EstimateDocument, OrderDocument };
