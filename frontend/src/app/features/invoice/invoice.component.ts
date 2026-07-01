import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Company, Txn } from '../../core/models';
import { billDate, inr, inWords } from '../../core/calc';

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss',
})
export class InvoiceComponent implements OnInit {
  store = inject(StoreService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  txn?: Txn;
  company!: Company;
  pad: number[] = [];
  busy = signal(false);
  mode = signal<'invoice' | 'estimation'>('invoice');

  inr2 = (n: number) => inr(n, 2);
  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);
  words = (n: number) => inWords(n);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.txn = this.store.txnById(id) || this.store.deletedTransactions().find(t => t.id === id);
    this.company = this.store.company()!;
    if (this.txn) {
      const padCount = Math.max(0, 6 - this.txn.items.length);
      this.pad = Array.from({ length: padCount }, (_, i) => i);
    }
  }

  async deleteBill() {
    const t = this.txn;
    if (!t) return;
    if (!confirm(`Move bill ${t.billNo} to Deleted Invoices? The staff payout will be refunded.`)) return;
    this.busy.set(true);
    try {
      await this.store.deleteTxn(t.id);
      this.toast.show(`Bill ${t.billNo} moved to Deleted Invoices.`);
      this.router.navigate(['/transactions']);
    } catch (e: any) { this.toast.err(e?.error?.error || 'Could not delete.'); this.busy.set(false); }
  }

  get address(): string {
    const c = this.txn!.customer;
    return [c.address1, c.address2, c.landmark ? 'Landmark: ' + c.landmark : '', 'PIN ' + c.pincode].filter(Boolean).join(', ');
  }
  get totalWeights() {
    return this.txn!.items.reduce((a, it) => ({ g: a.g + it.gross, s: a.s + it.stone, o: a.o + it.other, n: a.n + it.net }), { g: 0, s: 0, o: 0, n: 0 });
  }
  get rateLabel(): string { return this.txn!.metal === 'gold' ? '24crt' : '999'; }

  print() { window.print(); }

  async downloadPdf() {
    const el = document.getElementById('invoiceDoc');
    if (!el) return;
    this.busy.set(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const name = this.txn!.customer.name.replace(/\s+/g, '_');
      const fname = this.mode() === 'estimation' ? `Amogha_Estimate_${name}` : `Amogha_${this.txn!.billNo}_${name}`;
      await html2pdf().set({
        margin: 6,
        filename: `${fname}.pdf`,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).save();
    } catch { window.print(); }
    finally { this.busy.set(false); }
  }
}
