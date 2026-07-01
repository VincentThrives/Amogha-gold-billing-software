import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { Txn } from '../../core/models';
import { inr, billDate } from '../../core/calc';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './approvals.component.html',
  styleUrl: './approvals.component.scss',
})
export class ApprovalsComponent {
  store = inject(StoreService);

  pending = this.store.pendingTxns;

  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);
  itemsSummary(t: Txn) { return t.items.map(i => `${i.article} (${i.net.toFixed(2)}g)`).join(', '); }
}
