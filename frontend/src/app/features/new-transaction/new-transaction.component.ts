import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Metal, RegisteredCustomer, Txn } from '../../core/models';
import { computeTotals, inr, itemAmount, netWeight } from '../../core/calc';
import { ARTICLE_OPTIONS } from '../../core/articles';
import { highlightField } from '../../core/ui';

interface ItemRow { article: string; gross: number | null; stone: number; other: number; purity: number; rate: number; }

@Component({
  selector: 'app-new-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './new-transaction.component.html',
  styleUrl: './new-transaction.component.scss',
})
export class NewTransactionComponent implements OnInit {
  store = inject(StoreService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly articleOptions = ARTICLE_OPTIONS;
  metal: Metal = 'gold';
  fixedRate = 0;

  // the registered customer being billed (KYC is captured on the Register Customer page)
  selectedCustomer = signal<RegisteredCustomer | null>(null);
  custSearch = signal('');
  custResults = computed(() => this.store.searchCustomers(this.custSearch()));

  // items + charges
  readonly RELEASE_METHODS = ['Cash', 'RTGS', 'NEFT', 'UPI', 'IMPS', 'Cheque'];
  items = signal<ItemRow[]>([]);
  margin = 0; charges = 0;
  release = 0; releaseMethod = ''; releaseBank = '';
  busy = signal(false);

  inr2 = (n: number) => inr(n, 2);
  inr0 = (n: number) => inr(n, 0);
  cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  ngOnInit() {
    const m = this.route.snapshot.paramMap.get('metal');
    if (m !== 'gold' && m !== 'silver') { this.router.navigate(['/new']); return; }
    this.metal = m;
    this.fixedRate = m === 'gold' ? this.store.rates().gold : this.store.rates().silver;
    // admins apply margin/charges directly; pre-fill from the admin defaults (charges ₹100)
    if (this.store.isAdmin()) {
      this.margin = this.store.billingConfig().defaultMargin;
      this.charges = this.store.billingConfig().defaultBillingCharges;
    }
    this.addItem();

    // preselect the customer if we arrived via Register Customer
    const cid = this.route.snapshot.queryParamMap.get('customerId');
    if (cid) {
      const c = this.store.customerById(cid);
      if (c) this.selectedCustomer.set(c);
    }
  }

  pickCustomer(c: RegisteredCustomer) {
    this.selectedCustomer.set(c);
    this.custSearch.set('');
    this.toast.show(`Selected ${c.name}.`, 'ok');
  }
  clearCustomer() { this.selectedCustomer.set(null); }

  addItem(focusNew = false) {
    this.items.update(list => [...list, { article: '', gross: null, stone: 0, other: 0, purity: 91.6, rate: this.fixedRate || 0 }]);
    if (focusNew) {
      const idx = this.items().length - 1;
      setTimeout(() => {
        const el = document.getElementById('i_article_' + idx);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as HTMLElement).focus(); }
      });
    }
  }
  removeItem(i: number) {
    if (this.items().length <= 1) return;   // button is disabled at one row; guard anyway
    this.items.update(list => list.filter((_, idx) => idx !== i));
  }
  net(it: ItemRow) { return netWeight(it.gross || 0, it.stone, it.other); }
  amount(it: ItemRow) { return itemAmount(this.net(it), it.rate, it.purity); }

  // method (not computed) so it reflects in-place ngModel edits to item rows each change-detection pass
  totals() {
    return computeTotals(
      this.items().map(it => ({ net: netWeight(it.gross || 0, it.stone, it.other), rate: it.rate, purity: it.purity })),
      this.margin, this.charges, this.release);
  }

  // highlight a specific cell in a specific item row (article/gross/rate)
  private failRow(msg: string, field: 'i_article' | 'i_gross' | 'i_rate', idx: number): false {
    this.toast.err(msg);
    highlightField(document.getElementById(`${field}_${idx}`));
    return false;
  }

  async submit() {
    const customer = this.selectedCustomer();
    if (!customer) {
      this.toast.err('Search and select a registered customer first.');
      highlightField(document.getElementById('cust_search'));
      return false;
    }

    // items: keep rows that have a gross weight; each such row needs a name and a rate
    const rows = this.items()
      .map((it, idx) => ({ it, idx }))
      .filter(r => (r.it.gross || 0) > 0);
    if (!rows.length) return this.failRow('Add at least one item with its gross weight.', 'i_gross', 0);
    for (const { it, idx } of rows) {
      if (!it.article.trim()) return this.failRow(`Enter the article name for item ${idx + 1}.`, 'i_article', idx);
      if (!it.rate) return this.failRow(`Item ${idx + 1} needs a rate. Set the ${this.metal} rate first.`, 'i_rate', idx);
    }
    const items = rows.map(r => r.it);

    const tot = this.totals();
    if (tot.grossAmount <= 0) return this.failRow('Amount must be greater than zero.', 'i_gross', rows[0].idx);

    // release amount (paid to the bank) validation
    const release = Number(this.release) || 0;
    if (release > 0) {
      if (release > tot.grossAmount) { this.toast.err('Release amount cannot exceed the gross amount.'); highlightField(document.getElementById('t_release')); return false; }
      if (!this.releaseMethod) { this.toast.err('Select how the release amount was paid (Cash / RTGS / NEFT…).'); highlightField(document.getElementById('t_release_method')); return false; }
      if (!this.releaseBank.trim()) { this.toast.err('Enter the bank the release amount was paid to.'); highlightField(document.getElementById('t_release_bank')); return false; }
    }

    const me = this.store.me()!;

    // staff can only send a bill for approval if their wallet balance covers the amount payable
    // to the customer. (The release amount is paid to the bank separately and does not touch the
    // billing wallet.) If not, they must get a fund request approved first. Admins skip this check.
    if (!this.store.isAdmin()) {
      const needed = tot.amountPayableRounded;
      const available = this.store.balanceOf(me.id);
      if (needed > available) {
        this.toast.err(`Insufficient funds: ₹${available.toLocaleString('en-IN')} available, this bill needs ₹${needed.toLocaleString('en-IN')}. Request and get funds approved before sending for approval.`);
        highlightField(document.getElementById('i_gross_' + rows[0].idx));
        return false;
      }
    }

    const txn: Txn = {
      id: this.store.genId('txn'),
      billNo: this.store.genBillNo(),
      date: new Date().toISOString(),
      metal: this.metal,
      employeeId: me.id,
      employeeName: me.name,
      customer: {
        name: customer.name, dob: customer.dob, phone: customer.phone,
        address1: customer.address1, address2: customer.address2,
        pincode: customer.pincode, landmark: customer.landmark,
      },
      idProofs: customer.idProofs || [],
      reference: customer.reference || {},
      selfie: customer.selfie ?? null,
      clientOtpVerified: false,
      article: items[0].article.trim(),
      items: items.map(it => {
        const net = netWeight(it.gross || 0, it.stone, it.other);
        return { article: it.article.trim(), gross: it.gross || 0, stone: it.stone, other: it.other, net, purity: it.purity, rate: it.rate, amount: itemAmount(net, it.rate, it.purity) };
      }),
      totals: {
        grossAmount: tot.grossAmount, margin: tot.margin, netAmount: tot.netAmount,
        billingCharges: tot.billingCharges, releaseAmount: tot.releaseAmount,
        amountPayable: tot.amountPayableRounded, netWeight: tot.netWeight,
      },
      releaseMethod: release > 0 ? this.releaseMethod : '',
      releaseBank: release > 0 ? this.releaseBank.trim() : '',
      status: 'pending',   // server sets the real status by role (admin→approved, staff→pending)
    };

    this.busy.set(true);
    try {
      const saved = await this.store.addTxn(txn);
      if (saved.status === 'approved') {
        this.toast.ok(`Bill ${saved.billNo} generated.`);
        this.router.navigate(['/invoice', saved.id]);
      } else {
        this.toast.ok('Sent to admin for approval.');
        this.router.navigate(['/transactions']);
      }
      return true;
    } catch (e: any) {
      this.toast.err(e?.error?.error || 'Could not submit the bill.');
      this.busy.set(false);
      return false;
    }
  }
}
