import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  rateLabel(v: number) { return v ? inr(v, 0) + '/g' : 'not set'; }
}
