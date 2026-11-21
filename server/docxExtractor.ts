import zlib from 'node:zlib';

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

function extractEntryFromZip(zipBuffer: Buffer, targetPath: string): Buffer | null {
  // Locate End of Central Directory record (0x06054b50) near tail of buffer
  const minOffset = Math.max(0, zipBuffer.length - 65_557);
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= minOffset; i -= 1) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) return null;

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  let cursor = cdOffset;

  for (let idx = 0; idx < totalEntries; idx += 1) {
    if (cursor + 46 > zipBuffer.length || zipBuffer.readUInt32LE(cursor) !== 0x02014b50) {
      break;
    }
    const compressionMethod = zipBuffer.readUInt16LE(cursor + 10);
    const compressedSize = zipBuffer.readUInt32LE(cursor + 20);
    const nameLen = zipBuffer.readUInt16LE(cursor + 28);
    const extraLen = zipBuffer.readUInt16LE(cursor + 30);
    const commentLen = zipBuffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(cursor + 42);

    const fileName = zipBuffer.toString('utf8', cursor + 46, cursor + 46 + nameLen);
    cursor += 46 + nameLen + extraLen + commentLen;

    if (fileName !== targetPath) continue;
    if (
      localHeaderOffset + 30 > zipBuffer.length ||
      zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50
    ) {
      return null;
    }

    const lhNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const lhExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > zipBuffer.length) return null;

    const payload = zipBuffer.subarray(dataStart, dataEnd);
    if (compressionMethod === 0) return payload;
    if (compressionMethod === 8) return zlib.inflateRawSync(payload);
    throw new Error(`未対応の圧縮方式です (method ${compressionMethod})`);
  }

  return null;
}

export function extractTextFromDocxBuffer(docxBuffer: Buffer): string {
  const docXmlBuf = extractEntryFromZip(docxBuffer, 'word/document.xml');
  if (!docXmlBuf) {
    throw new Error('Word文書（.docx）の本文データを読み取れませんでした。');
  }

  const xml = docXmlBuf.toString('utf8');
  const paragraphs = xml.split(/<\/w:p>/g);
  const extractedLines: string[] = [];

  for (const para of paragraphs) {
    const withBreaks = para.replace(/<w:br[^>]*\/>/g, '\n').replace(/<w:tab[^>]*\/>/g, ' ');
    const textChunks: string[] = [];
    const runRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let match: RegExpExecArray | null = runRegex.exec(withBreaks);
    while (match !== null) {
      textChunks.push(decodeXmlEntities(match[1]));
      match = runRegex.exec(withBreaks);
    }
    const line = textChunks.join('').trim();
    if (line.length > 0) {
      extractedLines.push(line);
    }
  }

  return extractedLines.join('\n\n').trim();
}
