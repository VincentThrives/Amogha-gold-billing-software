import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FeatureAccessComponent } from './feature-access.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';

function build(features: Record<string, boolean>) {
  const store = {
    features: signal<Record<string, boolean>>(features),
    setFeatures: jasmine.createSpy('setFeatures').and.resolveTo(undefined),
  };
  const toast = jasmine.createSpyObj('ToastService', ['ok', 'err', 'show']);
  TestBed.configureTestingModule({
    imports: [FeatureAccessComponent],
    providers: [{ provide: StoreService, useValue: store }, { provide: ToastService, useValue: toast }],
  });
  return { cmp: TestBed.createComponent(FeatureAccessComponent).componentInstance, store };
}

describe('FeatureAccessComponent', () => {
  it('isOn reflects the flags (default on when missing)', () => {
    const { cmp } = build({ expense: false });
    expect(cmp.isOn('expense')).toBeFalse();
    expect(cmp.isOn('reports')).toBeTrue();
  });

  it('toggling an ON feature saves it as false', async () => {
    const { cmp, store } = build({});
    await cmp.toggle('expense');
    expect(store.setFeatures).toHaveBeenCalledWith({ expense: false });
  });

  it('toggling an OFF feature saves it as true', async () => {
    const { cmp, store } = build({ expense: false });
    await cmp.toggle('expense');
    expect(store.setFeatures).toHaveBeenCalledWith({ expense: true });
  });
});
