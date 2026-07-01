import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { inr } from '../../core/calc';

@Component({
  selector: 'app-new-transaction-select',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './new-transaction-select.component.html',
  styleUrl: './new-transaction-select.component.scss',
})
export class NewTransactionSelectComponent {
  store = inject(StoreService);
  private route = inject(ActivatedRoute);

  // carried through to the bill when starting from a registered customer
  customerId = this.route.snapshot.queryParamMap.get('customerId');
  customerName = this.customerId ? (this.store.customerById(this.customerId)?.name ?? '') : '';
  get query() { return this.customerId ? { customerId: this.customerId } : {}; }

  rateLabel(v: number) { return v ? inr(v, 0) + '/g' : 'not set'; }
}
