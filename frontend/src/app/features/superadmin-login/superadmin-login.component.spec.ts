import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SuperAdminLoginComponent } from './superadmin-login.component';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';

describe('SuperAdminLoginComponent', () => {
  let cmp: SuperAdminLoginComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let store: jasmine.SpyObj<StoreService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['login']);
    store = jasmine.createSpyObj('StoreService', ['sync']);
    store.sync.and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [SuperAdminLoginComponent],
      providers: [{ provide: AuthService, useValue: auth }, { provide: StoreService, useValue: store }, provideRouter([])],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    cmp = TestBed.createComponent(SuperAdminLoginComponent).componentInstance;
  });

  it('blocks when the email is empty', async () => {
    cmp.username = ''; cmp.password = 'x';
    await cmp.login();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('logs in with email + password and routes to dashboard', async () => {
    auth.login.and.resolveTo({ id: 'u-super', name: 'Super Admin', role: 'superadmin', phone: '' } as any);
    cmp.username = 'vincentthrives@gmail.com'; cmp.password = 'Vincent@1127';
    await cmp.login();
    expect(auth.login).toHaveBeenCalledWith('vincentthrives@gmail.com', 'Vincent@1127');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('shows an error on wrong credentials', async () => {
    auth.login.and.rejectWith({ error: { error: 'Incorrect username or password.' } });
    cmp.username = 'x@y.com'; cmp.password = 'wrong';
    await cmp.login();
    expect(cmp.error()).toContain('Incorrect');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
