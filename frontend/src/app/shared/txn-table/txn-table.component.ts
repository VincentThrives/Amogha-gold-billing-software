import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Txn } from '../../core/models';
import { inr, billDate } from '../../core/calc';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-txn-table',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './txn-table.component.html',
})
export class TxnTableComponent {
  store = inject(StoreService);
  @Input() rows: Txn[] = [];
  @Input() allowDelete = false;                 // show a Delete button on approved rows
  @Output() delete = new EventEmitter<Txn>();
  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);
}
