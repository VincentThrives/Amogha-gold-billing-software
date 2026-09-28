import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ApprovalsHubComponent } from './approvals-hub.component';
import { StoreService } from '../../core/services/store.service';

function build(isAdmin: boolean, tab?: string) {
  const store = { isAdmin: () => isAdmin, pendingTxns: signal([]), pendingFunds: signal([]) };
  TestBed.configureTestingModule({
    imports: [ApprovalsHubComponent],
    providers: [
      { provide: StoreService, useValue: store },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(tab ? { tab } : {}) } } },
    ],
  });
  return TestBed.createComponent(ApprovalsHubComponent).componentInstance;
}

describe('ApprovalsHubComponent', () => {
  it('defaults an admin to the Bill Approvals tab', () => {
    expect(build(true).tab()).toBe('bill');
  });
  it('honours ?tab=fund for an admin', () => {
    expect(build(true, 'fund').tab()).toBe('fund');
  });
  it('shows the fund tab for an employee', () => {
    expect(build(false).tab()).toBe('fund');
  });
});
