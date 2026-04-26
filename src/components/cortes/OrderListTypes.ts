/* eslint-disable @typescript-eslint/no-explicit-any */
export type OrderListCallbacks = {
  onPrintResume: (data: any, type: 'order' | 'estimate') => void;
  onPrintLabels: (data: any) => void;
  onApproveEstimate: (id: string) => void;
  onRemove: (id: string, type: 'orders' | 'estimates') => void;
  onShowHistory: (item: any) => void;
  onConfirmStatus: (item: any) => void;
  onEdit: (id: string) => void;
};

export type OrderListProps = OrderListCallbacks & {
  items: any[];
  isEstimateList: boolean;
  isLoading: boolean;
  searchQuery?: string;
};
