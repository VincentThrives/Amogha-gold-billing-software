import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { Txn, TxnItem } from '../../core/models';
import { computeTotals, itemAmount, netWeight, inr, billDate } from '../../core/calc';
import { ARTICLE_OPTIONS } from '../../core/articles';
import { highlightField } from '../../core/ui';

interface ItemRow { article: string; gross: number | null; stone: number; other: number; purity: number; rate: number; }

@Component({
  selector: 'app-approval-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './approval-edit.component.html',
  styleUrl: './approval-edit.component.scss',
})
export class ApprovalEditComponent implements OnInit {
  store = inject(StoreService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly articleOptions = ARTICLE_OPTIONS;
  txn = signal<Txn | null>(null);
  items = signal<ItemRow[]>([]);
  margin = 0;
  charges = 0;
  busy = signal(false);

  inr2 = (n: number) => inr(n, 2);
  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const t = id ? this.store.txnById(id) : undefined;
    if (!t || t.status !== 'pending') { this.router.navigate(['/approvals']); return; }
    this.txn.set(t);
    this.items.set(t.items.map(i => ({ article: i.article, gross: i.gross, stone: i.stone, other: i.other, purity: i.purity, rate: i.rate })));
    const cfg = this.store.billingConfig();
    this.margin = t.totals.margin || cfg.defaultMargin;
    this.charges = t.totals.billingCharges || cfg.defaultBillingCharges;
  }

  net(it: ItemRow) { return netWeight(it.gross || 0, it.stone, it.other); }
  amount(it: ItemRow) { return itemAmount(this.net(it), it.rate, it.purity); }
  totals() {
    return computeTotals(this.items().map(it => ({ net: this.net(it), rate: it.rate, purity: it.purity })), this.margin, this.charges);
  }

  addItem() { this.items.update(l => [...l, { article: '', gross: null, stone: 0, other: 0, purity: 91.6, rate: 0 }]); }
  removeItem(i: number) { if (this.items().length > 1) this.items.update(l => l.filter((_, idx) => idx !== i)); }

  private fail(msg: string, fieldId: string): false { this.toast.err(msg); highlightField(document.getElementById(fieldId)); return false; }

  async approve() {
    const t = this.txn();
    if (!t) return false;
    const rows = this.items().map((it, idx) => ({ it, idx })).filter(r => (r.it.gross || 0) > 0);
    if (!rows.length) return this.fail('Add at least one item with its gross weight.', 'a_gross_0');
    for (const { it, idx } of rows) {
      if (!it.article.trim()) return this.fail(`Enter the article name for item ${idx + 1}.`, `a_article_${idx}`);
      if (!it.rate) return this.fail(`Item ${idx + 1} needs a rate.`, `a_rate_${idx}`);
    }
    const built: TxnItem[] = rows.map(({ it }) => {
      const net = this.net(it);
      return { article: it.article.trim(), gross: it.gross || 0, stone: it.stone, other: it.other, net, purity: it.purity, rate: it.rate, amount: itemAmount(net, it.rate, it.purity) };
    });
    if (this.totals().amountPayableRounded <= 0) return this.fail('Amount payable must be greater than zero.', 'a_gross_0');

    this.busy.set(true);
    try {
      await this.store.approveTxn(t.id, built, Number(this.margin) || 0, Number(this.charges) || 0);
      this.toast.ok(`Bill ${t.billNo} approved.`);
      this.router.navigate(['/invoice', t.id]);
      return true;
    } catch (e: any) {
      this.toast.err(e?.error?.error || 'Could not approve.');
      this.busy.set(false);
      return false;
    }
  }

  async reject() {
    const t = this.txn();
    if (!t) return;
    this.busy.set(true);
    try { await this.store.rejectTxn(t.id); this.toast.show('Bill rejected.'); this.router.navigate(['/approvals']); }
    catch (e: any) { this.toast.err(e?.error?.error || 'Could not reject.'); this.busy.set(false); }
  }
}
