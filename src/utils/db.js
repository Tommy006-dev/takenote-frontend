import { openDB } from 'idb';

const DB_NAME = 'NotesDB';
const DB_VERSION = 2;

// Khởi tạo IndexedDB cho dữ liệu frontend/offline.
// Backend của nhóm bạn vẫn có thể đồng bộ dữ liệu thật sau này; phần này chỉ giữ UX offline/PWA mượt hơn.
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('labels')) {
        db.createObjectStore('labels', { keyPath: 'id' });
      }
    },
  });
};

export const saveNoteOffline = async (note) => {
  const db = await initDB();
  await db.put('notes', note);
};

export const getNotesOffline = async () => {
  const db = await initDB();
  return db.getAll('notes');
};

export const deleteNoteOffline = async (id) => {
  const db = await initDB();
  await db.delete('notes', id);
};

export const saveLabelOffline = async (label) => {
  const db = await initDB();
  await db.put('labels', label);
};

export const getLabelsOffline = async () => {
  const db = await initDB();
  return db.getAll('labels');
};

export const deleteLabelOffline = async (id) => {
  const db = await initDB();
  await db.delete('labels', id);
};
