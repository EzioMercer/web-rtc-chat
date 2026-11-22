const encoder = new TextEncoder();

export const utf8 = (text: string): Uint8Array<ArrayBuffer> => encoder.encode(text);
