import { MAX_PICTURE_CHARS, PICTURE_FIRST_STEP, PICTURE_QUALITIES, PICTURE_SIZE } from './config.ts';

const NOT_A_PICTURE = 'This file isn\'t a picture this browser can open.';

const toDataUrl = (canvas: HTMLCanvasElement, quality: number) => new Promise<string>((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error(NOT_A_PICTURE));

      return;
    }

    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(NOT_A_PICTURE));
    reader.readAsDataURL(blob);
  }, 'image/jpeg', quality);
});

const newCanvas = (size: number) => {
  const canvas = document.createElement('canvas');

  canvas.width = size;
  canvas.height = size;

  return canvas;
};

// Turns a chosen image file into our picture: the middle square, PICTURE_SIZE pixels, as a JPEG data URL. Loaded
// through an <img>, so a phone photo's rotation (EXIF) is applied. A big photo is halved step by step, because one
// big step down looks grainy in some browsers.
export const makePicture = async (file: Blob): Promise<string> => {
  const url = URL.createObjectURL(file);
  const image = new Image();

  try {
    image.src = url;
    await image.decode().catch(() => {
      throw new Error(NOT_A_PICTURE);
    });

    const side = Math.min(image.naturalWidth, image.naturalHeight);

    if (!side) {
      throw new Error(NOT_A_PICTURE);
    }

    let size = Math.min(side, PICTURE_SIZE * PICTURE_FIRST_STEP);
    let canvas = newCanvas(size);
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;

    // JPEG has no transparency: a see-through PNG gets a white background, not a black one.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size, size);
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );

    while (size > PICTURE_SIZE) {
      const next = Math.max(PICTURE_SIZE, Math.floor(size / 2));
      const smaller = newCanvas(next);
      const smallerContext = smaller.getContext('2d') as CanvasRenderingContext2D;

      smallerContext.imageSmoothingQuality = 'high';
      smallerContext.drawImage(canvas, 0, 0, next, next);
      canvas = smaller;
      size = next;
    }

    for (const quality of PICTURE_QUALITIES) {
      const picture = await toDataUrl(canvas, quality);

      if (picture.length <= MAX_PICTURE_CHARS) {
        return picture;
      }
    }

    throw new Error('This picture is too detailed to make small enough. Try another one.');
  } finally {
    URL.revokeObjectURL(url);
  }
};
