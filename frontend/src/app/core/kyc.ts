import { Customer, IdProof, Reference, RegisteredCustomer } from './models';

/** The KYC form's editable state — shared by Register Customer and New Transaction. */
export interface KycModel {
  selectedIds: string[];
  idNumbers: Record<string, string>;
  name: string; dob: string; phone: string;
  addr1: string; addr2: string; pin: string; landmark: string;
  refNumber: string; refRel: string; refPhone: string; refAddr: string;
  selfie: string | null;
  clientOtpVerified: boolean;
}

export const ID_TYPES = ['Aadhaar Card', 'PAN Card', 'Voter ID', 'Driving License', 'Passport', 'Ration Card', 'Other'];

export function emptyKyc(): KycModel {
  return {
    selectedIds: [], idNumbers: {},
    name: '', dob: '', phone: '', addr1: '', addr2: '', pin: '', landmark: '',
    refNumber: '', refRel: '', refPhone: '', refAddr: '',
    selfie: null, clientOtpVerified: false,
  };
}

export function idSlug(type: string): string { return type.toLowerCase().replace(/[^a-z0-9]+/g, '_'); }

/** Pure KYC validation. Returns the first problem with the DOM id of the field to highlight. */
export function validateKyc(m: KycModel): { ok: boolean; message?: string; fieldId?: string } {
  const proofs = kycIdProofs(m);
  if (!m.selectedIds.length) return { ok: false, message: 'Select at least one ID proof.', fieldId: 'idTypes' };
  if (!proofs.length) return { ok: false, message: 'Enter the document number for the selected ID proof.', fieldId: 'idnum_' + idSlug(m.selectedIds[0]) };
  if (!m.name.trim()) return { ok: false, message: 'Full name is required.', fieldId: 'f_name' };
  if (!/^\d{10}$/.test(m.phone)) return { ok: false, message: 'Enter a valid 10-digit phone.', fieldId: 'f_phone' };
  if (!m.addr1.trim()) return { ok: false, message: 'Address is required.', fieldId: 'f_addr1' };
  if (!/^\d{6}$/.test(m.pin)) return { ok: false, message: 'Enter a valid 6-digit PIN code.', fieldId: 'f_pin' };
  return { ok: true };
}

export function kycIdProofs(m: KycModel): IdProof[] {
  return m.selectedIds
    .map(t => ({ type: t, number: (m.idNumbers[t] || '').trim() }))
    .filter(p => p.number);
}

export function kycToCustomer(m: KycModel): Customer {
  return {
    name: m.name.trim(), dob: m.dob, phone: m.phone,
    address1: m.addr1.trim(), address2: m.addr2.trim(),
    pincode: m.pin, landmark: m.landmark.trim(),
  };
}

export function kycReference(m: KycModel): Reference {
  return { number: m.refNumber.trim(), relationship: m.refRel.trim(), phone: m.refPhone.trim(), address: m.refAddr.trim() };
}

/** Build the payload posted to POST /api/customers. */
export function kycToRegistration(m: KycModel) {
  const c = kycToCustomer(m);
  return { ...c, idProofs: kycIdProofs(m), reference: kycReference(m), selfie: m.selfie };
}

/** Prefill a KYC model from a previously registered customer. */
export function customerToKyc(c: RegisteredCustomer): KycModel {
  const idNumbers: Record<string, string> = {};
  (c.idProofs || []).forEach(p => (idNumbers[p.type] = p.number));
  return {
    selectedIds: (c.idProofs || []).map(p => p.type),
    idNumbers,
    name: c.name || '', dob: c.dob || '', phone: c.phone || '',
    addr1: c.address1 || '', addr2: c.address2 || '', pin: c.pincode || '', landmark: c.landmark || '',
    refNumber: c.reference?.number || '', refRel: c.reference?.relationship || '',
    refPhone: c.reference?.phone || '', refAddr: c.reference?.address || '',
    selfie: c.selfie ?? null, clientOtpVerified: false,
  };
}
