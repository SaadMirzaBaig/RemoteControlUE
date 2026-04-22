import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjectItemComponent } from './object-item.component';

describe('ObjectItemComponent', () => {
  let component: ObjectItemComponent;
  let fixture: ComponentFixture<ObjectItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ObjectItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ObjectItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
