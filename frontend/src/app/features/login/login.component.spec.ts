import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';

describe('LoginComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let store: jasmine.SpyObj<StoreService>;
  let router: jasmine.SpyObj<Router>;
  let cmp: LoginComponent;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['requestOtp', 'verifyOtp']);
    store = jasmine.createSpyObj('StoreService', ['sync']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: StoreService, useValue: store },
        { provide: Router, useValue: router },
      ],
    });
    cmp = TestBed.createComponent(LoginComponent).componentInstance;
  });

  it('role toggle switches between admin and employee', () => {
    expect(cmp.role()).toBe('admin');
    cmp.role.set('employee');
    expect(cmp.role()).toBe('employee');
  });

  it('onPhone strips non-digits and caps at 10', () => {
    cmp.onPhone('9a8b76543210999');
    expect(cmp.phone).toBe('9876543210');
  });

  it('sendOtp rejects an invalid phone without calling the API', async () => {
    cmp.phone = '123';
    await cmp.sendOtp();
    expect(auth.requestOtp).not.toHaveBeenCalled();
    expect(cmp.hint()).toContain('valid 10-digit');
  });

  it('sendOtp success moves to step 2 and shows the OTP', async () => {
    cmp.phone = '9999900001';
    auth.requestOtp.and.resolveTo({ name: 'Amogha Admin', role: 'admin', otp: '123456' });
    await cmp.sendOtp();
    expect(cmp.step()).toBe(2);
    expect(cmp.shownOtp()).toBe('123456');
    expect(cmp.generatedFor()).toContain('Amogha Admin');
  });

  it('sendOtp surfaces a server error in the hint', async () => {
    cmp.phone = '9999900009';
    auth.requestOtp.and.rejectWith({ error: { error: 'No admin account found for this number.' } });
    await cmp.sendOtp();
    expect(cmp.hint()).toContain('No admin account');
  });

  it('verify success navigates to the dashboard', async () => {
    cmp.phone = '9999900001'; cmp.otp = '123456';
    auth.verifyOtp.and.resolveTo({ id: 'u-admin', name: 'A', role: 'admin', phone: '9999900001' });
    store.sync.and.resolveTo(true);
    await cmp.verify();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('verify failure shows an error and does not navigate', async () => {
    cmp.otp = '000000';
    auth.verifyOtp.and.rejectWith({ error: { error: 'Incorrect OTP. Please try again.' } });
    await cmp.verify();
    expect(cmp.error()).toContain('Incorrect OTP');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
