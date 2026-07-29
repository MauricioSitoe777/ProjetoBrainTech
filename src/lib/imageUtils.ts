const LIMIT_BYTES = 350 * 1024; // 350 KB

function b64SizeBytes(dataUrl: string): number {
  const b64 = dataUrl.split(',')[1] ?? '';
  // Each base64 char encodes 6 bits → 4 chars = 3 bytes
  return Math.round(b64.length * 0.75);
}

/**
 * Converte um File em data URL JPEG, comprimindo apenas se o ficheiro
 * original ultrapassar 350 KB. A qualidade é reduzida iterativamente
 * e, se ainda assim não chegar ao limite, as dimensões são escaladas.
 */
export function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Erro ao ler o ficheiro.'));

    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();

      img.onerror = () => reject(new Error('Formato de imagem inválido.'));

      img.onload = () => {
        // Ficheiro já dentro do limite → converte para JPEG com qualidade alta
        if (file.size <= LIMIT_BYTES) {
          const canvas = document.createElement('canvas');
          canvas.width  = img.width;
          canvas.height = img.height;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
          return;
        }

        // Ficheiro > 350 KB → reduz qualidade iterativamente
        const MAX_W = 1200;
        const scale = Math.min(1, MAX_W / img.width);
        let cw = Math.round(img.width  * scale);
        let ch = Math.round(img.height * scale);

        const drawCanvas = (w: number, h: number): HTMLCanvasElement => {
          const c = document.createElement('canvas');
          c.width  = w;
          c.height = h;
          c.getContext('2d')!.drawImage(img, 0, 0, w, h);
          return c;
        };

        let canvas = drawCanvas(cw, ch);
        let quality = 0.85;
        let result  = canvas.toDataURL('image/jpeg', quality);

        // Passo 1: baixa a qualidade até chegar ao limite
        while (b64SizeBytes(result) > LIMIT_BYTES && quality > 0.2) {
          quality -= 0.05;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        // Passo 2: se ainda > 350 KB, reduz também as dimensões
        while (b64SizeBytes(result) > LIMIT_BYTES && cw > 400) {
          cw     = Math.round(cw * 0.8);
          ch     = Math.round(ch * 0.8);
          canvas = drawCanvas(cw, ch);
          result = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(result);
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
