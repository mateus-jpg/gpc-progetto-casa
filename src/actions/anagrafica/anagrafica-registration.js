"use server";

import {
  createAnagraficaShared as createAnagraficaSharedImpl,
  createRegistrationDraftShared as createRegistrationDraftSharedImpl,
} from "./anagrafica-registration-create";
import { finalizeRegistrationDraftShared as finalizeRegistrationDraftSharedImpl } from "./anagrafica-registration-finalize";

export async function createAnagraficaShared(body, services = []) {
  return await createAnagraficaSharedImpl(body, services);
}

export async function createRegistrationDraftShared(body) {
  return await createRegistrationDraftSharedImpl(body);
}

export async function finalizeRegistrationDraftShared(payload) {
  return await finalizeRegistrationDraftSharedImpl(payload);
}
