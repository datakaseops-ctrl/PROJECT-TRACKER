import { TaskAttachment } from '../types';

const DB_NAME = 'divisional_tracker_db';
const STORE_NAME = 'task_attachments';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Convert uploaded file to base64 Data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Format byte size to readable string
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Store attachment in IndexedDB with localStorage fallback
export async function persistAttachment(taskId: string, attachment: TaskAttachment): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ ...attachment, taskId });
  } catch {
    // LocalStorage fallback for lightweight attachments
    try {
      const key = `att_${taskId}`;
      const existing = localStorage.getItem(key);
      const list: TaskAttachment[] = existing ? JSON.parse(existing) : [];
      list.push(attachment);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage attachment fallback failed', e);
    }
  }
}

// Retrieve attachments for a task
export async function getStoredAttachments(taskId: string): Promise<TaskAttachment[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const all: any[] = request.result || [];
        const matching = all.filter(item => item.taskId === taskId);
        resolve(matching);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    try {
      const key = `att_${taskId}`;
      const existing = localStorage.getItem(key);
      return existing ? JSON.parse(existing) : [];
    } catch {
      return [];
    }
  }
}

// Delete attachment from storage
export async function removeStoredAttachment(taskId: string, attachmentId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(attachmentId);
  } catch {
    try {
      const key = `att_${taskId}`;
      const existing = localStorage.getItem(key);
      if (existing) {
        const list: TaskAttachment[] = JSON.parse(existing);
        const filtered = list.filter(a => a.id !== attachmentId);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch {}
  }
}

// Trigger browser download for an attachment
export function triggerFileDownload(attachment: TaskAttachment): void {
  try {
    const link = document.createElement('a');
    link.href = attachment.dataUrl;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Download failed', err);
  }
}
