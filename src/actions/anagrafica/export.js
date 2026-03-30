'use server';

import admin from '@/lib/firebase/firebaseAdmin';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';

const adminDb = admin.firestore();

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSVRow(values) {
  return values.map(escapeCSV).join(',');
}

function formatDate(value) {
  if (!value) return '';
  try {
    if (value?._seconds) return new Date(value._seconds * 1000).toLocaleDateString('it-IT');
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('it-IT');
  } catch {
    return '';
  }
}

function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function exportAccessiCSV({ structureId, startDate, endDate }) {
  const { userUid } = await requireUser();

  if (!structureId || !startDate || !endDate) {
    throw new Error('Parametri mancanti');
  }

  await verifyUserPermissions({ userUid, structureId });

  const start = new Date(startDate + 'T00:00:00.000Z');
  const end = new Date(endDate + 'T23:59:59.999Z');

  const accessiSnap = await adminDb.collection('accessi')
    .where('createdByStructure', '==', structureId)
    .get();

  const filtered = [];
  for (const doc of accessiSnap.docs) {
    const data = doc.data();
    const createdAt = new Date(data.createdAt);
    if (!isNaN(createdAt.getTime()) && createdAt >= start && createdAt <= end) {
      filtered.push({ id: doc.id, ...data });
    }
  }

  filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Batch fetch anagrafica docs
  const anagraficaIds = [...new Set(filtered.map(a => a.anagraficaId).filter(Boolean))];
  const anagraficaMap = {};
  if (anagraficaIds.length > 0) {
    for (let i = 0; i < anagraficaIds.length; i += 30) {
      const chunk = anagraficaIds.slice(i, i + 30);
      const refs = chunk.map(id => adminDb.collection('anagrafica').doc(id));
      const docs = await adminDb.getAll(...refs);
      for (const doc of docs) {
        if (doc.exists) anagraficaMap[doc.id] = doc.data();
      }
    }
  }

  const headers = [
    'Data Accesso',
    'ID Accesso',
    'Nome',
    'Cognome',
    'Data di Nascita',
    'Cittadinanza',
    'Tipo Accesso',
    'Sotto Categorie',
    'Altro',
    'Classificazione',
    'Ente Riferimento',
    'Note',
  ];

  const rows = [headers];

  for (const access of filtered) {
    const info = anagraficaMap[access.anagraficaId]?.anagrafica || {};
    const createdAt = access.createdAt ? new Date(access.createdAt).toLocaleDateString('it-IT') : '';
    const cittadinanza = Array.isArray(info.cittadinanza)
      ? info.cittadinanza.join('; ')
      : (info.cittadinanza || '');

    const services = Array.isArray(access.services) && access.services.length > 0
      ? access.services
      : [{}];

    for (const svc of services) {
      const sottoCategorie = Array.isArray(svc.sottoCategorie)
        ? svc.sottoCategorie.join('; ')
        : (svc.sottoCategorie || '');

      rows.push([
        createdAt,
        access.id,
        info.nome || '',
        info.cognome || '',
        formatDate(info.dataDiNascita),
        cittadinanza,
        svc.tipoAccesso || '',
        sottoCategorie,
        svc.altro || '',
        svc.classificazione || '',
        svc.enteRiferimento || '',
        stripHtml(svc.note || ''),
      ]);
    }
  }

  const csv = '\uFEFF' + rows.map(toCSVRow).join('\r\n');
  return { csv, count: filtered.length };
}
