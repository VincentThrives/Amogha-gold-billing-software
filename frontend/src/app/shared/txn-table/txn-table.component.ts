import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Txn } from '../../core/models';
import { inr, billDate } from '../../core/calc';

@Component({
  selector: 'app-txn-table',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './txn-table.component.html',
})
export class TxnTableComponent {
  @Input() rows: Txn[] = [];
  @Input() allowDelete = false;                 // show a Delete button on approved rows
  @Output() delete = new EventEmitter<Txn>();
  inr0 = (n: number) => inr(n, 0);
  date = (iso: string) => billDate(iso);
}
