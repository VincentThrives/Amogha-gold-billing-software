import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../core/models';

describe('SettingsComponent add-employee validation', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let cmp: SettingsComponent;
  let toast: jasmine.SpyObj<ToastService>;
  let addEmployee: jasmine.Spy;

  beforeEach(() => {
    addEmployee = jasmine.createSpy('addEmployee').and.resolveTo(undefined);
    const store = {
      company: () => ({ name: 'Amogha Gold Company', addressLines: [], gstn: '', phone: '', terms: [], legalName: '' }),
      users: signal<User[]>([{ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' }]),
      addEmployee,
      removeEmployee: jasmine.createSpy().and.resolveTo(undefined),
      setCompany: jasmine.createSpy().and.resolveTo(undefined),
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
    fixture = TestBed.createComponent(SettingsComponent);
    cmp = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => fixture.nativeElement.remove());

  it('highlights the name field and does not submit when name is empty', async () => {
    cmp.empName = ''; cmp.empPhone = '9876543210';
    await cmp.addEmployee();
    expect(toast.err).toHaveBeenCalledWith('Enter the employee name.');
    expect(document.getElementById('emp_name')!.classList.contains('input-err')).toBeTrue();
    expect(addEmployee).not.toHaveBeenCalled();
  });

  it('highlights the phone field when the phone is not 10 digits', async () => {
    cmp.empName = 'Test Staff'; cmp.empPhone = '123';
    await cmp.addEmployee();
    expect(toast.err).toHaveBeenCalledWith('Enter a valid 10-digit phone.');
    expect(document.getElementById('emp_phone')!.classList.contains('input-err')).toBeTrue();
    expect(addEmployee).not.toHaveBeenCalled();
  });

  it('submits when name and a valid phone are provided', async () => {
    cmp.empName = 'Test Staff'; cmp.empPhone = '9811122233';
    await cmp.addEmployee();
    expect(addEmployee).toHaveBeenCalledWith('Test Staff', '9811122233');
    expect(toast.ok).toHaveBeenCalledWith('Employee added.');
  });
});
