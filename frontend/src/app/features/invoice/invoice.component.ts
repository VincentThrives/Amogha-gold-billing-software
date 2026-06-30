import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
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
  private store = inject(StoreService);
  private route = inject(ActivatedRoute);

  txn?: Txn;
  company!: Company;
  pad: number[] = [];
  busy = signal(false);

  inr2 = (n: number) => inr(n, 2);
  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);
  words = (n: number) => inWords(n);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.txn = this.store.txnById(id);
    this.company = this.store.company()!;
    if (this.txn) {
      const padCount = Math.max(0, 6 - this.txn.items.length);
      this.pad = Array.from({ length: padCount }, (_, i) => i);
    }
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
      await html2pdf().set({
        margin: 6,
        filename: `Amogha_${this.txn!.billNo}_${this.txn!.customer.name.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).save();
    } catch { window.print(); }
    finally { this.busy.set(false); }
  }
}
