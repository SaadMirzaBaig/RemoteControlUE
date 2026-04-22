import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { ObjectListComponent } from './components/object-list/object-list.component';
import { ObjectItemComponent } from './components/object-item/object-item.component';
import { ObjectFormComponent } from './components/object-form/object-form.component';

@NgModule({
  declarations: [
    AppComponent,
    ObjectListComponent,
    ObjectItemComponent,
    ObjectFormComponent
  ],
  imports: [BrowserModule, HttpClientModule, ReactiveFormsModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
