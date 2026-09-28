import { Injectable, signal } from '@angular/core';

export interface DialogState {
  kind: 'confirm' | 'prompt';
  title: string;
  message: string;
  okText: string;
  danger: boolean;
  value: string;
  password: boolean;
  placeholder: string;
}

/** In-app replacement for window.confirm / window.prompt with a styled modal. */
@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly state = signal<DialogState | null>(null);
  private resolver: ((v: any) => void) | null = null;

  confirm(opts: { title?: string; message: string; okText?: string; danger?: boolean }): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.resolver = resolve;
      this.state.set({
        kind: 'confirm', title: opts.title ?? 'Please confirm', message: opts.message,
        okText: opts.okText ?? 'Confirm', danger: !!opts.danger, value: '', password: false, placeholder: '',
      });
    });
  }

  prompt(opts: { title?: string; message?: string; value?: string; okText?: string; password?: boolean; placeholder?: string }): Promise<string | null> {
    return new Promise<string | null>(resolve => {
      this.resolver = resolve;
      this.state.set({
        kind: 'prompt', title: opts.title ?? '', message: opts.message ?? '',
        okText: opts.okText ?? 'Save', danger: false, value: opts.value ?? '',
        password: !!opts.password, placeholder: opts.placeholder ?? '',
      });
    });
  }

  /** Called by the host component. */
  resolveWith(value: string | boolean | null) {
    const r = this.resolver;
    this.resolver = null;
    this.state.set(null);
    if (r) r(value);
  }
}
