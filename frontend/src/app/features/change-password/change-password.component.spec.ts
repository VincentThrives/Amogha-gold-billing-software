import { TestBed } from '@angular/core/testing';
import { ChangePasswordComponent } from './change-password.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

describe('ChangePasswordComponent', () => {
  let cmp: ChangePasswordComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['changePassword']);
    auth.changePassword.and.resolveTo(undefined);
    toast = jasmine.createSpyObj('ToastService', ['ok', 'err', 'show']);
    TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [{ provide: AuthService, useValue: auth }, { provide: ToastService, useValue: toast }],
    });
    cmp = TestBed.createComponent(ChangePasswordComponent).componentInstance;
  });

  it('blocks when the current password is empty', async () => {
    cmp.next = 'newpass'; cmp.confirm = 'newpass';
    await cmp.submit();
    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  it('blocks when the new password is too short', async () => {
    cmp.current = 'x'; cmp.next = 'ab'; cmp.confirm = 'ab';
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith('New password must be at least 4 characters.');
  });

  it('blocks when the confirmation does not match', async () => {
    cmp.current = 'x'; cmp.next = 'newpass'; cmp.confirm = 'other';
    await cmp.submit();
    expect(toast.err).toHaveBeenCalledWith('The new passwords do not match.');
    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  it('submits the current + new password', async () => {
    cmp.current = 'old1'; cmp.next = 'new1234'; cmp.confirm = 'new1234';
    await cmp.submit();
    expect(auth.changePassword).toHaveBeenCalledWith('old1', 'new1234');
    expect(toast.ok).toHaveBeenCalled();
  });
});
