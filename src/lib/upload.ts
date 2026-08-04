const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

export interface UploadResult {
  url: string;
  name: string;
  path: string;
}

export async function uploadFile(file: File, context?: string): Promise<UploadResult> {
  const token = sessionStorage.getItem('rentcar:api_token');
  const form = new FormData();
  form.append('file', file);
  if (context) form.append('context', context);

  const res = await fetch(`${BASE}/uploads`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao enviar ficheiro' }));
    throw new Error(err.message ?? 'Erro ao enviar ficheiro');
  }

  return res.json() as Promise<UploadResult>;
}
