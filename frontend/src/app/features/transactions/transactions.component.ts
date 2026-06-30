import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { TxnTableComponent } from '../../shared/txn-table/txn-table.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, RouterLink, TxnTableComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent {
  store = inject(StoreService);
}
