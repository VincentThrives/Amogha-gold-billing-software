import { emptyKyc, validateKyc, kycIdProofs, kycToCustomer, kycReference, kycToRegistration, customerToKyc, KycModel } from './kyc';
import { RegisteredCustomer } from './models';

function validModel(): KycModel {
  return {
    ...emptyKyc(),
    selectedIds: ['PAN Card'], idNumbers: { 'PAN Card': 'ABCDE1234F' },
    name: 'Ravi', phone: '9800000000', addr1: 'MG Road', pin: '560073',
    refNumber: 'R1', refRel: 'Brother', refPhone: '9811111111', refAddr: 'Addr',
  };
}

describe('validateKyc', () => {
  it('passes a complete model', () => expect(validateKyc(validModel()).ok).toBeTrue());
  it('requires an ID proof selection', () => {
    const r = validateKyc({ ...validModel(), selectedIds: [] });
    expect(r.ok).toBeFalse(); expect(r.fieldId).toBe('idTypes');
  });
  it('requires an ID document number', () => {
    const r = validateKyc({ ...validModel(), idNumbers: {} });
    expect(r.ok).toBeFalse(); expect(r.fieldId).toBe('idnum_pan_card');
  });
  it('requires a name', () => {
    const r = validateKyc({ ...validModel(), name: '' });
    expect(r.ok).toBeFalse(); expect(r.fieldId).toBe('f_name');
  });
  it('requires a 10-digit phone', () => {
    const r = validateKyc({ ...validModel(), phone: '123' });
    expect(r.ok).toBeFalse(); expect(r.fieldId).toBe('f_phone');
  });
  it('requires a 6-digit PIN', () => {
    const r = validateKyc({ ...validModel(), pin: '12' });
    expect(r.ok).toBeFalse(); expect(r.fieldId).toBe('f_pin');
  });
});

describe('kyc converters', () => {
  it('kycIdProofs keeps only filled numbers', () => {
    const m = { ...validModel(), selectedIds: ['PAN Card', 'Voter ID'], idNumbers: { 'PAN Card': 'ABCDE1234F', 'Voter ID': '' } };
    expect(kycIdProofs(m)).toEqual([{ type: 'PAN Card', number: 'ABCDE1234F' }]);
  });
  it('kycToCustomer maps + trims fields', () => {
    const c = kycToCustomer({ ...validModel(), name: ' Ravi ', addr1: ' MG Road ' });
    expect(c.name).toBe('Ravi'); expect(c.address1).toBe('MG Road'); expect(c.phone).toBe('9800000000');
  });
  it('kycReference maps reference fields', () => {
    expect(kycReference(validModel())).toEqual({ number: 'R1', relationship: 'Brother', phone: '9811111111', address: 'Addr' });
  });
  it('kycToRegistration bundles customer + proofs + reference + selfie', () => {
    const reg: any = kycToRegistration(validModel());
    expect(reg.name).toBe('Ravi');
    expect(reg.idProofs).toEqual([{ type: 'PAN Card', number: 'ABCDE1234F' }]);
    expect(reg.reference.relationship).toBe('Brother');
    expect(reg.selfie).toBeNull();
  });
});

describe('customerToKyc (prefill)', () => {
  it('round-trips a registered customer into an editable model', () => {
    const c: RegisteredCustomer = {
      id: 'c1', name: 'Ravi', phone: '9800000000', address1: 'MG Road', pincode: '560073',
      idProofs: [{ type: 'PAN Card', number: 'ABCDE1234F' }],
      reference: { relationship: 'Brother' }, selfie: null, createdAt: '',
    };
    const m = customerToKyc(c);
    expect(m.name).toBe('Ravi');
    expect(m.selectedIds).toEqual(['PAN Card']);
    expect(m.idNumbers['PAN Card']).toBe('ABCDE1234F');
    expect(m.refRel).toBe('Brother');
    expect(validateKyc(m).ok).toBeTrue();
  });
});
