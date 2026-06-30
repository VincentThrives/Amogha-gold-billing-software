import { Injectable, signal } from '@angular/core';

export interface ToastMsg { text: string; type: '' | 'ok' | 'err'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<ToastMsg | null>(null);
  private timer: any = null;

  show(text: string, type: '' | 'ok' | 'err' = '') {
    this.current.set({ text, type });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.current.set(null), 3200);
  }
  ok(text: string) { this.show(text, 'ok'); }
  err(text: string) { this.show(text, 'err'); }
}
