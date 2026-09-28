import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';

describe('LoginComponent (phone + password)', () => {
  let cmp: LoginComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let store: jasmine.SpyObj<StoreService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['login']);
    store = jasmine.createSpyObj('StoreService', ['sync']);
    store.sync.and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: StoreService, useValue: store },
        provideRouter([]),
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    cmp = TestBed.createComponent(LoginComponent).componentInstance;
  });

  it('blocks login with an invalid phone', async () => {
    cmp.phone = '123'; cmp.password = 'x';
    await cmp.login();
    expect(auth.login).not.toHaveBeenCalled();
    expect(cmp.error()).toContain('10-digit');
  });

  it('blocks login when the password is empty', async () => {
    cmp.phone = '9999900001'; cmp.password = '';
    await cmp.login();
    expect(auth.login).not.toHaveBeenCalled();
    expect(cmp.error()).toContain('password');
  });

  it('logs in and routes to the dashboard', async () => {
    auth.login.and.resolveTo({ id: 'u-admin', name: 'Admin', role: 'admin', phone: '9999900001' } as any);
    cmp.phone = '9999900001'; cmp.password = 'admin@2024';
    await cmp.login();
    expect(auth.login).toHaveBeenCalledWith('9999900001', 'admin@2024');
    expect(store.sync).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('shows an error on wrong credentials and does not navigate', async () => {
    auth.login.and.rejectWith({ error: { error: 'Incorrect phone number or password.' } });
    cmp.phone = '9999900001'; cmp.password = 'wrong';
    await cmp.login();
    expect(cmp.error()).toContain('Incorrect');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
