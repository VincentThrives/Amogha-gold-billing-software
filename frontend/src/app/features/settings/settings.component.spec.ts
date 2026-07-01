import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';

describe('SettingsComponent', () => {
  let cmp: SettingsComponent;
  let toast: jasmine.SpyObj<ToastService>;
  let setCompany: jasmine.Spy;

  beforeEach(() => {
    setCompany = jasmine.createSpy('setCompany').and.resolveTo(undefined);
    const store = {
      company: () => ({ name: 'Amogha Gold Company', addressLines: ['L1', 'L2'], gstn: '29ABFCA1286P1Z2', phone: '+91 1', terms: ['t'], legalName: 'For X' }),
      setCompany,
      resetAll: jasmine.createSpy().and.resolveTo(undefined),
    };
    toast = jasmine.createSpyObj('ToastService', ['err', 'ok', 'show']);
    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: StoreService, useValue: store },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
      ],
    });
    cmp = TestBed.createComponent(SettingsComponent).componentInstance;
  });

  it('loads the existing company details', () => {
    expect(cmp.name).toBe('Amogha Gold Company');
    expect(cmp.gstn).toBe('29ABFCA1286P1Z2');
    expect(cmp.addr).toBe('L1\nL2');
  });

  it('saveCompany sends trimmed values and preserves terms/legalName', async () => {
    cmp.name = ' New Name '; cmp.addr = 'A\n\nB'; cmp.gstn = ' G '; cmp.phone = ' P ';
    await cmp.saveCompany();
    expect(setCompany).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'New Name', addressLines: ['A', 'B'], gstn: 'G', phone: 'P', terms: ['t'], legalName: 'For X',
    }));
    expect(toast.ok).toHaveBeenCalledWith('Company details saved.');
  });
});
