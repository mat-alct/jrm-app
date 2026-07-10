import JSZip from 'jszip';

import type { GibenExportResult } from './types';
import { GibenExportError } from './types';

export const buildGibenZipBytes = async (
  result: GibenExportResult,
): Promise<Uint8Array> => {
  if (!result.pairs.length) {
    throw new GibenExportError('Nenhum par AC/AD disponível para o ZIP.');
  }
  const zip = new JSZip();
  result.pairs.forEach(pair => {
    zip.file(`${pair.baseName}.AC`, pair.ac, {
      binary: false,
      date: new Date(0),
    });
    zip.file(`${pair.baseName}.AD`, pair.ad, {
      binary: false,
      date: new Date(0),
    });
  });
  return zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
};

export const downloadGibenZip = async (
  result: GibenExportResult,
  fileName: string,
): Promise<void> => {
  if (typeof window === 'undefined') {
    throw new GibenExportError('O download do ZIP exige um navegador.');
  }
  const bytes = await buildGibenZipBytes(result);
  const blob = new Blob([bytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.toLowerCase().endsWith('.zip')
    ? fileName
    : `${fileName}.zip`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
