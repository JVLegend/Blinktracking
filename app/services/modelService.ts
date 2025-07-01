const MODEL_URL = 'https://raw.githubusercontent.com/davisking/dlib-models/master/shape_predictor_68_face_landmarks.dat';
const DB_NAME = 'facial-landmarks-db';
const STORE_NAME = 'models';
const MODEL_KEY = 'landmark-model';

async function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getFromDB(): Promise<ArrayBuffer | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(MODEL_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function saveToDB(data: ArrayBuffer) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, MODEL_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getModelData() {
  try {
    // Tentar obter do IndexedDB primeiro
    const cachedData = await getFromDB();
    if (cachedData) {
      console.log('Modelo obtido do cache');
      return cachedData;
    }

    // Se não estiver no cache, fazer download
    console.log('Baixando modelo facial...');
    const response = await fetch(MODEL_URL);
    const modelData = await response.arrayBuffer();

    // Salvar no IndexedDB
    await saveToDB(modelData);
    console.log('Modelo salvo no cache');

    return modelData;
  } catch (error) {
    console.error('Erro ao obter modelo:', error);
    throw new Error('Falha ao carregar o modelo facial');
  }
} 