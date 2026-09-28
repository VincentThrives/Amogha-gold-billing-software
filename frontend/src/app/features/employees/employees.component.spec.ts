import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EmployeesComponent } from './employees.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { User } from '../../core/models';

describe('EmployeesComponent (user management)', () => {
  let fixture: ComponentFixture<EmployeesComponent>;
  let cmp: EmployeesComponent;
  let toast: jasmine.SpyObj<ToastService>;
  let dlg: jasmine.SpyObj<DialogService>;
  let createUser: jasmine.Spy;
  let resetUserPassword: jasmine.Spy;
  let changeUserPhone: jasmine.Spy;

  beforeEach(() => {
    dlg = jasmine.createSpyObj('DialogService', ['confirm', 'prompt']);
    createUser = jasmine.createSpy('createUser').and.resolveTo(undefined);
    resetUserPassword = jasmine.createSpy('resetUserPassword').and.resolveTo(undefined);
    changeUserPhone = jasmine.createSpy('changeUserPhone').and.resolveTo(undefined);
    const store = {
      users: signal<User[]>([{ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' }]),
      me: signal<User | null>({ id: 'u-admin', name: 'Admin', role: 'admin', phone: '9999900001' }),
      createUser,
      resetUserPassword,
      changeUserPhone,
      removeEmployee: jasmine.createSpy().and.resolveTo(undefined),
    };
    toast = jasmine.createSpyObj('ToastService', ['err', 'ok', 'show']);
    TestBed.configureTestingModule({
      imports: [EmployeesComponent],
      providers: [{ provide: StoreService, useValue: store }, { provide: ToastService, useValue: toast }, { provide: DialogService, useValue: dlg }],
    });
    fixture = TestBed.createComponent(EmployeesComponent);
    cmp = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => fixture.nativeElement.remove());

  it('blocks create when the name is empty', async () => {
    cmp.newName = ''; cmp.newPhone = '9876543210'; cmp.newPassword = 'pass1234';
    await cmp.createUser();
    expect(toast.err).toHaveBeenCalledWith('Enter the name.');
    expect(createUser).not.toHaveBeenCalled();
  });

  it('blocks create when the phone is not 10 digits', async () => {
    cmp.newName = 'Test'; cmp.newPhone = '123'; cmp.newPassword = 'pass1234';
    await cmp.createUser();
    expect(toast.err).toHaveBeenCalledWith('Enter a valid 10-digit phone.');
    expect(createUser).not.toHaveBeenCalled();
  });

  it('blocks create when the password is too short', async () => {
    cmp.newName = 'Test'; cmp.newPhone = '9811122233'; cmp.newPassword = 'ab';
    await cmp.createUser();
    expect(toast.err).toHaveBeenCalledWith('Password must be at least 4 characters.');
    expect(createUser).not.toHaveBeenCalled();
  });

  it('creates an admin with name, phone, role and password', async () => {
    cmp.newName = 'Second Admin'; cmp.newPhone = '9811122233'; cmp.newRole = 'admin'; cmp.newPassword = 'secret1';
    await cmp.createUser();
    expect(createUser).toHaveBeenCalledWith('Second Admin', '9811122233', 'admin', 'secret1');
    expect(toast.ok).toHaveBeenCalledWith('Admin added.');
  });

  it('resets a user password via the prompt', async () => {
    dlg.prompt.and.resolveTo('newpass9');
    await cmp.resetPassword({ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' });
    expect(resetUserPassword).toHaveBeenCalledWith('u-emp1', 'newpass9');
    expect(toast.ok).toHaveBeenCalledWith('Password reset for Counter Staff.');
  });

  it('does not reset when the prompt is cancelled', async () => {
    dlg.prompt.and.resolveTo(null);
    await cmp.resetPassword({ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' });
    expect(resetUserPassword).not.toHaveBeenCalled();
  });

  it('changes a user mobile number via the prompt', async () => {
    dlg.prompt.and.resolveTo('9812345678');
    await cmp.changePhone({ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' });
    expect(changeUserPhone).toHaveBeenCalledWith('u-emp1', '9812345678');
    expect(toast.ok).toHaveBeenCalledWith('Mobile number updated for Counter Staff.');
  });

  it('blocks a mobile-number change that is not 10 digits', async () => {
    dlg.prompt.and.resolveTo('123');
    await cmp.changePhone({ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' });
    expect(changeUserPhone).not.toHaveBeenCalled();
    expect(toast.err).toHaveBeenCalledWith('Enter a valid 10-digit phone.');
  });
});
