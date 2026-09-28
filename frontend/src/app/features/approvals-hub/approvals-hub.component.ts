import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ApprovalsComponent } from '../approvals/approvals.component';
import { FundsComponent } from '../funds/funds.component';

@Component({
  selector: 'app-approvals-hub',
  standalone: true,
  imports: [CommonModule, ApprovalsComponent, FundsComponent],
  templateUrl: './approvals-hub.component.html',
  styleUrl: './approvals-hub.component.scss',
})
export class ApprovalsHubComponent {
  store = inject(StoreService);
  private route = inject(ActivatedRoute);
  tab = signal<'bill' | 'fund'>('bill');

  constructor() {
    if (!this.store.isAdmin()) this.tab.set('fund');
    else if (this.route.snapshot.queryParamMap.get('tab') === 'fund') this.tab.set('fund');
  }
}
