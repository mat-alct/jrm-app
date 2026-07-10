import {
  DEFAULT_CUTTING_MACHINE_CONFIGURATION,
  normalizeCuttingMachineConfiguration,
  validateCuttingMachineConfiguration,
} from '@/domain/cutting-plan';

describe('cutting machine configuration', () => {
  it('fornece os parâmetros operacionais padrão', () => {
    expect(normalizeCuttingMachineConfiguration()).toMatchObject({
      cutting: {
        edgeTrimMm: 10,
        internalEdgeTrimMm: 7.5,
        kerfMm: 3.2,
      },
      exportProfile: {
        id: 'giben-cortecloud-v1',
        labelImageDirectory: 'C:\\cortecloud\\etiquetas',
      },
    });
  });

  it('migra a perda interna antiga de 15mm para 7,5mm por borda', () => {
    expect(
      normalizeCuttingMachineConfiguration({
        cutting: { internalCutLossMm: 15 },
      }).cutting.internalEdgeTrimMm,
    ).toBe(7.5);
  });

  it('rejeita dimensões, perdas e perfil inválidos', () => {
    expect(() =>
      validateCuttingMachineConfiguration({
        ...DEFAULT_CUTTING_MACHINE_CONFIGURATION,
        cutting: {
          ...DEFAULT_CUTTING_MACHINE_CONFIGURATION.cutting,
          sheetWidthMm: 10,
          edgeTrimMm: 10,
        },
      }),
    ).toThrow('área útil');

    expect(() =>
      validateCuttingMachineConfiguration({
        ...DEFAULT_CUTTING_MACHINE_CONFIGURATION,
        cutting: {
          ...DEFAULT_CUTTING_MACHINE_CONFIGURATION.cutting,
          kerfMm: -1,
        },
      }),
    ).toThrow('não podem ser negativos');
  });
});
