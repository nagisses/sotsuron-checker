function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('お使いのブラウザは .docx の直接展開に対応していません。本文をコピーして貼り付けてください。');
  }
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  const copy = new Uint8Array(compressed.byteLength);
  copy.set(compressed);
  writer.write(copy);
  writer.close();
  const response = new Response(stream.readable);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function extractEntryFromZipBytes(bytes: Uint8Array, targetPath: string): Promise<Uint8Array | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder('utf-8');

  const minOffset = Math.max(0, bytes.length - 65_557);
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= minOffset; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) return null;

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let cursor = view.getUint32(eocdOffset + 16, true);

  for (let idx = 0; idx < totalEntries; idx += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) {
      break;
    }
    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    const fileName = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen));
    cursor += 46 + nameLen + extraLen + commentLen;

    if (fileName !== targetPath) continue;
    if (localHeaderOffset + 30 > bytes.length || view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
      return null;
    }

    const lhNameLen = view.getUint16(localHeaderOffset + 26, true);
    const lhExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) return null;

    const payload = bytes.subarray(dataStart, dataEnd);
    if (compressionMethod === 0) return payload;
    if (compressionMethod === 8) return inflateRawBytes(payload);
    throw new Error('未対応の圧縮形式の Word ファイルです。本文をコピーして貼り付けてください。');
  }

  return null;
}

export async function extractDocumentTextInBrowser(file: File): Promise<{ fileName: string; text: string }> {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.docx')) {
    const raw = (await file.text()).trim();
    return { fileName: file.name, text: raw.slice(0, 120_000) };
  }

  const buffer = await file.arrayBuffer();
  const xmlBytes = await extractEntryFromZipBytes(new Uint8Array(buffer), 'word/document.xml');
  if (!xmlBytes) {
    throw new Error('Wordファイル（.docx）の本文を読み取れませんでした。');
  }

  const xml = new TextDecoder('utf-8').decode(xmlBytes);
  const paragraphs = xml.split(/<\/w:p>/g);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const withBreaks = para.replace(/<w:br[^>]*\/>/g, '\n').replace(/<w:tab[^>]*\/>/g, ' ');
    const chunks: string[] = [];
    const runRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let match = runRegex.exec(withBreaks);
    while (match !== null) {
      chunks.push(decodeXmlEntities(match[1]));
      match = runRegex.exec(withBreaks);
    }
    const line = chunks.join('').trim();
    if (line.length > 0) lines.push(line);
  }

  const text = lines.join('\n\n').trim();
  if (text.length < 10) {
    throw new Error('Wordファイルから十分な本文を抽出できませんでした。');
  }
  return { fileName: file.name, text: text.slice(0, 120_000) };
}
