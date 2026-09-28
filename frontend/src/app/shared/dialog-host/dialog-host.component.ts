import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../core/services/dialog.service';

@Component({
  selector: 'app-dialog-host',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dialog-host.component.html',
  styleUrl: './dialog-host.component.scss',
})
export class DialogHostComponent {
  dlg = inject(DialogService);
  input = '';

  constructor() {
    // seed the input whenever a prompt opens; autofocus the field
    effect(() => {
      const s = this.dlg.state();
      if (s?.kind === 'prompt') {
        this.input = s.value;
        setTimeout(() => document.getElementById('dlg_input')?.focus(), 0);
      }
    });
  }

  ok() {
    const s = this.dlg.state();
    this.dlg.resolveWith(s?.kind === 'prompt' ? this.input : true);
  }
  cancel() {
    const s = this.dlg.state();
    this.dlg.resolveWith(s?.kind === 'prompt' ? null : false);
  }
}
