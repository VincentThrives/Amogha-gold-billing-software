import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KycModel, ID_TYPES, idSlug } from '../../core/kyc';
import { digitsOnly } from '../../core/calc';

/** Presentational KYC form (ID proof, details, reference, selfie/OTP) bound to a KycModel.
 *  Shared by Register Customer and New Transaction. Validation lives in core/kyc.ts. */
@Component({
  selector: 'app-kyc-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kyc-form.component.html',
  styleUrl: './kyc-form.component.scss',
})
export class KycFormComponent {
  @Input({ required: true }) model!: KycModel;

  readonly ID_TYPES = ID_TYPES;
  idSlug = idSlug;

  // transient client OTP (not persisted; sets model.clientOtpVerified)
  clientOtp = signal('');
  clientOtpInput = '';

  get selectedIdList(): string[] { return this.ID_TYPES.filter(t => this.model.selectedIds.includes(t)); }

  toggleId(type: string) {
    const i = this.model.selectedIds.indexOf(type);
    if (i >= 0) this.model.selectedIds.splice(i, 1);
    else { this.model.selectedIds.push(type); if (this.model.idNumbers[type] == null) this.model.idNumbers[type] = ''; }
  }

  onDigits(field: 'phone' | 'pin' | 'refPhone', v: string) {
    (this.model as any)[field] = digitsOnly(v, field === 'pin' ? 6 : 10);
  }

  onSelfie(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) { this.model.selfie = null; return; }
    const fr = new FileReader();
    fr.onload = () => (this.model.selfie = fr.result as string);
    fr.readAsDataURL(file);
  }

  genClientOtp() {
    this.clientOtp.set(String(Math.floor(100000 + Math.random() * 900000)));
    this.model.clientOtpVerified = false;
    this.clientOtpInput = '';
  }
  verifyClientOtp() { this.model.clientOtpVerified = this.clientOtpInput.trim() === this.clientOtp(); }
}
