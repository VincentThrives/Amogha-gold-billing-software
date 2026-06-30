import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Metal, Txn, IdProof } from '../../core/models';
import { computeTotals, digitsOnly, inr, itemAmount, netWeight } from '../../core/calc';
import { highlightField } from '../../core/ui';

interface ItemRow { article: string; gross: number | null; stone: number; other: number; purity: number; rate: number; }

const ID_TYPES = ['Aadhaar Card', 'PAN Card', 'Voter ID', 'Driving License', 'Passport', 'Ration Card', 'Other'];

@Component({
  selector: 'app-new-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './new-transaction.component.html',
  styleUrl: './new-transaction.component.scss',
})
export class NewTransactionComponent implements OnInit {
  private store = inject(StoreService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly ID_TYPES = ID_TYPES;
  metal: Metal = 'gold';
  fixedRate = 0;

  // KYC
  selectedIds = new Set<string>();
  idNumbers: Record<string, string> = {};
  name = ''; dob = ''; phone = ''; addr1 = ''; addr2 = ''; pin = ''; landmark = '';
  refNumber = ''; refRel = ''; refPhone = ''; refAddr = '';
  selfie: string | null = null;

  // client OTP (optional, simulated)
  clientOtp = signal('');
  clientOtpInput = '';
  clientOtpVerified = signal(false);

  // items + charges
  items = signal<ItemRow[]>([]);
  article = ''; margin = 0; charges = 0;
  busy = signal(false);

  inr2 = (n: number) => inr(n, 2);
  inr0 = (n: number) => inr(n, 0);
  slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  ngOnInit() {
    const m = this.route.snapshot.paramMap.get('metal');
    if (m !== 'gold' && m !== 'silver') { this.router.navigate(['/new']); return; }
    this.metal = m;
    this.fixedRate = m === 'gold' ? this.store.rates().gold : this.store.rates().silver;
    this.addItem();
  }

  get selectedIdList(): string[] { return this.ID_TYPES.filter(t => this.selectedIds.has(t)); }

  toggleId(type: string) {
    if (this.selectedIds.has(type)) { this.selectedIds.delete(type); }
    else { this.selectedIds.add(type); if (this.idNumbers[type] == null) this.idNumbers[type] = ''; }
  }

  onDigits(field: 'phone' | 'pin' | 'refPhone', v: string) {
    const max = field === 'pin' ? 6 : 10;
    (this as any)[field] = digitsOnly(v, max);
  }

  onSelfie(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) { this.selfie = null; return; }
    const fr = new FileReader();
    fr.onload = () => (this.selfie = fr.result as string);
    fr.readAsDataURL(file);
  }

  genClientOtp() {
    this.clientOtp.set(String(Math.floor(100000 + Math.random() * 900000)));
    this.clientOtpVerified.set(false);
    this.clientOtpInput = '';
  }
  verifyClientOtp() { this.clientOtpVerified.set(this.clientOtpInput.trim() === this.clientOtp()); }

  addItem() { this.items.update(list => [...list, { article: '', gross: null, stone: 0, other: 0, purity: 91.6, rate: this.fixedRate || 0 }]); }
  removeItem(i: number) {
    if (this.items().length <= 1) { this.toast.err('At least one item is required.'); return; }
    this.items.update(list => list.filter((_, idx) => idx !== i));
  }
  net(it: ItemRow) { return netWeight(it.gross || 0, it.stone, it.other); }
  amount(it: ItemRow) { return itemAmount(this.net(it), it.rate, it.purity); }

  // method (not computed) so it reflects in-place ngModel edits to item rows each change-detection pass
  totals() {
    return computeTotals(
      this.items().map(it => ({ net: netWeight(it.gross || 0, it.stone, it.other), rate: it.rate, purity: it.purity })),
      this.margin, this.charges);
  }

  private fail(msg: string, selector: string): false {
    this.toast.err(msg);
    highlightField(document.querySelector(selector));
    return false;
  }

  async submit() {
    const idProofs: IdProof[] = this.selectedIdList
      .map(t => ({ type: t, number: (this.idNumbers[t] || '').trim() }))
      .filter(p => p.number);
    if (!this.selectedIdList.length) return this.fail('Select at least one ID proof.', '#idTypes');
    if (!idProofs.length) return this.fail('Enter the document number for the selected ID proof.', '.id-number-input');

    if (!this.name.trim()) return this.fail('Seller name is required.', '#f_name');
    if (!/^\d{10}$/.test(this.phone)) return this.fail('Enter a valid 10-digit seller phone.', '#f_phone');
    if (!this.addr1.trim()) return this.fail('Seller address is required.', '#f_addr1');
    if (!/^\d{6}$/.test(this.pin)) return this.fail('Enter a valid 6-digit PIN code.', '#f_pin');
    if (!this.article.trim()) return this.fail('Enter the item / article name.', '#t_article');

    const items = this.items().filter(it => (it.gross || 0) > 0);
    if (!items.length) return this.fail('Add at least one item with gross weight.', '.i_gross');
    if (items.some(it => !it.rate)) return this.fail(`Every item needs a rate. Set the ${this.metal} rate first.`, '.i_rate');

    const tot = this.totals();
    if (tot.amountPayable <= 0) return this.fail('Amount payable must be greater than zero.', '.i_gross');

    const me = this.store.me()!;
    if (me.role === 'employee' && this.store.balanceOf(me.id) < tot.amountPayable) {
      this.toast.err(`Insufficient funds (${this.inr0(this.store.balanceOf(me.id))}). Get funds approved before billing.`);
      return false;
    }

    const txn: Txn = {
      id: this.store.genId('txn'),
      billNo: this.store.genBillNo(),
      date: new Date().toISOString(),
      metal: this.metal,
      employeeId: me.id,
      employeeName: me.name,
      customer: {
        name: this.name.trim(), dob: this.dob, phone: this.phone,
        address1: this.addr1.trim(), address2: this.addr2.trim(),
        pincode: this.pin, landmark: this.landmark.trim(),
      },
      idProofs,
      reference: { number: this.refNumber.trim(), relationship: this.refRel.trim(), phone: this.refPhone.trim(), address: this.refAddr.trim() },
      selfie: this.selfie,
      clientOtpVerified: this.clientOtpVerified(),
      article: this.article.trim(),
      items: items.map(it => {
        const net = netWeight(it.gross || 0, it.stone, it.other);
        return { article: it.article.trim() || this.article.trim(), gross: it.gross || 0, stone: it.stone, other: it.other, net, purity: it.purity, rate: it.rate, amount: itemAmount(net, it.rate, it.purity) };
      }),
      totals: {
        grossAmount: tot.grossAmount, margin: tot.margin, netAmount: tot.netAmount,
        billingCharges: tot.billingCharges, amountPayable: tot.amountPayableRounded, netWeight: tot.netWeight,
      },
    };

    this.busy.set(true);
    try {
      const saved = await this.store.addTxn(txn);
      this.toast.ok(`Bill ${saved.billNo} generated.`);
      this.router.navigate(['/invoice', saved.id]);
      return true;
    } catch (e: any) {
      this.toast.err(e?.error?.error || 'Could not save the bill.');
      this.busy.set(false);
      return false;
    }
  }
}
