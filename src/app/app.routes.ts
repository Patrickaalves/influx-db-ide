import { Routes } from '@angular/router';
import { QueryEditorComponent } from './components/query-editor/query-editor.component';
import { ConfigurationComponent } from './components/configuration/configuration.component';

export const routes: Routes = [
  { path: '', redirectTo: '/query', pathMatch: 'full' },
  { path: 'query', component: QueryEditorComponent },
  { path: 'configuration', component: ConfigurationComponent }
];
