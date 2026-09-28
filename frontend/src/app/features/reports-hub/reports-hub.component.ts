import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ReportsComponent } from '../reports/reports.component';
import { FundReportsComponent } from '../fund-reports/fund-reports.component';

@Component({
  selector: 'app-reports-hub',
  standalone: true,
  imports: [CommonModule, ReportsComponent, FundReportsComponent],
  templateUrl: './reports-hub.component.html',
  styleUrl: './reports-hub.component.scss',
})
export class ReportsHubComponent {
  store = inject(StoreService);
  private route = inject(ActivatedRoute);
  tab = signal<'sales' | 'fund'>('sales');

  constructor() {
    if (this.route.snapshot.queryParamMap.get('tab') === 'fund') this.tab.set('fund');
  }
}
