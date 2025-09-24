import { Route } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { InsurancesComponent } from './features/insurances/insurances.component';
import { SettingsComponent } from './features/settings/settings.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: LandingComponent
  },
  {
    path: 'insurances',
    component: InsurancesComponent
  },
  {
    path: 'settings',
    component: SettingsComponent
  }
];
