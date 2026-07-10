import React, { useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

import type { Order } from '@/types';

import { CuttingPlanPrintable, isPrintableCuttingPlan } from '../CuttingPlan';

interface CuttingPlanPrintProps {
  onAfterPrint: () => void;
  order: (Order & { orderCode?: number }) | null;
}

export const CuttingPlanPrint = ({
  onAfterPrint,
  order,
}: CuttingPlanPrintProps) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Plano-de-corte-${order?.orderCode ?? 'sem-codigo'}`,
    onAfterPrint,
  });

  useEffect(() => {
    if (isPrintableCuttingPlan(order?.cuttingPlan) && componentRef.current) {
      handlePrint();
    }
  }, [handlePrint, order]);

  if (!order || !isPrintableCuttingPlan(order.cuttingPlan)) return null;

  return (
    <div style={{ display: 'none' }}>
      <div ref={componentRef} data-testid="cutting-plan-only-print">
        <style type="text/css" media="print">
          {`
            @page { size: A4 portrait; margin: 5mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: Arial, sans-serif; color: black; }
          `}
        </style>
        <CuttingPlanPrintable
          plan={order.cuttingPlan}
          orderCode={order.orderCode}
        />
      </div>
    </div>
  );
};
