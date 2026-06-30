import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { StoreService } from '../../core/services/store.service';
import { inr } from '../../core/calc';

Chart.register(...registerables);

interface MonthRow { label: string; count: number; gold: number; silver: number; total: number; }

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements AfterViewInit, OnDestroy {
  private store = inject(StoreService);
  @ViewChild('dayCanvas') dayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('weekCanvas') weekCanvas!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  hasData = this.store.transactions().length > 0;
  hasToday = false;
  monthRows: MonthRow[] = [];
  inr0 = (n: number) => inr(n, 0);

  ngAfterViewInit() {
    const txns = this.store.transactions();

    // today doughnut by metal
    const start = new Date(); start.setHours(0, 0, 0, 0);
    let dg = 0, ds = 0;
    txns.forEach(t => { if (new Date(t.date) >= start) { t.metal === 'gold' ? dg += t.totals.amountPayable : ds += t.totals.amountPayable; } });
    this.hasToday = dg + ds > 0;
    if (this.hasToday) {
      this.charts.push(new Chart(this.dayCanvas.nativeElement, {
        type: 'doughnut',
        data: { labels: ['Gold', 'Silver'], datasets: [{ data: [dg, ds], backgroundColor: ['#c79a3b', '#9aa3ad'] }] },
        options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => `${c.label}: ${this.inr0(c.parsed)}` } } } },
      }));
    }

    // weekly bar (last 7 days payouts)
    const labels: string[] = [], data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const sum = txns.reduce((s, t) => { const td = new Date(t.date); return s + (td >= d && td < next ? t.totals.amountPayable : 0); }, 0);
      labels.push(d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }));
      data.push(Math.round(sum));
    }
    this.charts.push(new Chart(this.weekCanvas.nativeElement, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Payout (₹)', data, backgroundColor: '#561a70', borderRadius: 6 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '₹' + Number(v).toLocaleString('en-IN') } } } },
    }));

    // monthly table (last months)
    const months: Record<string, MonthRow> = {};
    txns.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
      if (!months[key]) months[key] = { label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), count: 0, gold: 0, silver: 0, total: 0 };
      months[key].count++; months[key].total += t.totals.amountPayable;
      months[key][t.metal] += t.totals.amountPayable;
    });
    this.monthRows = Object.keys(months).sort().reverse().map(k => months[k]);
  }

  ngOnDestroy() { this.charts.forEach(c => c.destroy()); }
}
