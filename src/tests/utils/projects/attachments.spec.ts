import { Attachment } from '@/types/projects';
import {
  inferAttachmentFileKind,
  isModel3DAttachment,
} from '@/utils/projects/attachments';

describe('inferAttachmentFileKind', () => {
  it.each([
    ['modelo.glb', 'model/gltf-binary'],
    ['modelo.gltf', 'model/gltf+json'],
    ['modelo.usdz', 'model/vnd.usdz+zip'],
    // Navegadores costumam mandar octet-stream para .glb
    ['modelo.glb', 'application/octet-stream'],
    // Qualquer mime model/* com extensao conhecida vale
    ['modelo.gltf', 'model/qualquer-coisa'],
    // Extensao em caixa alta
    ['MODELO.GLB', 'model/gltf-binary'],
  ])('classifica %s (%s) como model_3d', (name, type) => {
    expect(inferAttachmentFileKind({ name, type })).toBe('model_3d');
  });

  it.each([
    ['foto.png', 'image/png'],
    ['foto.jpg', 'image/jpeg'],
    ['foto.webp', 'image/webp'],
    ['scan.HEIC', 'image/heic'],
  ])('classifica %s (%s) como image', (name, type) => {
    expect(inferAttachmentFileKind({ name, type })).toBe('image');
  });

  it.each([
    ['contrato.pdf', 'application/pdf'],
    ['planilha.xlsx', 'application/vnd.ms-excel'],
    ['notas.txt', 'text/plain'],
    ['arquivo.zip', 'application/zip'],
  ])('classifica %s (%s) como document', (name, type) => {
    expect(inferAttachmentFileKind({ name, type })).toBe('document');
  });

  it('nao classifica como 3D um arquivo com extensao 3D mas mime incompativel', () => {
    expect(
      inferAttachmentFileKind({ name: 'modelo.glb', type: 'image/png' }),
    ).toBe('image');
    expect(
      inferAttachmentFileKind({ name: 'modelo.glb', type: 'application/pdf' }),
    ).toBe('document');
  });

  it('nao classifica como 3D um mime 3D com extensao desconhecida', () => {
    expect(
      inferAttachmentFileKind({
        name: 'arquivo.bin',
        type: 'model/gltf-binary',
      }),
    ).toBe('document');
  });

  it('assume octet-stream quando o mime vem vazio', () => {
    expect(inferAttachmentFileKind({ name: 'modelo.glb' })).toBe('model_3d');
    expect(inferAttachmentFileKind({ name: 'arquivo.qualquer' })).toBe(
      'document',
    );
    expect(inferAttachmentFileKind({ name: 'sem-extensao', type: '' })).toBe(
      'document',
    );
  });
});

describe('isModel3DAttachment', () => {
  function attachment(overrides: Partial<Attachment>): Attachment {
    return {
      fileName: 'modelo.glb',
      originalFileName: 'modelo.glb',
      mimeType: 'model/gltf-binary',
      ...overrides,
    } as Attachment;
  }

  it('confia no fileKind gravado, mesmo com nome e mime que nao indicam 3D', () => {
    expect(
      isModel3DAttachment(
        attachment({
          fileKind: 'model_3d',
          fileName: 'qualquer.pdf',
          originalFileName: 'qualquer.pdf',
          mimeType: 'application/pdf',
        }),
      ),
    ).toBe(true);
  });

  it('detecta pelo nome original quando o fileKind nao foi gravado', () => {
    expect(isModel3DAttachment(attachment({ fileKind: undefined }))).toBe(true);
  });

  it('prefere originalFileName ao fileName sanitizado', () => {
    expect(
      isModel3DAttachment(
        attachment({
          fileKind: undefined,
          fileName: 'uuid_sem_extensao',
          originalFileName: 'meu-modelo.glb',
        }),
      ),
    ).toBe(true);
  });

  it('cai no fileName quando originalFileName esta vazio', () => {
    expect(
      isModel3DAttachment(
        attachment({
          fileKind: undefined,
          fileName: 'modelo.usdz',
          originalFileName: '',
          mimeType: 'model/vnd.usdz+zip',
        }),
      ),
    ).toBe(true);
  });

  it('recusa extensao 3D com mime incompativel', () => {
    expect(
      isModel3DAttachment(
        attachment({ fileKind: undefined, mimeType: 'image/png' }),
      ),
    ).toBe(false);
  });

  it('recusa documento comum', () => {
    expect(
      isModel3DAttachment(
        attachment({
          fileKind: 'document',
          fileName: 'contrato.pdf',
          originalFileName: 'contrato.pdf',
          mimeType: 'application/pdf',
        }),
      ),
    ).toBe(false);
  });
});
