import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EmployeesComponent } from './employees.component';
import { StoreService } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../core/models';

describe('EmployeesComponent add-employee validation', () => {
  let fixture: ComponentFixture<EmployeesComponent>;
  let cmp: EmployeesComponent;
  let toast: jasmine.SpyObj<ToastService>;
  let addEmployee: jasmine.Spy;

  beforeEach(() => {
    addEmployee = jasmine.createSpy('addEmployee').and.resolveTo(undefined);
    const store = {
      users: signal<User[]>([{ id: 'u-emp1', name: 'Counter Staff', role: 'employee', phone: '9999900002' }]),
      addEmployee,
      removeEmployee: jasmine.createSpy().and.resolveTo(undefined),
    };
    toast = jasmine.createSpyObj('ToastService', ['err', 'ok', 'show']);
    TestBed.configureTestingModule({
      imports: [EmployeesComponent],
      providers: [
        { provide: StoreService, useValue: store },
        { provide: ToastService, useValue: toast },
      ],
    });
    fixture = TestBed.createComponent(EmployeesComponent);
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
