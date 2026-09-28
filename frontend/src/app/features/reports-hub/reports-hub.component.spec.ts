import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ReportsHubComponent } from './reports-hub.component';
import { StoreService } from '../../core/services/store.service';

function build(tab?: string) {
  const store = { isAdmin: () => true };
  TestBed.configureTestingModule({
    imports: [ReportsHubComponent],
    providers: [
      { provide: StoreService, useValue: store },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(tab ? { tab } : {}) } } },
    ],
  });
  return TestBed.createComponent(ReportsHubComponent).componentInstance;
}

describe('ReportsHubComponent', () => {
  it('defaults to the Sales tab', () => {
    expect(build().tab()).toBe('sales');
  });
  it('honours ?tab=fund', () => {
    expect(build('fund').tab()).toBe('fund');
  });
});
